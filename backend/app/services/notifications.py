from sqlalchemy import Connection
from ..db import one
from ..notify import notify


def notify_customer_of_order(conn: Connection, order_id, template: str, extra: dict):
    row = one(conn, """select o.number, c.email, c.phone from orders o join customers c on c.id = o.customer_id
                       where o.id = :id""", id=order_id)
    if not row:
        return
    payload = {"order": row["number"], **extra}
    if row["email"]:
        notify(conn, channel="email", recipient=row["email"], template=template, payload=payload)
    if row["phone"]:
        notify(conn, channel="whatsapp", recipient=row["phone"], template=template, payload=payload)
