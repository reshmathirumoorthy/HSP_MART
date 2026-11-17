"""Credit notes and partial refunds. Maker-checker; refund through Razorpay after commit."""
import json
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, engine, one, run
from ..errors import fail
from ..notify import notify
from .common import FINANCE, amount_due, doc_number, net_paid
from .partners import adjust_commission_for_credit
from .pricing import js_round, pct
from .razorpay import create_provider_refund


def create_credit_note(conn: Connection, actor, order_number: str, *, reason: str, lines: list[dict] | None = None,
                       taxable_paise: int | None = None, refund_paise: int = 0):
    if actor.role not in FINANCE:
        fail("Only admin or finance can raise credit notes.")
    if len(reason.strip()) < 10:
        fail("Give a reason of at least 10 characters.")
    o = one(conn, "select * from orders where number = :n for update", n=order_number) or fail("Order not found.")
    if o["status"] == "cancelled":
        fail("Cancelled orders cannot take credit notes.")
    by_id = {str(l["id"]): l for l in all_(conn, "select * from order_lines where order_id = :id", id=o["id"])}
    taxable = gst = 0
    lines = [l for l in (lines or []) if l["quantity"] > 0]
    if lines:
        for l in lines:
            ol = by_id.get(l["orderLineId"]) or fail("Unknown order line.")
            if not isinstance(l["quantity"], int):
                fail("Quantities must be whole numbers.")
            left = ol["quantity"] - ol["credited_quantity"]
            if l["quantity"] > left:
                fail(f"Only {left} of {ol['product_id']} can still be credited.")
            net = ol["unit_price_paise"] * l["quantity"]
            taxable += net
            gst += pct(net, ol["gst_rate_bps"])
    else:
        value = taxable_paise or 0
        if value <= 0:
            fail("Enter returned quantities or a credit value.")
        taxable = value
        # GST on a value adjustment follows the order's blended goods rate.
        gst = js_round(value * (o["gst_paise"] - pct(o["freight_paise"], 1800)) / o["subtotal_paise"]) if o["subtotal_paise"] > 0 else 0
    total = taxable + gst
    pending = one(conn, "select coalesce(sum(total_paise),0)::bigint as p from credit_notes where order_id = :id and status = 'draft'",
                  id=o["id"])["p"]
    if o["credited_taxable_paise"] + taxable > o["subtotal_paise"] or o["credited_paise"] + pending + total > o["total_paise"]:
        fail("Credit would exceed the order's invoice value.")
    if refund_paise < 0:
        fail("Invalid refund amount.")
    if refund_paise > total:
        fail("Refund cannot exceed the credit note value.")
    excess = max(0, net_paid(o) - (amount_due(o) - total))
    if refund_paise > excess:
        fail(f"At most {excess / 100:.2f} can be refunded on this order.")
    cn = one(conn, """insert into credit_notes (number, order_id, reason, lines, taxable_paise, gst_paise, total_paise,
                          refund_paise, created_by)
                      values (:n, :o, :r, cast(:l as jsonb), :t, :g, :tot, :rf, cast(:u as uuid)) returning id::text, number""",
             n=doc_number("CN"), o=o["id"], r=reason.strip(), l=json.dumps(lines), t=taxable, g=gst, tot=total, rf=refund_paise, u=actor.id)
    audit(conn, actor, "credit_note.create", "credit_note", cn["id"], None,
          {"number": cn["number"], "order": o["number"], "totalPaise": total, "refundPaise": refund_paise})
    return cn


def _covering_payment(conn, order_id, amount):
    pays = all_(conn, """select * from payments where order_id = :o and status in ('captured','partially_refunded')
                         order by created_at""", o=order_id)
    return next((p for p in pays if p["provider_payment_id"] and p["amount_paise"] - p["refunded_paise"] >= amount), None)


