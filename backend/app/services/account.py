"""Storefront customer account: real orders, quote requests, profile, address book, wishlist, inbox.
Shapes match the storefront types in src/types (order.ts, quote.ts, customer.ts, notifications.ts)."""
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import is_uuid

ORDER_STATUS = {"confirmed": "confirmed", "awaiting_artwork": "processing", "production_approved": "processing",
                "po_issued": "processing", "dispatched": "shipped", "delivered": "delivered", "closed": "delivered",
                "cancelled": "cancelled"}
TIMELINE = {"confirmed": "confirmed", "processing": "processing", "shipped": "shipped", "delivered": "delivered", "cancelled": "placed"}
ENQ_STATUS = {"new": "submitted", "in_review": "under-review", "quoted": "responded", "closed": "closed"}
ENQ_TIMELINE = {"new": "submitted", "in_review": "under-review", "quoted": "quotation", "closed": "confirmation"}
EMPTY_ADDR = {"line1": "", "line2": "", "city": "", "state": "", "pincode": "", "country": "India"}


def _rupees(p: int) -> float:
    return p / 100


def _owned_orders_sql() -> str:
    return """from orders o join customers c on c.id = o.customer_id
              where c.user_id = cast(:u as uuid) or (cast(:e as text) is not null and c.email = :e)"""


def _order_shape(conn, o) -> dict:
    lines = all_(conn, """select l.product_id, l.quantity, l.unit_price_paise, l.personalisation, p.sku, p.slug, p.name
                          from order_lines l join products p on p.id = l.product_id where l.order_id = :id order by p.name""", id=o["id"])
    status = ORDER_STATUS[o["status"]]
    addr = o["shipping_address"] or {}
    tracking = all_(conn, """select courier, tracking_number, dispatched_at, delivered_at from shipments where order_id = :id
                             order by dispatched_at""", id=o["id"])
    events = [{"status": "placed", "timestamp": o["created_at"].isoformat(), "label": "Order placed"}]
    for s in tracking:
        events.append({"status": "shipped", "timestamp": s["dispatched_at"].isoformat(), "label": f"Dispatched via {s['courier']}",
                       "description": f"Tracking {s['tracking_number']}"})
        if s["delivered_at"]:
            events.append({"status": "delivered", "timestamp": s["delivered_at"].isoformat(), "label": "Delivered"})
    items = [{"productId": l["product_id"], "sku": l["sku"], "productSlug": l["slug"], "productName": l["name"],
              "quantity": l["quantity"], "unitPrice": _rupees(l["unit_price_paise"]),
              "lineTotal": _rupees(l["unit_price_paise"] * l["quantity"]),
              **({"customizationSummary": ["Personalised"]} if l["personalisation"] else {})} for l in lines]
    return {"id": o["number"], "reference": o["number"], "placedAt": o["created_at"].date().isoformat(), "status": status,
            "timelineStep": TIMELINE[status], "items": items, "itemCount": sum(i["quantity"] for i in items),
            "subtotal": _rupees(o["subtotal_paise"]), "shipping": _rupees(o["freight_paise"]),
            "tax": _rupees(o["gst_paise"]), "total": _rupees(o["total_paise"]), "currency": "INR", "paymentMethod": "upi",
            "deliveryName": addr.get("name", ""),
            "deliveryAddress": {"line1": addr.get("line1", ""), "line2": addr.get("line2", ""), "city": addr.get("city", ""),
                                "state": addr.get("state", ""), "pincode": addr.get("pincode", ""), "country": "India"},
            "trackingEvents": events, "portalHref": f"/my/orders/{o['number']}"}


def list_orders(conn: Connection, user) -> list[dict]:
    rows = all_(conn, f"select o.* {_owned_orders_sql()} order by o.created_at desc limit 100", u=user.id, e=user.email)
    return [_order_shape(conn, o) for o in rows]


def get_order(conn: Connection, user, number: str) -> dict | None:
    o = one(conn, f"select o.* {_owned_orders_sql()} and o.number = :n", u=user.id, e=user.email, n=number)
    return _order_shape(conn, o) if o else None


def _enquiry_shape(e) -> dict:
    d = e["details"] or {}
    lines = e["lines"] or []
    return {"id": e["number"], "reference": e["number"], "submittedAt": e["created_at"].date().isoformat(),
            "status": ENQ_STATUS[e["status"]], "timelineStep": ENQ_TIMELINE[e["status"]],
            "orderType": d.get("orderType", "corporate"), "customerType": d.get("customerType"),
            "items": [{"productId": l.get("productId"), "sku": l.get("sku", ""), "productSlug": l.get("slug", ""),
                       "productName": l.get("name", ""), "quantity": l.get("quantity", 0), "notes": l.get("notes", ""),
                       **({"customization": l["customization"]} if l.get("customization") else {})} for l in lines],
            "totalUnits": sum(int(l.get("quantity") or 0) for l in lines),
            "customization": d.get("customization", "no"), "customizationNotes": d.get("customizationNotes", ""),
            "packaging": d.get("packaging", "standard"), "branding": d.get("branding", "no"), "brandName": d.get("brandName", ""),
            "expectedDelivery": d.get("expectedDelivery", ""), "additionalNotes": e["message"] or "",
            "designFileName": d.get("designFileName"), "customerName": e["name"], "organizationName": e["organization"] or "",
            "email": e["email"], "phone": e["phone"] or "", "deliveryAddress": {**EMPTY_ADDR, **(d.get("address") or {})},
            "quoteNumber": e.get("quote_number")}


