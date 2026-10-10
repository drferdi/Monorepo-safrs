"""OpenRouter support: policy on every request, policy failures, reported vs estimated cost,
preflight and the simulation runner's create() wrapper. No network: all clients are fakes."""

from __future__ import annotations

import json
import httpx
import openai
import pytest
from openai.types.chat import ChatCompletion

from common.guard import ApiGuard, RunAborted
from common.providers import (
    OPENROUTER_BASE_URL,
    OPENROUTER_PROVIDER_POLICY,
    is_policy_failure,
    model_id,
    openrouter_extra_body,
    preflight_openrouter,
    route_openai_sdk_to_openrouter,
    served_provider,
    usage_cost,
)
from service.settings import StartupRefused, check_startup, load_settings

from .conftest import AUTH, assessment, completion, model_outputs

STEP = "/v1/diagnosis/step"
POLICY = {"zdr": True, "data_collection": "deny", "require_parameters": True}


def status_error(status: int, message: str) -> openai.APIStatusError:
    request = httpx.Request("POST", f"{OPENROUTER_BASE_URL}/chat/completions")
    response = httpx.Response(status, request=request, json={"error": {"code": status, "message": message}})
    error_class = {404: openai.NotFoundError, 503: openai.InternalServerError}.get(status, openai.APIStatusError)
    return error_class(message, response=response, body=None)


def openrouter_client(make_client, outputs, **overrides):
    settings_env = {"MIRA_LLM_PROVIDER": "openrouter"}
    base = load_settings(settings_env)
    return make_client(
        outputs, llm_provider="openrouter", plan_model=base.plan_model, assess_model=base.assess_model, **overrides
    )


def audit_record(settings) -> dict:
    [path] = settings.audit_dir.glob("audit-*.jsonl")
    return json.loads(path.read_text(encoding="utf-8").splitlines()[-1])


# --------------------------------------------------------------------------- building blocks


def test_the_policy_is_exactly_the_required_one():
    assert OPENROUTER_PROVIDER_POLICY == POLICY


@pytest.mark.parametrize(("model", "expected"), [("o1", "openai/o1"), ("gpt-4o", "openai/gpt-4o"), ("openai/o1", "openai/o1")])
def test_openrouter_model_ids_carry_the_organisation(model, expected):
    assert model_id("openrouter", model) == expected
    assert model_id("openai", "o1") == "o1"


def test_a_caller_cannot_weaken_the_policy():
    body = openrouter_extra_body({"provider": {"zdr": False, "data_collection": "allow", "order": ["X"]}, "seed": 1})
    assert body["provider"] == {**POLICY, "order": ["X"]}
    assert body["usage"] == {"include": True}
    assert body["seed"] == 1


def test_throughput_sort_is_opt_in_and_keeps_the_privacy_policy():
    default = openrouter_extra_body()
    sorted_body = openrouter_extra_body(provider_sort="throughput")

    assert "sort" not in default["provider"]
    assert sorted_body["provider"] == {**POLICY, "sort": "throughput"}
    assert default["usage"] == sorted_body["usage"] == {"include": True}


def test_provider_sort_setting_defaults_off_and_rejects_unsupported_values():
    default = load_settings({"MIRA_LLM_PROVIDER": "openrouter"})
    opted_in = load_settings({"MIRA_LLM_PROVIDER": "openrouter", "MIRA_OPENROUTER_PROVIDER_SORT": "throughput"})

    assert default.openrouter_provider_sort is None
    assert opted_in.openrouter_provider_sort == "throughput"

    invalid = load_settings({
        "MIRA_LLM_PROVIDER": "openrouter", "MIRA_DEV_TOKEN": "test", "MIRA_OPENROUTER_PROVIDER_SORT": "latency"
    })
    with pytest.raises(StartupRefused, match="MIRA_OPENROUTER_PROVIDER_SORT"):
        check_startup(invalid, require_api_key=False)

    wrong_provider = load_settings({
        "MIRA_LLM_PROVIDER": "openai", "MIRA_DEV_TOKEN": "test", "MIRA_OPENROUTER_PROVIDER_SORT": "throughput"
    })
    with pytest.raises(StartupRefused, match="requires MIRA_LLM_PROVIDER=openrouter"):
        check_startup(wrong_provider, require_api_key=False)


def test_zdr_opt_out_cannot_claim_the_openrouter_zdr_data_policy():
    misleading = load_settings({
        "MIRA_LLM_PROVIDER": "openrouter", "MIRA_DEV_TOKEN": "test",
        "MIRA_DATA_POLICY": "openrouter-zdr", "MIRA_OPENROUTER_ZDR": "false",
    })
    with pytest.raises(StartupRefused, match="openrouter-zdr"):
        check_startup(misleading, require_api_key=False)


