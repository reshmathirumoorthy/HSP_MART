"""Bulk recipient upload & multi-location fulfilment."""
import csv
import io
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import one, run
from ..errors import fail


def parse_recipients_csv(text: str) -> list[dict]:
    """Columns: name, phone, address, city, pincode[, quantity]. Header optional. Quote fields containing commas."""
    lines = [l.strip() for l in re.split(r"\r?\n", text) if l.strip()]
    if lines and re.match(r"^name\s*,", lines[0], re.I):
        lines.pop(0)
    if not lines:
        fail("The file has no recipients.")
    if len(lines) > 5000:
        fail("Upload at most 5,000 recipients at a time.")
    errors, rows = [], []
    for i, line in enumerate(lines, 1):
        cols = [c.strip() for c in next(csv.reader(io.StringIO(line), skipinitialspace=True))] + [""] * 6
        name, phone_raw, address, city, pincode, qty = cols[:6]
        phone = re.sub(r"^(91|0)(?=\d{10}$)", "", re.sub(r"\D", "", phone_raw))
        quantity = int(qty) if re.fullmatch(r"\d+", qty) else (1 if not qty else -1)
        if not name:
            errors.append(f"Row {i}: name missing")
        if not re.fullmatch(r"[6-9]\d{9}", phone):
            errors.append(f"Row {i}: invalid mobile")
        if not address or not city:
            errors.append(f"Row {i}: address and city required")
        if not re.fullmatch(r"[1-9]\d{5}", pincode):
            errors.append(f"Row {i}: invalid PIN code")
        if quantity <= 0:
            errors.append(f"Row {i}: invalid quantity")
        rows.append({"name": name, "phone": f"+91{phone}", "address_line": address, "city": city.strip(), "pincode": pincode, "quantity": quantity})
    if errors:
        fail("; ".join(errors[:5]) + (f" (+{len(errors) - 5} more)" if len(errors) > 5 else ""))
    return rows


def upload_recipients(conn: Connection, actor, order_number: str, text: str):
    rows = parse_recipients_csv(text)
    o = one(conn, "select * from orders where number = :n for update", n=order_number) or fail("Order not found.")
    if o["status"] in ("dispatched", "delivered", "closed", "cancelled"):
        fail("Recipients can only change before dispatch.")
    units = one(conn, "select coalesce(sum(quantity),0)::int as u from order_lines where order_id = :id", id=o["id"])["u"]
    total = sum(r["quantity"] for r in rows)
    if total != units:
        fail(f"Recipients account for {total} units but the order has {units}.")
    run(conn, "delete from recipients where order_id = :id", id=o["id"])
    for r in rows:
        run(conn, """insert into recipients (order_id, name, phone, address_line, city, pincode, quantity)
                     values (:o, :name, :phone, :address_line, :city, :pincode, :quantity)""", o=o["id"], **r)
    cities = len({r["city"].lower() for r in rows})
    audit(conn, actor, "order.recipients_uploaded", "order", o["id"], None, {"recipients": len(rows), "cities": cities})
    return {"recipients": len(rows), "cities": cities}
