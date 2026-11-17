"""Partner payouts: approved commission → maker-checker payout, TDS withheld, idempotent transfer."""
import hashlib
from sqlalchemy import Connection
from ..audit import audit
from ..config import settings
from ..db import engine, one, run
from ..errors import fail
from ..notify import notify
from .common import FINANCE, is_uuid
from .ledger import append_ledger, latest_ledger
from .pricing import pct


def tds_bps() -> int:
    return settings().commission_tds_bps


def request_payout(conn: Connection, actor, partner_id: str):
    if actor.role not in FINANCE:
        fail("Only finance can raise payouts.")
    p = one(conn, "select * from partners where id = :id for update", id=partner_id) if is_uuid(partner_id) else None
    if not p:
        fail("Partner not found.")
    if p["status"] != "active" or not p["kyc_verified_at"]:
        fail("Partner must be active with verified KYC and bank details.")
    due = [r for r in latest_ledger(conn, partner_id=partner_id) if r["status"] == "approved" and not r["payout_id"]]
    if not due:
        fail("No approved commission awaiting payout.")
    gross = sum(r["amount_paise"] - r["deductions_paise"] for r in due)
    if gross <= 0:
        fail("Nothing payable after deductions.")
    tds = pct(gross, tds_bps())
    key = hashlib.sha256(f"{partner_id}:{','.join(sorted(r['id'] for r in due))}".encode()).hexdigest()
    payout = one(conn, """insert into payouts (partner_id, gross_paise, tds_paise, net_paise, bank_destination,
                              idempotency_key, requested_by)
                          values (:p, :g, :t, :n, :b, :k, cast(:u as uuid))
                          on conflict (idempotency_key) do nothing returning id::text""",
                 p=p["id"], g=gross, t=tds, n=gross - tds, b=f"{p['bank_ifsc']} ··{p['bank_account_last4']}", k=key, u=actor.id)
    if not payout:
        fail("A payout for these commissions already exists.")
    for r in due:
        append_ledger(conn, r, "approved", "Reserved for payout", payout_id=payout["id"])
    audit(conn, actor, "payout.request", "payout", payout["id"], None, {"gross": gross, "tds": tds, "net": gross - tds, "entries": len(due)})
    return payout


def _transfer(payout) -> str:
    s = settings()
    if s.razorpayx_account_number and s.razorpay_key_id:
        fail("RazorpayX live payouts require fund-account onboarding; configure before enabling.")
    if s.production:
        fail("Payout provider not configured.")
    return f"pout_sim_{payout['idempotency_key'][:14]}"


def approve_payout(conn: Connection, actor, payout_id: str):
    """Maker-checker: a different finance/admin user must approve; then the transfer runs once."""
    if actor.role not in FINANCE:
        fail("Only finance can approve payouts.")
    po = one(conn, "select * from payouts where id = :id for update", id=payout_id) if is_uuid(payout_id) else None
    if not po:
        fail("Payout not found.")
    if po["status"] != "requested":
        fail("Payout is not awaiting approval.")
    if str(po["requested_by"]) == actor.id:
        fail("The person who raised a payout cannot approve it.")
    run(conn, "update payouts set status = 'processing', approved_by = cast(:u as uuid) where id = :id", u=actor.id, id=payout_id)
    audit(conn, actor, "payout.approve", "payout", payout_id, {"status": "requested"}, {"status": "processing"})
    conn.commit()
    try:
        reference = _transfer(po)
    except Exception as e:
        with engine().begin() as c2:
            run(c2, "update payouts set status = 'failed' where id = :id", id=payout_id)
            audit(c2, actor, "payout.failed", "payout", payout_id, None, {"error": str(e)})
        raise
    run(conn, "update payouts set status = 'processed', transfer_reference = :r where id = :id", r=reference, id=payout_id)
    reserved = [r for r in latest_ledger(conn, partner_id=str(po["partner_id"])) if r["payout_id"] == payout_id]
    for r in reserved:
        append_ledger(conn, r, "paid", f"Paid · {reference}", payout_id=payout_id)
    audit(conn, actor, "payout.processed", "payout", payout_id, None, {"reference": reference, "entries": len(reserved)})
    u = one(conn, "select u.email from partners p join users u on u.id = p.user_id where p.id = :id", id=po["partner_id"])
    if u and u["email"]:
        notify(conn, channel="email", recipient=u["email"], template="payout.processed",
               payload={"netPaise": po["net_paise"], "tdsPaise": po["tds_paise"], "reference": reference})
