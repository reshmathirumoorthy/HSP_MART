"""Partner network: onboarding & KYC, lead attribution (90-day protection), contracts, commission ledger."""
import secrets
from datetime import datetime, timedelta, timezone
from .dateutil_shim import add_months
from sqlalchemy import Connection
from ..audit import audit
from ..config import settings
from ..db import all_, one, run
from ..errors import fail
from .common import FINANCE, is_email, is_uuid, partner_for_user, upsert_customer
from .ledger import append_ledger, latest_ledger

AGREEMENT_VERSION = "HSP-PA-2026.1"
LEAD_PROTECTION_DAYS = 90
DEFAULT_COMMISSION_BPS = 1000
FRANCHISE_SERVICE_FEE_BPS = 200
ROLE_FOR = {"associate": "associate", "franchise": "franchise", "enterprise": "enterprise_partner"}


def return_window_days() -> int:
    return int(settings().return_window_days)


def apply_as_partner(conn: Connection, user, *, type: str, city: str, state: str, pan: str, ifsc: str,
                     account_last4: str, gstin: str = "", accept_agreement: bool):
    import re
    if partner_for_user(conn, user.id):
        fail("You have already applied.")
    if not accept_agreement:
        fail("You must accept the partner agreement.")
    pan, ifsc = pan.strip().upper(), ifsc.strip().upper()
    if not re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", pan):
        fail("Enter a valid PAN (e.g. ABCDE1234F).")
    if not re.fullmatch(r"[A-Z]{4}0[A-Z0-9]{6}", ifsc):
        fail("Enter a valid IFSC code.")
    if not re.fullmatch(r"\d{4}", account_last4.strip()):
        fail("Enter the last 4 digits of your bank account.")
    if not city.strip():
        fail("City is required.")
    type = "franchise" if type == "franchise" else "associate"
    code = f"HSP-{'F' if type == 'franchise' else 'A'}-{secrets.token_hex(3).upper()}"
    p = one(conn, """insert into partners (user_id, code, type, status, city, state, pan, gstin, bank_ifsc,
                         bank_account_last4, agreement_version, agreement_accepted_at, commission_bps, service_fee_bps)
                     values (cast(:u as uuid), :code, :t, 'kyc_pending', :city, :state, :pan, :gstin, :ifsc, :l4, :av,
                             now(), :cb, :sf) returning id::text, code, type::text as type""",
            u=user.id, code=code, t=type, city=city.strip(), state=state.strip() or None, pan=pan,
            gstin=gstin.strip().upper() or None, ifsc=ifsc, l4=account_last4.strip(), av=AGREEMENT_VERSION,
            cb=DEFAULT_COMMISSION_BPS, sf=FRANCHISE_SERVICE_FEE_BPS if type == "franchise" else 0)
    audit(conn, user, "partner.apply", "partner", p["id"], None, {"type": p["type"], "code": p["code"], "agreement": AGREEMENT_VERSION})
    return p


def _partner(conn, partner_id, lock=False):
    if not is_uuid(partner_id):
        return None
    return one(conn, f"select * from partners where id = :id {'for update' if lock else ''}", id=partner_id)


def verify_partner(conn: Connection, actor, partner_id: str):
    if actor.role not in FINANCE:
        fail("Only admin or finance can verify KYC.")
    p = _partner(conn, partner_id, lock=True) or fail("Partner not found.")
    if p["status"] != "kyc_pending":
        fail("Partner is not awaiting KYC.")
    role = ROLE_FOR[p["type"]]
    run(conn, "update partners set status = 'active', kyc_verified_at = now() where id = :id", id=p["id"])
    run(conn, "update users set role = :r where id = :u", r=role, u=p["user_id"])
    audit(conn, actor, "partner.kyc_verified", "partner", p["id"], {"status": p["status"]}, {"status": "active", "role": role})


def set_partner_status(conn: Connection, actor, partner_id: str, status: str):
    if actor.role != "hsp_admin":
        fail("Only admin can change partner status.")
    if status not in ("suspended", "active"):
        fail("Unknown status.")
    p = _partner(conn, partner_id)
    if not p or not p["kyc_verified_at"]:
        fail("Partner not found or not verified.")
    run(conn, "update partners set status = :s where id = :id", s=status, id=p["id"])
    audit(conn, actor, f"partner.{status}", "partner", partner_id, {"status": p["status"]}, {"status": status})


def record_deposit(conn: Connection, actor, partner_id: str, amount_paise: int):
    """Franchise security deposits are a refundable liability, never revenue."""
    if actor.role not in FINANCE:
        fail("Only finance can record deposits.")
    if amount_paise < 0:
        fail("Invalid deposit amount.")
    p = _partner(conn, partner_id) or fail("Partner not found.")
    if p["type"] != "franchise":
        fail("Deposits apply to city franchises only.")
    run(conn, "update partners set security_deposit_paise = :a where id = :id", a=amount_paise, id=p["id"])
    audit(conn, actor, "partner.deposit_recorded", "partner", partner_id, {"depositPaise": p["security_deposit_paise"]},
          {"depositPaise": amount_paise, "accounting": "liability"})


