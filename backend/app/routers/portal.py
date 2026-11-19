"""Customer (/my), partner (/partner, /join) and supplier (/supplier) portal APIs."""
from typing import Literal
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import Connection
from ..auth import PARTNER_ROLES, CurrentUser, require_roles, require_user
from ..db import all_, get_conn, one
from ..errors import fail
from ..serialize import camel
from ..services import ai, files, grievances, partners, payments, quotes, suppliers as sup
from ..services.common import amount_due, customer_owns, is_uuid, net_paid, partner_for_user, supplier_for_user
from ..services.pricing import advance_due
from ..services.razorpay import live as razorpay_live

router = APIRouter(prefix="/api", tags=["portals"])
PARTNER = require_roles(*PARTNER_ROLES)
SUPPLIER = require_roles("supplier")
OK = {"ok": True}


# ── Customer: quotes and orders ──

@router.get("/my/quotes/{number}")
def my_quote(number: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    q = one(conn, "select *, status::text as status from quotations where number = :n", n=number)
    if not q or q["status"] not in ("sent", "accepted", "expired") or not customer_owns(conn, user, q["customer_id"]):
        raise HTTPException(404, "Quote not found.")
    lines = all_(conn, """select l.id::text, p.name, p.sku, l.quantity, l.unit_price_paise, l.gst_rate_bps, l.branding
                          from quotation_lines l join products p on p.id = l.product_id where l.quotation_id = :id""", id=q["id"])
    order = one(conn, "select number from orders where quotation_id = :id", id=q["id"])
    q = {k: v for k, v in q.items() if k not in ("commission_paise", "contribution_bps", "below_minimum", "exception_reason", "created_by", "approved_by")}
    q["advance_due_paise"] = advance_due(q["total_paise"])
    q["order_number"] = order["number"] if order else None
    return camel({"quote": q, "lines": lines})


@router.post("/my/quotes/{number}/accept")
def accept(number: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return {"orderNumber": quotes.accept_quote(conn, user, number)["number"]}


@router.get("/my/orders/{number}")
def my_order(number: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    o = one(conn, "select *, status::text as status from orders where number = :n", n=number)
    if not o or not customer_owns(conn, user, o["customer_id"]):
        raise HTTPException(404, "Order not found.")
    pending = one(conn, """select provider_order_id, amount_paise from payments where order_id = :id and status = 'created'
                           order by created_at desc limit 1""", id=o["id"])
    order = {k: v for k, v in o.items() if k not in ("partner_id",)}
    order["amount_due_paise"] = amount_due(o)
    order["advance_due_paise"] = advance_due(amount_due(o))
    order["net_paid_paise"] = net_paid(o)
    order["balance_paise"] = amount_due(o) - net_paid(o)
    return camel({
        "order": order, "pending": pending, "razorpayLive": razorpay_live(),
        "lines": all_(conn, """select l.id::text, p.name, p.sku, l.quantity, l.credited_quantity, l.unit_price_paise, l.gst_rate_bps,
                                      l.personalisation is not null as personalised
                               from order_lines l join products p on p.id = l.product_id where l.order_id = :id order by p.name""", id=o["id"]),
        "creditNotes": all_(conn, """select number, reason, total_paise, refund_paise, refund_status, created_at from credit_notes
                                     where order_id = :id and status = 'approved' order by created_at""", id=o["id"]),
        "files": all_(conn, """select id::text, kind, filename, review_status, review_note, created_at from files
                               where entity = 'order' and entity_id = :id order by created_at desc""", id=str(o["id"])),
        "shipments": all_(conn, """select courier, tracking_number, city, dispatched_at, delivered_at from shipments
                                   where order_id = :id order by tracking_number""", id=o["id"]),
        "grievances": [{k: g[k] for k in ("number", "category", "description", "status", "resolution", "due_at", "created_at")}
                       for g in grievances.for_order(conn, o["id"])],
        "grievanceCategories": list(grievances.CATEGORIES),
    })


class GrievanceIn(BaseModel):
    category: str
    description: str


@router.post("/my/orders/{number}/grievances")
def raise_grievance(number: str, body: GrievanceIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return {"number": grievances.raise_grievance(conn, user, number, category=body.category, description=body.description)["number"]}


class PayIn(BaseModel):
    kind: Literal["advance", "balance"]


@router.post("/my/orders/{number}/pay")
def pay(number: str, body: PayIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    payments.start_payment(conn, user, number, body.kind)
    return OK


@router.post("/my/orders/{number}/artwork")
def upload_artwork(number: str, file: UploadFile = File(...), user: CurrentUser = Depends(require_user),
                   conn: Connection = Depends(get_conn)):
    data = file.file.read(10 * 1024 * 1024 + 1)
    return files.upload_artwork(conn, user, number, file.filename or "upload", data)


# ── Partner onboarding & portal ──

@router.get("/partner/me")
def partner_me(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    p = partner_for_user(conn, user.id)
    return camel({"partner": {k: p[k] for k in ("id", "code", "type", "status", "city", "commission_bps", "service_fee_bps")} if p else None,
                  "agreementVersion": partners.AGREEMENT_VERSION})


class ApplyIn(BaseModel):
    type: Literal["associate", "franchise"] = "associate"
    city: str = ""
    state: str = ""
    pan: str = ""
    ifsc: str = ""
    accountLast4: str = ""
    gstin: str = ""
    acceptAgreement: bool = False


@router.post("/partner/apply")
def apply(body: ApplyIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return partners.apply_as_partner(conn, user, type=body.type, city=body.city, state=body.state, pan=body.pan, ifsc=body.ifsc,
                                     account_last4=body.accountLast4, gstin=body.gstin, accept_agreement=body.acceptAgreement)


def _my_partner(conn, user):
    return partner_for_user(conn, user.id)


@router.get("/partner/dashboard")
def partner_dashboard(user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user)
    if not p:
        return {"partner": None}
    totals, rows = partners.ledger_totals(conn, str(p["id"]))
    numbers = {r["id"]: r["number"] for r in all_(conn, "select id::text, number from orders where id = any(cast(:ids as uuid[]))",
                                                  ids=[r["order_id"] for r in rows])} if rows else {}
    for r in rows:
        r["order_number"] = numbers.get(r["order_id"])
    return camel({"partner": {k: p[k] for k in ("id", "code", "type", "status", "city", "commission_bps", "service_fee_bps")},
                  "totals": totals, "rows": rows,
                  "leads": one(conn, "select count(*)::int as n from leads where partner_id = :p", p=p["id"])["n"]})


@router.get("/partner/leads")
def partner_leads(user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user)
    if not p:
        return {"partner": None, "leads": []}
    return camel({"partner": {"code": p["code"], "status": p["status"]},
                  "leads": all_(conn, """select l.id::text, l.status::text as status, l.source, l.protection_expires_at, l.created_at,
                                                c.id::text as customer_id, c.name, c.email, c.kind
                                         from leads l join customers c on c.id = l.customer_id
                                         where l.partner_id = :p order by l.created_at desc""", p=p["id"])})


class LeadIn(BaseModel):
    name: str
    email: str
    kind: Literal["organisation", "individual"] = "organisation"
    source: str = ""


@router.post("/partner/leads")
def register_lead(body: LeadIn, user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    return partners.register_lead(conn, user, name=body.name, email=body.email, kind=body.kind, source=body.source)


@router.get("/partner/quotes")
def partner_quotes(user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user)
    if not p:
        return {"partner": None, "leads": [], "quotes": []}
    return camel({
        "partner": {"code": p["code"], "status": p["status"]},
        "leads": all_(conn, """select c.id::text, c.name from leads l join customers c on c.id = l.customer_id
                               where l.partner_id = :p and l.protection_expires_at > now()""", p=p["id"]),
        "quotes": all_(conn, """select q.number, q.status::text as status, q.total_paise, q.commission_paise, q.valid_until, q.created_at,
                                       c.name as customer
                                from quotations q join customers c on c.id = q.customer_id
                                where q.partner_id = :p order by q.created_at desc""", p=p["id"]),
    })


class PartnerQuoteIn(BaseModel):
    customerId: str
    lines: str


@router.post("/partner/quotes")
def partner_quote(body: PartnerQuoteIn, user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user) or fail("No partner profile.")
    c = one(conn, "select * from customers where id = cast(:id as uuid)", id=body.customerId) if is_uuid(body.customerId) else None
    if not c:
        fail("Choose one of your leads.")
    q = quotes.create_quote(conn, user, customer={"name": c["name"], "email": c["email"], "kind": c["kind"]},
                            lines=quotes.parse_lines(body.lines, allow_price=False), partner_id=str(p["id"]))
    return {"number": q["number"]}


@router.post("/partner/quotes/{number}/send")
def partner_send(number: str, user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user)
    q = one(conn, "select partner_id from quotations where number = :n", n=number)
    if not q or not p or q["partner_id"] != p["id"]:
        fail("Quote not found.")
    quotes.send_quote(conn, user, number)
    return OK


@router.get("/partner/coach")
def partner_coach(user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user)
    return ai.sales_coach(conn, str(p["id"])) if p else {"followUps": [], "upcoming": [], "messages": {"en": "", "hi": ""}}


# ── Supplier portal ──

@router.get("/supplier/dashboard")
def supplier_dashboard(user: CurrentUser = Depends(SUPPLIER), conn: Connection = Depends(get_conn)):
    s = supplier_for_user(conn, user.id)
    if not s:
        return {"supplier": None}
    return camel({
        "supplier": {"id": str(s["id"]), "name": s["name"], "status": s["status"], "city": s["city"]},
        "purchaseOrders": all_(conn, """select po.id::text, po.number, po.status, po.total_cost_paise, po.created_at, o.number as order_number
                                        from purchase_orders po join orders o on o.id = po.order_id
                                        where po.supplier_id = :s order by po.created_at desc""", s=s["id"]),
        "rates": all_(conn, """select r.id::text, p.sku, p.name, r.cost_paise, r.lead_time_days, r.stock_quantity
                               from supplier_rates r join products p on p.id = r.product_id where r.supplier_id = :s order by p.sku""", s=s["id"]),
        "grievances": grievances.for_supplier(conn, s["id"]),
    })


class SupplierResponseIn(BaseModel):
    note: str


@router.post("/supplier/grievances/{number}/respond")
def supplier_respond(number: str, body: SupplierResponseIn, user: CurrentUser = Depends(SUPPLIER), conn: Connection = Depends(get_conn)):
    grievances.supplier_respond(conn, user, number, body.note)
    return OK


@router.get("/partner/grievances")
def partner_grievances(user: CurrentUser = Depends(PARTNER), conn: Connection = Depends(get_conn)):
    p = _my_partner(conn, user)
    return camel([{k: g[k] for k in ("number", "order_number", "category", "description", "status", "resolution", "due_at", "overdue")}
                  for g in grievances.for_partner(conn, p["id"])])


@router.post("/supplier/purchase-orders/{po_id}/acknowledge")
def acknowledge(po_id: str, user: CurrentUser = Depends(SUPPLIER), conn: Connection = Depends(get_conn)):
    sup.acknowledge_purchase_order(conn, user, po_id)
    return OK


class StockIn(BaseModel):
    stock: int


@router.post("/supplier/rates/{rate_id}/stock")
def stock(rate_id: str, body: StockIn, user: CurrentUser = Depends(SUPPLIER), conn: Connection = Depends(get_conn)):
    sup.update_supplier_stock(conn, user, rate_id, body.stock)
    return OK
