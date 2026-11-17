"""Quotations: create (pricing engine + attribution), exception approval, send, accept → order."""
import json
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from ..notify import notify
from .common import customer_owns, doc_number, upsert_customer
from .partners import accrue_commission, attribution_for
from .pricing import js_round, price_quote


def _to_paise(v: str | None):
    try:
        n = float(re.sub(r"[,₹\s]", "", v or ""))
    except ValueError:
        return None
    return js_round(n * 100) if n > 0 else None


def parse_lines(raw: str, allow_price: bool = True) -> list[dict]:
    """"SKU, qty[, unit price ₹][, branding notes]" per line. Partners may not override price."""
    out = []
    for line in [l.strip() for l in raw.split("\n") if l.strip()]:
        parts = [s.strip() for s in line.split(",")]
        sku, qty, price, branding = parts[0], parts[1] if len(parts) > 1 else "", parts[2] if len(parts) > 2 else "", parts[3:]
        if not sku or not re.fullmatch(r"\d+", qty) or int(qty) <= 0:
            fail(f'Could not read line "{line}". Use: SKU, quantity[, price][, branding]')
        if not allow_price and price:
            fail("Partners quote approved catalogue prices only; leave the price blank.")
        out.append({"sku": sku, "quantity": int(qty), "unit_price_paise": _to_paise(price), "branding": ",".join(branding) or None})
    if not out:
        fail("Add at least one product line.")
    return out


def costs_for(conn: Connection, product_ids: list[str]) -> dict[str, int]:
    """Lowest cost from an approved supplier."""
    rows = all_(conn, """select r.product_id, min(r.cost_paise)::bigint as cost from supplier_rates r
                         join suppliers s on s.id = r.supplier_id
                         where r.product_id = any(:ids) and s.status = 'approved' group by r.product_id""", ids=product_ids)
    return {r["product_id"]: int(r["cost"]) for r in rows}


def create_quote(conn: Connection, actor, *, customer: dict, lines: list[dict], freight_paise: int = 0,
                 partner_id: str | None = None):
    if not lines:
        fail("Add at least one product line.")
    skus = sorted({l["sku"].strip().upper() for l in lines})
    prods = all_(conn, "select * from products where upper(sku) = any(:s) and active", s=skus)
    by_sku = {p["sku"].upper(): p for p in prods}
    missing = [s for s in skus if s not in by_sku]
    if missing:
        fail(f"Unknown or inactive SKU: {', '.join(missing)}")
    cust = upsert_customer(conn, name=customer["name"], email=customer["email"], kind=customer["kind"], gstin=customer.get("gstin"))
    attr = attribution_for(conn, cust["id"])
    if partner_id and attr["lead_partner_id"] != partner_id:
        fail("Register this customer as your lead before quoting.")
    if partner_id and attr["partner_id"] != partner_id:
        fail("Your partner account is not active.")
    costs = costs_for(conn, [p["id"] for p in prods])
    priced_input = []
    for l in lines:
        p = by_sku[l["sku"].strip().upper()]
        if l["quantity"] < p["min_order_quantity"]:
            fail(f"{p['sku']} has a minimum order of {p['min_order_quantity']}.")
        priced_input.append({"product_id": p["id"], "quantity": l["quantity"],
                             "unit_price_paise": l.get("unit_price_paise") or p["price_paise"],
                             "unit_cost_paise": costs.get(p["id"], p["cost_paise"]), "gst_rate_bps": p["gst_rate_bps"],
                             "branding": l.get("branding")})
    try:
        r = price_quote(priced_input, attr["channel"], attr["partner"], freight_paise or 0)
    except ValueError as e:
        fail(str(e))
    q = one(conn, """insert into quotations (number, customer_id, partner_id, created_by, channel, status, subtotal_paise,
                         gst_paise, freight_paise, total_paise, commission_paise, contribution_bps, below_minimum, valid_until)
                     values (:n, :c, cast(:p as uuid), cast(:u as uuid), :ch, :st, :sub, :gst, :fr, :tot, :com, :cb, :bm,
                             now() + interval '15 days') returning *""",
            n=doc_number("Q"), c=cust["id"], p=attr["partner_id"], u=actor.id, ch=attr["channel"],
            st="pending_approval" if r.below_minimum else "approved", sub=r.subtotal_paise, gst=r.gst_paise,
            fr=r.freight_paise, tot=r.total_paise, com=r.commission_paise, cb=r.contribution_bps, bm=r.below_minimum)
    for pl, inp in zip(r.lines, priced_input, strict=True):
        run(conn, """insert into quotation_lines (quotation_id, product_id, quantity, unit_price_paise, unit_cost_paise,
                         gst_rate_bps, branding) values (:q, :p, :qty, :up, :uc, :g, cast(:b as jsonb))""",
            q=q["id"], p=pl.product_id, qty=pl.quantity, up=pl.unit_price_paise, uc=pl.unit_cost_paise, g=pl.gst_rate_bps,
            b=json.dumps({"notes": inp["branding"]}) if inp["branding"] else None)
    audit(conn, actor, "quote.create", "quotation", q["id"], None, {"number": q["number"], "status": q["status"],
          "contributionBps": q["contribution_bps"], "anyCostEstimated": r.any_cost_estimated})
    return q


