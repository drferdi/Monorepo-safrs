"""CORS for the Med Assist extension origin (MIRA_ALLOWED_ORIGINS)."""

from __future__ import annotations

import json

import pytest

from service.settings import StartupRefused, check_startup, load_settings

from .conftest import AUTH, TOKEN, model_outputs

STEP = "/v1/diagnosis/step"
EXTENSION = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"


def test_origins_are_read_from_the_environment():
    settings = load_settings(
        {"MIRA_DEV_TOKEN": TOKEN, "MIRA_ALLOWED_ORIGINS": f" {EXTENSION} , chrome-extension://other ,"}
    )
    assert settings.allowed_origins == (EXTENSION, "chrome-extension://other")


def test_a_bare_extension_id_is_refused_at_startup():
    settings = load_settings({"MIRA_DEV_TOKEN": TOKEN, "MIRA_ALLOWED_ORIGINS": "abcdefghijklmnop"})
    with pytest.raises(StartupRefused, match="chrome-extension://"):
        check_startup(settings, require_api_key=False, environ={})


def test_preflight_from_the_extension_is_answered_without_a_token(make_client):
    client, fake = make_client([], allowed_origins=(EXTENSION,))
    response = client.options(
        STEP,
        headers={
            "Origin": EXTENSION,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,x-mira-plan-model,x-mira-case-origin",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == EXTENSION
    assert fake.calls == []


def test_a_step_from_the_extension_carries_the_cors_header(make_client, example_request):
    client, _ = make_client(model_outputs(), allowed_origins=(EXTENSION,))
    response = client.post(STEP, content=json.dumps(example_request), headers={**AUTH, "Origin": EXTENSION})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == EXTENSION


def test_another_origin_gets_no_cors_header(make_client):
    client, _ = make_client([], allowed_origins=(EXTENSION,))
    response = client.options(
        STEP, headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"}
    )
    assert "access-control-allow-origin" not in response.headers
