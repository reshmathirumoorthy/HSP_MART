"""Management metrics: HSP profitability and the actual income distribution of active associates."""
from sqlalchemy import Connection
from ..db import all_, one


def channel_economics(conn: Connection):
    return all_(conn, """select q.channel, count(*)::int as orders, sum(o.subtotal_paise)::bigint as revenue_paise,
                                sum(round(o.subtotal_paise * q.contribution_bps / 10000.0))::bigint as contribution_paise
                         from orders o join quotations q on q.id = o.quotation_id
                         where o.status <> 'cancelled' group by q.channel order by q.channel""")


def overdue_orders(conn: Connection):
    return all_(conn, """select number, status::text as status,
                                (total_paise - credited_paise - paid_paise + refunded_paise)::bigint as balance_paise,
                                extract(day from now() - created_at)::int as age_days
                         from orders
                         where status not in ('cancelled','closed')
                           and total_paise - credited_paise - paid_paise + refunded_paise > 0
                           and (status in ('dispatched','delivered') or created_at < now() - interval '7 days')
                         order by created_at""")


BUCKETS = [("₹0", 0, 0), ("₹1–999", 1, 99_900), ("₹1k–5k", 100_000, 499_999), ("₹5k–15k", 500_000, 1_499_999),
           ("₹15k+", 1_500_000, 2**62)]


def associate_income_distribution(conn: Connection):
    data = all_(conn, """with latest as (
                           select distinct on (order_id) partner_id, status, amount_paise - deductions_paise as net, created_at
                           from commission_ledger order by order_id, created_at desc, id desc)
                         select p.id, coalesce(sum(l.net) filter (where l.status in ('earned','approved','paid')
                                and l.created_at > now() - interval '30 days'), 0)::bigint as income_paise
                         from partners p left join latest l on l.partner_id = p.id
                         where p.status = 'active' and p.type = 'associate' group by p.id""")
    incomes = sorted(int(d["income_paise"]) for d in data)
    return {"associates": len(incomes), "median": incomes[len(incomes) // 2] if incomes else 0,
            "buckets": [{"label": l, "count": sum(1 for v in incomes if lo <= v <= hi)} for l, lo, hi in BUCKETS]}


def inactive_partners(conn: Connection, days: int = 30):
    return all_(conn, """select p.code, p.type::text as type, p.city from partners p where p.status = 'active'
                           and not exists (select 1 from leads l where l.partner_id = p.id and l.created_at > now() - make_interval(days => :d))
                           and not exists (select 1 from quotations q where q.partner_id = p.id and q.created_at > now() - make_interval(days => :d))
                         order by p.created_at""", d=days)


def margin_exceptions(conn: Connection):
    return dict(one(conn, """select count(*) filter (where status = 'pending_approval')::int as pending,
                                    count(*) filter (where below_minimum and status <> 'pending_approval')::int as approved
                             from quotations"""))


def deposit_liability(conn: Connection) -> int:
    return int(one(conn, "select coalesce(sum(security_deposit_paise),0)::bigint as t from partners")["t"])


def customer_advances(conn: Connection):
    """Money received on orders not yet delivered: a liability (unearned revenue), not sales (Blueprint §3)."""
    return dict(one(conn, """select count(*)::int as orders,
                                    coalesce(sum(least(paid_paise - refunded_paise, total_paise - credited_paise)), 0)::bigint as advances_paise
                             from orders
                             where status not in ('delivered','closed','cancelled') and paid_paise - refunded_paise > 0"""))


FESTIVE_MONTHS = {3: "Holi", 10: "Diwali", 11: "Diwali", 12: "Christmas & year-end"}


def demand_forecast(conn: Connection, months_ahead: int = 3):
    """Units by division per month for the last 12 months and a simple next-quarter forecast:
    trailing 3-month average, with the same month last year as a floor for festive months.
    Deliberately transparent — replace with a fitted model once a full year of real orders exists."""
    from datetime import date
    rows = all_(conn, """select p.division::text as division, to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
                                sum(l.quantity)::int as units
                         from orders o join order_lines l on l.order_id = o.id join products p on p.id = l.product_id
                         where o.status <> 'cancelled' and o.created_at >= date_trunc('month', now()) - interval '12 months'
                         group by 1, 2 order by 1, 2""")
    today = date.today()

    def shift(y, m, k):
        m0 = m - 1 + k
        return y + m0 // 12, m0 % 12 + 1

    hist: dict[str, dict[str, int]] = {}
    for r in rows:
        hist.setdefault(r["division"], {})[r["month"]] = r["units"]
    out = []
    for division, months in sorted(hist.items()):
        recent = [months.get("%04d-%02d" % shift(today.year, today.month, -k), 0) for k in (1, 2, 3)]
        base = round(sum(recent) / 3)
        forecast = []
        for k in range(1, months_ahead + 1):
            y, m = shift(today.year, today.month, k)
            last_year = months.get("%04d-%02d" % (y - 1, m), 0)
            units = max(base, last_year) if m in FESTIVE_MONTHS else base
            forecast.append({"month": "%04d-%02d" % (y, m), "units": units, "season": FESTIVE_MONTHS.get(m)})
        out.append({"division": division, "history": [{"month": k, "units": v} for k, v in sorted(months.items())],
                    "forecast": forecast})
    return out


def franchise_analytics(conn: Connection):
    return all_(conn, """select p.code, p.city, p.status::text as status, p.security_deposit_paise,
                                (select count(*) from leads l where l.partner_id = p.id)::int as leads,
                                (select count(*) from quotations q where q.partner_id = p.id)::int as quotes,
                                count(o.id)::int as orders,
                                coalesce(sum(o.subtotal_paise), 0)::bigint as revenue_paise,
                                coalesce(sum(round(o.subtotal_paise * q.contribution_bps / 10000.0)), 0)::bigint as contribution_paise,
                                coalesce(round(avg(o.subtotal_paise)), 0)::bigint as avg_order_paise,
                                (select count(*) from grievances g join orders go on go.id = g.order_id where go.partner_id = p.id)::int as complaints
                         from partners p
                         left join orders o on o.partner_id = p.id and o.status <> 'cancelled'
                         left join quotations q on q.id = o.quotation_id
                         where p.type = 'franchise' group by p.id order by revenue_paise desc""")


def supplier_scorecard(conn: Connection):
    """Supplier optimisation input: fulfilment speed, completion and defect rate per approved supplier."""
    return all_(conn, """select s.name, s.city, s.status::text as status,
                                count(distinct po.id)::int as purchase_orders,
                                count(distinct po.id) filter (where po.status = 'delivered')::int as delivered,
                                round(avg(extract(epoch from sh.delivered_at - po.created_at) / 86400)::numeric, 1)::float as avg_days_to_deliver,
                                (select count(*) from grievances g where g.supplier_id = s.id)::int as complaints
                         from suppliers s left join purchase_orders po on po.supplier_id = s.id
                         left join shipments sh on sh.purchase_order_id = po.id and sh.delivered_at is not null
                         group by s.id order by purchase_orders desc, s.name""")