def test_zdr_opt_out_removes_only_retention_filter():
    existing = {"provider": {"zdr": True, "data_collection": "allow"}}
    body = openrouter_extra_body(existing, provider_sort="throughput", enforce_zdr=False)
    assert body["provider"] == {"data_collection": "deny", "require_parameters": True, "sort": "throughput"}
    assert body["usage"] == {"include": True}
    assert existing["provider"]["zdr"] is True
    assert openrouter_extra_body()["provider"] == POLICY


def test_zdr_setting_defaults_on_and_requires_explicit_openrouter_opt_out():
    assert load_settings({}).openrouter_zdr is True
    opted_out = load_settings({"MIRA_LLM_PROVIDER": "openrouter", "MIRA_OPENROUTER_ZDR": "false"})
    assert opted_out.openrouter_zdr is False
    with pytest.raises(StartupRefused, match="MIRA_OPENROUTER_ZDR"):
        load_settings({"MIRA_OPENROUTER_ZDR": "invalid"})
    wrong_provider = load_settings({"MIRA_DEV_TOKEN": "test", "MIRA_OPENROUTER_ZDR": "false"})
    with pytest.raises(StartupRefused, match="requires MIRA_LLM_PROVIDER=openrouter"):
        check_startup(wrong_provider, require_api_key=False)


def test_zdr_opt_out_reaches_both_calls_without_removing_assessment_schema(make_client, example_request):
    client, fake = openrouter_client(make_client, model_outputs(), openrouter_zdr=False)
    body = client.post(STEP, json=example_request, headers=AUTH).json()
    assert body["status"] == "ok"
    assert len(fake.calls) == 2
    for call in fake.calls:
        assert call["extra_body"]["provider"] == {"data_collection": "deny", "require_parameters": True}
    assert fake.calls[1]["response_format"]["type"] == "json_schema"


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (status_error(503, "There is no available model provider that meets your routing requirements"), True),
        (status_error(404, "No endpoints found matching your data policy"), True),
        (status_error(404, "Model not found"), False),
        (status_error(502, "Upstream error"), False),
        (RuntimeError("boom"), False),
    ],
)
def test_policy_failures_are_recognised(error, expected):
    assert is_policy_failure(error) is expected


def test_reported_cost_and_serving_provider_survive_sdk_parsing():
    parsed = ChatCompletion.model_validate(
        {
            "id": "gen-1",
            "object": "chat.completion",
            "created": 0,
            "model": "openai/gpt-4o",
            "provider": "Azure",
            "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": "x"}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 2, "total_tokens": 12, "cost": 0.0123},
        }
    )
    assert usage_cost(parsed) == pytest.approx(0.0123)
    assert served_provider(parsed) == "Azure"
    assert usage_cost(completion("x", "gpt-4o")) is None


def test_route_sets_base_url_and_key_for_this_process_only():
    environ = {"OPENROUTER_API_KEY": "or-key"}
    route_openai_sdk_to_openrouter(environ)
    assert environ == {"OPENROUTER_API_KEY": "or-key", "OPENAI_BASE_URL": OPENROUTER_BASE_URL, "OPENAI_API_KEY": "or-key"}
    client = openai.OpenAI(api_key=environ["OPENAI_API_KEY"], base_url=environ["OPENAI_BASE_URL"])
    assert str(client.base_url).rstrip("/") == OPENROUTER_BASE_URL
    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        route_openai_sdk_to_openrouter({})


def test_the_sdk_reads_the_base_url_from_the_environment(monkeypatch):
    monkeypatch.setenv("OPENAI_BASE_URL", OPENROUTER_BASE_URL)
    monkeypatch.setenv("OPENAI_API_KEY", "or-key")
    assert str(openai.OpenAI().base_url).rstrip("/") == OPENROUTER_BASE_URL


# --------------------------------------------------------------------------- preflight

MODELS = {
    "data": [
        {"id": "openai/o1", "supported_parameters": ["structured_outputs", "response_format"]},
        {"id": "openai/gpt-4o", "supported_parameters": ["structured_outputs", "response_format", "temperature", "tools"]},
    ]
}


def fake_get_json(zdr_endpoints):
    def get_json(url):
        return MODELS if url.endswith("/models") else {"data": zdr_endpoints}

    return get_json


