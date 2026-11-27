"""Admin API: everything the HSP staff portals (Next.js /admin and the React admin app) read and do."""
from typing import Literal
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import Connection
from ..audit import audit
from ..auth import CurrentUser, require_roles, require_staff
from ..db import all_, get_conn, one
from ..errors import fail
from ..serialize import camel
from ..services import ai, campaigns, credit_notes, enquiries, exports, files, insights, orders as svc, partners, payouts
from ..services import courier as courier_svc, deposits, grievances, imports, plan, readiness, search, users, programmes, quotes, recipients, suppliers as sup, tally
from ..services.common import amount_due, net_paid
from ..services.ledger import latest_ledger
from ..services.pricing import advance_due

router = APIRouter(prefix="/api/admin", tags=["admin"])
ADMIN = require_roles("hsp_admin")
FINANCE = require_roles("hsp_admin", "hsp_finance")
OPS = require_roles("hsp_admin", "hsp_procurement")
OK = {"ok": True}


@router.get("/dashboard")
def dashboard(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel({
        "divisions": all_(conn, "select division::text as division, count(*)::int as n from products group by 1 order by 1"),
        "roles": all_(conn, "select role::text as role, count(*)::int as n from users group by 1 order by 1"),
        "orders": all_(conn, "select status::text as status, count(*)::int as n from orders group by 1 order by 1"),
        "enquiries": one(conn, "select count(*) filter (where status = 'new')::int as new from enquiries")["new"],
        "events": all_(conn, """select id::text, created_at, action, actor_role, entity, entity_id
                                from audit_events order by created_at desc limit 15"""),
    })


# ── Orders ──

@router.get("/orders")
def list_orders(status: str | None = None, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel(all_(conn, """select o.number, o.status::text as status, o.source, o.requires_artwork, o.total_paise, o.paid_paise,
                                     o.refunded_paise, o.credited_paise, o.created_at, c.name as customer, p.code as partner
                              from orders o join customers c on c.id = o.customer_id left join partners p on p.id = o.partner_id
                              where (cast(:s as text) is null or o.status::text = :s)
                              order by o.created_at desc limit 200""", s=status))


@router.get("/orders/{number}")
def order_detail(number: str, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    o = one(conn, """select o.*, o.status::text as status, c.name as customer, c.email as customer_email, c.phone as customer_phone,
                            p.code as partner
                     from orders o join customers c on c.id = o.customer_id left join partners p on p.id = o.partner_id
                     where o.number = :n""", n=number)
    if not o:
        raise HTTPException(404, "Order not found.")
    oid = o["id"]
    order = dict(o)
    order["amount_due_paise"] = amount_due(o)
    order["balance_paise"] = amount_due(o) - net_paid(o)
    order["advance_due_paise"] = advance_due(amount_due(o))
    return camel({
        "order": order,
        "lines": all_(conn, """select l.id::text, l.product_id, pr.sku, pr.name, l.quantity, l.credited_quantity,
                                      l.unit_price_paise, l.gst_rate_bps, l.personalisation is not null as personalised
                               from order_lines l join products pr on pr.id = l.product_id where l.order_id = :id order by pr.name""", id=oid),
        "parcel": courier_svc.parcel(all_(conn, """select l.quantity, p.weight_g, p.packing_kind, p.length_mm, p.breadth_mm, p.height_mm
                                                  from order_lines l join products p on p.id = l.product_id where l.order_id = :id""", id=oid)),
        "payments": all_(conn, """select id::text, provider_order_id, provider_payment_id, amount_paise, refunded_paise,
                                         status::text as status, created_at from payments where order_id = :id order by created_at desc""", id=oid),
        "purchaseOrders": all_(conn, """select po.id::text, po.number, po.status, po.total_cost_paise, s.name as supplier
                                        from purchase_orders po join suppliers s on s.id = po.supplier_id where po.order_id = :id""", id=oid),
        "shipments": all_(conn, """select id::text, courier, tracking_number, city, dispatched_at, delivered_at, delivery_proof_url,
                                          provider, tracking_status
                                   from shipments where order_id = :id order by tracking_number""", id=oid),
        "files": all_(conn, """select id::text, kind, filename, review_status, review_note, created_at from files
                               where entity = 'order' and entity_id = :id order by created_at desc""", id=str(oid)),
        "creditNotes": all_(conn, """select id::text, number, reason, taxable_paise, gst_paise, total_paise, refund_paise, status,
                                            refund_status, created_at from credit_notes where order_id = :id order by created_at desc""", id=oid),
        "recipients": all_(conn, """select city, count(*)::int as recipients, sum(quantity)::int as units from recipients
                                     where order_id = :id group by city order by min(ctid)""", id=oid),
        "commission": latest_ledger(conn, order_id=str(oid)),
        "suppliers": all_(conn, "select id::text, name, city from suppliers where status = 'approved' order by name"),
        "ranking": ai.rank_suppliers(conn, oid) if o["status"] == "production_approved" else [],
        "audit": all_(conn, """select created_at, action, actor_role from audit_events
                               where entity = 'order' and entity_id = :id order by created_at""", id=str(oid)),
    })


@router.post("/orders/{number}/steps")
def order_step(number: str, step: Literal["production", "po", "dispatch", "book_courier", "deliver", "close", "cancel"] = Form(...),
               supplierId: str = Form(""), courier: str = Form(""), tracking: str = Form(""), proof: str = Form(""),
               proofFile: UploadFile | None = File(None), user: CurrentUser = Depends(OPS), conn: Connection = Depends(get_conn, scope="function")):
    """Accepts form data (portal forms, with an optional POD scan) or the same fields as JSON-free form posts."""
    if step == "deliver" and proofFile is not None and proofFile.filename:
        data = proofFile.file.read(10 * 1024 * 1024 + 1)
        if data:
            proof = f"file:{files.upload_delivery_proof(conn, user, number, proofFile.filename, data)['id']}"
    result = {
        "production": lambda: svc.approve_production(conn, user, number),
        "po": lambda: svc.issue_purchase_order(conn, user, number, supplierId),
        "dispatch": lambda: svc.dispatch_order(conn, user, number, courier, tracking),
        "book_courier": lambda: courier_svc.book_and_dispatch(conn, user, number),
        "deliver": lambda: svc.mark_delivered(conn, user, number, proof),
        "close": lambda: svc.close_order(conn, user, number),
        "cancel": lambda: svc.cancel_order(conn, user, number),
    }[step]()
    return {"ok": True, "result": result}


class Review(BaseModel):
    decision: Literal["approved", "rejected"]
    note: str = ""


@router.post("/files/{file_id}/review")
def review_artwork(file_id: str, body: Review, user: CurrentUser = Depends(OPS), conn: Connection = Depends(get_conn, scope="function")):
    files.review_artwork(conn, user, file_id, body.decision, body.note)
    return OK


class CreditNoteIn(BaseModel):
    reason: str
    lines: list[dict] = []
    valuePaise: int | None = None
    refundPaise: int = 0


@router.post("/orders/{number}/credit-notes")
def create_credit_note(number: str, body: CreditNoteIn, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    lines = [{"orderLineId": str(l.get("orderLineId")), "quantity": l.get("quantity")} for l in body.lines
             if isinstance(l.get("quantity"), int) and l.get("quantity") > 0]
    cn = credit_notes.create_credit_note(conn, user, number, reason=body.reason, lines=lines,
                                         taxable_paise=None if lines else body.valuePaise, refund_paise=body.refundPaise)
    return cn


@router.post("/credit-notes/{cn}/{step}")
def credit_note_step(cn: str, step: Literal["approve", "void", "retry"], user: CurrentUser = Depends(FINANCE),
                     conn: Connection = Depends(get_conn, scope="function")):
    {"approve": credit_notes.approve_credit_note, "void": credit_notes.void_credit_note,
     "retry": credit_notes.retry_credit_note_refund}[step](conn, user, cn)
    return OK


class RecipientsIn(BaseModel):
    csv: str = Field(max_length=2_000_000)


@router.post("/orders/{number}/recipients")
def upload_recipients(number: str, body: RecipientsIn, user: CurrentUser = Depends(OPS), conn: Connection = Depends(get_conn, scope="function")):
    return recipients.upload_recipients(conn, user, number, body.csv)


# ── Quotes ──

@router.get("/quotes")
def list_quotes(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel(all_(conn, """select q.number, q.status::text as status, q.channel, q.total_paise, q.contribution_bps, q.below_minimum,
                                     q.valid_until, q.created_at, c.name as customer, p.code as partner
                              from quotations q join customers c on c.id = q.customer_id left join partners p on p.id = q.partner_id
                              order by q.created_at desc limit 200"""))


@router.get("/quotes/{number}")
def quote_detail(number: str, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    q = one(conn, """select q.*, q.status::text as status, c.name as customer, c.email as customer_email, c.gstin as customer_gstin,
                            p.code as partner, o.number as order_number
                     from quotations q join customers c on c.id = q.customer_id left join partners p on p.id = q.partner_id
                     left join orders o on o.quotation_id = q.id where q.number = :n""", n=number)
    if not q:
        raise HTTPException(404, "Quote not found.")
    lines = all_(conn, """select l.id::text, p.sku, p.name, l.quantity, l.unit_price_paise, l.unit_cost_paise, l.gst_rate_bps, l.branding
                          from quotation_lines l join products p on p.id = l.product_id where l.quotation_id = :id""", id=q["id"])
    return camel({"quote": q, "lines": lines})


class QuoteIn(BaseModel):
    customerName: str
    customerEmail: str
    kind: Literal["organisation", "individual"] = "organisation"
    gstin: str = ""
    lines: str
    freightPaise: int = 0


@router.post("/quotes")
def create_quote(body: QuoteIn, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    from ..services.common import is_email
    if not is_email(body.customerEmail):
        fail("Enter the customer's email.")
    if not body.customerName.strip():
        fail("Enter the customer's name.")
    q = quotes.create_quote(conn, user, customer={"name": body.customerName, "email": body.customerEmail, "kind": body.kind,
                                                  "gstin": body.gstin or None},
                            lines=quotes.parse_lines(body.lines), freight_paise=max(0, body.freightPaise))
    return {"number": q["number"]}


class Reason(BaseModel):
    reason: str = ""


@router.post("/quotes/{number}/approve-exception")
def approve_exception(number: str, body: Reason, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    quotes.approve_quote_exception(conn, user, number, body.reason)
    return OK


@router.post("/quotes/{number}/send")
def send_quote(number: str, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    quotes.send_quote(conn, user, number)
    return OK


@router.get("/assistant")
def assistant(q: str, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return ai.draft_quote(conn, q[:2000])


# ── Suppliers ──

@router.get("/suppliers")
def list_suppliers(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    rows = all_(conn, """select s.id::text, s.name, s.city, s.gstin, s.status::text as status, s.created_at, u.email as login_email
                         from suppliers s left join users u on u.id = s.user_id order by s.created_at desc""")
    rates = all_(conn, """select r.id::text, r.supplier_id::text, p.sku, p.name, r.cost_paise, r.lead_time_days, r.stock_quantity
                          from supplier_rates r join products p on p.id = r.product_id order by p.sku""")
    for s in rows:
        s["rates"] = [r for r in rates if r["supplier_id"] == s["id"]]
    return camel(rows)


class NewSupplier(BaseModel):
    name: str
    city: str = ""
    gstin: str = ""
    loginEmail: str = ""


@router.post("/suppliers")
def create_supplier(body: NewSupplier, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return sup.create_supplier(conn, user, body.name, body.city, body.gstin, body.loginEmail)


class SupplierStatus(BaseModel):
    status: Literal["approved", "suspended"]


@router.post("/suppliers/{supplier_id}/status")
def supplier_status(supplier_id: str, body: SupplierStatus, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    sup.set_supplier_status(conn, user, supplier_id, body.status)
    return OK


class SupplierRate(BaseModel):
    sku: str
    costPaise: int
    leadTimeDays: int = Field(default=7, ge=1, le=365)


@router.post("/suppliers/{supplier_id}/rates")
def supplier_rate(supplier_id: str, body: SupplierRate, user: CurrentUser = Depends(OPS), conn: Connection = Depends(get_conn, scope="function")):
    sup.set_supplier_rate(conn, user, supplier_id, body.sku, body.costPaise, body.leadTimeDays)
    return OK


# ── Partners ──

@router.get("/partners")
def list_partners(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    rows = all_(conn, """select p.id::text, p.code, p.type::text as type, p.status::text as status, p.city, p.state, p.pan, p.gstin,
                                p.bank_ifsc, p.bank_account_last4, p.agreement_version, p.kyc_verified_at, p.commission_bps,
                                p.service_fee_bps, p.security_deposit_paise, p.created_at, u.email, u.phone
                         from partners p join users u on u.id = p.user_id order by p.created_at desc""")
    totals: dict[str, dict] = {}
    for r in latest_ledger(conn):
        t = totals.setdefault(r["partner_id"], {k: 0 for k in ("pending", "earned", "approved", "paid", "reversed")})
        t[r["status"]] += r["amount_paise"] - r["deductions_paise"]
    for p in rows:
        p["ledger"] = totals.get(p["id"], {k: 0 for k in ("pending", "earned", "approved", "paid", "reversed")})
    contracts = all_(conn, """select ac.id::text, ac.status, ac.reference, ac.starts_at, ac.ends_at, ac.renewal_commission_bps,
                                     ac.ended_reason, c.name as customer, c.email, p.code as partner
                              from account_contracts ac join customers c on c.id = ac.customer_id join partners p on p.id = ac.partner_id
                              order by ac.created_at desc limit 100""")
    customers = all_(conn, """select id::text, name, email, is_national_key_account from customers where kind = 'organisation'
                              order by created_at desc limit 50""")
    return camel({"partners": rows, "contracts": contracts, "customers": customers,
                  "depositLiability": insights.deposit_liability(conn),
                  "settlements": deposits.list_settlements(conn)})


@router.post("/partners/{partner_id}/verify")
def verify_partner(partner_id: str, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    partners.verify_partner(conn, user, partner_id)
    return OK


class PartnerStatus(BaseModel):
    status: Literal["suspended", "active"]


@router.post("/partners/{partner_id}/status")
def partner_status(partner_id: str, body: PartnerStatus, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    partners.set_partner_status(conn, user, partner_id, body.status)
    return OK


class Deposit(BaseModel):
    depositPaise: int


@router.post("/partners/{partner_id}/deposit")
def deposit(partner_id: str, body: Deposit, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    partners.record_deposit(conn, user, partner_id, body.depositPaise)
    return OK


class DeductionIn(BaseModel):
    reason: str
    amountPaise: int


class SettlementIn(BaseModel):
    reason: str
    deductions: list[DeductionIn] = []


@router.post("/partners/{partner_id}/deposit-settlement")
def request_settlement(partner_id: str, body: SettlementIn, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    s = deposits.request_settlement(conn, user, partner_id, reason=body.reason, deductions=[d.model_dump() for d in body.deductions])
    return {"number": s["number"]}


class SettlementDecision(BaseModel):
    approve: bool
    payoutReference: str = ""


@router.post("/deposit-settlements/{settlement_id}/decide")
def decide_settlement(settlement_id: str, body: SettlementDecision, user: CurrentUser = Depends(FINANCE),
                      conn: Connection = Depends(get_conn, scope="function")):
    deposits.decide_settlement(conn, user, settlement_id, approve=body.approve, payout_reference=body.payoutReference)
    return OK


@router.post("/partners/{partner_id}/approve-commissions")
def approve_commissions(partner_id: str, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    return {"approved": partners.approve_commissions(conn, user, partner_id)}


class KeyAccount(BaseModel):
    on: bool


@router.post("/customers/{customer_id}/key-account")
def key_account(customer_id: str, body: KeyAccount, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    partners.flag_key_account(conn, user, customer_id, body.on)
    return OK


class ContractIn(BaseModel):
    customerEmail: str
    partnerCode: str
    months: int = 12
    renewalCommissionBps: int = 500  # default renewal rate: 5% (max 10%)
    reference: str = ""


@router.post("/contracts")
def create_contract(body: ContractIn, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    return partners.create_contract(conn, user, customer_email=body.customerEmail, partner_code=body.partnerCode, months=body.months,
                                    renewal_commission_bps=body.renewalCommissionBps, reference=body.reference)


@router.post("/contracts/{contract_id}/end")
def end_contract(contract_id: str, body: Reason, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    partners.end_contract(conn, user, contract_id, body.reason)
    return OK


# ── Payouts & finance ──

@router.get("/payouts")
def list_payouts(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    due: dict[str, int] = {}
    for r in latest_ledger(conn):
        if r["status"] == "approved" and not r["payout_id"]:
            due[r["partner_id"]] = due.get(r["partner_id"], 0) + r["amount_paise"] - r["deductions_paise"]
    active = all_(conn, "select id::text, code from partners where status = 'active' order by code")
    return camel({
        "tdsBps": payouts.tds_bps(),
        "due": [{"partner_id": p["id"], "code": p["code"], "amount_paise": due[p["id"]]} for p in active if due.get(p["id"], 0) > 0],
        "payouts": all_(conn, """select po.id::text, p.code, po.gross_paise, po.tds_paise, po.net_paise, po.bank_destination,
                                        po.transfer_reference, po.status::text as status, po.requested_by::text, po.created_at
                                 from payouts po join partners p on p.id = po.partner_id order by po.created_at desc"""),
    })


@router.post("/partners/{partner_id}/payouts")
def request_payout(partner_id: str, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    return payouts.request_payout(conn, user, partner_id)


@router.post("/payouts/{payout_id}/approve")
def approve_payout(payout_id: str, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    payouts.approve_payout(conn, user, payout_id)
    return OK


@router.get("/insights")
def get_insights(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel({
        "channels": insights.channel_economics(conn), "overdue": insights.overdue_orders(conn),
        "income": insights.associate_income_distribution(conn), "inactive": insights.inactive_partners(conn),
        "margin": insights.margin_exceptions(conn), "deposits": insights.deposit_liability(conn),
        "advances": insights.customer_advances(conn), "grievances": grievances.summary(conn),
        "forecast": insights.demand_forecast(conn), "franchises": insights.franchise_analytics(conn),
        "suppliers": insights.supplier_scorecard(conn),
        "alerts": ai.management_alerts(conn),
        "outbox": all_(conn, """select id::text, channel, recipient, template, category, status, reason, created_at
                                from notifications order by created_at desc limit 12"""),
    })


class Campaign(BaseModel):
    template: str = "festive.diwali"


@router.post("/campaigns")
def send_campaign(body: Campaign, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    return campaigns.send_campaign(conn, user, body.template.strip() or "festive.diwali")


@router.get("/exports/{kind}")
def export(kind: str, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    from datetime import date
    today = date.today().isoformat()
    if kind == "tally":
        if user.role not in ("hsp_admin", "hsp_finance"):
            raise HTTPException(403, "Forbidden")
        count, xml = tally.tally_vouchers_xml(conn)
        audit(conn, user, "export.download", "export", kind, None, {"rows": count})
        return Response(xml, media_type="application/xml; charset=utf-8",
                        headers={"content-disposition": f'attachment; filename="hsp-tally-vouchers-{today}.xml"'})
    res = exports.export_csv(conn, kind)
    if res is None:
        raise HTTPException(404, "Not found")
    count, csv = res
    audit(conn, user, "export.download", "export", kind, None, {"rows": count})
    return Response(csv, media_type="text/csv; charset=utf-8",
                    headers={"content-disposition": f'attachment; filename="hsp-{kind}-{today}.csv"'})


# ── Programmes ──

@router.get("/programmes")
def list_programmes(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel(all_(conn, """select p.id::text, p.name, p.occasion, p.next_date, p.lead_days, p.lines, p.active, c.name as customer,
                                     q.number as quote
                              from programmes p join customers c on c.id = p.customer_id
                              left join quotations q on q.id = p.last_quotation_id order by p.created_at desc"""))


class ProgrammeIn(BaseModel):
    customerName: str
    customerEmail: str
    name: str
    occasion: str = ""
    nextDate: str
    leadDays: int = 30
    lines: str


@router.post("/programmes")
def create_programme(body: ProgrammeIn, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    p = programmes.create_programme(conn, user, customer_name=body.customerName, customer_email=body.customerEmail, name=body.name,
                                    occasion=body.occasion, next_date=body.nextDate, lead_days=body.leadDays, lines=body.lines)
    return camel(p)


@router.post("/programmes/run")
def run_programmes(_: CurrentUser = Depends(ADMIN)):
    return {"raised": programmes.run_due_programmes()}


# ── Enquiries (storefront bulk quotes & contact) ──

@router.get("/enquiries")
def list_enquiries(status: str | None = None, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel(enquiries.list_enquiries(conn, status))


class EnquiryStatus(BaseModel):
    status: Literal["new", "in_review", "closed"]


@router.post("/enquiries/{enquiry_id}/status")
def enquiry_status(enquiry_id: str, body: EnquiryStatus, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    enquiries.set_enquiry_status(conn, user, enquiry_id, body.status)
    return OK


@router.post("/enquiries/{enquiry_id}/quote")
def enquiry_quote(enquiry_id: str, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    return enquiries.quote_from_enquiry(conn, user, enquiry_id)


# ── Catalogue & site content ──

from ..services import catalogue  # noqa: E402

CATALOGUE_EDIT = require_roles("hsp_admin", "hsp_procurement")


@router.get("/products")
def admin_products(q: str = "", category: str = "", status: str = "", limit: int = 50, offset: int = 0,
                   _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel(catalogue.list_products(conn, q, category, status, limit, offset))


@router.get("/products/{product_id}")
def admin_product(product_id: str, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    row = catalogue.get_product(conn, product_id)
    content = row.pop("content")
    return {**camel(row), "content": content}


@router.post("/products")
def create_product(body: dict, user: CurrentUser = Depends(CATALOGUE_EDIT), conn: Connection = Depends(get_conn, scope="function")):
    return {"id": catalogue.save_product(conn, user, body)["id"]}


@router.post("/products/{product_id}/media")
def upload_product_media(product_id: str, file: UploadFile = File(...), user: CurrentUser = Depends(CATALOGUE_EDIT),
                         conn: Connection = Depends(get_conn, scope="function")):
    return files.upload_product_media(conn, user, product_id, file.filename or "upload", file.file.read(files.MAX_MODEL_BYTES + 1))


@router.post("/products/{product_id}")
def update_product(product_id: str, body: dict, user: CurrentUser = Depends(CATALOGUE_EDIT), conn: Connection = Depends(get_conn, scope="function")):
    catalogue.save_product(conn, user, body, product_id)
    return OK


@router.get("/content")
def admin_content(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    content = catalogue.get_content(conn)
    content.pop("commerce", None)
    meta = {r["key"]: r for r in all_(conn, """select sc.key, sc.updated_at, u.email as updated_by from site_content sc
                                               left join users u on u.id = sc.updated_by""")}
    return {"content": content, "meta": camel(meta)}


@router.post("/content/{key}")
def save_content(key: str, body: dict, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    if "value" not in body:
        fail("Send the new value.")
    catalogue.save_content(conn, user, key, body["value"])
    return OK


# ── Customer grievances ──

@router.get("/grievances")
def list_grievances(status: str | None = None, _: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    rows = grievances.for_admin(conn, status or None)
    for g in rows:
        g["suppliers"] = all_(conn, """select distinct s.id::text, s.name from purchase_orders po join suppliers s on s.id = po.supplier_id
                                       join orders o on o.id = po.order_id where o.number = :n""", n=g["order_number"])
    return camel(rows)


class GrievanceIn(BaseModel):
    category: str
    description: str


@router.post("/orders/{number}/grievances")
def staff_raise_grievance(number: str, body: GrievanceIn, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return {"number": grievances.raise_grievance(conn, user, number, category=body.category, description=body.description)["number"]}


class AssignIn(BaseModel):
    supplierId: str


@router.post("/grievances/{number}/assign")
def assign_grievance(number: str, body: AssignIn, user: CurrentUser = Depends(OPS), conn: Connection = Depends(get_conn, scope="function")):
    grievances.assign_supplier(conn, user, number, body.supplierId)
    return OK


class ResolveIn(BaseModel):
    resolution: str
    creditNote: str = ""


@router.post("/grievances/{number}/resolve")
def resolve_grievance(number: str, body: ResolveIn, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    grievances.resolve(conn, user, number, body.resolution, body.creditNote)
    return OK


@router.post("/grievances/{number}/close")
def close_grievance(number: str, user: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    grievances.close(conn, user, number)
    return OK


@router.get("/search/status")
def search_status(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return search.status(conn)


@router.post("/search/reindex")
def search_reindex(_: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    return {"embedded": search.refresh_embeddings(conn)}


# ── Financial plan, scale readiness and data imports ──

@router.get("/plan")
def get_plan(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return camel(plan.get(conn))


class PlanIn(BaseModel):
    assumptions: dict


@router.post("/plan")
def save_plan(body: PlanIn, user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    return camel(plan.save(conn, user, body.assumptions))


@router.post("/plan/reset")
def reset_plan(user: CurrentUser = Depends(FINANCE), conn: Connection = Depends(get_conn, scope="function")):
    return camel(plan.reset(conn, user))


@router.get("/readiness")
def get_readiness(_: CurrentUser = Depends(require_staff), conn: Connection = Depends(get_conn, scope="function")):
    return readiness.summary(conn)


@router.get("/imports")
def list_imports(_: CurrentUser = Depends(require_staff)):
    return [{"kind": k, "columns": v["columns"], "help": v["help"], "roles": list(v["roles"])} for k, v in imports.KINDS.items()]


@router.get("/imports/{kind}/template")
def import_template(kind: str, _: CurrentUser = Depends(require_staff)):
    return Response(imports.template(kind), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{kind}-template.csv"'})


@router.post("/imports/{kind}")
def run_import(kind: str, file: UploadFile = File(...), apply: bool = Form(False), user: CurrentUser = Depends(require_staff),
               conn: Connection = Depends(get_conn, scope="function")):
    data = file.file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        fail("Files must be 5 MB or smaller.")
    return imports.run_import(conn, user, kind, data, dry_run=not apply)


# ── Staff users and roles ──

@router.get("/users")
def list_users(q: str = "", role: str = "", page: int = 1, _: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    return camel(users.list_users(conn, q=q, role=role, page=page))


class StaffIn(BaseModel):
    email: str
    name: str
    role: Literal["hsp_admin", "hsp_finance", "hsp_procurement"]


@router.post("/users")
def create_staff(body: StaffIn, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    return users.create_staff(conn, user, email=body.email, name=body.name, role=body.role)


class StaffUpdate(BaseModel):
    role: Literal["hsp_admin", "hsp_finance", "hsp_procurement"] | None = None
    active: bool | None = None


@router.post("/users/{user_id}")
def update_staff(user_id: str, body: StaffUpdate, user: CurrentUser = Depends(ADMIN), conn: Connection = Depends(get_conn, scope="function")):
    users.update_staff(conn, user, user_id, role=body.role, active=body.active)
    return OK
