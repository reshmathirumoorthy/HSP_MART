"""Franchise security-deposit settlement (Blueprint §2): refund follows documented settlement, damage,
deduction and termination rules. Maker-checker; the deposit is a liability until approval releases it."""
import json
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import FINANCE, doc_number, is_uuid


def request_settlement(conn: Connection, actor, partner_id: str, *, reason: str, deductions: list[dict]):
    if actor.role not in FINANCE:
        fail("Only admin or finance can settle deposits.")
    if len(reason.strip()) < 10:
        fail("Give a reason of at least 10 characters.")
    if not is_uuid(partner_id):
        fail("Partner not found.")
    p = one(conn, "select *, status::text as status, type::text as type from partners where id = :id for update",
            id=partner_id) or fail("Partner not found.")
    if p["type"] != "franchise" or p["security_deposit_paise"] <= 0:
        fail("This partner holds no security deposit.")
    if p["status"] == "active":
        fail("Suspend the franchise before settling its deposit.")
    if one(conn, "select 1 as x from deposit_settlements where partner_id = :id and status = 'pending'", id=partner_id):
        fail("A settlement is already awaiting approval.")
    clean = []
    for d in deductions or []:
        amt, why = d.get("amountPaise"), str(d.get("reason", "")).strip()
        if not isinstance(amt, int) or amt <= 0:
            fail("Each deduction needs a positive amount.")
        if len(why) < 5:
            fail("Each deduction needs a documented reason.")
        clean.append({"reason": why, "amountPaise": amt})
    deducted = sum(d["amountPaise"] for d in clean)
    deposit = int(p["security_deposit_paise"])
    if deducted > deposit:
        fail("Deductions cannot exceed the deposit held.")
    s = one(conn, """insert into deposit_settlements (number, partner_id, deposit_paise, deductions, deduction_paise,
                         refund_paise, reason, requested_by)
                     values (:n, :p, :d, cast(:ded as jsonb), :dp, :rp, :r, cast(:u as uuid)) returning id::text, number""",
            n=doc_number("DS"), p=partner_id, d=deposit, ded=json.dumps(clean), dp=deducted, rp=deposit - deducted,
            r=reason.strip(), u=actor.id)
    audit(conn, actor, "deposit.settlement_requested", "deposit_settlement", s["id"], None,
          {"partner": p["code"], "depositPaise": deposit, "deductionPaise": deducted, "refundPaise": deposit - deducted})
    return s


def decide_settlement(conn: Connection, actor, settlement_id: str, *, approve: bool, payout_reference: str = ""):
    if actor.role not in FINANCE:
        fail("Only admin or finance can approve settlements.")
    if not is_uuid(settlement_id):
        fail("Settlement not found.")
    s = one(conn, "select * from deposit_settlements where id = :id for update", id=settlement_id) or fail("Settlement not found.")
    if s["status"] != "pending":
        fail("This settlement has already been decided.")
    if str(s["requested_by"]) == actor.id:
        fail("A different finance user must approve this settlement.")
    p = one(conn, "select * from partners where id = :id for update", id=s["partner_id"])
    if approve:
        if int(p["security_deposit_paise"]) != int(s["deposit_paise"]):
            fail("The deposit changed after this settlement was raised. Reject it and raise a new one.")
        if s["refund_paise"] > 0 and not payout_reference.strip():
            fail("Enter the bank transfer reference for the refund.")
        run(conn, """update deposit_settlements set status = 'approved', decided_by = cast(:u as uuid), decided_at = now(),
                         payout_reference = :ref where id = :id""", u=actor.id, ref=payout_reference.strip() or None, id=s["id"])
        run(conn, "update partners set security_deposit_paise = 0, status = 'terminated', updated_at = now() where id = :id", id=p["id"])
        audit(conn, actor, "deposit.settled", "deposit_settlement", s["id"], {"depositPaise": s["deposit_paise"]},
              {"refundPaise": s["refund_paise"], "deductionPaise": s["deduction_paise"], "reference": payout_reference.strip(),
               "accounting": "liability released; deductions recognised against documented claims", "partnerStatus": "terminated"})
    else:
        run(conn, """update deposit_settlements set status = 'rejected', decided_by = cast(:u as uuid), decided_at = now()
                     where id = :id""", u=actor.id, id=s["id"])
        audit(conn, actor, "deposit.settlement_rejected", "deposit_settlement", s["id"], {"status": "pending"}, {"status": "rejected"})


def list_settlements(conn: Connection):
    return all_(conn, """select s.id::text, s.number, s.status, s.deposit_paise, s.deductions, s.deduction_paise, s.refund_paise,
                                s.reason, s.payout_reference, s.created_at, s.decided_at, s.requested_by::text,
                                p.id::text as partner_id, p.code as partner_code, p.city
                         from deposit_settlements s join partners p on p.id = s.partner_id order by s.created_at desc""")
