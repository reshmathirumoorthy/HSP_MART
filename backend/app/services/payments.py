import json
from sqlalchemy import Connection
from ..audit import audit
from ..db import one, run
from ..errors import fail
from .common import amount_due, customer_owns, net_paid
from .notifications import notify_customer_of_order
from .pricing import advance_due
from .razorpay import create_provider_order


def start_payment(conn: Connection, user, order_number: str, kind: str):
    order = one(conn, "select * from orders where number = :n", n=order_number)
    if not order or not customer_owns(conn, user, order["customer_id"]):
        fail("Order not found.")
    if order["status"] == "cancelled":
        fail("Order is cancelled.")
    paid = net_paid(order)
    balance = amount_due(order) - paid
    if balance <= 0:
        fail("Nothing is due on this order.")
    # Online orders are paid in full up front; the 50% advance applies to quoted orders.
    if kind == "advance" and order["source"] == "online":
        fail("Online orders are paid in full.")
    amount = max(0, advance_due(amount_due(order)) - paid) if kind == "advance" else balance
    if amount <= 0:
        fail("The advance is already paid.")
    provider_id = create_provider_order(amount, order["number"])
    p = one(conn, "insert into payments (order_id, provider_order_id, amount_paise) values (:o, :p, :a) returning id::text",
            o=order["id"], p=provider_id, a=amount)
    audit(conn, user, "payment.start", "payment", p["id"], None, {"order": order["number"], "amountPaise": amount, "kind": kind})
    return p


def apply_razorpay_event(conn: Connection, event_id: str, evt: dict) -> str:
    """Idempotent: each provider event id is processed at most once."""
    inserted = one(conn, """insert into webhook_events (id, provider, type, payload) values (:id, 'razorpay', :t, cast(:p as jsonb))
                            on conflict do nothing returning id""", id=event_id, t=evt.get("event", ""), p=json.dumps(evt))
    if not inserted:
        return "duplicate"
    event = evt.get("event")
    payload = evt.get("payload") or {}
    if event in ("payment.captured", "payment.failed"):
        p = payload["payment"]["entity"]
        pay = one(conn, "select * from payments where provider_order_id = :o for update", o=p["order_id"])
        if not pay:
            return "ignored"
        if event == "payment.failed":
            if pay["status"] == "created":
                run(conn, "update payments set status = 'failed', provider_payment_id = :p where id = :id", p=p["id"], id=pay["id"])
            audit(conn, None, "payment.failed", "payment", pay["id"], None, {"providerPaymentId": p["id"]})
            return "processed"
        if pay["status"] == "captured":
            return "duplicate"
        if p["amount"] != pay["amount_paise"]:
            audit(conn, None, "payment.amount_mismatch", "payment", pay["id"], {"expected": pay["amount_paise"]}, {"received": p["amount"]})
            return "ignored"
        run(conn, "update payments set status = 'captured', provider_payment_id = :p where id = :id", p=p["id"], id=pay["id"])
        run(conn, "update orders set paid_paise = paid_paise + :a where id = :id", a=p["amount"], id=pay["order_id"])
        audit(conn, None, "payment.captured", "payment", pay["id"], {"status": pay["status"]}, {"status": "captured", "amountPaise": p["amount"]})
        notify_customer_of_order(conn, pay["order_id"], "payment.received", {"amountPaise": p["amount"]})
        return "processed"
    if event == "refund.processed":
        r = payload["refund"]["entity"]
        pay = one(conn, "select * from payments where provider_payment_id = :p for update", p=r["payment_id"])
        if not pay:
            return "ignored"
        refunded = pay["refunded_paise"] + r["amount"]
        if refunded > pay["amount_paise"]:
            fail("Refund exceeds captured amount.")
        run(conn, "update payments set refunded_paise = :r, status = :s where id = :id", r=refunded,
            s="refunded" if refunded == pay["amount_paise"] else "partially_refunded", id=pay["id"])
        run(conn, "update orders set refunded_paise = refunded_paise + :a where id = :id", a=r["amount"], id=pay["order_id"])
        audit(conn, None, "payment.refunded", "payment", pay["id"], None, {"refundId": r["id"], "amountPaise": r["amount"]})
        cn_number = (r.get("notes") or {}).get("credit_note")
        if cn_number:
            cn = one(conn, "select id, order_id, refund_status from credit_notes where number = :n", n=cn_number)
            if cn and cn["order_id"] == pay["order_id"] and cn["refund_status"] == "requested":
                run(conn, "update credit_notes set refund_status = 'processed', provider_refund_id = :r where id = :id", r=r["id"], id=cn["id"])
                audit(conn, None, "credit_note.refunded", "credit_note", cn["id"], {"refundStatus": "requested"},
                      {"refundStatus": "processed", "refundId": r["id"]})
        return "processed"
    return "ignored"
