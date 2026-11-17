"""The five AI engines. Read-only: suggestions and drafts only; money comes from the pricing engine.
Only active products and approved suppliers are suggested; partner engines read only that partner's records."""
import re
from datetime import datetime, timedelta, timezone
from sqlalchemy import Connection
from ..db import all_, one
from .llm import polish_text
from .pricing import price_quote

OCCASION_DIVISIONS = [
    (re.compile(r"diwali|deepavali|holi|christmas|eid|rakhi|raksha|festiv|new year|pongal|onam", re.I), ["festive", "premium"]),
    (re.compile(r"wedding|shaadi|anniversary|birthday|valentine|return gift", re.I), ["personal", "premium"]),
    (re.compile(r"employee|onboard|welcome|joining|recognition|award|milestone|client|corporate", re.I), ["corporate", "premium"]),
    (re.compile(r"conference|event|branded|logo|merch|promotional|expo", re.I), ["promotional", "corporate"]),
    (re.compile(r"premium|executive|luxury|ceo|director|vip", re.I), ["premium"]),
]


def divisions_for(text: str):
    return next((d for rx, d in OCCASION_DIVISIONS if rx.search(text)), None)


def discover_products(conn: Connection, *, query: str | None = None, occasion: str | None = None,
                      budget_rupees: float | None = None, quantity: int | None = None,
                      deadline_days: int | None = None, limit: int = 8):
    text = f"{occasion or ''} {query or ''}".strip()
    divisions = divisions_for(text)
    qty = quantity or 1
    conds, params = ["active", "min_order_quantity <= :qty"], {"qty": qty}
    if budget_rupees:
        conds.append("price_paise <= :budget")
        params["budget"] = round(budget_rupees * 100)
    if divisions:
        conds.append("division::text = any(:divs)")
        params["divs"] = divisions
    cands = all_(conn, f"select id, sku, name, division::text as division, price_paise from products where {' and '.join(conds)} limit 400", **params)
    if not cands:
        return []
    lead = {r["product_id"]: r["days"] for r in all_(conn, """
        select r.product_id, min(r.lead_time_days)::int as days from supplier_rates r join suppliers s on s.id = r.supplier_id
        where s.status = 'approved' and r.product_id = any(:ids) group by r.product_id""", ids=[c["id"] for c in cands])}
    words = [w for w in re.split(r"\W+", (query or "").lower()) if len(w) > 2]
    out = []
    for p in cands:
        lt = lead.get(p["id"])
        if deadline_days is not None and lt is not None and lt > deadline_days:
            continue
        name = p["name"].lower()
        hits = [w for w in words if w in name]
        budget_fit = p["price_paise"] / (budget_rupees * 100) if budget_rupees else 0.5
        score = len(hits) * 3 + budget_fit * 2 + (1 if divisions and divisions[0] == p["division"] else 0) + (0.5 if lt is not None else 0)
        budget_label = f"{budget_rupees:g}" if budget_rupees else ""
        reasons = [r for r in [f"{p['division']} gifting" if divisions else None,
                               f"within ₹{budget_label} per unit" if budget_rupees else None,
                               f"matches “{', '.join(hits)}”" if hits else None,
                               f"{lt}-day supplier lead time" if lt is not None else None] if r]
        out.append({"id": p["id"], "sku": p["sku"], "name": p["name"], "division": p["division"],
                    "pricePaise": p["price_paise"], "reason": " · ".join(reasons), "score": score})
    out.sort(key=lambda s: -s["score"])
    return out[:limit]


_UNIT = r"(?:units?|pcs|pieces|nos|employees|staff|people|guests|clients|hampers?|gifts?|kits?|boxes|sets?|bottles?|pens?|diaries|mugs?|x\b)"
_QTY = re.compile(r"(?<![₹\d.])(\d{1,6})\s+(?:[a-z'-]+\s+){0,3}?" + _UNIT, re.I)
_BUDGET_WORD = re.compile(r"(?:under|below|upto|within|budget|max|around|rs\.?|inr|of)\s{1,2}$", re.I)


def parse_request(text: str) -> dict:
    t = text.replace(",", "")
    qty = None
    for m in _QTY.finditer(t):
        # Python lookbehind must be fixed-width; check the budget-word exclusion manually.
        if not _BUDGET_WORD.search(t[: m.start()]):
            qty = int(m.group(1))
            break
    if qty is None:
        m = re.search(r"\bfor\s+(\d{1,6})\b", t, re.I)
        qty = int(m.group(1)) if m else None
    qty = qty or None
    m = re.search(r"(?:under|below|upto|up to|within|budget(?: of)?|max|around|₹|rs\.?|inr)\s*₹?\s*(\d{2,7})", t, re.I)
    budget = int(m.group(1)) if m else None
    m = re.search(r"(?:in|within)\s+(\d{1,3})\s*days?", t, re.I)
    deadline = int(m.group(1)) if m else None
    return {"quantity": qty or None, "budgetRupees": budget or None, "deadlineDays": deadline or None,
            "branding": bool(re.search(r"logo|brand|print|engrav|personali[sz]", text, re.I)),
            "occasion": text if divisions_for(text) else None}