def test_preflight_passes_when_models_and_zdr_endpoints_fit():
    zdr = [
        {"model_id": "openai/o1", "provider_name": "P", "supported_parameters": ["structured_outputs"]},
        {"model_id": "openai/gpt-4o", "provider_name": "Azure", "supported_parameters": ["structured_outputs", "temperature"]},
    ]
    needs = {"openai/o1": {"structured_outputs"}, "openai/gpt-4o": {"structured_outputs", "temperature"}}
    assert preflight_openrouter(needs, fake_get_json(zdr)) == []


def test_preflight_reports_missing_model_parameter_and_zdr_endpoint():
    zdr = [{"model_id": "openai/gpt-4o", "provider_name": "Azure", "supported_parameters": ["temperature"]}]
    needs = {
        "openai/o1": {"structured_outputs"},  # exists, but no ZDR endpoint (the situation on 2026-09-27)
        "openai/gpt-4o": {"structured_outputs", "temperature"},  # ZDR endpoint lacks structured_outputs
        "openai/o9": {"structured_outputs"},
        "openai/gpt-4o-mini": set(),
    }
    problems = preflight_openrouter(needs | {"openai/o1": {"structured_outputs", "seed"}}, fake_get_json(zdr))
    assert "openai/o1: does not support seed" in problems
    assert "openai/o1: no zero-data-retention endpoint" in problems
    assert any(p.startswith("openai/gpt-4o: no zero-data-retention endpoint supports") for p in problems)
    assert "openai/o9: not offered by OpenRouter" in problems
    assert "openai/gpt-4o-mini: not offered by OpenRouter" in problems


def test_preflight_checks_a_nitro_variant_against_its_base_model():
    zdr = [{"model_id": "openai/gpt-4o", "provider_name": "Azure", "supported_parameters": ["structured_outputs"]}]
    needs = {"openai/gpt-4o:nitro": {"structured_outputs"}, "openai/o1:nitro": {"structured_outputs"}}
    assert preflight_openrouter(needs, fake_get_json(zdr)) == ["openai/o1:nitro: no zero-data-retention endpoint"]


# --------------------------------------------------------------------------- guard (simulation runner)


def test_guard_wrapper_sends_prefix_policy_and_header_for_openrouter():
    seen = {}

    def original(client_self, **kwargs):
        seen.update(kwargs)
        return completion("ok", "openai/o1", cost=0.5, provider="OpenAI")

    guard = ApiGuard(max_calls=5, max_usd=1, provider="openrouter")
    guard.guarded(original)(None, model="o1", messages=[], extra_body={"provider": {"zdr": False}})

    assert seen["model"] == "openai/o1"
    assert seen["extra_body"]["provider"] == POLICY
    assert seen["extra_body"]["usage"] == {"include": True}
    assert "X-OpenRouter-Title" in seen["extra_headers"]
    [record] = guard.calls
    assert record["role"] == "plan"
    assert (record["cost_usd"], record["cost_source"], record["provider_served"]) == (0.5, "reported", "OpenAI")


def test_guard_wrapper_leaves_openai_requests_unchanged():
    seen = {}

    def original(client_self, **kwargs):
        seen.update(kwargs)
        return completion("ok", "gpt-4o")

    guard = ApiGuard(max_calls=5, max_usd=1)
    guard.guarded(original)(None, model="gpt-4o", messages=[], temperature=0.05)
    assert seen == {"model": "gpt-4o", "messages": [], "temperature": 0.05}
    assert guard.calls[0]["cost_source"] == "estimated"


def test_guard_wrapper_stops_on_a_policy_failure_without_retrying():
    calls = []

    def original(client_self, **kwargs):
        calls.append(kwargs)
        raise status_error(503, "There is no available model provider that meets your routing requirements")

    guard = ApiGuard(max_calls=5, max_usd=1, provider="openrouter")
    with pytest.raises(RunAborted, match="PROVIDER_POLICY"):
        guard.guarded(original)(None, model="o1", messages=[])
    assert len(calls) == 1 and guard.errors == 0


# --------------------------------------------------------------------------- service


def test_every_openrouter_request_carries_the_privacy_policy(make_client, example_request):
    client, fake = openrouter_client(make_client, model_outputs())
    body = client.post(STEP, json=example_request, headers=AUTH).json()

    assert body["status"] == "ok"
    assert [call["model"] for call in fake.calls] == ["openai/o1", "openai/gpt-4o"]
    for call in fake.calls:
        assert call["extra_body"]["provider"] == POLICY
        assert call["extra_body"]["usage"] == {"include": True}
    assert body["meta"]["model"] == "openai/o1+openai/gpt-4o"
    assert "+provider=openrouter+data=synthetic-only+plan=openai/o1+assess=openai/gpt-4o+experimental" in body["meta"]["version"]


