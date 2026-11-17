"""Tally Prime XML import: Sales vouchers for orders, Credit Note vouchers for approved credit notes."""
from datetime import datetime, timedelta, timezone
from html import escape
from sqlalchemy import Connection
from ..config import settings
from ..db import all_


def _amt(p: int) -> str:
    return f"{p / 100:.2f}"


def _esc(s: str) -> str:
    return escape(s, quote=True).replace("&#x27;", "'")


def _entry(ledger: str, paise: int, sale: bool, sign: int) -> str:
    return (f"<ALLLEDGERENTRIES.LIST><LEDGERNAME>{_esc(ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>{'No' if sale else 'Yes'}"
            f"</ISDEEMEDPOSITIVE><AMOUNT>{_amt(sign * paise)}</AMOUNT></ALLLEDGERENTRIES.LIST>")


def _tax(gst: int, state: str | None, sale: bool, sign: int) -> str:
    home = settings().hsp_gst_state.strip().lower()
    if not gst:
        return ""
    if not home or not state:
        return _entry("Output GST", gst, sale, sign)
    if state.strip().lower() == home:
        half = gst // 2
        return _entry("Output CGST", half, sale, sign) + _entry("Output SGST", gst - half, sale, sign)
    return _entry("Output IGST", gst, sale, sign)


def _voucher(r) -> str:
    sale = r["kind"] == "sale"
    s = 1 if sale else -1
    goods, freight, gst, total = (int(r[k]) for k in ("goods", "freight", "gst", "total"))
    vt = "Sales" if sale else "Credit Note"
    st = settings()
    party = _esc(r["party"])
    line = lambda ledger, p: _entry(ledger, p, sale, s) if p else ""  # noqa: E731
    return (f'<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="{vt}" ACTION="Create">\n'
            f"<DATE>{r['date'].astimezone(timezone.utc).strftime('%Y%m%d')}</DATE><VOUCHERTYPENAME>{vt}</VOUCHERTYPENAME>"
            f"<VOUCHERNUMBER>{_esc(r['ref'])}</VOUCHERNUMBER>\n<REFERENCE>{_esc(r['order_ref'])}</REFERENCE>"
            f"<PARTYLEDGERNAME>{party}</PARTYLEDGERNAME>"
            + (f"<PARTYGSTIN>{_esc(r['gstin'])}</PARTYGSTIN>" if r["gstin"] else "")
            + (f"<PLACEOFSUPPLY>{_esc(r['state'])}</PLACEOFSUPPLY>" if r["state"] else "")
            + f"\n<ALLLEDGERENTRIES.LIST><LEDGERNAME>{party}</LEDGERNAME><ISDEEMEDPOSITIVE>{'Yes' if sale else 'No'}"
            f"</ISDEEMEDPOSITIVE><AMOUNT>{_amt(-s * total)}</AMOUNT></ALLLEDGERENTRIES.LIST>\n"
            + line(st.tally_sales_ledger, goods) + line(st.tally_freight_ledger, freight) + _tax(gst, r["state"], sale, s)
            + "\n</VOUCHER></TALLYMESSAGE>")


def tally_vouchers_xml(conn: Connection, start: datetime | None = None, end: datetime | None = None):
    f = start or datetime(1970, 1, 1, tzinfo=timezone.utc)
    t = end or datetime.now(timezone.utc) + timedelta(days=1)
    rows = all_(conn, """
        select 'sale' as kind, o.number as ref, o.number as order_ref, o.created_at as date, c.name as party, c.gstin,
               o.shipping_address->>'state' as state, o.subtotal_paise as goods, o.freight_paise as freight, o.gst_paise as gst,
               o.total_paise as total
        from orders o join customers c on c.id = o.customer_id
        where o.status <> 'cancelled' and o.created_at >= :f and o.created_at < :t
        union all
        select 'credit', cn.number, o.number, cn.created_at, c.name, c.gstin, o.shipping_address->>'state',
               cn.taxable_paise, 0, cn.gst_paise, cn.total_paise
        from credit_notes cn join orders o on o.id = cn.order_id join customers c on c.id = o.customer_id
        where cn.status = 'approved' and cn.created_at >= :f and cn.created_at < :t
        order by 4""", f=f, t=t)
    body = "\n".join(_voucher(r) for r in rows)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>'
           "<BODY><IMPORTDATA>\n<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>\n"
           f"{body}\n</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>")
    return len(rows), xml
