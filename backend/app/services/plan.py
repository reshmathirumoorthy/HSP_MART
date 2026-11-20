"""Financial plan (Blueprint §4): editable driver-based projections, compared with actual platform performance.

All inputs are visible and editable by finance, as the blueprint asks ("deliberately visible so HSP's team can
challenge them"). Defaults reproduce the PDF's base case exactly. Figures are returned in ₹ lakh.
"""
import copy
from datetime import datetime, timedelta, timezone
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import FINANCE

KEY = "financial_plan"
LAKH = 100_000

BASE = {
    "procurementPct": 70.0, "fulfilmentPct": 7.0, "associateRatePct": 10.0, "franchiseRatePct": 12.0,
    "years": [
        {"associates": 50, "associateOrdersPerMonth": 0.75, "associateOrderValue": 25_000,
         "franchises": 3, "franchiseOrdersPerMonth": 3, "franchiseOrderValue": 60_000,
         "directOrdersPerMonth": 10, "directOrderValue": 100_000, "fixedCostsLakh": 80, "techInvestmentLakh": 25, "workingCapitalLakh": 14.66},
        {"associates": 200, "associateOrdersPerMonth": 1.0, "associateOrderValue": 30_000,
         "franchises": 20, "franchiseOrdersPerMonth": 4, "franchiseOrderValue": 70_000,
         "directOrdersPerMonth": 20, "directOrderValue": 125_000, "fixedCostsLakh": 160, "techInvestmentLakh": 15, "workingCapitalLakh": 38.65},
        {"associates": 500, "associateOrdersPerMonth": 1.2, "associateOrderValue": 35_000,
         "franchises": 60, "franchiseOrdersPerMonth": 5, "franchiseOrderValue": 90_000,
         "directOrdersPerMonth": 40, "directOrderValue": 150_000, "fixedCostsLakh": 320, "techInvestmentLakh": 20, "workingCapitalLakh": 53.21},
    ],
}
NUMERIC_TOP = ("procurementPct", "fulfilmentPct", "associateRatePct", "franchiseRatePct")
NUMERIC_YEAR = tuple(BASE["years"][0].keys())


def _r(x: float) -> float:
    return round(x + 0.0, 2)


def compute(a: dict) -> dict:
    proc, ful = a["procurementPct"] / 100, a["fulfilmentPct"] / 100
    ar, fr = a["associateRatePct"] / 100, a["franchiseRatePct"] / 100
    years = []
    for i, y in enumerate(a["years"], 1):
        assoc = y["associates"] * y["associateOrdersPerMonth"] * y["associateOrderValue"] * 12 / LAKH
        fran = y["franchises"] * y["franchiseOrdersPerMonth"] * y["franchiseOrderValue"] * 12 / LAKH
        direct = y["directOrdersPerMonth"] * y["directOrderValue"] * 12 / LAKH
        revenue = assoc + fran + direct
        procurement, fulfilment = revenue * proc, revenue * ful
        commissions = assoc * ar + fran * fr
        contribution = revenue - procurement - fulfilment - commissions
        ebitda = contribution - y["fixedCostsLakh"]
        margin = contribution / revenue if revenue else 0
        # Additional working capital is an explicit input: the blueprint gives figures but not its method.
        wc = y["workingCapitalLakh"]
        cash = ebitda - y["techInvestmentLakh"] - wc
        assoc_monthly = (y["associateOrdersPerMonth"] * y["associateOrderValue"] * ar) if y["associates"] else 0
        years.append({
            "year": i, "associateSales": _r(assoc), "franchiseSales": _r(fran), "directSales": _r(direct),
            "revenue": _r(revenue), "procurement": _r(procurement), "fulfilment": _r(fulfilment),
            "commissions": _r(commissions), "contribution": _r(contribution), "contributionPct": _r(margin * 100),
            "fixedCosts": _r(y["fixedCostsLakh"]), "ebitda": _r(ebitda),
            "ebitdaPct": _r(ebitda / revenue * 100) if revenue else 0.0,
            "breakEvenRevenue": _r(y["fixedCostsLakh"] / margin) if margin > 0 else None,
            "techInvestment": _r(y["techInvestmentLakh"]), "workingCapital": _r(wc), "cash": _r(cash),
            "associateMonthlyCommission": round(assoc_monthly),
        })
    # Per-channel contribution at the plan's cost structure (Blueprint §3 table).
    channels = [{"channel": c, "partnerPct": p * 100, "contributionPct": _r((1 - proc - ful - p) * 100)}
                for c, p in (("associate", ar), ("franchise", fr), ("direct", 0.0))]
    return {"years": years, "channels": channels,
            "cumulativeCashLow": _r(min(_cum(years))), "fundingNeedLakh": _r(max(0.0, -min(_cum(years))))}