# ── Leads & attribution ──

def active_lead_for(conn: Connection, customer_id):
    return one(conn, """select l.id as lead_id, l.protection_expires_at, l.status::text as lead_status,
                               p.id::text as partner_id, p.status::text as partner_status, p.type::text as partner_type,
                               p.commission_bps, p.service_fee_bps
                        from leads l join partners p on p.id = l.partner_id
                        where l.customer_id = :c and l.protection_expires_at > now()
                          and l.status in ('registered','qualified','converted')
                        order by l.created_at desc limit 1""", c=customer_id)


def register_lead(conn: Connection, user, *, name: str, email: str, kind: str, source: str = ""):
    partner = partner_for_user(conn, user.id)
    if not partner or partner["status"] != "active":
        fail("Your partner account is not active.")
    if not is_email(email):
        fail("Enter the customer's email.")
    if not name.strip():
        fail("Enter the customer's name.")
    # Serialise registrations for the same customer so two partners cannot race.
    run(conn, "select pg_advisory_xact_lock(hashtext(:e))", e=email.strip().lower())
    customer = upsert_customer(conn, name=name, email=email, kind="individual" if kind == "individual" else "organisation")
    if customer["is_national_key_account"]:
        fail("This is an HSP national key account and cannot be registered as a lead.")
    for c in all_(conn, "select id from customers where dedupe_key = :d", d=customer["dedupe_key"]):
        existing = active_lead_for(conn, c["id"])
        if existing:
            if existing["partner_id"] == str(partner["id"]):
                fail("You have already registered this customer.")
            fail(f"This customer is protected by another partner until {existing['protection_expires_at'].strftime('%d/%m/%Y')}.")
    lead = one(conn, """insert into leads (customer_id, partner_id, source, protection_expires_at)
                        values (:c, :p, :s, now() + make_interval(days => :d)) returning id::text""",
               c=customer["id"], p=partner["id"], s=source or None, d=LEAD_PROTECTION_DAYS)
    audit(conn, user, "lead.register", "lead", lead["id"], None, {"customer": customer["email"], "partner": partner["code"]})
    return lead


def active_contract_for(conn: Connection, customer_id):
    return one(conn, """select ac.id::text, ac.renewal_commission_bps, p.id::text as partner_id,
                               p.status::text as partner_status, p.type::text as partner_type
                        from account_contracts ac join partners p on p.id = ac.partner_id
                        where ac.customer_id = :c and ac.status = 'active' and ac.starts_at <= now() and ac.ends_at > now()
                        order by ac.created_at desc limit 1""", c=customer_id)


def attribution_for(conn: Connection, customer_id) -> dict:
    """One partner per order: protected lead → active contract → direct. Inactive partners earn nothing."""
    lead = active_lead_for(conn, customer_id)
    if lead:
        if lead["partner_status"] == "active":
            ch = lead["partner_type"]
            return {"partner_id": lead["partner_id"], "channel": ch, "basis": "lead", "lead_partner_id": lead["partner_id"],
                    "partner": {"commission_bps": lead["commission_bps"],
                                "service_fee_bps": lead["service_fee_bps"] if ch == "franchise" else 0}}
        return {"partner_id": None, "channel": "direct", "partner": None, "basis": "direct", "lead_partner_id": lead["partner_id"]}
    c = active_contract_for(conn, customer_id)
    if c and c["partner_status"] == "active":
        # Renewal rate replaces acquisition commission; no franchise service fee on renewals.
        return {"partner_id": c["partner_id"], "channel": c["partner_type"], "basis": "contract",
                "lead_partner_id": c["partner_id"],
                "partner": {"commission_bps": c["renewal_commission_bps"], "service_fee_bps": 0}}
    return {"partner_id": None, "channel": "direct", "partner": None, "basis": "direct", "lead_partner_id": None}


