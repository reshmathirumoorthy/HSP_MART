"""Deterministic pricing engine. Pure: integer paise everywhere. Only this computes money.

contribution = net sales − procurement/branding − variable fulfilment − partner remuneration
"""
from dataclasses import dataclass, field

VARIABLE_COST_BPS = 700
MIN_CONTRIBUTION_BPS = 1200
DEFAULT_COST_RATIO_BPS = 7000
FREIGHT_GST_RATE_BPS = 1800
ADVANCE_BPS = 5000


def pct(amount: int, bps: int) -> int:
    # JS Math.round semantics (half up), not banker's rounding.
    return int((amount * bps + 5000) // 10_000) if amount * bps >= 0 else -int((-amount * bps + 5000) // 10_000)


def advance_due(total: int) -> int:
    return pct(total, ADVANCE_BPS)


def js_round(x: float) -> int:
    import math
    return math.floor(x + 0.5)


@dataclass
class PricedLine:
    product_id: str
    quantity: int
    unit_price_paise: int
    unit_cost_paise: int
    gst_rate_bps: int
    cost_estimated: bool
    line_net_paise: int
    line_gst_paise: int
    line_cost_paise: int


@dataclass
class PricingResult:
    lines: list[PricedLine] = field(default_factory=list)
    subtotal_paise: int = 0
    freight_paise: int = 0
    gst_paise: int = 0
    total_paise: int = 0
    cost_paise: int = 0
    variable_cost_paise: int = 0
    commission_paise: int = 0
    contribution_paise: int = 0
    contribution_bps: int = 0
    below_minimum: bool = False
    any_cost_estimated: bool = False


def price_quote(lines: list[dict], channel: str, partner: dict | None, freight_paise: int = 0) -> PricingResult:
    """lines: {product_id, quantity, unit_price_paise, unit_cost_paise|None, gst_rate_bps}.
    partner: {commission_bps, service_fee_bps} or None. Raises ValueError on invalid input."""
    if not lines:
        raise ValueError("A quote needs at least one line")
    if channel != "direct" and not partner:
        raise ValueError(f'Channel "{channel}" requires partner terms')
    priced: list[PricedLine] = []
    for l in lines:
        q, price = l["quantity"], l["unit_price_paise"]
        if not isinstance(q, int) or q <= 0:
            raise ValueError("Quantity must be a positive integer")
        if not isinstance(price, int) or price <= 0:
            raise ValueError("Price must be positive paise")
        est = l.get("unit_cost_paise") is None
        unit_cost = pct(price, DEFAULT_COST_RATIO_BPS) if est else int(l["unit_cost_paise"])
        net = price * q
        priced.append(PricedLine(l["product_id"], q, price, unit_cost, l["gst_rate_bps"], est, net,
                                 pct(net, l["gst_rate_bps"]), unit_cost * q))
    subtotal = sum(l.line_net_paise for l in priced)
    gst = sum(l.line_gst_paise for l in priced) + pct(freight_paise, FREIGHT_GST_RATE_BPS)
    cost = sum(l.line_cost_paise for l in priced)
    variable = pct(subtotal, VARIABLE_COST_BPS)
    rem_bps = 0 if channel == "direct" or not partner else partner["commission_bps"] + partner["service_fee_bps"]
    commission = pct(subtotal, rem_bps)
    contribution = subtotal - cost - variable - commission
    contribution_bps = js_round(contribution * 10_000 / subtotal)
    return PricingResult(priced, subtotal, freight_paise, gst, subtotal + freight_paise + gst, cost, variable,
                         commission, contribution, contribution_bps, contribution_bps < MIN_CONTRIBUTION_BPS,
                         any(l.cost_estimated for l in priced))
