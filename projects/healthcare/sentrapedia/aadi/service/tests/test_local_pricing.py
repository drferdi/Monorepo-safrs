"""The Gemini API reports no usage.cost, so the guard's own price table must carry it (common/guard.py)."""
from common.guard import PRICES, ApiGuard
from service import app


def test_the_guard_table_itself_carries_the_gemini_price():
    # A fresh interpreter that never imports the service: the price must not depend on app.py being loaded.
    import subprocess
    import sys
    from pathlib import Path

    code = "from common.guard import PRICES; print(PRICES.get('gemini-3.1-flash-lite'))"
    out = subprocess.run([sys.executable, "-I", "-c", f"import sys; sys.path.insert(0, '.'); {code}"], cwd=Path(__file__).resolve().parents[2], capture_output=True, text=True, check=True)
    assert out.stdout.strip() == "(0.25, 1.5)"


def test_gemini_flash_lite_is_estimated_at_its_own_price_not_o1():
    assert app.PRICES is PRICES  # the service checks the guard's own table at startup
    assert ApiGuard.price_for("gemini-3.1-flash-lite") == (0.25, 1.50)
    assert ApiGuard.price_for("google/gemini-3.1-flash-lite") == (0.25, 1.50)
    assert PRICES["o1"] == (15.00, 60.00)
