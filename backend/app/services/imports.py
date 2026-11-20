"""CSV imports for the datasets the blueprint asks HSP for (§11) and for the CA's GST decisions.

Every import validates all rows first; nothing is written unless the whole file is valid (one transaction).
`dry_run=True` returns the preview without writing. Each applied import is audited.
"""
import csv
import io
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .catalogue import request_storefront_refresh

KINDS = {
    "product_costs": {
        "roles": ("hsp_admin", "hsp_procurement"),
        "columns": ["sku", "landed_cost_rupees", "selling_price_rupees"],
        "help": "Dataset 1: landed purchase cost per SKU (excl. GST); selling price optional (excl. GST).",
        "example": ["HSP-STN-001", "250.00", "420.00"],
    },
    "suppliers": {
        "roles": ("hsp_admin", "hsp_procurement"),
        "columns": ["supplier_name", "city", "gstin", "login_email", "sku", "cost_rupees", "lead_time_days", "stock_quantity"],
        "help": "Dataset 3: one row per supplier × SKU. New suppliers are created as 'pending' until procurement approves them.",
        "example": ["Shree Packers", "Pune", "27ABCDE1234F1Z5", "orders@shreepackers.in", "HSP-STN-001", "240.00", "5", "500"],
    },
    "sales_history": {
        "roles": ("hsp_admin", "hsp_finance"),
        "columns": ["month", "channel", "division", "orders", "revenue_rupees", "cost_rupees"],
        "help": "Dataset 2: last 12 months of sales, excl. GST. channel: associate, franchise, direct, online or other.",
        "example": ["2025-11", "direct", "corporate", "14", "1250000.00", "880000.00"],
    },
    "gst_decisions": {
        "roles": ("hsp_admin", "hsp_finance"),
        "columns": ["sku", "proposed_hsn", "ca_decision", "ca_initials"],
        "help": "The CA's completed docs/compliance/gst-review.csv. Rows without both ca_decision (rate %) and ca_initials are skipped.",
        "example": ["HSP-STN-001", "4820", "0", "RK"],
    },
}
GST_RATES = {0, 0.25, 3, 5, 12, 18, 28, 40}
DIVISIONS = {"corporate", "promotional", "premium", "personal", "festive"}
CHANNELS = {"associate", "franchise", "direct", "online", "other"}


def template(kind: str) -> str:
    k = KINDS.get(kind) or fail("Unknown import.")
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(k["columns"])
    w.writerow(k["example"])
    return out.getvalue()


def _paise(v: str, field: str, errors: list, n: int, required=True):
    v = (v or "").replace(",", "").replace("₹", "").strip()
    if not v:
        if required:
            errors.append(f"Row {n}: {field} is required.")
        return None
    try:
        p = round(float(v) * 100)
    except ValueError:
        errors.append(f"Row {n}: {field} must be a number.")
        return None
    if p <= 0:
        errors.append(f"Row {n}: {field} must be positive.")
        return None
    return p


def _int(v: str, field: str, errors: list, n: int, required=True):
    v = (v or "").strip()
    if not v:
        if required:
            errors.append(f"Row {n}: {field} is required.")
        return None
    if not re.fullmatch(r"\d+", v):
        errors.append(f"Row {n}: {field} must be a whole number.")
        return None
    return int(v)


