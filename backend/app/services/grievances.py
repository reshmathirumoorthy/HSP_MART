"""Customer grievances (Blueprint §1): HSP is accountable, the selling partner assists, the supplier resolves
supply defects. Every step is audited; partners and suppliers only see grievances on their own orders/POs."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import STAFF_ROLES, customer_owns, doc_number, is_uuid, partner_for_user, supplier_for_user
from .notifications import notify_customer_of_order

CATEGORIES = ("damaged", "missing", "wrong_item", "quality", "delay", "billing", "other")
RESOLUTION_SLA_DAYS = 3


def raise_grievance(conn: Connection, user, order_number: str, *, category: str, description: str):
    o = one(conn, "select id, number, customer_id, partner_id, status::text as status from orders where number = :n",
            n=order_number) or fail("Order not found.")
    if user.role in STAFF_ROLES:
        role = "staff"
    else:
        p = partner_for_user(conn, user.id)
        if p and o["partner_id"] and str(o["partner_id"]) == str(p["id"]):
            role = "partner"
        elif customer_owns(conn, user, o["customer_id"]):
            role = "customer"
        else:
            fail("Order not found.")
    if o["status"] == "cancelled":
        fail("Cancelled orders cannot take complaints.")
    if category not in CATEGORIES:
        fail("Choose a complaint type.")
    if len(description.strip()) < 10:
        fail("Describe the problem in at least 10 characters.")
    if one(conn, """select 1 as x from grievances where order_id = :o and category = :c and status in ('open','with_supplier')""",
           o=o["id"], c=category):
        fail("A complaint of this type is already open for this order.")
    g = one(conn, """insert into grievances (number, order_id, raised_by, raised_by_role, category, description, due_at)
                     values (:n, :o, cast(:u as uuid), :r, :c, :d, :due) returning id::text, number""",
            n=doc_number("GR"), o=o["id"], u=user.id, r=role, c=category, d=description.strip(),
            due=datetime.now(timezone.utc) + timedelta(days=RESOLUTION_SLA_DAYS))
    audit(conn, user, "grievance.raise", "grievance", g["id"], None, {"order": o["number"], "category": category, "by": role})
    notify_customer_of_order(conn, o["id"], "grievance.received", {"grievance": g["number"]})
    return g


def _grievance(conn, number):
    return one(conn, "select * from grievances where number = :n for update", n=number) or fail("Complaint not found.")


def assign_supplier(conn: Connection, actor, number: str, supplier_id: str):
    if actor.role not in ("hsp_admin", "hsp_procurement"):
        fail("Only admin or procurement can route complaints to suppliers.")
    g = _grievance(conn, number)
    if g["status"] not in ("open", "with_supplier"):
        fail("This complaint is already resolved.")
    if not is_uuid(supplier_id) or not one(conn, "select 1 as x from purchase_orders where order_id = :o and supplier_id = :s",
                                            o=g["order_id"], s=supplier_id):
        fail("Only a supplier with a purchase order on this order can be assigned.")
    run(conn, "update grievances set supplier_id = :s, status = 'with_supplier' where id = :id", s=supplier_id, id=g["id"])
    audit(conn, actor, "grievance.assign_supplier", "grievance", g["id"], {"status": g["status"]},
          {"status": "with_supplier", "supplier": supplier_id})


def supplier_respond(conn: Connection, user, number: str, note: str):
    s = supplier_for_user(conn, user.id) or fail("No supplier account is linked to this login.")
    g = _grievance(conn, number)
    if str(g["supplier_id"]) != str(s["id"]):
        fail("Complaint not found.")
    if g["status"] != "with_supplier":
        fail("This complaint is not waiting on you.")
    if len(note.strip()) < 10:
        fail("Describe the corrective action in at least 10 characters.")
    run(conn, "update grievances set supplier_note = :n, status = 'open' where id = :id", n=note.strip(), id=g["id"])
    audit(conn, user, "grievance.supplier_response", "grievance", g["id"], {"status": "with_supplier"}, {"status": "open", "note": note.strip()})


def resolve(conn: Connection, actor, number: str, resolution: str, credit_note: str = ""):
    if actor.role not in STAFF_ROLES:
        fail("Only HSP staff can resolve complaints.")
    g = _grievance(conn, number)
    if g["status"] not in ("open", "with_supplier"):
        fail("This complaint is already resolved.")
    if len(resolution.strip()) < 10:
        fail("Record the resolution in at least 10 characters.")
    cn_id = None
    if credit_note.strip():
        cn = one(conn, "select id from credit_notes where number = :n and order_id = :o", n=credit_note.strip(), o=g["order_id"])
        if not cn:
            fail("That credit note does not belong to this order.")
        cn_id = cn["id"]
    run(conn, """update grievances set status = 'resolved', resolution = :r, credit_note_id = :cn, resolved_at = now()
                 where id = :id""", r=resolution.strip(), cn=cn_id, id=g["id"])
    audit(conn, actor, "grievance.resolve", "grievance", g["id"], {"status": g["status"]},
          {"status": "resolved", "resolution": resolution.strip(), "creditNote": credit_note.strip() or None})
    notify_customer_of_order(conn, g["order_id"], "grievance.resolved", {"grievance": g["number"]})


def close(conn: Connection, actor, number: str):
    if actor.role not in STAFF_ROLES:
        fail("Only HSP staff can close complaints.")
    g = _grievance(conn, number)
    if g["status"] != "resolved":
        fail("Resolve the complaint before closing it.")
    run(conn, "update grievances set status = 'closed' where id = :id", id=g["id"])
    audit(conn, actor, "grievance.close", "grievance", g["id"], {"status": "resolved"}, {"status": "closed"})


SELECT = """select g.id::text, g.number, g.category, g.description, g.status, g.raised_by_role, g.supplier_note, g.resolution,
                   g.due_at, g.resolved_at, g.created_at, (g.status in ('open','with_supplier') and g.due_at < now()) as overdue,
                   o.number as order_number, s.name as supplier_name, cn.number as credit_note
            from grievances g join orders o on o.id = g.order_id left join suppliers s on s.id = g.supplier_id
            left join credit_notes cn on cn.id = g.credit_note_id"""


def for_admin(conn: Connection, status: str | None = None):
    if status == "active":
        return all_(conn, SELECT + " where g.status in ('open','with_supplier') order by g.due_at")
    if status:
        return all_(conn, SELECT + " where g.status = :s order by g.due_at", s=status)
    return all_(conn, SELECT + " order by g.created_at desc limit 200")


def for_order(conn: Connection, order_id):
    return all_(conn, SELECT + " where g.order_id = :o order by g.created_at desc", o=order_id)


def for_supplier(conn: Connection, supplier_id):
    # Suppliers see the defect, not the customer or the order value.
    return all_(conn, """select g.number, g.category, g.description, g.status, g.supplier_note, g.due_at, po.number as po_number
                         from grievances g join purchase_orders po on po.order_id = g.order_id and po.supplier_id = g.supplier_id
                         where g.supplier_id = :s order by g.created_at desc""", s=supplier_id)


def for_partner(conn: Connection, partner_id):
    return all_(conn, SELECT + " where o.partner_id = :p order by g.created_at desc", p=partner_id)


def summary(conn: Connection):
    return dict(one(conn, """select count(*) filter (where status in ('open','with_supplier'))::int as open,
                                    count(*) filter (where status in ('open','with_supplier') and due_at < now())::int as overdue,
                                    count(*) filter (where status in ('resolved','closed') and resolved_at <= due_at)::int as on_time,
                                    count(*) filter (where status in ('resolved','closed'))::int as resolved
                             from grievances"""))