def list_quote_requests(conn: Connection, user) -> list[dict]:
    rows = all_(conn, """select e.*, q.number as quote_number from enquiries e left join quotations q on q.id = e.quotation_id
                         where e.kind = 'bulk_quote' and (e.user_id = cast(:u as uuid) or (cast(:em as text) is not null and e.email = :em))
                         order by e.created_at desc""", u=user.id, em=user.email)
    return [_enquiry_shape(e) for e in rows]


def get_quote_request(conn: Connection, user, number: str):
    return next((q for q in list_quote_requests(conn, user) if q["reference"] == number), None)


# ── Profile ──

def get_profile(conn: Connection, user) -> dict:
    u = one(conn, "select * from users where id = cast(:u as uuid)", u=user.id)
    addr = one(conn, """select * from customer_addresses where user_id = cast(:u as uuid)
                        order by is_default desc, created_at limit 1""", u=user.id)
    name = u["name"] or ""
    return {"id": str(u["id"]), "fullName": name, "firstName": name.split(" ")[0] if name else "", "email": u["email"] or "",
            "phone": u["phone"] or "", "customerType": u["customer_type"] or "individual",
            "organizationName": u["organization_name"] or "", "gstin": u["gstin"] or "",
            "address": {"line1": addr["line1"], "line2": addr["line2"] or "", "city": addr["city"], "state": addr["state"],
                        "pincode": addr["pincode"], "country": "India"} if addr else dict(EMPTY_ADDR)}


def update_profile(conn: Connection, user, *, full_name: str, customer_type: str, organization_name: str, gstin: str):
    full_name = full_name.strip()
    if not full_name or len(full_name) > 120:
        fail("Enter your full name.")
    if customer_type not in ("individual", "business", "reseller", "institution"):
        fail("Choose a customer type.")
    gstin = gstin.strip().upper()
    if gstin and not re.fullmatch(r"\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]", gstin):
        fail("Enter a valid 15-character GSTIN.")
    run(conn, """update users set name = :n, customer_type = :t, organization_name = :o, gstin = :g, updated_at = now()
                 where id = cast(:u as uuid)""", n=full_name, t=customer_type, o=organization_name.strip()[:160] or None,
        g=gstin or None, u=user.id)
    audit(conn, user, "account.profile_update", "user", user.id, None, {"customerType": customer_type})


# ── Address book ──

def _addr_shape(a) -> dict:
    return {"id": str(a["id"]), "label": a["label"], "fullName": a["name"], "phone": a["phone"], "addressLine1": a["line1"],
            "addressLine2": a["line2"] or "", "city": a["city"], "state": a["state"], "postalCode": a["pincode"],
            "country": "India", "isDefault": a["is_default"]}


def list_addresses(conn: Connection, user):
    return [_addr_shape(a) for a in all_(conn, "select * from customer_addresses where user_id = cast(:u as uuid) order by is_default desc, created_at", u=user.id)]


def _validate_addr(a: dict) -> dict:
    v = {k: str(a.get(k) or "").strip() for k in ("label", "fullName", "phone", "addressLine1", "addressLine2", "city", "state", "postalCode")}
    if not v["fullName"]:
        fail("Enter the recipient's name.")
    if not re.fullmatch(r"[6-9]\d{9}", re.sub(r"\D", "", v["phone"])[-10:]):
        fail("Enter a valid 10-digit mobile number.")
    if not v["addressLine1"] or not v["city"] or not v["state"]:
        fail("Complete the address.")
    if not re.fullmatch(r"[1-9]\d{5}", v["postalCode"]):
        fail("Enter a valid 6-digit PIN code.")
    return v


