"""CSV registers for any accounting system."""
import csv
import io
import re
from sqlalchemy import Connection
from ..db import all_

QUERIES = {
    "sales": """select o.number as invoice_ref, to_char(o.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as date,
           c.name as customer, coalesce(c.gstin,'') as gstin, o.subtotal_paise / 100.0 as taxable_value,
           o.gst_paise / 100.0 as gst, o.total_paise / 100.0 as invoice_total,
           o.credited_paise / 100.0 as credited, (o.paid_paise - o.refunded_paise) / 100.0 as received, o.status::text as status
        from orders o join customers c on c.id = o.customer_id where o.status <> 'cancelled' order by o.created_at""",
    "credit_notes": """select cn.number as credit_note, o.number as invoice_ref,
           to_char(cn.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as date,
           c.name as customer, coalesce(c.gstin,'') as gstin, cn.taxable_paise / 100.0 as taxable_value, cn.gst_paise / 100.0 as gst,
           cn.total_paise / 100.0 as credit_total, cn.refund_paise / 100.0 as refund, cn.refund_status as refund_status, cn.reason
        from credit_notes cn join orders o on o.id = cn.order_id join customers c on c.id = o.customer_id
        where cn.status = 'approved' order by cn.created_at""",
    "commissions": """select p.code as partner, o.number as order_ref, l.status::text as status, l.rate_bps / 100.0 as rate_pct,
           l.eligible_base_paise / 100.0 as eligible_base, (l.amount_paise - l.deductions_paise) / 100.0 as commission,
           to_char(l.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') as recorded_at
        from commission_ledger l join partners p on p.id = l.partner_id join orders o on o.id = l.order_id
        order by l.created_at""",
    "payouts": """select p.code as partner, p.pan, po.gross_paise / 100.0 as gross, po.tds_paise / 100.0 as tds,
           po.net_paise / 100.0 as net, po.status::text as status, coalesce(po.transfer_reference,'') as reference,
           to_char(po.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as date
        from payouts po join partners p on p.id = po.partner_id order by po.created_at""",
}


def _cell(v) -> str:
    if v is None:
        return ""
    s = str(v)  # Decimal keeps Postgres's text form, as the Next.js export did
    try:
        float(s)
        numeric = True
    except ValueError:
        numeric = False
    # Neutralise spreadsheet formula injection.
    return f"'{s}" if re.match(r"^[=+\-@]", s) and not numeric else s


def export_csv(conn: Connection, kind: str) -> tuple[int, str] | None:
    q = QUERIES.get(kind)
    if not q:
        return None
    rows = all_(conn, q)
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    if rows:
        w.writerow(rows[0].keys())
        for r in rows:
            w.writerow([_cell(v) for v in r.values()])
    else:
        out.write("")
    return len(rows), out.getvalue().rstrip("\n")