def approve_credit_note(conn: Connection, actor, number: str):
    if actor.role not in FINANCE:
        fail("Only admin or finance can approve credit notes.")
    cn = one(conn, "select * from credit_notes where number = :n for update", n=number) or fail("Credit note not found.")
    if cn["status"] != "draft":
        fail("Credit note is not awaiting approval.")
    if str(cn["created_by"]) == actor.id:
        fail("The person who raised a credit note cannot approve it.")
    o = one(conn, "select * from orders where id = :id for update", id=cn["order_id"])
    if o["credited_paise"] + cn["total_paise"] > o["total_paise"]:
        fail("Credit would exceed the order's invoice value.")
    for l in cn["lines"] or []:
        upd = one(conn, """update order_lines set credited_quantity = credited_quantity + :q
                           where id = cast(:id as uuid) and credited_quantity + :q <= quantity returning id""",
                  q=l["quantity"], id=l["orderLineId"])
        if not upd:
            fail("A credited line no longer has that quantity available.")
    after = one(conn, """update orders set credited_paise = credited_paise + :t, credited_taxable_paise = credited_taxable_paise + :x
                         where id = :id returning *""", t=cn["total_paise"], x=cn["taxable_paise"], id=o["id"])
    commission = adjust_commission_for_credit(conn, after)
    refund_status, payment = "none", None
    if cn["refund_paise"] > 0:
        payment = _covering_payment(conn, o["id"], cn["refund_paise"])
        if not payment:
            fail("No single captured payment covers this refund; split it into smaller credit notes.")
        refund_status = "requested"
    run(conn, "update credit_notes set status = 'approved', approved_by = cast(:u as uuid), refund_status = :r where id = :id",
        u=actor.id, r=refund_status, id=cn["id"])
    audit(conn, actor, "credit_note.approve", "credit_note", cn["id"], {"status": "draft"},
          {"status": "approved", "creditedPaise": after["credited_paise"], "commission": commission, "refundStatus": refund_status})
    c = one(conn, "select email from customers where id = :id", id=after["customer_id"])
    if c and c["email"]:
        notify(conn, channel="email", recipient=c["email"], template="credit_note.issued",
               payload={"order": after["number"], "creditNote": cn["number"], "totalPaise": cn["total_paise"], "refundPaise": cn["refund_paise"]})
    # Provider call happens after commit; a failure is recorded and can be retried.
    conn.commit()
    if payment:
        with engine().begin() as c2:
            try:
                create_provider_refund(payment["provider_payment_id"], cn["refund_paise"], cn["number"])
                audit(c2, actor, "credit_note.refund_requested", "credit_note", cn["id"], None,
                      {"paymentId": payment["provider_payment_id"], "amountPaise": cn["refund_paise"]})
            except Exception as e:  # noqa: BLE001 — any provider failure is recorded for retry
                run(c2, "update credit_notes set refund_status = 'failed' where id = :id", id=cn["id"])
                audit(c2, actor, "credit_note.refund_failed", "credit_note", cn["id"], None, {"error": str(e)})
    return {"number": cn["number"]}


def retry_credit_note_refund(conn: Connection, actor, number: str):
    if actor.role not in FINANCE:
        fail("Only admin or finance can retry refunds.")
    cn = one(conn, "select * from credit_notes where number = :n", n=number)
    if not cn or cn["refund_status"] != "failed":
        fail("No failed refund to retry.")
    p = _covering_payment(conn, cn["order_id"], cn["refund_paise"]) or fail("No captured payment covers this refund.")
    create_provider_refund(p["provider_payment_id"], cn["refund_paise"], cn["number"])
    run(conn, "update credit_notes set refund_status = 'requested' where id = :id", id=cn["id"])
    audit(conn, actor, "credit_note.refund_requested", "credit_note", cn["id"], {"refundStatus": "failed"}, {"refundStatus": "requested"})


def void_credit_note(conn: Connection, actor, number: str):
    if actor.role not in FINANCE:
        fail("Only admin or finance can void credit notes.")
    cn = one(conn, "select * from credit_notes where number = :n", n=number)
    if not cn or cn["status"] != "draft":
        fail("Only draft credit notes can be voided.")
    run(conn, "update credit_notes set status = 'void' where id = :id", id=cn["id"])
    audit(conn, actor, "credit_note.void", "credit_note", cn["id"], {"status": "draft"}, {"status": "void"})