def test_throughput_sort_reaches_both_openrouter_model_calls(make_client, example_request):
    client, fake = openrouter_client(make_client, model_outputs(), openrouter_provider_sort="throughput")
    body = client.post(STEP, json=example_request, headers=AUTH).json()

    assert body["status"] == "ok"
    assert [call["extra_body"]["provider"] for call in fake.calls] == [
        {**POLICY, "sort": "throughput"},
        {**POLICY, "sort": "throughput"},
    ]


def test_openai_requests_carry_no_openrouter_fields(make_client, example_request):
    client, fake = make_client(model_outputs())
    body = client.post(STEP, json=example_request, headers=AUTH).json()
    assert all("extra_body" not in call for call in fake.calls)
    assert "+provider=openai+data=synthetic-only+plan=o1+assess=gpt-4o" in body["meta"]["version"]
    assert "+experimental" not in body["meta"]["version"]


def test_policy_failure_is_unavailable_and_does_not_pause_the_service(make_client, example_request, settings):
    refused = status_error(503, "There is no available model provider that meets your routing requirements")
    client, fake = openrouter_client(make_client, [refused, refused, refused] + model_outputs(), max_consecutive_api_errors=3)
    codes = [client.post(STEP, json=example_request, headers=AUTH).json()["error"]["code"] for _ in range(3)]
    assert codes == ["PROVIDER_POLICY"] * 3
    assert client.post(STEP, json=example_request, headers=AUTH).json()["status"] == "ok"
    assert len(fake.calls) == 5  # one attempt per step, never a second attempt without the policy


def test_reported_cost_is_used_and_recorded(make_client, example_request, settings):
    outputs = [
        completion("plan", "openai/o1", cost=0.4321, provider="OpenAI"),
        completion(json.dumps(assessment()), "openai/gpt-4o", cost=0.0111, provider="Azure"),
    ]
    client, _ = openrouter_client(make_client, outputs)
    body = client.post(STEP, json=example_request, headers=AUTH).json()

    assert body["meta"]["costUsd"] == pytest.approx(0.4432)
    record = audit_record(settings)
    assert record["provider"] == "openrouter"
    assert record["models"] == {"plan": "openai/o1", "assessment": "openai/gpt-4o"}
    assert record["costSource"] == ["reported"]
    assert [(c["cost_source"], c["provider_served"]) for c in record["calls"]] == [("reported", "OpenAI"), ("reported", "Azure")]


def test_missing_reported_cost_falls_back_to_the_price_table(make_client, example_request, settings):
    client, _ = openrouter_client(make_client, model_outputs())
    body = client.post(STEP, json=example_request, headers=AUTH).json()
    assert body["meta"]["costUsd"] == pytest.approx(0.245)  # same tokens priced as o1 + gpt-4o
    record = audit_record(settings)
    assert record["costSource"] == ["estimated"]
    assert all(c["provider_served"] is None for c in record["calls"])


# --------------------------------------------------------------------------- start-up


@pytest.mark.parametrize("service_env", ["development", "production"])
def test_start_is_refused_without_the_selected_providers_key(service_env):
    env = {"MIRA_SERVICE_ENV": service_env, "MIRA_LLM_PROVIDER": "openrouter", "MIRA_DEV_TOKEN": "t", "OPENAI_API_KEY": "k"}
    with pytest.raises(StartupRefused, match="OPENROUTER_API_KEY is empty"):
        check_startup(load_settings(env), environ=env)


def test_production_with_the_key_is_still_refused_for_lack_of_a_verifier():
    env = {
        "MIRA_SERVICE_ENV": "production",
        "MIRA_LLM_PROVIDER": "openrouter",
        "MIRA_DATA_POLICY": "openrouter-zdr",
        "OPENROUTER_API_KEY": "k",
    }
    with pytest.raises(StartupRefused, match="no production token verifier"):
        check_startup(load_settings(env), environ=env)


def test_unknown_provider_is_refused():
    env = {"MIRA_LLM_PROVIDER": "anthropic", "MIRA_DEV_TOKEN": "t"}
    with pytest.raises(StartupRefused, match="Unknown MIRA_LLM_PROVIDER"):
        check_startup(load_settings(env), environ=env)


def test_openrouter_defaults_and_overrides():
    defaults = load_settings({"MIRA_LLM_PROVIDER": "openrouter"})
    assert (defaults.plan_model, defaults.assess_model) == ("openai/o1", "openai/gpt-4o")
    custom = load_settings({"MIRA_LLM_PROVIDER": "openrouter", "MIRA_PLAN_MODEL": "gpt-5"})
    assert custom.plan_model == "openai/gpt-5"