def save_address(conn: Connection, user, data: dict, address_id: str | None = None):
    v = _validate_addr(data)
    count = one(conn, "select count(*)::int as n from customer_addresses where user_id = cast(:u as uuid)", u=user.id)["n"]
    make_default = bool(data.get("isDefault")) or count == 0
    if make_default:
        run(conn, "update customer_addresses set is_default = false where user_id = cast(:u as uuid)", u=user.id)
    params = dict(l=v["label"] or "Home", n=v["fullName"], p=v["phone"], l1=v["addressLine1"], l2=v["addressLine2"] or None,
                  c=v["city"], s=v["state"], pin=v["postalCode"], d=make_default, u=user.id)
    if address_id:
        row = one(conn, """update customer_addresses set label=:l, name=:n, phone=:p, line1=:l1, line2=:l2, city=:c, state=:s,
                               pincode=:pin, is_default = is_default or :d
                           where id = cast(:id as uuid) and user_id = cast(:u as uuid) returning *""",
                  id=address_id, **params) if is_uuid(address_id) else None
        if not row:
            fail("Address not found.")
    else:
        if count >= 20:
            fail("You can save up to 20 addresses.")
        row = one(conn, """insert into customer_addresses (user_id, label, name, phone, line1, line2, city, state, pincode, is_default)
                           values (cast(:u as uuid), :l, :n, :p, :l1, :l2, :c, :s, :pin, :d) returning *""", **params)
    return _addr_shape(row)


def delete_address(conn: Connection, user, address_id: str):
    if not is_uuid(address_id):
        fail("Address not found.")
    gone = one(conn, "delete from customer_addresses where id = :id and user_id = cast(:u as uuid) returning is_default", id=address_id, u=user.id)
    if not gone:
        fail("Address not found.")
    if gone["is_default"]:
        run(conn, """update customer_addresses set is_default = true where id = (select id from customer_addresses
                     where user_id = cast(:u as uuid) order by created_at limit 1)""", u=user.id)


def set_default_address(conn: Connection, user, address_id: str):
    if not is_uuid(address_id) or not one(conn, "select 1 as x from customer_addresses where id = :id and user_id = cast(:u as uuid)", id=address_id, u=user.id):
        fail("Address not found.")
    run(conn, "update customer_addresses set is_default = (id = cast(:id as uuid)) where user_id = cast(:u as uuid)", id=address_id, u=user.id)


# ── Wishlist ──

def list_wishlist(conn: Connection, user) -> list[str]:
    return [r["product_id"] for r in all_(conn, "select product_id from wishlist_items where user_id = cast(:u as uuid) order by created_at desc", u=user.id)]


def set_wishlist(conn: Connection, user, product_id: str, on: bool):
    if on:
        if not one(conn, "select 1 as x from products where id = :p and active", p=product_id):
            fail("Product not found.")
        run(conn, "insert into wishlist_items (user_id, product_id) values (cast(:u as uuid), :p) on conflict do nothing", u=user.id, p=product_id)
    else:
        run(conn, "delete from wishlist_items where user_id = cast(:u as uuid) and product_id = :p", u=user.id, p=product_id)


def merge_wishlist(conn: Connection, user, product_ids: list[str]):
    """On sign-in, items saved while browsing as a guest are added to the account."""
    for p in product_ids[:200]:
        run(conn, """insert into wishlist_items (user_id, product_id) select cast(:u as uuid), id from products where id = :p and active
                     on conflict do nothing""", u=user.id, p=p)


# ── Inbox (real notifications sent to this user) ──

NOTIF_TYPE = {"payment.received": "PAYMENT_SUCCESSFUL", "order.dispatched": "ORDER_SHIPPED", "quote.sent": "QUOTE_UPDATED",
              "credit_note.issued": "ORDER_CANCELLED", "enquiry.received": "QUOTE_SUBMITTED", "order.placed": "ORDER_PLACED"}


def list_notifications(conn: Connection, user):
    from ..notify import render
    rows = all_(conn, """select id::text, template, payload, created_at, read_at from notifications
                         where recipient = any(:r) and template <> 'auth.otp' and category = 'transactional'
                           and status in ('sent','simulated','queued')
                         order by created_at desc limit 100""", r=[x for x in (user.email, user.phone) if x])
    seen, out = set(), []
    for n in rows:
        p = n["payload"] or {}
        key = (n["template"], str(p))
        if key in seen:  # the same event sent by email and WhatsApp shows once
            continue
        seen.add(key)
        subject, text = render(n["template"], p)
        href = f"/my/orders/{p['order']}" if p.get("order") else (p.get("link") or None)
        out.append({"id": n["id"], "type": NOTIF_TYPE.get(n["template"], "ACCOUNT_SECURITY"), "title": subject, "message": text,
                    "timestamp": n["created_at"].isoformat(), "read": n["read_at"] is not None, **({"href": href} if href else {})})
    return out


def mark_notifications_read(conn: Connection, user, ids: list[str] | None):
    recips = [x for x in (user.email, user.phone) if x]
    if ids:
        run(conn, "update notifications set read_at = now() where id = any(cast(:ids as uuid[])) and recipient = any(:r) and read_at is null",
            ids=[i for i in ids if is_uuid(i)], r=recips)
    else:
        run(conn, "update notifications set read_at = now() where recipient = any(:r) and read_at is null", r=recips)
