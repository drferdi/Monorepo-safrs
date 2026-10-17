"""Local additions for the Gemini route: no routing policy exists there, and its cost is always estimated."""
import json
from dataclasses import replace
from pathlib import Path

import pytest

from common.guard import PRICES
from service.app import create_app
from service.settings import StartupRefused

from .conftest import AUTH, model_outputs
from .test_providers import STEP, status_error

PROFILE = Path(__file__).resolve().parents[3] / "scripts" / "mira-profile.json"


def test_the_launcher_model_has_a_registered_price():
    model = json.loads(PROFILE.read_text(encoding="utf-8"))["model"]
    assert any(model.startswith(prefix) for prefix in PRICES), f"register a price for {model} in service/app.py"


def test_an_unpriced_model_on_the_estimated_route_refuses_to_start(settings):
    with pytest.raises(StartupRefused, match="price"):
        create_app(replace(settings, assess_model="gemini-9-unknown"), client=object())


def test_a_503_without_a_routing_policy_is_an_outage_that_pauses_the_service(make_client, example_request):
    overloaded = status_error(503, "The model is overloaded. Please try again later.")
    client, _ = make_client([overloaded] * 3 + model_outputs(), max_consecutive_api_errors=3)
    codes = [client.post(STEP, json=example_request, headers=AUTH).json()["error"]["code"] for _ in range(4)]
    assert codes == ["MODEL_ERROR"] * 3 + ["API_ERRORS"]
