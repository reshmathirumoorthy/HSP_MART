"""Tally Prime XML import.

- Sales voucher per order, dated when the goods are dispatched (time of supply / tax invoice), not when the order is
  confirmed. Orders not yet dispatched are not sales.
- Receipt voucher per captured payment. Money received before the invoice is credited to the Customer Advances
  ledger (a liability); money received after it is credited to the customer.
- Journal on the invoice date moving the advances received so far from Customer Advances to the customer.
- Credit Note vouchers for approved credit notes, and a Payment voucher for each refund actually processed
  (debit the customer, credit the bank/clearing ledger).
"""
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


def _simple(vt: str, r, debit: str, credit: str, amount: int, narration: str) -> str:
    """Two-line voucher: debit ledger (ISDEEMEDPOSITIVE Yes, negative amount) and credit ledger."""
    return (f'<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="{vt}" ACTION="Create">\n'
            f"<DATE>{r['date'].astimezone(timezone.utc).strftime('%Y%m%d')}</DATE><VOUCHERTYPENAME>{vt}</VOUCHERTYPENAME>"
            f"<VOUCHERNUMBER>{_esc(r['ref'])}</VOUCHERNUMBER>\n<REFERENCE>{_esc(r['order_ref'])}</REFERENCE>"
            f"<NARRATION>{_esc(narration)}</NARRATION>\n"
            f"<ALLLEDGERENTRIES.LIST><LEDGERNAME>{_esc(debit)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>"
            f"<AMOUNT>{_amt(-amount)}</AMOUNT></ALLLEDGERENTRIES.LIST>\n"
            f"<ALLLEDGERENTRIES.LIST><LEDGERNAME>{_esc(credit)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>"
            f"<AMOUNT>{_amt(amount)}</AMOUNT></ALLLEDGERENTRIES.LIST>\n</VOUCHER></TALLYMESSAGE>")


INVOICE_DATE = """case when o.status in ('dispatched','delivered','closed')
                      then coalesce((select min(sh.dispatched_at) from shipments sh where sh.order_id = o.id), o.delivered_at, o.created_at)
                 end"""


def _render(r) -> str:
    st = settings()
    if r["kind"] in ("sale", "credit"):
        return _voucher(r)
    if r["kind"] == "receipt":
        advance = r["invoice_date"] is None or r["date"] < r["invoice_date"]
        return _simple("Receipt", r, st.tally_bank_ledger, st.tally_advance_ledger if advance else r["party"], int(r["total"]),
                       f"{'Advance' if advance else 'Payment'} received for order {r['order_ref']}")
    if r["kind"] == "refund":
        return _simple("Payment", r, r["party"], st.tally_bank_ledger, int(r["total"]),
                       f"Refund against credit note {r['ref'].removeprefix('RFND-')} on order {r['order_ref']}")
    return _simple("Journal", r, st.tally_advance_ledger, r["party"], int(r["total"]),
                   f"Advance adjusted against invoice {r['order_ref']}")


def tally_vouchers_xml(conn: Connection, start: datetime | None = None, end: datetime | None = None):
    f = start or datetime(1970, 1, 1, tzinfo=timezone.utc)
    t = end or datetime.now(timezone.utc) + timedelta(days=1)
    rows = all_(conn, """
        with inv as (select o.*, {INVOICE_DATE} as invoice_date from orders o where o.status <> 'cancelled')
        select 'sale' as kind, o.number as ref, o.number as order_ref, o.invoice_date as date, c.name as party, c.gstin,
               o.shipping_address->>'state' as state, o.subtotal_paise as goods, o.freight_paise as freight, o.gst_paise as gst,
               o.total_paise as total, o.invoice_date
        from inv o join customers c on c.id = o.customer_id
        where o.invoice_date >= :f and o.invoice_date < :t
        union all
        select 'credit', cn.number, o.number, cn.created_at, c.name, c.gstin, o.shipping_address->>'state',
               cn.taxable_paise, 0, cn.gst_paise, cn.total_paise, null
        from credit_notes cn join orders o on o.id = cn.order_id join customers c on c.id = o.customer_id
        where cn.status = 'approved' and cn.created_at >= :f and cn.created_at < :t
        union all
        select 'receipt', 'RCPT-' || coalesce(p.provider_payment_id, p.id::text), o.number, coalesce(p.settled_at, p.created_at),
               c.name, c.gstin, null, 0, 0, 0, p.amount_paise, o.invoice_date
        from payments p join inv o on o.id = p.order_id join customers c on c.id = o.customer_id
        where p.status in ('captured','refunded','partially_refunded')
          and coalesce(p.settled_at, p.created_at) >= :f and coalesce(p.settled_at, p.created_at) < :t
        union all
        select 'refund', 'RFND-' || cn.number, o.number, cn.created_at, c.name, c.gstin, null, 0, 0, 0, cn.refund_paise, null
        from credit_notes cn join orders o on o.id = cn.order_id join customers c on c.id = o.customer_id
        where cn.status = 'approved' and cn.refund_status = 'processed' and cn.refund_paise > 0
          and cn.created_at >= :f and cn.created_at < :t
        union all
        select 'adjust', 'ADV-' || o.number, o.number, o.invoice_date, c.name, c.gstin, null, 0, 0, 0,
               sum(p.amount_paise), o.invoice_date
        from inv o join customers c on c.id = o.customer_id join payments p on p.order_id = o.id
        where p.status in ('captured','refunded','partially_refunded') and coalesce(p.settled_at, p.created_at) < o.invoice_date
          and o.invoice_date >= :f and o.invoice_date < :t
        group by o.number, o.invoice_date, c.name, c.gstin
        order by 4""".format(INVOICE_DATE=INVOICE_DATE), f=f, t=t)
    body = "\n".join(_render(r) for r in rows)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>'
           "<BODY><IMPORTDATA>\n<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>\n"
           f"{body}\n</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>")
    return len(rows), xml
