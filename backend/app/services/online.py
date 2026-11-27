"""Storefront checkout → a real HSP order paid in full through Razorpay. Prices are recomputed here."""
import json
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from . import hamper_fit
from .hamper_fit import model_missing
from .common import is_email, doc_number, upsert_customer
from .partners import accrue_commission, attribution_for
from .payments import start_payment
from .pricing import price_quote

ONLINE_FREIGHT_PAISE = 9_900
FREE_SHIPPING_THRESHOLD_PAISE = 99_900


def freight_for(subtotal: int) -> int:
    return 0 if subtotal >= FREE_SHIPPING_THRESHOLD_PAISE else ONLINE_FREIGHT_PAISE


MAX_HAMPER_LINES = 30


def _hamper_contents(item: dict) -> list[dict]:
    h = item.get("hamper")
    return [c for c in (h.get("contents") or []) if isinstance(c, dict)] if isinstance(h, dict) else []


def check_hamper(by_id: dict, item: dict) -> dict:
    """Re-checks a built hamper on the server (the browser's fit result is never trusted) and returns what is stored
    on the box's order line: the contents and the packing plan the warehouse follows."""
    box = by_id[item["productId"]]
    if box["packing_kind"] != "hamper_box":
        fail(f"{box['name']} is not a hamper box.")
    if model_missing(box):
        fail(f"{box['name']} is not available for hamper building yet.")
    raw = item.get("hamper")
    contents = _hamper_contents(item)
    if not isinstance(raw, dict) or not contents or len(contents) > MAX_HAMPER_LINES:
        fail("Add at least one product to your hamper.")
    packed, clean = [], []
    for c in contents:
        p = by_id.get(c.get("productId")) or fail("A product in your hamper is no longer available.")
        q = c.get("quantity")
        if not isinstance(q, int) or isinstance(q, bool) or not 1 <= q <= 50:
            fail("Invalid hamper quantity.")
        if p["packing_kind"] == "hamper_box" or model_missing(p):
            fail(f"{p['name']} cannot go in a hamper.")
        if p["stock_status"] == "out_of_stock":
            fail(f"{p['name']} is out of stock.")
        clean.append({"productId": p["id"], "quantity": q})
        packed += [{"productId": p["id"], "lengthMm": p["length_mm"], "breadthMm": p["breadth_mm"], "heightMm": p["height_mm"],
                    "weightG": p["weight_g"], "orientation": p["orientation"], "fragile": p["fragile"]}] * q
    settings = (box["content"] or {}).get("hamperBox") or {}
    spec = {"lengthMm": box["length_mm"], "breadthMm": box["breadth_mm"], "heightMm": box["height_mm"], "maxLoadG": box["max_load_g"],
            **{k: settings[k] for k in ("paddingMm", "maxFillPercent") if isinstance(settings.get(k), int)}}
    fit = hamper_fit.evaluate_fit(packed, spec)
    if not fit["ok"]:
        fail(f"Your hamper doesn't fit in {box['name']}: {', '.join(HAMPER_REASONS[r] for r in fit['reasons'])}. "
             "Please rebuild it.")
    return {"contents": clean, "placements": fit["placements"], "weightG": fit["weightG"] + (box["weight_g"] or 0)}


HAMPER_REASONS = {"too_large": "an item is too big", "too_tall": "an item is too tall", "over_volume": "it is too full",
                  "over_weight": "it is over the weight limit", "cannot_pack": "the items can't all be packed"}


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
        ids = sorted({i["productId"] for i in items} | {c.get("productId") for i in items for c in _hamper_contents(i)})
        by_id = {p["id"]: p for p in all_(conn, "select * from products where id = any(:ids) and active", ids=ids)}
        hampers = {n: check_hamper(by_id, i) for n, i in enumerate(items) if i.get("hamper") is not None}
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
        requires_artwork = any(i.get("personalisation") is not None for i in items)
        # A built hamper becomes its box line plus one line per content product, each priced and taxed on its own.
        lines = []
        for n, i in enumerate(items):
            pers = i.get("personalisation")
            if n in hampers:
                pers = {**(pers or {}), "hamper": hampers[n]}
            lines.append({"productId": i["productId"], "quantity": i["quantity"], "personalisation": pers})
            for c in hampers.get(n, {}).get("contents", []):
                lines.append({"productId": c["productId"], "quantity": c["quantity"] * i["quantity"],
                              "personalisation": None, "inHamper": i["productId"]})
        subtotal = sum(by_id[i["productId"]]["price_paise"] * i["quantity"] for i in lines)
        priced = price_quote([{"product_id": i["productId"], "quantity": i["quantity"],
                               "unit_price_paise": by_id[i["productId"]]["price_paise"],
                               "unit_cost_paise": by_id[i["productId"]]["cost_paise"],
                               "gst_rate_bps": by_id[i["productId"]]["gst_rate_bps"]} for i in lines],
                             attr["channel"], attr["partner"], freight_for(subtotal))
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
        for i in lines:
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