def draft_quote(conn: Connection, text: str) -> dict:
    """Drafts a quote from free text. Nothing is saved; a human creates the quote through the pricing engine."""
    u = parse_request(text)
    quantity = u["quantity"] or 1
    suggestions = discover_products(conn, query=text, occasion=u["occasion"], budget_rupees=u["budgetRupees"],
                                    quantity=quantity, deadline_days=u["deadlineDays"], limit=3)
    pick = suggestions[:1]
    lines = [{"sku": s["sku"], "quantity": quantity, "branding": "Logo branding (artwork to be approved)" if u["branding"] else None} for s in pick]
    preview = None
    if pick:
        prods = all_(conn, "select * from products where id = any(:ids)", ids=[p["id"] for p in pick])
        r = price_quote([{"product_id": p["id"], "quantity": quantity, "unit_price_paise": p["price_paise"],
                          "unit_cost_paise": p["cost_paise"], "gst_rate_bps": p["gst_rate_bps"]} for p in prods], "direct", None)
        preview = {"subtotalPaise": r.subtotal_paise, "gstPaise": r.gst_paise, "totalPaise": r.total_paise,
                   "contributionBps": r.contribution_bps, "belowMinimum": r.below_minimum, "anyCostEstimated": r.any_cost_estimated}
    lines_text = "\n".join(re.sub(r", , $", "", ", ".join([l["sku"], str(l["quantity"]), "", l["branding"] or ""])) for l in lines)
    return {"understood": u, "suggestions": suggestions, "lines": lines, "preview": preview, "linesText": lines_text}


OCCASIONS = [("Christmas & year-end", "2026-12-25"), ("New Year", "2027-01-01"), ("Republic Day", "2027-01-26"),
             ("Valentine's Day", "2027-02-14"), ("Holi", "2027-03-22"), ("Financial year-end client gifting", "2027-03-31"),
             ("Raksha Bandhan", "2027-08-17"), ("Diwali", "2027-10-29")]
TEMPLATES = {
    "en": lambda c, o: f"Hello {c}, {o} is coming up. HSP Mart can deliver curated, branded gifts for your team and clients across India with GST invoicing. May I share 3 options within your budget?",
    "hi": lambda c, o: f"नमस्ते {c}, {o} नज़दीक है। HSP Mart आपकी टीम और क्लाइंट्स के लिए ब्रांडेड गिफ्ट्स पूरे भारत में GST इनवॉइस के साथ पहुँचा सकता है। क्या मैं आपके बजट में 3 विकल्प भेजूँ?",
}


