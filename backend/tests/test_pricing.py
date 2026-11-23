"""The production pricing engine (backend/app/services/pricing.py).

The Playwright "2.1 pricing engine" tests exercise the TypeScript copy in src/lib/commerce/pricing.ts, which the
running application no longer uses; these tests cover the engine that actually prices quotes and orders.
"""
import pytest
from app.services.pricing import advance_due, pct, price_quote

LINE = {"product_id": "p", "quantity": 1, "unit_price_paise": 100_000, "unit_cost_paise": 70_000, "gst_rate_bps": 1800}
ASSOCIATE = {"commission_bps": 1000, "service_fee_bps": 0}
FRANCHISE = {"commission_bps": 1000, "service_fee_bps": 200}


def test_reproduces_the_blueprint_channel_table():
    a = price_quote([LINE], "associate", ASSOCIATE)
    f = price_quote([LINE], "franchise", FRANCHISE)
    d = price_quote([LINE], "direct", None)
    assert [a.contribution_bps, f.contribution_bps, d.contribution_bps] == [1300, 1100, 2300]
    assert [a.below_minimum, f.below_minimum, d.below_minimum] == [False, True, False]
    assert a.commission_paise == 10_000


def test_commission_base_excludes_gst_and_freight_and_freight_carries_gst():
    r = price_quote([LINE], "associate", ASSOCIATE, freight_paise=5_000)
    assert r.subtotal_paise == 100_000
    assert r.gst_paise == 18_000 + 900
    assert r.total_paise == 100_000 + 5_000 + 18_900
    assert r.commission_paise == 10_000


def test_unknown_cost_is_estimated_at_70_percent_and_flagged():
    r = price_quote([{**LINE, "unit_cost_paise": None}], "direct", None)
    assert r.cost_paise == 70_000 and r.any_cost_estimated


@pytest.mark.parametrize("bad", [{"quantity": 0}, {"quantity": 1.5}, {"unit_price_paise": 0}, {"unit_price_paise": 10.5}])
def test_invalid_lines_are_rejected(bad):
    with pytest.raises(ValueError):
        price_quote([{**LINE, **bad}], "direct", None)


def test_partner_channels_need_partner_terms_and_quotes_need_lines():
    with pytest.raises(ValueError, match="partner"):
        price_quote([LINE], "associate", None)
    with pytest.raises(ValueError):
        price_quote([], "direct", None)


def test_rounding_is_half_up_on_paise():
    assert pct(5, 1000) == 1        # 0.5 paise rounds up
    assert pct(15, 1000) == 2       # 1.5 → 2 (not banker's 2/… surprises)
    assert advance_due(99_999) == 50_000
