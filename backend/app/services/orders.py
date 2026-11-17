"""Order fulfilment: production → PO → dispatch → delivery → close. Guarded, transactional, audited."""
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import EMAIL_RE, amount_due, doc_number, is_uuid, net_paid  # noqa: F401
from .ledger import earn_commission, reverse_commission
from .notifications import notify_customer_of_order as _notify_customer
from .pricing import advance_due

def lock_order(conn: Connection, number: str):
    o = one(conn, "select * from orders where number = :n for update", n=number)
    return o or fail("Order not found.")


def approve_production(conn: Connection, actor, number: str):
    o = lock_order(conn, number)
    if o["status"] not in ("confirmed", "awaiting_artwork"):
        fail("Order is not awaiting production approval.")
    if o["source"] == "online" and net_paid(o) < amount_due(o):
        fail("Online orders must be paid in full before production.")
    if net_paid(o) < advance_due(amount_due(o)):
        fail("The 50% advance has not been received.")
    if o["requires_artwork"]:
        art = one(conn, """select id from files where entity = 'order' and entity_id = :id and kind = 'artwork'
                           and review_status = 'approved' limit 1""", id=str(o["id"]))
        if not art:
            fail("Upload the artwork and record HSP's written approval before production.")
        run(conn, "update orders set status = 'production_approved', artwork_approved_at = now() where id = :id", id=o["id"])
    else:
        run(conn, "update orders set status = 'production_approved' where id = :id", id=o["id"])
    audit(conn, actor, "order.artwork_approved" if o["requires_artwork"] else "order.production_approved", "order",
          o["id"], {"status": o["status"]}, {"status": "production_approved"})


def issue_purchase_order(conn: Connection, actor, number: str, supplier_id: str):
    o = lock_order(conn, number)
    if o["status"] != "production_approved":
        fail("Production must be approved before issuing a PO.")
    s = one(conn, "select id, name, status::text as status from suppliers where id = cast(:id as uuid)", id=supplier_id) \
        if is_uuid(supplier_id) else None
    if not s or s["status"] != "approved":
        fail("Only approved suppliers can receive purchase orders.")
    lines = all_(conn, "select product_id, quantity from order_lines where order_id = :id", id=o["id"])
    rates = {r["product_id"]: r["cost_paise"] for r in all_(
        conn, "select product_id, cost_paise from supplier_rates where supplier_id = :s", s=s["id"])}
    unrated = [l["product_id"] for l in lines if l["product_id"] not in rates]
    if unrated:
        fail(f"Supplier has no approved rate for: {', '.join(unrated)}")
    total_cost = sum(rates[l["product_id"]] * l["quantity"] for l in lines)
    po = one(conn, """insert into purchase_orders (number, order_id, supplier_id, total_cost_paise)
                      values (:n, :o, :s, :t) returning id, number""",
             n=doc_number("PO"), o=o["id"], s=s["id"], t=total_cost)
    run(conn, "update orders set status = 'po_issued' where id = :id", id=o["id"])
    audit(conn, actor, "po.issue", "purchase_order", po["id"], None,
          {"order": o["number"], "supplier": s["name"], "totalCostPaise": total_cost})
    return {"number": po["number"]}


def dispatch_order(conn: Connection, actor, number: str, courier: str, tracking: str):
    courier, tracking = courier.strip(), tracking.strip()
    if not courier or not tracking:
        fail("Courier and tracking number are required.")
    o = lock_order(conn, number)
    if o["status"] != "po_issued":
        fail("Order is not ready to dispatch.")
    if net_paid(o) < amount_due(o):
        fail("Full payment is required before dispatch.")
    po = one(conn, "select id from purchase_orders where order_id = :id limit 1", id=o["id"])
    po_id = po["id"] if po else None
    cities = [r["city"] for r in all_(conn, "select distinct city from recipients where order_id = :id order by city", id=o["id"])]
    if not cities:
        run(conn, """insert into shipments (order_id, purchase_order_id, courier, tracking_number, dispatched_at)
                     values (:o, :po, :c, :t, now())""", o=o["id"], po=po_id, c=courier, t=tracking)
    for i, city in enumerate(cities, 1):
        sh = one(conn, """insert into shipments (order_id, purchase_order_id, courier, tracking_number, city, dispatched_at)
                          values (:o, :po, :c, :t, :city, now()) returning id""",
                 o=o["id"], po=po_id, c=courier, t=f"{tracking}-{i}", city=city)
        run(conn, "update recipients set shipment_id = :sh where order_id = :o and city = :city", sh=sh["id"], o=o["id"], city=city)
    if po_id:
        run(conn, "update purchase_orders set status = 'dispatched' where id = :id", id=po_id)
    run(conn, "update orders set status = 'dispatched' where id = :id", id=o["id"])
    audit(conn, actor, "order.dispatch", "order", o["id"], {"status": o["status"]},
          {"status": "dispatched", "courier": courier, "trackingNumber": tracking})
    _notify_customer(conn, o["id"], "order.dispatched", {"courier": courier, "trackingNumber": tracking})


def mark_delivered(conn: Connection, actor, number: str, proof: str):
    if not proof.strip():
        fail("Delivery proof is required.")
    o = lock_order(conn, number)
    if o["status"] != "dispatched":
        fail("Order has not been dispatched.")
    run(conn, "update shipments set delivered_at = now(), delivery_proof_url = :p where order_id = :id", p=proof, id=o["id"])
    run(conn, "update purchase_orders set status = 'delivered' where order_id = :id", id=o["id"])
    run(conn, "update orders set status = 'delivered', delivered_at = now() where id = :id", id=o["id"])
    audit(conn, actor, "order.deliver", "order", o["id"], {"status": o["status"]}, {"status": "delivered", "proofUrl": proof})


def close_order(conn: Connection, actor, number: str):
    """Financial closure: captured payments must reconcile exactly with the invoice."""
    o = lock_order(conn, number)
    if o["status"] != "delivered":
        fail("Only delivered orders can be closed.")
    captured = one(conn, """select coalesce(sum(amount_paise - refunded_paise), 0)::bigint as c from payments
                            where order_id = :id and status in ('captured','partially_refunded','refunded')""",
                   id=o["id"])["c"]
    if captured != net_paid(o) or net_paid(o) != amount_due(o):
        fail("Payments do not reconcile with the order total less credit notes.")
    run(conn, "update orders set status = 'closed' where id = :id", id=o["id"])
    earn_commission(conn, o)
    audit(conn, actor, "order.close", "order", o["id"], {"status": o["status"]}, {"status": "closed"})


def cancel_order(conn: Connection, actor, number: str):
    o = lock_order(conn, number)
    if o["status"] in ("dispatched", "delivered", "closed", "cancelled"):
        fail("Order can no longer be cancelled.")
    if net_paid(o) > 0:
        fail("Refund the customer's payments before cancelling.")
    run(conn, "update orders set status = 'cancelled' where id = :id", id=o["id"])
    reverse_commission(conn, str(o["id"]), "Order cancelled")
    audit(conn, actor, "order.cancel", "order", o["id"], {"status": o["status"]}, {"status": "cancelled"})
