"""Scale-readiness gate (Blueprint §10, "conditions before scaling"), measured from live data.

Each check returns pass / fail / no_data with its value and target. Targets are management defaults and can be
changed here; the blueprint sets the conditions but not the numbers, except the 12% contribution floor.
"""
from sqlalchemy import Connection
from ..db import one

WINDOW = "90 days"
MIN_CONTRIBUTION_BPS = 1200
TARGETS = {"contributionShare": 90.0, "supplierOnTime": 90.0, "defectRate": 2.0, "repeatAssociates": 30.0, "complaintOnTime": 90.0}


def _check(key, label, value, target, ok, unit="%", detail="", has_data=True):
    return {"key": key, "label": label, "value": value, "target": target, "unit": unit, "detail": detail,
            "status": "no_data" if not has_data else ("pass" if ok else "fail")}


def checks(conn: Connection) -> list[dict]:
    out = []
    r = one(conn, """select count(*)::int as n,
                            count(*) filter (where paid_paise - refunded_paise <> total_paise - credited_paise)::int as bad
                     from orders where status = 'closed'""")
    out.append(_check("reconciliation", "Closed orders reconcile exactly (paid − refunded = invoiced − credited)",
                      r["bad"], 0, r["bad"] == 0, "orders", f"{r['n']} closed orders checked", r["n"] > 0))

    r = one(conn, """with latest as (select distinct on (order_id) order_id, status from commission_ledger
                                     order by order_id, created_at desc, id desc)
                     select count(*)::int as n,
                            count(*) filter (where (o.status = 'cancelled' and l.status <> 'reversed')
                                             or (l.status in ('approved','paid')
                                                 and o.paid_paise - o.refunded_paise < o.total_paise - o.credited_paise))::int as bad
                     from latest l join orders o on o.id = l.order_id""")
    out.append(_check("commission", "No commission on cancelled or unpaid orders", r["bad"], 0, r["bad"] == 0, "orders",
                      f"{r['n']} commissioned orders checked", r["n"] > 0))

    r = one(conn, f"""select count(*)::int as n, count(*) filter (where q.contribution_bps >= {MIN_CONTRIBUTION_BPS})::int as ok
                      from orders o join quotations q on q.id = o.quotation_id
                      where q.channel <> 'direct' and o.status <> 'cancelled' and o.created_at > now() - interval '{WINDOW}'""")
    share = round(r["ok"] / r["n"] * 100, 1) if r["n"] else None
    out.append(_check("contribution", "Partner orders meeting the 12% contribution floor (90 days)", share,
                      TARGETS["contributionShare"], share is not None and share >= TARGETS["contributionShare"],
                      detail=f"{r['ok']} of {r['n']} orders", has_data=r["n"] > 0))

    r = one(conn, f"""with po as (
                         select po.id, po.created_at, sh.delivered_at,
                                (select max(sr.lead_time_days) from order_lines l join supplier_rates sr
                                   on sr.product_id = l.product_id and sr.supplier_id = po.supplier_id where l.order_id = po.order_id) as lead
                         from purchase_orders po join shipments sh on sh.purchase_order_id = po.id
                         where sh.delivered_at is not null and po.created_at > now() - interval '{WINDOW}')
                      select count(*)::int as n,
                             count(*) filter (where delivered_at <= created_at + make_interval(days => coalesce(lead, 7) + 2))::int as ok
                      from po""")
    on_time = round(r["ok"] / r["n"] * 100, 1) if r["n"] else None
    out.append(_check("supplier_on_time", "Supplier deliveries within lead time + 2 days (90 days)", on_time,
                      TARGETS["supplierOnTime"], on_time is not None and on_time >= TARGETS["supplierOnTime"],
                      detail=f"{r['ok']} of {r['n']} delivered POs", has_data=r["n"] > 0))

    r = one(conn, f"""select (select count(*) from orders where delivered_at > now() - interval '{WINDOW}')::int as delivered,
                             (select count(distinct g.order_id) from grievances g join orders o on o.id = g.order_id
                              where g.category in ('damaged','wrong_item','quality','missing')
                                and o.delivered_at > now() - interval '{WINDOW}')::int as defects""")
    rate = round(r["defects"] / r["delivered"] * 100, 1) if r["delivered"] else None
    out.append(_check("supplier_quality", "Delivered orders with a supply-defect complaint (90 days)", rate,
                      TARGETS["defectRate"], rate is not None and rate <= TARGETS["defectRate"],
                      detail=f"{r['defects']} of {r['delivered']} orders", has_data=r["delivered"] > 0))

    r = one(conn, """with per as (select o.partner_id, o.customer_id, count(*) as n from orders o join partners p on p.id = o.partner_id
                                  where p.type = 'associate' and o.status <> 'cancelled' group by 1, 2)
                     select count(distinct partner_id)::int as productive,
                            count(distinct partner_id) filter (where n >= 2)::int as repeat from per""")
    rep = round(r["repeat"] / r["productive"] * 100, 1) if r["productive"] else None
    out.append(_check("repeat_business", "Productive associates with a repeat customer", rep, TARGETS["repeatAssociates"],
                      rep is not None and rep >= TARGETS["repeatAssociates"],
                      detail=f"{r['repeat']} of {r['productive']} associates", has_data=r["productive"] > 0))

    r = one(conn, """select count(*) filter (where status in ('resolved','closed'))::int as resolved,
                            count(*) filter (where status in ('resolved','closed') and resolved_at <= due_at)::int as on_time,
                            count(*) filter (where status in ('open','with_supplier') and due_at < now())::int as overdue
                     from grievances""")
    ct = round(r["on_time"] / r["resolved"] * 100, 1) if r["resolved"] else None
    out.append(_check("complaints", "Complaints resolved within the 3-day target", ct, TARGETS["complaintOnTime"],
                      ct is not None and ct >= TARGETS["complaintOnTime"] and r["overdue"] <= 5,
                      detail=f"{r['on_time']} of {r['resolved']} resolved on time; {r['overdue']} overdue now",
                      has_data=r["resolved"] > 0))
    return out


def summary(conn: Connection) -> dict:
    c = checks(conn)
    return {"checks": c, "ready": all(x["status"] == "pass" for x in c),
            "passed": sum(x["status"] == "pass" for x in c), "total": len(c)}