def _cum(years):
    total, out = 0.0, []
    for y in years:
        total += y["cash"]
        out.append(total)
    return out


def _validate(a: dict) -> dict:
    try:
        clean = {k: float(a[k]) for k in NUMERIC_TOP}
        years = a["years"]
        if not isinstance(years, list) or len(years) != 3:
            fail("The plan needs exactly three years.")
        clean["years"] = [{k: float(y[k]) for k in NUMERIC_YEAR} for y in years]
    except (KeyError, TypeError, ValueError):
        fail("Every assumption must be a number.")
    if any(v < 0 for v in clean.values() if isinstance(v, float)) or any(v < 0 for y in clean["years"] for v in y.values()):
        fail("Assumptions cannot be negative.")
    if clean["procurementPct"] + clean["fulfilmentPct"] >= 100:
        fail("Procurement plus fulfilment must be below 100% of revenue.")
    return clean


def get(conn: Connection) -> dict:
    row = one(conn, "select value, updated_at from app_settings where key = :k", k=KEY)
    a = row["value"] if row else copy.deepcopy(BASE)
    return {"assumptions": a, "isDefault": row is None, "updatedAt": row["updated_at"] if row else None,
            "plan": compute(a), "actuals": actuals(conn)}


def save(conn: Connection, actor, assumptions: dict) -> dict:
    if actor.role not in FINANCE:
        fail("Only admin or finance can change the plan.")
    a = _validate(assumptions)
    before = one(conn, "select value from app_settings where key = :k", k=KEY)
    import json
    run(conn, """insert into app_settings (key, value, updated_by) values (:k, cast(:v as jsonb), cast(:u as uuid))
                 on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()""",
        k=KEY, v=json.dumps(a), u=actor.id)
    audit(conn, actor, "plan.update", "app_settings", KEY, before["value"] if before else None, a)
    return get(conn)


def reset(conn: Connection, actor) -> dict:
    if actor.role not in FINANCE:
        fail("Only admin or finance can change the plan.")
    run(conn, "delete from app_settings where key = :k", k=KEY)
    audit(conn, actor, "plan.reset", "app_settings", KEY, None, {"to": "blueprint base case"})
    return get(conn)


def actuals(conn: Connection) -> dict:
    """Trailing 12 months on the platform (₹ lakh), plus imported pre-platform history, to set against Year 1."""
    since = datetime.now(timezone.utc) - timedelta(days=365)
    rows = all_(conn, """select coalesce(q.channel, 'online') as channel, count(*)::int as orders,
                                sum(o.subtotal_paise - o.credited_taxable_paise)::bigint as revenue,
                                sum(round((o.subtotal_paise - o.credited_taxable_paise) * coalesce(q.contribution_bps, 0) / 10000.0))::bigint as contribution
                         from orders o left join quotations q on q.id = o.quotation_id
                         where o.status <> 'cancelled' and o.created_at >= :s group by 1 order by 1""", s=since)
    active = one(conn, """select count(distinct o.partner_id)::int as n from orders o join partners p on p.id = o.partner_id
                          where p.type = 'associate' and o.status <> 'cancelled' and o.created_at >= :s""", s=since)["n"]
    history = all_(conn, """select channel, sum(orders)::int as orders, sum(revenue_paise)::bigint as revenue,
                                   sum(coalesce(cost_paise, 0))::bigint as cost, count(distinct month)::int as months
                            from sales_history group by channel order by channel""")
    lakh = lambda p: _r((p or 0) / 100 / LAKH)  # noqa: E731
    return {"platform": [{"channel": r["channel"], "orders": r["orders"], "revenue": lakh(r["revenue"]),
                          "contribution": lakh(r["contribution"])} for r in rows],
            "productiveAssociates": active,
            "history": [{"channel": r["channel"], "orders": r["orders"], "revenue": lakh(r["revenue"]),
                         "grossMarginPct": _r((1 - r["cost"] / r["revenue"]) * 100) if r["revenue"] and r["cost"] else None,
                         "months": r["months"]} for r in history]}
