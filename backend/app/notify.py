"""Notification outbox. Every message is recorded; marketing is blocked without consent.

Delivery: with a provider configured, secret-bearing messages (OTP) are sent inline once and never
persisted; others are queued and sent right after the request (FastAPI background task) or by the
cron worker (/api/cron/notifications) with backoff. Without a provider (dev/test): "simulated".

Providers: email → Resend; WhatsApp → Meta Cloud API (approved templates); SMS → MSG91 Flow (DLT
template id per message in SMS_TEMPLATE_<TEMPLATE>).
"""
import contextvars
import json
import os
import re
import httpx
from sqlalchemy import Connection
from .config import settings
from .db import all_, engine, one, run

MAX_ATTEMPTS = 5
# Per-request list of queued ids to send once the request's transaction has committed.
_pending: contextvars.ContextVar[list[str] | None] = contextvars.ContextVar("notify_pending", default=None)


def begin_request() -> list[str]:
    ids: list[str] = []
    _pending.set(ids)
    return ids


def provider_configured(channel: str) -> bool:
    s = settings()
    if channel == "email":
        return bool(s.email_provider_key and s.email_from)
    if channel == "whatsapp":
        return bool(s.whatsapp_token and s.whatsapp_phone_number_id)
    return bool(s.sms_provider_key)


def _inr(p) -> str:
    v = float(p or 0) / 100
    s = f"{v:,.2f}".rstrip("0").rstrip(".")
    return f"₹{s}"


def render(template: str, p: dict) -> tuple[str, str]:
    site = settings().site_url
    match template:
        case "auth.otp":
            return "Your HSP Mart sign-in code", f"Your HSP Mart sign-in code is {p.get('code')}. It expires in 10 minutes. Do not share it."
        case "quote.sent":
            return f"Quotation {p.get('quote')} from HSP Mart", f"Your quotation {p.get('quote')} for {_inr(p.get('totalPaise'))} is ready: {site}{p.get('link')}"
        case "payment.received":
            return f"Payment received for {p.get('order')}", f"We received {_inr(p.get('amountPaise'))} for order {p.get('order')}. Thank you."
        case "order.dispatched":
            return f"Order {p.get('order')} dispatched", f"Order {p.get('order')} has been dispatched via {p.get('courier')}, tracking {p.get('trackingNumber')}."
        case "credit_note.issued":
            refund = f" A refund of {_inr(p.get('refundPaise'))} is on its way to your original payment method." if float(p.get("refundPaise") or 0) > 0 else ""
            return f"Credit note {p.get('creditNote')} for {p.get('order')}", f"Credit note {p.get('creditNote')} of {_inr(p.get('totalPaise'))} has been issued on order {p.get('order')}.{refund}"
        case "grievance.received":
            return f"Complaint {p.get('grievance')} received", f"We have logged complaint {p.get('grievance')} on order {p.get('order')} and will resolve it within 3 working days: {site}/my/orders/{p.get('order')}"
        case "grievance.resolved":
            return f"Complaint {p.get('grievance')} resolved", f"Complaint {p.get('grievance')} on order {p.get('order')} has been resolved. Details: {site}/my/orders/{p.get('order')}"
        case "payout.processed":
            return "Your HSP commission payout", f"Commission of {_inr(p.get('netPaise'))} (after TDS {_inr(p.get('tdsPaise'))}) has been paid. Reference {p.get('reference')}."
        case _:
            return "HSP Mart", p["text"] if isinstance(p.get("text"), str) else f"HSP Mart update ({template})."


def _post(url: str, headers: dict, body: dict) -> dict:
    try:
        r = httpx.post(url, headers=headers, json=body, timeout=10)
    except httpx.HTTPError as e:
        return {"ok": False, "error": str(e)}
    if r.status_code >= 400:
        return {"ok": False, "error": f"{r.status_code} {r.text[:300]}",
                "permanent": 400 <= r.status_code < 500 and r.status_code != 429}
    try:
        data = r.json()
    except ValueError:
        data = {}
    return {"ok": True, "json": data}


