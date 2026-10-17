"""Local addition: the Gemini API reports no usage.cost, so the guard must know its price."""
from common.guard import PRICES, ApiGuard

from service import app


def test_gemini_flash_lite_is_estimated_at_its_own_price_not_o1():
    assert app.PRICES is PRICES  # the service registers into the guard's own table
    assert ApiGuard.price_for("gemini-3.1-flash-lite") == (0.25, 1.50)
    assert ApiGuard.price_for("google/gemini-3.1-flash-lite") == (0.25, 1.50)
    assert PRICES["o1"] == (15.00, 60.00)
