from sqlalchemy import Connection
from ..audit import audit
from ..db import one, run
from ..errors import fail
from .common import EMAIL_RE, is_uuid, supplier_for_user


def create_supplier(conn: Connection, actor, name: str, city: str = "", gstin: str = "", login_email: str = ""):
    name = name.strip()
    if not name:
        fail("Supplier name is required.")
    user_id = None
    email = login_email.strip().lower()
    if email:
        if not EMAIL_RE.fullmatch(email):
            fail("Enter a valid supplier login email.")
        existing = one(conn, "select id, role::text as role from users where email = :e", e=email)
        if existing and existing["role"] not in ("customer", "supplier"):
            fail("That email belongs to a staff or partner account.")
        if existing:
            run(conn, "update users set role = 'supplier' where id = :id", id=existing["id"])
            user_id = existing["id"]
        else:
            user_id = one(conn, "insert into users (email, role, name) values (:e, 'supplier', :n) returning id",
                          e=email, n=name)["id"]
    s = one(conn, """insert into suppliers (name, city, gstin, user_id) values (:n, :c, :g, :u)
                     returning id::text, name, status::text as status""",
            n=name, c=city or None, g=gstin or None, u=user_id)
    audit(conn, actor, "supplier.create", "supplier", s["id"], None, {"name": s["name"], "status": s["status"], "login": email or None})
    return s


def set_supplier_status(conn: Connection, actor, supplier_id: str, status: str):
    if actor.role not in ("hsp_admin", "hsp_procurement"):
        fail("Only procurement can approve suppliers.")
    if status not in ("approved", "suspended"):
        fail("Unknown status.")
    before = one(conn, "select status::text as status from suppliers where id = cast(:id as uuid)", id=supplier_id) \
        if is_uuid(supplier_id) else None
    if not before:
        fail("Supplier not found.")
    run(conn, "update suppliers set status = cast(:s as supplier_status) where id = cast(:id as uuid)", s=status, id=supplier_id)
    audit(conn, actor, f"supplier.{status}", "supplier", supplier_id, {"status": before["status"]}, {"status": status})


def set_supplier_rate(conn: Connection, actor, supplier_id: str, sku: str, cost_paise: int, lead_time_days: int):
    if cost_paise <= 0:
        fail("Cost must be positive.")
    p = one(conn, "select id, sku from products where upper(sku) = :s", s=sku.strip().upper())
    if not p:
        fail(f"Unknown SKU: {sku}")
    run(conn, """insert into supplier_rates (supplier_id, product_id, cost_paise, lead_time_days)
                 values (cast(:s as uuid), :p, :c, :l)
                 on conflict (supplier_id, product_id) do update set cost_paise = excluded.cost_paise,
                     lead_time_days = excluded.lead_time_days""",
        s=supplier_id, p=p["id"], c=cost_paise, l=lead_time_days)
    audit(conn, actor, "supplier.rate_set", "supplier", supplier_id, None,
          {"sku": p["sku"], "costPaise": cost_paise, "leadTimeDays": lead_time_days})


# ── Supplier self-service ──

def acknowledge_purchase_order(conn: Connection, user, po_id: str):
    supplier = supplier_for_user(conn, user.id) or fail("No supplier account linked.")
    po = one(conn, "select * from purchase_orders where id = :id", id=po_id) if is_uuid(po_id) else None
    if not po or po["supplier_id"] != supplier["id"]:
        fail("Purchase order not found.")
    if po["status"] != "issued":
        fail("Purchase order already acknowledged.")
    run(conn, "update purchase_orders set status = 'acknowledged' where id = :id", id=po_id)
    audit(conn, user, "po.acknowledge", "purchase_order", po_id, {"status": po["status"]}, {"status": "acknowledged"})


def update_supplier_stock(conn: Connection, user, rate_id: str, stock: int):
    supplier = supplier_for_user(conn, user.id) or fail("No supplier account linked.")
    if not isinstance(stock, int) or stock < 0:
        fail("Stock must be a whole number.")
    r = one(conn, "select * from supplier_rates where id = :id", id=rate_id) if is_uuid(rate_id) else None
    if not r or r["supplier_id"] != supplier["id"]:
        fail("Product not found.")
    run(conn, "update supplier_rates set stock_quantity = :s where id = :id", s=stock, id=rate_id)
    audit(conn, user, "supplier.stock_update", "supplier_rate", rate_id, {"stock": r["stock_quantity"]}, {"stock": stock})