def deliver(channel: str, recipient: str, template: str, payload: dict) -> dict:
    s = settings()
    subject, text = render(template, payload)
    if channel == "email":
        r = _post("https://api.resend.com/emails", {"Authorization": f"Bearer {s.email_provider_key}"},
                  {"from": s.email_from, "to": [recipient], "subject": subject, "text": text})
        return {"ok": True, "ref": str(r["json"].get("id", ""))} if r["ok"] else r
    digits = re.sub(r"\D", "", recipient)
    phone = f"91{digits}" if len(digits) == 10 else digits
    if channel == "whatsapp":
        r = _post(f"https://graph.facebook.com/v21.0/{s.whatsapp_phone_number_id}/messages",
                  {"Authorization": f"Bearer {s.whatsapp_token}"},
                  {"messaging_product": "whatsapp", "to": phone, "type": "template",
                   "template": {"name": template.replace(".", "_"), "language": {"code": "en"},
                                "components": [{"type": "body", "parameters": [{"type": "text", "text": text[:1000]}]}]}})
        return {"ok": True, "ref": str(((r["json"].get("messages") or [{}])[0]).get("id", ""))} if r["ok"] else r
    template_id = os.environ.get("SMS_TEMPLATE_" + re.sub(r"\W", "_", template).upper())
    if not template_id:
        return {"ok": False, "error": f"No DLT template id for {template}", "permanent": True}
    r = _post("https://control.msg91.com/api/v5/flow", {"authkey": s.sms_provider_key},
              {"template_id": template_id, "short_url": "0",
               "recipients": [{"mobiles": phone, **{k: str(v) for k, v in payload.items()}}]})
    return {"ok": True, "ref": str(r["json"].get("request_id", ""))} if r["ok"] else r


def notify(conn: Connection, *, channel: str, recipient: str, template: str, payload: dict,
           category: str = "transactional", consent: bool = False, redact: list[str] | None = None):
    stored = {k: ("[redacted]" if k in (redact or []) else v) for k, v in payload.items()}
    status, reason = "simulated", None
    if category == "marketing" and not consent:
        status, reason = "blocked", "No marketing consent recorded"
    elif provider_configured(channel):
        status = "queued"
    elif settings().production:
        status, reason = "queued", "No provider configured"
    row = one(conn, """insert into notifications (channel, recipient, template, category, payload, status, reason)
                       values (:c, :r, :t, :cat, cast(:p as jsonb), :s, :reason) returning id, status""",
              c=channel, r=recipient, t=template, cat=category, p=json.dumps(stored, default=str), s=status, reason=reason)
    if status == "queued" and provider_configured(channel):
        if redact:
            # Secret-bearing: send now with the real payload; it can't be retried from the outbox.
            res = deliver(channel, recipient, template, payload)
            _record(conn, row["id"], res, final=True)
        else:
            pending = _pending.get()
            if pending is not None:
                pending.append(str(row["id"]))
    return row


def _record(conn, nid, r: dict, final=False):
    if r["ok"]:
        run(conn, """update notifications set status = 'sent', provider_ref = :ref, sent_at = now(), attempts = attempts + 1,
                     reason = null where id = :id""", ref=r.get("ref") or None, id=nid)
    else:
        run(conn, "update notifications set status = :s, reason = :r, attempts = attempts + 1 where id = :id",
            s="failed" if final or r.get("permanent") else "queued", r=r["error"][:500], id=nid)


def dispatch_one(nid: str):
    """Claims one queued message (row lock, skip if another worker has it) and sends it."""
    with engine().begin() as conn:
        n = one(conn, """select id, channel, recipient, template, payload, attempts from notifications
                         where id = cast(:id as uuid) and status = 'queued' for update skip locked""", id=nid)
        if not n or not provider_configured(n["channel"]):
            return
        if "[redacted]" in n["payload"].values():
            run(conn, "update notifications set status = 'failed', reason = 'Secret payload cannot be retried' where id = :id", id=n["id"])
            return
        # Mark the attempt before sending so a crash can't double-send in a tight loop.
        run(conn, "update notifications set attempts = attempts + 1 where id = :id", id=n["id"])
    r = deliver(n["channel"], n["recipient"], n["template"], n["payload"])
    with engine().begin() as conn:
        if r["ok"]:
            run(conn, "update notifications set status = 'sent', provider_ref = :ref, sent_at = now(), reason = null where id = :id",
                ref=r.get("ref") or None, id=n["id"])
        else:
            failed = r.get("permanent") or n["attempts"] + 1 >= MAX_ATTEMPTS
            run(conn, "update notifications set status = :s, reason = :r where id = :id",
                s="failed" if failed else "queued", r=r["error"][:500], id=n["id"])


def dispatch_queued(limit: int = 50) -> int:
    """Cron worker: retries queued messages, oldest first, waiting 2^attempts minutes between tries."""
    with engine().begin() as conn:
        due = all_(conn, """select id::text from notifications where status = 'queued' and attempts < :m
                            and created_at < now() - (power(2, attempts) * interval '1 minute') + interval '1 minute'
                            order by created_at limit :l""", m=MAX_ATTEMPTS, l=limit)
    for d in due:
        dispatch_one(d["id"])
    return len(due)