def lock_quote(conn: Connection, number: str):
    return one(conn, "select * from quotations where number = :n for update", n=number) or fail("Quote not found.")


def approve_quote_exception(conn: Connection, actor, number: str, reason: str):
    """Below-minimum quotes need a recorded exception by a *different* finance/admin user."""
    if actor.role not in ("hsp_admin", "hsp_finance"):
        fail("Only admin or finance can approve exceptions.")
    if len(reason.strip()) < 10:
        fail("Give a reason of at least 10 characters.")
    q = lock_quote(conn, number)
    if q["status"] != "pending_approval":
        fail("Quote is not awaiting approval.")
    if str(q["created_by"]) == actor.id:
        fail("The quote's creator cannot approve its own exception.")
    run(conn, "update quotations set status = 'approved', approved_by = cast(:u as uuid), exception_reason = :r where id = :id",
        u=actor.id, r=reason.strip(), id=q["id"])
    audit(conn, actor, "quote.exception_approved", "quotation", q["id"], {"status": q["status"]}, {"status": "approved", "reason": reason})


def send_quote(conn: Connection, actor, number: str):
    q = lock_quote(conn, number)
    if q["status"] != "approved":
        fail("Only approved quotes can be sent.")
    run(conn, "update quotations set status = 'sent' where id = :id", id=q["id"])
    audit(conn, actor, "quote.send", "quotation", q["id"], {"status": q["status"]}, {"status": "sent"})
    c = one(conn, "select email from customers where id = :id", id=q["customer_id"])
    if c and c["email"]:
        notify(conn, channel="email", recipient=c["email"], template="quote.sent",
               payload={"quote": q["number"], "totalPaise": q["total_paise"], "link": f"/my/quotes/{q['number']}"})


def accept_quote(conn: Connection, user, number: str):
    q = lock_quote(conn, number)
    if not customer_owns(conn, user, q["customer_id"]):
        fail("Quote not found.")
    if q["status"] != "sent":
        fail("This quote cannot be accepted.")
    expired = one(conn, "select :v < now() as e", v=q["valid_until"])["e"]
    if expired:
        run(conn, "update quotations set status = 'expired' where id = :id", id=q["id"])
        conn.commit()
        fail("This quote has expired. Ask HSP for a fresh quote.")
    lines = all_(conn, "select * from quotation_lines where quotation_id = :id", id=q["id"])
    requires_artwork = any(l["branding"] is not None for l in lines)
    order = one(conn, """insert into orders (number, quotation_id, customer_id, partner_id, status, requires_artwork,
                             subtotal_paise, gst_paise, freight_paise, total_paise)
                         values (:n, :q, :c, :p, :s, :ra, :sub, :gst, :fr, :tot) returning *""",
                n=doc_number("O"), q=q["id"], c=q["customer_id"], p=q["partner_id"],
                s="awaiting_artwork" if requires_artwork else "confirmed", ra=requires_artwork,
                sub=q["subtotal_paise"], gst=q["gst_paise"], fr=q["freight_paise"], tot=q["total_paise"])
    for l in lines:
        run(conn, """insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps)
                     values (:o, :p, :q, :u, :g)""", o=order["id"], p=l["product_id"], q=l["quantity"],
            u=l["unit_price_paise"], g=l["gst_rate_bps"])
    if q["partner_id"]:
        rate = js_round(q["commission_paise"] * 10_000 / q["subtotal_paise"])
        accrue_commission(conn, order, rate)
        run(conn, "update leads set status = 'converted' where partner_id = :p and customer_id = :c", p=q["partner_id"], c=q["customer_id"])
    run(conn, "update quotations set status = 'accepted' where id = :id", id=q["id"])
    audit(conn, user, "quote.accept", "quotation", q["id"], {"status": "sent"}, {"status": "accepted", "order": order["number"]})
    audit(conn, user, "order.create", "order", order["id"], None,
          {"number": order["number"], "status": order["status"], "totalPaise": order["total_paise"]})
    return order
