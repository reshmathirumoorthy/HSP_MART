"""Storefront enquiries: bulk quote requests and contact messages → HSP sales queue → quotation."""
import json
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from ..notify import notify
from .common import STAFF_ROLES, doc_number, is_email, is_uuid
from .quotes import create_quote

ACK = "enquiry.received"


def submit_bulk_quote(conn: Connection, user, data: dict):
    lines_in = data.get("lines") or []
    if not lines_in:
        fail("Add at least one product.")
    if len(lines_in) > 50:
        fail("Add at most 50 products per request.")
    ids = [str(l.get("productId", "")) for l in lines_in]
    prods = {p["id"]: p for p in all_(conn, "select id, sku, slug, name, min_order_quantity from products where id = any(:i) and active", i=ids)}
    lines = []
    for l in lines_in:
        p = prods.get(str(l.get("productId"))) or fail("A product in your request is no longer available.")
        q = l.get("quantity")
        if not isinstance(q, int) or isinstance(q, bool) or not 1 <= q <= 1_000_000:
            fail(f"Enter a valid quantity for {p['name']}.")
        lines.append({"productId": p["id"], "sku": p["sku"], "slug": p["slug"], "name": p["name"], "quantity": q,
                      "notes": str(l.get("notes") or "")[:500]})
    c = data.get("customer") or {}
    name, email = str(c.get("fullName", "")).strip(), str(c.get("email", "")).strip().lower()
    if not name:
        fail("Enter your name.")
    if not is_email(email):
        fail("Enter a valid email.")
    phone = str(c.get("phone", "")).strip()
    if not re.fullmatch(r"[6-9]\d{9}", re.sub(r"\D", "", phone)[-10:]):
        fail("Enter a valid 10-digit mobile number.")
    req = data.get("requirements") or {}
    details = {k: req.get(k) for k in ("orderType", "customization", "customizationNotes", "packaging", "branding", "brandName",
                                        "expectedDelivery", "designFileName")}
    details["customerType"] = c.get("customerType")
    details["address"] = {k: str((data.get("address") or {}).get(k, ""))[:200] for k in ("line1", "line2", "city", "state", "pincode")}
    return _save(conn, user, kind="bulk_quote", name=name, email=email, phone=phone, organization=str(c.get("organizationName") or "")[:160],
                 subject="Bulk quote request", message=str(req.get("additionalNotes") or "")[:4000], lines=lines, details=details)


def submit_contact(conn: Connection, user, data: dict):
    name, email = str(data.get("name", "")).strip(), str(data.get("email", "")).strip().lower()
    message = str(data.get("message", "")).strip()
    if not name:
        fail("Enter your name.")
    if not is_email(email):
        fail("Enter a valid email.")
    if len(message) < 10:
        fail("Tell us a little more (at least 10 characters).")
    return _save(conn, user, kind="contact", name=name[:120], email=email, phone=str(data.get("phone") or "")[:20] or None,
                 organization=str(data.get("organization") or "")[:160] or None, subject=str(data.get("subject") or "General enquiry")[:160],
                 message=message[:4000], lines=None, details=None)


def _save(conn, user, *, kind, name, email, phone, organization, subject, message, lines, details):
    if user is None:
        recent = one(conn, "select count(*)::int as n from enquiries where email = :e and created_at > now() - interval '1 hour'", e=email)["n"]
        if recent >= 5:
            fail("Too many requests from this email. Try again later.")
    e = one(conn, """insert into enquiries (number, kind, user_id, name, email, phone, organization, subject, message, lines, details)
                     values (:n, :k, cast(:u as uuid), :name, :email, :phone, :org, :sub, :msg, cast(:lines as jsonb), cast(:d as jsonb))
                     returning id::text, number""",
            n=doc_number("ENQ"), k=kind, u=user.id if user else None, name=name, email=email, phone=phone, org=organization or None,
            sub=subject, msg=message or None, lines=json.dumps(lines) if lines is not None else None,
            d=json.dumps(details) if details is not None else None)
    audit(conn, user, f"enquiry.{kind}", "enquiry", e["id"], None, {"number": e["number"]})
    notify(conn, channel="email", recipient=email, template=ACK,
           payload={"text": f"Thank you, {name}. We received your request {e['number']}. HSP will reply within one working day.",
                    "link": "/account/quotes" if kind == "bulk_quote" else None})
    return {"number": e["number"]}


def list_enquiries(conn: Connection, status: str | None = None):
    return all_(conn, """select e.id::text, e.number, e.kind, e.status, e.name, e.email, e.phone, e.organization, e.subject, e.message,
                                e.lines, e.details, e.created_at, q.number as quote_number
                         from enquiries e left join quotations q on q.id = e.quotation_id
                         where (cast(:s as text) is null or e.status = :s) order by e.created_at desc limit 200""", s=status)


def set_enquiry_status(conn: Connection, actor, enquiry_id: str, status: str):
    if actor.role not in STAFF_ROLES:
        fail("Staff only.")
    if status not in ("in_review", "closed", "new"):
        fail("Unknown status.")
    e = one(conn, "select status from enquiries where id = :id", id=enquiry_id) if is_uuid(enquiry_id) else None
    if not e:
        fail("Enquiry not found.")
    run(conn, "update enquiries set status = :s, handled_by = cast(:u as uuid) where id = :id", s=status, u=actor.id, id=enquiry_id)
    audit(conn, actor, "enquiry.status", "enquiry", enquiry_id, {"status": e["status"]}, {"status": status})


def quote_from_enquiry(conn: Connection, actor, enquiry_id: str):
    """Turns a bulk quote request into a priced quotation (pricing engine) for staff to review and send."""
    if actor.role != "hsp_admin":
        fail("Only admin can create quotes.")
    e = one(conn, "select * from enquiries where id = :id for update", id=enquiry_id) if is_uuid(enquiry_id) else None
    if not e or e["kind"] != "bulk_quote":
        fail("Bulk quote request not found.")
    if e["quotation_id"]:
        fail("A quote already exists for this request.")
    d = e["details"] or {}
    branded = d.get("branding") == "yes" or d.get("customization") == "yes"
    q = create_quote(conn, actor, customer={"name": e["organization"] or e["name"], "email": e["email"],
                                            "kind": "individual" if d.get("customerType") == "individual" else "organisation"},
                     lines=[{"sku": l["sku"], "quantity": l["quantity"], "unit_price_paise": None,
                             "branding": (d.get("brandName") or d.get("customizationNotes") or "Branding") if branded else None}
                            for l in e["lines"] or []])
    run(conn, "update enquiries set status = 'quoted', quotation_id = :q, handled_by = cast(:u as uuid) where id = :id",
        q=q["id"], u=actor.id, id=enquiry_id)
    audit(conn, actor, "enquiry.quoted", "enquiry", enquiry_id, {"status": e["status"]}, {"status": "quoted", "quote": q["number"]})
    return {"quote": q["number"]}
