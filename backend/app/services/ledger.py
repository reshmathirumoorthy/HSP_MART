"""Append-only commission ledger: the latest row per order is its current state."""
from sqlalchemy import Connection
from ..db import all_, run
from ..errors import fail


def latest_ledger(conn: Connection, *, partner_id: str | None = None, order_id: str | None = None):
    cond, params = "true", {}
    if order_id:
        cond, params = "order_id = cast(:v as uuid)", {"v": order_id}
    elif partner_id:
        cond, params = "partner_id = cast(:v as uuid)", {"v": partner_id}
    return all_(conn, f"""select distinct on (order_id) id::text, partner_id::text, order_id::text, rate_bps,
                              eligible_base_paise::bigint as eligible_base_paise, amount_paise::bigint as amount_paise,
                              deductions_paise::bigint as deductions_paise, status::text as status,
                              payout_id::text, created_at
                          from commission_ledger where {cond}
                          order by order_id, created_at desc, id desc""", **params)


def append_ledger(conn: Connection, prev: dict, status: str, note: str, deductions: int | None = None,
                  payout_id: str | None = None):
    run(conn, """insert into commission_ledger (partner_id, order_id, rate_bps, eligible_base_paise, amount_paise,
                     deductions_paise, payout_id, status, note)
                 values (cast(:p as uuid), cast(:o as uuid), :r, :b, :a, :d, cast(:po as uuid), :s, :n)""",
        p=prev["partner_id"], o=prev["order_id"], r=prev["rate_bps"], b=prev["eligible_base_paise"],
        a=prev["amount_paise"], d=prev["deductions_paise"] if deductions is None else deductions, s=status, n=note,
        po=payout_id)


def earn_commission(conn: Connection, order: dict):
    rows = latest_ledger(conn, order_id=str(order["id"]))
    if not rows or rows[0]["status"] != "pending":
        return
    cur = rows[0]
    from .pricing import pct
    deductions = pct(min(order["credited_taxable_paise"], cur["eligible_base_paise"]), cur["rate_bps"])
    append_ledger(conn, cur, "earned", "Payment realised, delivered and reconciled", deductions)


def reverse_commission(conn: Connection, order_id: str, note: str):
    rows = latest_ledger(conn, order_id=order_id)
    if not rows or rows[0]["status"] == "reversed":
        return
    if rows[0]["status"] == "paid":
        fail("Commission already paid; raise a clawback via finance.")
    append_ledger(conn, rows[0], "reversed", note)