def run_import(conn: Connection, actor, kind: str, data: bytes, dry_run: bool = True) -> dict:
    k = KINDS.get(kind) or fail("Unknown import.")
    if actor.role not in k["roles"]:
        fail("You are not allowed to run this import.")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        fail("Save the file as CSV (UTF-8).")
    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in k["columns"] if c not in (reader.fieldnames or [])]
    if kind == "gst_decisions":
        missing = [c for c in ("sku", "ca_decision", "ca_initials") if c not in (reader.fieldnames or [])]
    if missing:
        fail(f"Missing columns: {', '.join(missing)}. Download the template for the expected layout.")
    rows = list(reader)
    if not rows:
        fail("The file has no data rows.")
    if len(rows) > 20_000:
        fail("Split files larger than 20,000 rows.")
    skus = {p["sku"].upper(): p for p in all_(conn, "select id, sku, price_paise, cost_paise, gst_rate_bps, hsn_code from products")}
    errors, changes, skipped = [], [], 0
    for n, r in enumerate(rows, start=2):
        r = {key: (val or "").strip() for key, val in r.items() if key}
        if kind in ("product_costs", "suppliers", "gst_decisions"):
            p = skus.get(r.get("sku", "").upper())
            if not p:
                errors.append(f"Row {n}: unknown SKU {r.get('sku') or '(blank)'}.")
                continue
        if kind == "product_costs":
            cost = _paise(r["landed_cost_rupees"], "landed_cost_rupees", errors, n)
            price = _paise(r.get("selling_price_rupees", ""), "selling_price_rupees", errors, n, required=False)
            if cost and price and cost >= price:
                errors.append(f"Row {n}: cost {cost / 100:.2f} is not below the selling price {price / 100:.2f}.")
            if cost:
                changes.append({"sku": p["sku"], "id": p["id"], "cost": cost, "price": price,
                                "before": {"cost": p["cost_paise"], "price": p["price_paise"]}})
        elif kind == "suppliers":
            if not r.get("supplier_name"):
                errors.append(f"Row {n}: supplier_name is required.")
            cost = _paise(r["cost_rupees"], "cost_rupees", errors, n)
            lead = _int(r["lead_time_days"], "lead_time_days", errors, n)
            stock = _int(r.get("stock_quantity", ""), "stock_quantity", errors, n, required=False)
            gstin = r.get("gstin", "").upper()
            if gstin and not re.fullmatch(r"\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]", gstin):
                errors.append(f"Row {n}: GSTIN {gstin} is not valid.")
            changes.append({"supplier": r.get("supplier_name"), "city": r.get("city", ""), "gstin": gstin,
                            "email": r.get("login_email", "").lower(), "sku": p["sku"], "productId": p["id"],
                            "cost": cost, "lead": lead, "stock": stock})
        elif kind == "sales_history":
            m = r.get("month", "")
            if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", m):
                errors.append(f"Row {n}: month must be YYYY-MM.")
            if r.get("channel") not in CHANNELS:
                errors.append(f"Row {n}: channel must be one of {', '.join(sorted(CHANNELS))}.")
            div = r.get("division") or None
            if div and div not in DIVISIONS:
                errors.append(f"Row {n}: division must be one of {', '.join(sorted(DIVISIONS))} or blank.")
            orders = _int(r["orders"], "orders", errors, n)
            rev = _paise(r["revenue_rupees"], "revenue_rupees", errors, n)
            cost = _paise(r.get("cost_rupees", ""), "cost_rupees", errors, n, required=False)
            changes.append({"month": m, "channel": r.get("channel"), "division": div, "orders": orders, "revenue": rev, "cost": cost})
        elif kind == "gst_decisions":
            dec, initials = r.get("ca_decision", ""), r.get("ca_initials", "")
            if not dec or not initials:
                skipped += 1
                continue
            try:
                rate = float(dec.rstrip("%"))
            except ValueError:
                errors.append(f"Row {n}: ca_decision must be a GST rate like 5 or 18.")
                continue
            if rate not in GST_RATES:
                errors.append(f"Row {n}: {rate}% is not a GST rate.")
                continue
            hsn = r.get("proposed_hsn", "") or p["hsn_code"] or ""
            if hsn and not re.fullmatch(r"\d{4}(\d{2}){0,2}", hsn):
                errors.append(f"Row {n}: HSN {hsn} must be 4, 6 or 8 digits.")
            changes.append({"sku": p["sku"], "id": p["id"], "rateBps": round(rate * 100), "hsn": hsn or None, "by": initials,
                            "before": {"rateBps": p["gst_rate_bps"], "hsn": p["hsn_code"]}})
    summary = {"kind": kind, "rows": len(rows), "valid": len(changes), "skipped": skipped, "errors": errors[:200],
               "errorCount": len(errors), "preview": [{k2: v for k2, v in c.items() if k2 not in ("id", "productId")} for c in changes[:20]],
               "applied": False}
    if errors or dry_run:
        return summary
    _apply(conn, actor, kind, changes)
    audit(conn, actor, f"import.{kind}", "import", kind, None, {"rows": len(changes), "skipped": skipped})
    summary["applied"] = True
    return summary


def _apply(conn: Connection, actor, kind: str, changes: list[dict]):
    if kind == "product_costs":
        for c in changes:
            run(conn, """update products set cost_paise = :c, price_paise = coalesce(:p, price_paise), updated_at = now()
                         where id = :id""", c=c["cost"], p=c["price"], id=c["id"])
        request_storefront_refresh(conn)
    elif kind == "suppliers":
        from .suppliers import create_supplier
        ids: dict[str, str] = {}
        for c in changes:
            name = c["supplier"]
            if name not in ids:
                s = one(conn, "select id::text from suppliers where lower(name) = lower(:n)", n=name)
                ids[name] = s["id"] if s else create_supplier(conn, actor, name, c["city"], c["gstin"], c["email"])["id"]
            run(conn, """insert into supplier_rates (supplier_id, product_id, cost_paise, lead_time_days, stock_quantity)
                         values (cast(:s as uuid), :p, :c, :l, :st)
                         on conflict (supplier_id, product_id) do update set cost_paise = excluded.cost_paise,
                             lead_time_days = excluded.lead_time_days,
                             stock_quantity = coalesce(excluded.stock_quantity, supplier_rates.stock_quantity)""",
                s=ids[name], p=c["productId"], c=c["cost"], l=c["lead"], st=c["stock"])
    elif kind == "sales_history":
        for c in changes:
            run(conn, """insert into sales_history (month, channel, division, orders, revenue_paise, cost_paise)
                         values (:m, :ch, :d, :o, :r, :c)
                         on conflict (month, channel, division) do update set orders = excluded.orders,
                             revenue_paise = excluded.revenue_paise, cost_paise = excluded.cost_paise""",
                m=c["month"], ch=c["channel"], d=c["division"], o=c["orders"], r=c["revenue"], c=c["cost"])
    elif kind == "gst_decisions":
        for c in changes:
            run(conn, "update products set gst_rate_bps = :g, hsn_code = :h, updated_at = now() where id = :id",
                g=c["rateBps"], h=c["hsn"], id=c["id"])
            if c["before"]["rateBps"] != c["rateBps"] or c["before"]["hsn"] != c["hsn"]:
                audit(conn, actor, "product.gst_classified", "product", c["id"], c["before"],
                      {"rateBps": c["rateBps"], "hsn": c["hsn"], "caInitials": c["by"]})
        request_storefront_refresh(conn)