def create_contract(conn: Connection, actor, *, customer_email: str, partner_code: str, months: int,
                    renewal_commission_bps: int, reference: str = ""):
    if actor.role not in FINANCE:
        fail("Only admin or finance can record contracts.")
    if not 1 <= months <= 36:
        fail("Contract term must be 1–36 months.")
    if not 0 <= renewal_commission_bps <= DEFAULT_COMMISSION_BPS:
        fail("Renewal commission must be between 0% and 10%.")
    c = one(conn, "select * from customers where email = :e", e=customer_email.strip().lower()) or fail("Customer not found.")
    if c["is_national_key_account"]:
        fail("National key accounts are managed by HSP and cannot carry partner renewal rights.")
    p = one(conn, "select * from partners where code = :c", c=partner_code.strip().upper())
    if not p or p["status"] != "active":
        fail("Partner not found or not active.")
    if not one(conn, "select id from leads where customer_id = :c and partner_id = :p and status = 'converted' limit 1",
               c=c["id"], p=p["id"]):
        fail("Renewal rights need a converted lead from this partner for this customer.")
    run(conn, "select pg_advisory_xact_lock(hashtext(:k))", k=f"contract:{c['id']}")
    if active_contract_for(conn, c["id"]):
        fail("This customer already has an active contract.")
    starts = datetime.now(timezone.utc)
    ends = add_months(starts, months)
    row = one(conn, """insert into account_contracts (customer_id, partner_id, reference, starts_at, ends_at,
                           renewal_commission_bps, created_by)
                       values (:c, :p, :r, :s, :e, :b, cast(:u as uuid)) returning id::text""",
              c=c["id"], p=p["id"], r=reference.strip() or None, s=starts, e=ends, b=renewal_commission_bps, u=actor.id)
    audit(conn, actor, "contract.create", "account_contract", row["id"], None,
          {"customer": c["email"], "partner": p["code"], "endsAt": ends.isoformat(), "renewalCommissionBps": renewal_commission_bps})
    return row


def end_contract(conn: Connection, actor, contract_id: str, reason: str):
    if actor.role not in FINANCE:
        fail("Only admin or finance can end contracts.")
    if len(reason.strip()) < 10:
        fail("Give a reason of at least 10 characters.")
    c = one(conn, "select status from account_contracts where id = :id", id=contract_id) if is_uuid(contract_id) else None
    if not c or c["status"] != "active":
        fail("Contract not found or already ended.")
    run(conn, "update account_contracts set status = 'ended', ended_reason = :r where id = :id", r=reason.strip(), id=contract_id)
    audit(conn, actor, "contract.end", "account_contract", contract_id, {"status": "active"}, {"status": "ended", "reason": reason.strip()})


def flag_key_account(conn: Connection, actor, customer_id: str, on: bool):
    if actor.role != "hsp_admin":
        fail("Only admin can flag national key accounts.")
    if not is_uuid(customer_id):
        fail("Customer not found.")
    run(conn, "update customers set is_national_key_account = :on where id = :id", on=on, id=customer_id)
    audit(conn, actor, "customer.key_account", "customer", customer_id, None, {"isNationalKeyAccount": on})


# ── Commission ledger ──

def accrue_commission(conn: Connection, order, rate_bps: int):
    if not order["partner_id"] or rate_bps <= 0:
        return
    from .pricing import pct
    run(conn, """insert into commission_ledger (partner_id, order_id, rate_bps, eligible_base_paise, amount_paise, status, note)
                 values (:p, :o, :r, :b, :a, 'pending', 'Order confirmed')""",
        p=order["partner_id"], o=order["id"], r=rate_bps, b=order["subtotal_paise"], a=pct(order["subtotal_paise"], rate_bps))


def adjust_commission_for_credit(conn: Connection, order):
    """A credit note approved after commission was earned adjusts the deduction; if already paid, flag a clawback."""
    from .pricing import pct
    rows = latest_ledger(conn, order_id=str(order["id"]))
    if not rows or rows[0]["status"] in ("pending", "reversed"):
        return None
    cur = rows[0]
    deductions = pct(min(order["credited_taxable_paise"], cur["eligible_base_paise"]), cur["rate_bps"])
    if deductions == cur["deductions_paise"]:
        return None
    if cur["status"] == "paid":
        audit(conn, None, "commission.clawback_required", "commission", cur["id"], {"deductionsPaise": cur["deductions_paise"]},
              {"deductionsPaise": deductions, "partnerId": cur["partner_id"]})
        return "clawback"
    append_ledger(conn, cur, cur["status"], "Adjusted for credit note", deductions=deductions)
    return "adjusted"


def approve_commissions(conn: Connection, actor, partner_id: str) -> int:
    """Earned → Approved once the returns window has passed and partner KYC is verified."""
    if actor.role not in FINANCE:
        fail("Only finance can approve commissions.")
    p = _partner(conn, partner_id)
    if not p or not p["kyc_verified_at"]:
        fail("Partner KYC is not verified.")
    cutoff = datetime.now(timezone.utc) - timedelta(days=return_window_days())
    n = 0
    for e in latest_ledger(conn, partner_id=partner_id):
        if e["status"] != "earned":
            continue
        o = one(conn, "select delivered_at from orders where id = cast(:id as uuid)", id=e["order_id"])
        if not o or not o["delivered_at"] or o["delivered_at"] > cutoff:
            continue
        append_ledger(conn, e, "approved", f"Approved by {actor.role}")
        n += 1
    audit(conn, actor, "commission.approve", "partner", partner_id, None, {"approved": n})
    return n


def ledger_totals(conn: Connection, partner_id: str):
    rows = latest_ledger(conn, partner_id=partner_id)
    totals = {k: 0 for k in ("pending", "earned", "approved", "paid", "reversed")}
    for r in rows:
        totals[r["status"]] += r["amount_paise"] - r["deductions_paise"]
    return totals, rows
