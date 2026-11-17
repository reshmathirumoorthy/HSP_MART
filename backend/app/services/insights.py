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