def sales_coach(conn: Connection, partner_id: str, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    in14, three_ago = now + timedelta(days=14), now - timedelta(days=3)
    leads = all_(conn, """select l.status::text as status, l.protection_expires_at, c.name, c.id as customer_id
                          from leads l join customers c on c.id = l.customer_id where l.partner_id = cast(:p as uuid)""", p=partner_id)
    quotes = all_(conn, "select number, status::text as status, customer_id, created_at from quotations where partner_id = cast(:p as uuid)", p=partner_id)
    quoted = {q["customer_id"] for q in quotes}
    follow = []
    for l in leads:
        exp = l["protection_expires_at"]
        if now < exp <= in14 and l["customer_id"] not in quoted:
            follow.append({"kind": "protection-expiring", "message": f"{l['name']}: protection ends {exp.strftime('%-d/%-m/%Y')} and no quote yet — send one now."})
        if l["status"] == "registered" and l["customer_id"] not in quoted and exp > in14:
            follow.append({"kind": "unquoted-lead", "message": f"{l['name']}: registered but not quoted. Ask for budget, quantity and occasion."})
    for q in quotes:
        if q["status"] == "sent" and q["created_at"] < three_ago:
            follow.append({"kind": "quote-follow-up", "message": f"Quote {q['number']} sent {(now - q['created_at']).days} days ago — follow up before it expires."})
    upcoming = []
    for name, d in OCCASIONS:
        dt = datetime.fromisoformat(d).replace(tzinfo=timezone.utc)
        if dt > now and (dt - now).total_seconds() <= 75 * 86_400:
            upcoming.append({"name": name, "date": d})
    customer = leads[0]["name"] if leads else "Sir/Madam"
    occasion = upcoming[0]["name"] if upcoming else "the festive season"
    return {"followUps": follow, "upcoming": upcoming, "messages": {
        "en": polish_text(TEMPLATES["en"](customer, occasion), "Make this WhatsApp opener warm and natural, under 60 words."),
        "hi": polish_text(TEMPLATES["hi"](customer, occasion), "इस WhatsApp संदेश को स्वाभाविक और विनम्र बनाइए, 60 शब्दों से कम।")}}


def rank_suppliers(conn: Connection, order_id) -> list[dict]:
    lines = all_(conn, "select product_id, quantity from order_lines where order_id = :o", o=order_id)
    if not lines:
        return []
    qty = {l["product_id"]: l["quantity"] for l in lines}
    rates = all_(conn, """select r.product_id, r.cost_paise, r.lead_time_days, r.stock_quantity, s.id::text as sid, s.name, s.city,
                                 s.on_time_rate_bps, s.quality_score_bps
                          from supplier_rates r join suppliers s on s.id = r.supplier_id
                          where s.status = 'approved' and r.product_id = any(:ids)""", ids=list(qty))
    by: dict[str, dict] = {}
    for r in rates:
        cur = by.setdefault(r["sid"], {"name": r["name"], "city": r["city"], "cost": 0, "leadDays": 0, "covered": 0,
                                        "stockOk": True, "onTime": r["on_time_rate_bps"], "quality": r["quality_score_bps"]})
        q = qty[r["product_id"]]
        cur["cost"] += r["cost_paise"] * q
        cur["leadDays"] = max(cur["leadDays"], r["lead_time_days"])
        cur["covered"] += 1
        if r["stock_quantity"] is not None and r["stock_quantity"] < q:
            cur["stockOk"] = False
    eligible = [(k, v) for k, v in by.items() if v["covered"] == len(lines)]
    if not eligible:
        return []
    min_cost = min(v["cost"] for _, v in eligible)
    out = []
    for k, v in eligible:
        score = (min_cost / v["cost"]) * 60 - v["leadDays"] * 2 + (10 if v["stockOk"] else -20) \
            + ((v["onTime"] or 8000) / 10_000) * 15 + ((v["quality"] or 8000) / 10_000) * 15
        out.append({"supplierId": k, **v, "score": round(score * 10) / 10})
    return sorted(out, key=lambda s: -s["score"])


def management_alerts(conn: Connection) -> list[dict]:
    alerts = []
    for r in all_(conn, """select number, contribution_bps, status::text as status from quotations
                           where below_minimum and status in ('pending_approval','approved','sent') order by created_at desc limit 10"""):
        alerts.append({"kind": "unprofitable-quote", "severity": "medium" if r["status"] == "pending_approval" else "high",
                       "message": f"Quote {r['number']} at {r['contribution_bps'] / 100:.1f}% contribution ({r['status']})."})
    for r in all_(conn, """select number, (total_paise - credited_paise - paid_paise + refunded_paise)::bigint as balance from orders
                           where status in ('dispatched','delivered') and total_paise - credited_paise - paid_paise + refunded_paise > 0"""):
        alerts.append({"kind": "overdue-payment", "severity": "high",
                       "message": f"Order {r['number']} delivered/dispatched with ₹{int(r['balance']) / 100:.2f} unpaid."})
    for r in all_(conn, """select po.number, s.name as supplier, extract(day from now() - po.created_at)::int as days,
                                  coalesce((select max(lead_time_days) from supplier_rates sr where sr.supplier_id = s.id), 7) as lead
                           from purchase_orders po join suppliers s on s.id = po.supplier_id where po.status in ('issued','acknowledged')"""):
        if r["days"] > r["lead"]:
            alerts.append({"kind": "supplier-delay", "severity": "high",
                           "message": f"PO {r['number']} with {r['supplier']} is {r['days'] - r['lead']} days past lead time."})
    for r in all_(conn, """select p.code, o.number, l.rate_bps from commission_ledger l join partners p on p.id = l.partner_id
                           join orders o on o.id = l.order_id
                           where l.rate_bps > 1500 or (l.status in ('earned','approved','paid')
                                 and o.paid_paise - o.refunded_paise < o.total_paise - o.credited_paise)"""):
        alerts.append({"kind": "commission-anomaly", "severity": "high",
                       "message": f"Partner {r['code']} on {r['number']}: rate {r['rate_bps'] / 100:.1f}% or commission without full payment."})
    n = one(conn, """select count(*)::int n from partners p where p.status = 'active' and p.created_at < now() - interval '30 days'
                     and not exists (select 1 from leads l where l.partner_id = p.id and l.created_at > now() - interval '30 days')""")["n"]
    if n > 0:
        alerts.append({"kind": "inactive-associates", "severity": "medium", "message": f"{n} active partners registered no leads in 30 days."})
    return alerts
