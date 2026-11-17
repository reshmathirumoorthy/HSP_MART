"""Storefront checkout → a real HSP order paid in full through Razorpay. Prices are recomputed here."""
import json
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import is_email, doc_number, upsert_customer
from .partners import accrue_commission, attribution_for
from .payments import start_payment
from .pricing import price_quote

ONLINE_FREIGHT_PAISE = 9_900
FREE_SHIPPING_THRESHOLD_PAISE = 99_900


def freight_for(subtotal: int) -> int:
    return 0 if subtotal >= FREE_SHIPPING_THRESHOLD_PAISE else ONLINE_FREIGHT_PAISE


def place_online_order(conn: Connection, user, *, client_ref: str, customer: dict, address: dict, items: list[dict]):
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", client_ref or ""):
        fail("Invalid checkout reference.")
    if not items:
        fail("Your cart is empty.")
    if len(items) > 100:
        fail("Too many cart lines.")
    email = customer.get("email", "").strip().lower()
    if not is_email(email):
        fail("Enter a valid email.")
    if not re.fullmatch(r"[6-9]\d{9}", re.sub(r"\D", "", customer.get("phone", ""))[-10:]):
        fail("Enter a valid 10-digit mobile number.")
    if not re.fullmatch(r"\d{6}", address.get("pincode", "").strip()):
        fail("Enter a valid 6-digit pincode.")
    if not all(address.get(k, "").strip() for k in ("line1", "city", "state")):
        fail("Complete the delivery address.")
    if user.email and user.email != email:
        fail(f"You are signed in as {user.email}. Use that email or sign in again.")

    existing = one(conn, "select * from orders where client_ref = :r", r=client_ref)
    if existing:
        c = one(conn, "select user_id::text from customers where id = :id", id=existing["customer_id"])
        if not c or c["user_id"] != user.id:
            fail("Invalid checkout reference.")
        order = existing
    else:
        ids = sorted({i["productId"] for i in items})
        by_id = {p["id"]: p for p in all_(conn, "select * from products where id = any(:ids) and active", ids=ids)}
        for i in items:
            p = by_id.get(i["productId"]) or fail("An item in your cart is no longer available.")
            q = i.get("quantity")
            if not isinstance(q, int) or isinstance(q, bool) or not 1 <= q <= 10_000:
                fail("Invalid quantity.")
            if q < p["min_order_quantity"]:
                fail(f"{p['name']} has a minimum order of {p['min_order_quantity']}.")
            if i.get("personalisation") is not None and not p["customizable"]:
                fail(f"{p['name']} cannot be personalised.")
        full_name = customer.get("fullName", "").strip()
        cust = upsert_customer(conn, name=full_name or email, email=email, kind="individual", contact_name=full_name)
        if cust["user_id"] and str(cust["user_id"]) != user.id:
            fail("This email belongs to another account. Sign in with it to order.")
        run(conn, "update customers set user_id = cast(:u as uuid), phone = :p where id = :id",
            u=user.id, p=cust["phone"] or customer["phone"].strip(), id=cust["id"])
        attr = attribution_for(conn, cust["id"])
        subtotal = sum(by_id[i["productId"]]["price_paise"] * i["quantity"] for i in items)
        priced = price_quote([{"product_id": i["productId"], "quantity": i["quantity"],
                               "unit_price_paise": by_id[i["productId"]]["price_paise"],
                               "unit_cost_paise": by_id[i["productId"]]["cost_paise"],
                               "gst_rate_bps": by_id[i["productId"]]["gst_rate_bps"]} for i in items],
                             attr["channel"], attr["partner"], freight_for(subtotal))
        requires_artwork = any(i.get("personalisation") is not None for i in items)
        ship = {"name": full_name, "phone": customer["phone"].strip(), "line1": address["line1"].strip(),
                "line2": (address.get("line2") or "").strip(), "city": address["city"].strip(),
                "state": address["state"].strip(), "pincode": address["pincode"].strip()}
        order = one(conn, """insert into orders (number, customer_id, partner_id, source, client_ref, freight_paise,
                                 shipping_address, status, requires_artwork, subtotal_paise, gst_paise, total_paise)
                             values (:n, :c, cast(:p as uuid), 'online', :r, :f, cast(:a as jsonb), :s, :ra, :sub, :gst, :tot)
                             returning *""",
                    n=doc_number("O"), c=cust["id"], p=attr["partner_id"], r=client_ref, f=priced.freight_paise,
                    a=json.dumps(ship), s="awaiting_artwork" if requires_artwork else "confirmed", ra=requires_artwork,
                    sub=priced.subtotal_paise, gst=priced.gst_paise, tot=priced.total_paise)
        for i in items:
            p = by_id[i["productId"]]
            run(conn, """insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps, personalisation)
                         values (:o, :p, :q, :u, :g, cast(:pers as jsonb))""", o=order["id"], p=p["id"], q=i["quantity"],
                u=p["price_paise"], g=p["gst_rate_bps"],
                pers=json.dumps(i["personalisation"]) if i.get("personalisation") is not None else None)
        if attr["partner_id"] and attr["partner"]:
            accrue_commission(conn, order, attr["partner"]["commission_bps"] + attr["partner"]["service_fee_bps"])
        audit(conn, user, "order.create", "order", order["id"], None, {"number": order["number"], "source": "online",
              "totalPaise": order["total_paise"], "attribution": attr["basis"], "contributionBps": priced.contribution_bps,
              "belowMinimum": priced.below_minimum})
    pending = one(conn, "select id from payments where order_id = :o and status = 'created' limit 1", o=order["id"])
    if not pending and order["paid_paise"] == 0:
        start_payment(conn, user, order["number"], "balance")
    return order
