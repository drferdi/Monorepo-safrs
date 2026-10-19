"""The step endpoint end to end, with a mocked model client."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import openai
import pytest
from starlette.requests import Request

from service import postchecks
from service.app import AUDIT_RETENTION_DAYS, digest
from service.audit import AuditLog, DailyBudget
from service.contract import RESPONSE, UNFILLABLE_FIELDS, errors
from service.engine import FAST_COPIES, ApiErrorBreaker, StepEngine
from service.postchecks import NOT_AVAILABLE_NOTE

from .conftest import AUTH, FakeClient, assessment, completion, model_outputs, with_case

STEP = "/v1/diagnosis/step"


def post(client, request, headers=AUTH):
    return client.post(STEP, content=json.dumps(request), headers=headers)


def theoracle_grounding() -> dict:
    return {
        "version": "theoracle-grounding-v2",
        "corpus": {
            "name": "TheOracle",
            "indexSha256": "a" * 64,
            "embeddingModel": {
                "id": "onnx-community/embeddinggemma-300m-ONNX",
                "revision": "e" * 40,
                "dtype": "fp32",
                "dims": 768,
            },
            "retrievedAt": "2026-10-11T12:00:00.000Z",
            "reviewProvenance": "Gaffer stated on 2026-10-11 that Gaffer reviewed and approved the TheOracle corpus.",
        },
        "queryDigest": "b" * 64,
        "evidence": [
            {
                "evidenceId": "P001-001",
                "text": "THEORACLE_QUOTE pneumonia guidance exact source passage",
                "retrievalRank": 1,
                "similarity": 0.71,
                "source": {
                    "title": "PNPK_Pneumonia.md",
                    "docSource": "Kemenkes knowledge base markdown reviewed and approved by Gaffer",
                    "origin": "oracle-ii-knowledge-base",
                    "textSha256": "c" * 64,
                },
            }
        ],
    }


def audit_lines(settings) -> list[dict]:
    files = list(settings.audit_dir.glob("audit-*.jsonl"))
    return [json.loads(line) for f in files for line in f.read_text(encoding="utf-8").splitlines()]


def test_happy_path_returns_a_contract_valid_assessment(make_client, example_request, settings):
    client, fake = make_client(model_outputs())
    response = post(client, example_request)

    assert response.status_code == 200
    body = response.json()
    assert errors(RESPONSE, body) == []
    assert body["status"] == "ok"
    assert body["differential"]["likely"][0]["icd10"] == "K35.8"
    assert body["disposition"] == {"decision": "refer", "urgency": "urgent"}
    assert body["meta"]["model"] == "o1+gpt-4o"
    assert "+experimental" not in body["meta"]["version"]
    assert body["meta"]["costUsd"] > 0

    plan_call, assess_call = fake.calls
    assert plan_call["model"] == "o1" and "temperature" not in plan_call
    assert "Available Tools and options" in plan_call["messages"][0]["content"]
    assert assess_call["model"] == "gpt-4o"
    assert assess_call["response_format"]["json_schema"]["strict"] is True
    assert "1. Examine the abdomen" in assess_call["messages"][1]["content"]

    [record] = audit_lines(settings)
    assert record["traceId"] == example_request["traceId"]
    assert [c["role"] for c in record["calls"]] == ["plan", "assessment"]
    # Metadata and hashes only: the case text never reaches the ledger.
    assert record["requestSha256"] == digest(example_request) and record["responseSha256"] == digest(body)
    assert "request" not in record and "response" not in record
    assert example_request["case"]["chiefComplaint"] not in json.dumps(record)


def test_an_answer_without_choices_is_invalid_output_and_still_charged(make_client, example_request, settings):
    empty = completion("plan", "o1")
    empty.choices = []
    client, _ = make_client([empty])
    body = post(client, example_request).json()
    assert body["error"]["code"] == "MODEL_OUTPUT_INVALID"
    assert body["meta"]["costUsd"] > 0
    [record] = audit_lines(settings)
    assert record["costUsd"] == body["meta"]["costUsd"]


def test_audit_files_older_than_the_retention_are_pruned_at_startup(make_client, settings):
    settings.audit_dir.mkdir(parents=True)
    today = datetime.now(UTC).date()
    old = settings.audit_dir / f"audit-{today - timedelta(days=AUDIT_RETENTION_DAYS + 1)}.jsonl"
    kept = settings.audit_dir / f"audit-{today - timedelta(days=AUDIT_RETENTION_DAYS)}.jsonl"
    other = settings.audit_dir / "notes.txt"
    for path in (old, kept, other):
        path.write_text("{}\n", encoding="utf-8")
    make_client([])
    assert not old.exists() and kept.exists() and other.exists()


def test_a_non_default_model_is_marked_experimental(make_client, example_request):
    client, _ = make_client(model_outputs(), plan_model="o3")
    body = post(client, example_request).json()
    assert body["meta"]["version"].endswith("+plan=o3+assess=gpt-4o+experimental")


def test_an_allowed_plan_model_header_plans_with_that_model(make_client, example_request, settings):
    client, fake = make_client(model_outputs(), plan_model_choices=("o1", "o3"))
    body = post(client, example_request, headers={**AUTH, "X-MIRA-Plan-Model": " o3 "}).json()

    assert body["status"] == "ok"
    assert [call["model"] for call in fake.calls] == ["o3", "gpt-4o"]
    assert body["meta"]["model"] == "o3+gpt-4o"
    assert body["meta"]["version"].endswith("+plan=o3+assess=gpt-4o+experimental")
    [record] = audit_lines(settings)
    assert record["models"] == {"plan": "o3", "assessment": "gpt-4o"}


def test_a_plan_model_outside_the_choices_is_refused_before_any_call(make_client, example_request, settings):
    client, fake = make_client(model_outputs(), plan_model_choices=("o1", "o3"))
    body = post(client, example_request, headers={**AUTH, "X-MIRA-Plan-Model": "openai/gpt-5.4-pro"}).json()

    assert errors(RESPONSE, body) == []
    assert body["status"] == "unavailable" and body["error"]["code"] == "MODEL_NOT_ALLOWED"
    assert "gpt-5.4-pro" not in json.dumps(body)
    assert fake.calls == []
    [record] = audit_lines(settings)
    assert record["errorCode"] == "MODEL_NOT_ALLOWED" and "request" not in record


def test_invalid_icd_codes_are_removed_and_listed(make_client, example_request):
    dx = {
        "likely": [{"icd10": "K35.80", "label": "Appendicitis (ICD-10-CM style)", "confidenceTier": "high"}],
        "alternatives": [{"icd10": "K99.1", "label": "Invented", "confidenceTier": "low"}],
        "cannotMiss": [],
    }
    client, _ = make_client(model_outputs(assessment(differential=dx)))
    body = post(client, example_request).json()

    assert errors(RESPONSE, body) == []
    assert body["differential"]["likely"][0]["icd10"] == "K35.8"
    assert body["differential"]["alternatives"] == []
    reasons = {u["field"]: u["reason"] for u in body["unfilled"]}
    assert "K99.1 (not a WHO ICD-10 code)" in reasons["differential.alternatives"]


def test_a_female_only_diagnosis_is_removed_for_a_male_patient(make_client, example_request):
    dx = {
        "likely": [{"icd10": "K35.8", "label": "Acute appendicitis", "confidenceTier": "high"}],
        "alternatives": [{"icd10": "N70.0", "label": "Acute salpingitis", "confidenceTier": "low"}],
        "cannotMiss": [],
    }
    evidence = [{"icd10": "N70.0", "supporting": ["lower abdominal pain"], "opposing": []}]
    client, _ = make_client(model_outputs(assessment(differential=dx, evidence=evidence)))
    body = post(client, example_request).json()

    assert example_request["case"]["demographics"]["sex"] == "M"
    assert body["differential"]["alternatives"] == []
    assert body["evidence"] == []
    reasons = {u["field"]: u["reason"] for u in body["unfilled"]}
    assert "N70.0 (requires female)" in reasons["differential.alternatives"]


def test_a_test_the_facility_lacks_stays_listed_with_a_referral_note(make_client, example_request):
    actions = [
        {"kind": "test", "item": "Complete blood count", "reason": "infection", "matchedCapability": "Darah rutin"},
        {"kind": "test", "item": "Abdominal CT", "reason": "confirm", "matchedCapability": None},
        {"kind": "test", "item": "Ultrasound", "reason": "confirm", "matchedCapability": "USG (invented entry)"},
    ]
    request = with_case(example_request, facilityCapabilities=["Darah rutin", "Urinalisis"])
    client, _ = make_client(model_outputs(assessment(nextBestActions=actions)))
    body = post(client, request).json()

    reasons = [a["reason"] for a in body["nextBestActions"]]
    assert reasons[0] == "infection"
    assert reasons[1].endswith(NOT_AVAILABLE_NOTE)
    assert reasons[2].endswith(NOT_AVAILABLE_NOTE)  # a capability not in the list counts as unavailable
    assert len(body["nextBestActions"]) == 3


def test_personal_data_is_blocked_before_any_model_call(make_client, example_request, settings):
    request = with_case(example_request, anamnesis={"freeText": "hubungi keluarga di 081234567890"})
    client, fake = make_client(model_outputs())
    body = post(client, request).json()

    assert body["status"] == "unavailable"
    assert body["error"]["code"] == "PII_DETECTED"
    assert "081234567890" not in json.dumps(body)
    assert fake.calls == []
    [record] = audit_lines(settings)
    assert "request" not in record and "081234567890" not in json.dumps(record)


@pytest.mark.parametrize("text", ["Pasien Sdr. Budi Santoso", "NIK 3571021204990001", "BPJS 0001234567890"])
def test_other_identifiers_are_blocked(make_client, example_request, text):
    client, fake = make_client(model_outputs())
    body = post(client, with_case(example_request, chiefComplaint=text)).json()
    assert body["error"]["code"] == "PII_DETECTED"
    assert fake.calls == []


def test_random_trace_ids_and_hashes_are_not_read_as_identifiers(make_client, example_request):
    # The gateway's trace id is a random UUID; this one ends in "62930803889", which the phone pattern matched.
    grounding = theoracle_grounding()
    grounding["queryDigest"] = "a" * 53 + "62123456789"
    client, fake = make_client(model_outputs())
    body = post(client, {**example_request, "traceId": "3ee4da5a-7989-49d0-83a4-e62930803889", "grounding": grounding}).json()
    assert body["status"] == "ok"
    assert fake.calls


PII_PARITY = json.loads((Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "pii-parity.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("row", PII_PARITY["evidence"], ids=lambda row: row["text"])
def test_engine_accepts_exactly_the_evidence_the_gateway_keeps(make_client, example_request, row):
    """tests/theoracle-grounding.test.ts runs the same rows through the gateway's passage filter."""
    grounding = theoracle_grounding()
    grounding["evidence"][0]["text"] = row["text"]
    client, _ = make_client(model_outputs())
    body = post(client, {**example_request, "grounding": grounding}).json()
    assert (body["status"] == "ok") == row["kept"]
    if not row["kept"]:
        assert body["error"]["code"] == "PII_DETECTED"


def test_identifiers_in_evidence_text_are_still_blocked(make_client, example_request):
    grounding = theoracle_grounding()
    grounding["evidence"][0]["text"] = "hubungi 081234567890"
    client, fake = make_client(model_outputs())
    body = post(client, {**example_request, "grounding": grounding}).json()
    assert body["error"]["code"] == "PII_DETECTED"
    assert fake.calls == []


def test_step_deadline_returns_timeout(make_client, example_request):
    client, _ = make_client([5.0], step_deadline_s=0.2)
    body = post(client, example_request).json()
    assert body["status"] == "unavailable"
    assert body["error"]["code"] == "TIMEOUT"
    assert errors(RESPONSE, body) == []


def test_client_side_timeouts_are_timeouts_and_do_not_pause_the_service(make_client, example_request):
    import httpx
    from openai import APITimeoutError

    slow = APITimeoutError(request=httpx.Request("POST", "http://model.invalid"))
    client, fake = make_client([slow, slow, slow] + model_outputs(), max_consecutive_api_errors=3)
    codes = [post(client, example_request).json()["error"]["code"] for _ in range(3)]
    assert codes == ["TIMEOUT", "TIMEOUT", "TIMEOUT"]
    assert post(client, example_request).json()["status"] == "ok"
    assert len(fake.calls) == 5


def test_daily_budget_exhausted_makes_no_call(make_client, example_request):
    client, fake = make_client(model_outputs(), daily_budget_usd=0.0)
    body = post(client, example_request).json()
    assert body["error"]["code"] == "BUDGET_EXHAUSTED"
    assert fake.calls == []


def test_daily_budget_counts_spend_across_requests(make_client, example_request):
    # A step needs room for its whole cap (0.50 USD by default); the second one finds less than that left.
    client, fake = make_client(model_outputs() + model_outputs(), daily_budget_usd=0.51)
    assert post(client, example_request).json()["status"] == "ok"
    assert post(client, example_request).json()["error"]["code"] == "BUDGET_EXHAUSTED"
    assert len(fake.calls) == 2


def test_per_step_cost_cap_stops_the_second_call(make_client, example_request):
    expensive_plan = completion("plan", "o1", prompt_tokens=1_000_000, completion_tokens=0)
    client, fake = make_client([expensive_plan], max_usd_per_step=1.0)
    body = post(client, example_request).json()
    assert body["error"]["code"] == "STEP_BUDGET_EXCEEDED"
    assert len(fake.calls) == 1
    assert body["meta"]["costUsd"] == pytest.approx(15.0)


def test_model_error_is_unavailable_and_repeated_errors_pause_calls(make_client, example_request):
    boom = RuntimeError("upstream down")
    client, fake = make_client([boom, boom, boom], max_consecutive_api_errors=3)
    codes = [post(client, example_request).json()["error"]["code"] for _ in range(4)]
    assert codes == ["MODEL_ERROR", "MODEL_ERROR", "MODEL_ERROR", "API_ERRORS"]
    assert len(fake.calls) == 3


def test_a_rejected_key_is_its_own_error_and_never_pauses_calls(make_client, example_request):
    request = httpx.Request("POST", "https://provider.invalid/v1/chat/completions")
    rejected = [
        openai.AuthenticationError("invalid key", response=httpx.Response(401, request=request), body=None),
        openai.PermissionDeniedError("revoked key", response=httpx.Response(403, request=request), body=None),
    ]
    client, fake = make_client(rejected * 2, max_consecutive_api_errors=3)
    codes = [post(client, example_request).json()["error"]["code"] for _ in range(4)]
    assert codes == ["PROVIDER_AUTH"] * 4
    assert len(fake.calls) == 4


def test_unparseable_model_output_is_unavailable(make_client, example_request):
    client, _ = make_client(model_outputs("not json"))
    body = post(client, example_request).json()
    assert body["error"]["code"] == "MODEL_OUTPUT_INVALID"


def test_every_unavailable_answer_lists_all_fields(make_client, example_request):
    client, _ = make_client(model_outputs("not json"))
    body = post(client, example_request).json()
    assert [u["field"] for u in body["unfilled"]] == list(UNFILLABLE_FIELDS)


def test_the_raw_request_never_reaches_logs_or_stdout(make_client, example_request, monkeypatch, caplog, capsys):
    marker = "UNIQUE-CASE-TEXT-7f3a"
    request = with_case(example_request, chiefComplaint=f"nyeri perut {marker}")

    def broken(*_args, **_kwargs):
        raise RuntimeError(marker)

    caplog.set_level(logging.DEBUG)
    client, _ = make_client(model_outputs() + model_outputs())
    post(client, request)  # happy path
    monkeypatch.setattr(postchecks, "apply", broken)
    body = post(client, request).json()  # internal failure path

    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert marker not in json.dumps(body)
    captured = capsys.readouterr()
    assert marker not in caplog.text
    assert marker not in captured.out + captured.err


@pytest.mark.parametrize(
    ("headers", "payload", "status"),
    [
        ({}, None, 401),
        ({"Authorization": "Bearer wrong"}, None, 401),
        (AUTH, "{not json", 400),
        (AUTH, {"contractVersion": "1", "traceId": "t"}, 400),
    ],
)
def test_bad_requests_are_refused(make_client, example_request, headers, payload, status):
    client, fake = make_client(model_outputs())
    content = json.dumps(example_request if payload is None else payload) if not isinstance(payload, str) else payload
    response = client.post(STEP, content=content, headers=headers)
    assert response.status_code == status
    assert fake.calls == []


def test_a_request_with_an_extra_field_is_refused(make_client, example_request):
    client, _ = make_client(model_outputs())
    request = with_case(example_request, patientName="not allowed")
    response = post(client, request)
    assert response.status_code == 400
    assert "not allowed" not in response.text


def test_oversized_requests_are_refused(make_client, example_request):
    client, fake = make_client(model_outputs(), max_body_bytes=100)
    assert post(client, example_request).status_code == 413
    assert fake.calls == []


def test_rate_limit_per_token(make_client, example_request):
    client, _ = make_client(model_outputs(), rate_limit_per_minute=1)
    assert post(client, example_request).status_code == 200
    assert post(client, example_request).status_code == 429


def test_healthz_needs_no_token(make_client):
    client, _ = make_client([])
    body = client.get("/healthz").json()
    assert body["status"] == "ok" and body["contractVersion"] == "1"
    assert "theoracle-grounding-v2" in body["capabilities"]


def test_grounding_is_optional_for_legacy_v1_clients(make_client, example_request):
    client, fake = make_client(model_outputs())
    original = json.loads(json.dumps(example_request))
    body = post(client, example_request).json()
    assert body["status"] == "ok"
    assert example_request == original
    assert all("THEORACLE_QUOTE" not in message["content"] for call in fake.calls for message in call["messages"])


def test_grounded_full_assessment_keeps_case_unchanged_and_supplies_every_call(make_client, example_request, settings):
    request = {**example_request, "grounding": theoracle_grounding()}
    original_case = json.loads(json.dumps(request["case"]))
    client, fake = make_client(model_outputs())
    body = post(client, request).json()

    assert body["status"] == "ok"
    assert request["case"] == original_case
    assert len(fake.calls) == 2
    for call in fake.calls:
        prompt = "\n".join(message["content"] for message in call["messages"])
        assert request["case"]["chiefComplaint"] in prompt
        assert "THEORACLE_QUOTE pneumonia guidance exact source passage" in prompt
        assert "separate from patient facts" in prompt
        assert "verbatim from an excerpt" in prompt
    [record] = audit_lines(settings)
    assert record["requestSha256"] == digest(request)


def test_invalid_grounding_is_refused_before_model_calls(make_client, example_request):
    grounding = theoracle_grounding()
    grounding["evidence"][0]["unexpected"] = "not allowed"
    client, fake = make_client(model_outputs())
    response = post(client, {**example_request, "grounding": grounding})
    assert response.status_code == 400
    assert fake.calls == []


def test_provisional_differential_is_opt_in_and_marked_in_the_version(make_client, example_request):
    client, fake = make_client(model_outputs())
    body = post(client, example_request).json()
    assert "provisional differential" not in fake.calls[1]["messages"][0]["content"]
    assert "+ddx=provisional" not in body["meta"]["version"]

    client, fake = make_client(model_outputs(), provisional_differential=True)
    body = post(client, example_request).json()
    instructions = " ".join(fake.calls[1]["messages"][0]["content"].split())
    assert "provisional differential" in instructions
    assert "never leave differential.likely, differential.alternatives or differential.cannotMiss empty" in instructions
    assert "Prefer disease codes over symptom codes" in instructions
    assert "occur in Indonesia" in instructions
    assert body["meta"]["version"].endswith("+ddx=provisional")
    assert fake.calls[1]["response_format"]["json_schema"]["strict"] is True


def test_provisional_differential_setting_accepts_only_true_or_false():
    from service.settings import StartupRefused, load_settings

    assert load_settings({}).provisional_differential is False
    assert load_settings({"MIRA_PROVISIONAL_DIFFERENTIAL": "true"}).provisional_differential is True
    with pytest.raises(StartupRefused, match="MIRA_PROVISIONAL_DIFFERENTIAL"):
        load_settings({"MIRA_PROVISIONAL_DIFFERENTIAL": "yes"})


def fast_outputs(diagnosis_copies, workup_copies, pad=5.0):
    """Queued outputs in the fast mode's call order: every diagnosis copy, then every workup copy.
    Each list is padded to FAST_COPIES with `pad` (by default a copy too slow to win)."""
    fill = lambda copies: [*copies, *[pad] * (FAST_COPIES - len(copies))]
    return [*fill(diagnosis_copies), *fill(workup_copies)]


def diagnosis_part(**overrides) -> str:
    body = assessment(**overrides)
    return json.dumps({k: body[k] for k in ("differential", "evidence", "disposition", "unfilled")})


def workup_part() -> str:
    body = assessment()
    return json.dumps({"missingInformation": body["missingInformation"], "nextBestActions": body["nextBestActions"], "unfilled": []})


def test_fast_assessment_skips_planning_and_merges_two_parallel_parts(make_client, example_request, settings):
    outputs = fast_outputs(
        [completion(diagnosis_part(), "gpt-4o")],
        [completion(workup_part(), "gpt-4o")],
    )
    client, fake = make_client(outputs, fast_assessment=True)
    body = post(client, example_request).json()

    assert body["status"] == "ok"
    assert errors(RESPONSE, body) == []
    assert body["differential"]["likely"][0]["icd10"] == "K35.8"
    assert [a["item"] for a in body["nextBestActions"]] == ["Rovsing sign", "Abdominal ultrasound"]
    assert body["meta"]["version"].endswith("+assessment=fast")
    assert all("Available Tools and options" not in m["content"] for c in fake.calls for m in c["messages"])
    fast_rules = " ".join(fake.calls[0]["messages"][0]["content"].split())
    assert "in Bahasa Indonesia" in fast_rules and "without disclaimers" in fast_rules
    assert "at least one test (laboratory or imaging) that would confirm the likely diagnosis or exclude a dangerous one" in fast_rules
    names = [c["response_format"]["json_schema"]["name"] for c in fake.calls]
    assert names == ["step_diagnosis"] * FAST_COPIES + ["step_workup"] * FAST_COPIES
    assert all(c["response_format"]["json_schema"]["strict"] for c in fake.calls)
    [record] = audit_lines(settings)
    losers = FAST_COPIES - 1
    assert [c["role"] for c in record["calls"]] == ["diagnosis", "workup"] + ["diagnosis"] * losers + ["workup"] * losers
    assert [c["cost_source"] for c in record["calls"]][2:] == ["estimated-cancelled"] * 2 * losers


def test_fast_assessment_uses_the_other_copy_when_one_fails(make_client, example_request):
    outputs = fast_outputs(
        [RuntimeError("provider hiccup"), completion(diagnosis_part(), "gpt-4o")],
        [completion(workup_part(), "gpt-4o"), completion(workup_part(), "gpt-4o")],
    )
    client, _ = make_client(outputs, fast_assessment=True)
    body = post(client, example_request).json()
    assert body["status"] == "ok"
    assert body["differential"]["likely"][0]["icd10"] == "K35.8"


def test_failed_copies_of_a_part_that_succeeds_do_not_pause_the_service(make_client, example_request, caplog):
    ok = [completion(workup_part(), "gpt-4o")]
    outputs = fast_outputs([RuntimeError("rate limited"), RuntimeError("rate limited"), completion(diagnosis_part(), "gpt-4o")], ok)
    outputs += fast_outputs([completion(diagnosis_part(), "gpt-4o")], ok)
    client, _ = make_client(outputs, fast_assessment=True, max_consecutive_api_errors=2)
    assert [post(client, example_request).json()["status"] for _ in range(2)] == ["ok", "ok"]
    assert "diagnosis call failed: RuntimeError" in caplog.text


def test_fast_assessment_is_unavailable_when_both_copies_fail(make_client, example_request):
    outputs = fast_outputs(
        [],
        [completion(workup_part(), "gpt-4o")],
        pad=RuntimeError("down"),
    )
    client, _ = make_client(outputs, fast_assessment=True)
    body = post(client, example_request).json()
    assert body["status"] == "unavailable"
    assert body["error"]["code"] == "MODEL_ERROR"


def test_fast_assessment_setting_accepts_only_true_or_false():
    from service.settings import StartupRefused, load_settings

    assert load_settings({}).fast_assessment is False
    assert load_settings({"MIRA_FAST_ASSESSMENT": "true"}).fast_assessment is True
    with pytest.raises(StartupRefused, match="MIRA_FAST_ASSESSMENT"):
        load_settings({"MIRA_FAST_ASSESSMENT": "1"})


def test_fast_assessment_uses_the_other_copy_when_one_returns_invalid_json(make_client, example_request):
    outputs = fast_outputs(
        [completion('{"differential": ', "gpt-4o"), completion(diagnosis_part(), "gpt-4o")],
        [completion(workup_part(), "gpt-4o"), completion(workup_part(), "gpt-4o")],
    )
    client, _ = make_client(outputs, fast_assessment=True)
    body = post(client, example_request).json()
    assert body["status"] == "ok"
    assert body["differential"]["likely"][0]["icd10"] == "K35.8"


def test_fast_assessment_spreads_copies_over_the_configured_providers(make_client, example_request):
    client, fake = make_client(
        fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
        fast_assessment=True, llm_provider="openrouter", fast_copy_providers=("ai-studio", "vertex"),
    )
    assert post(client, example_request).json()["status"] == "ok"
    orders = [c["extra_body"]["provider"].get("order") for c in fake.calls]
    assert orders == [["ai-studio"], ["vertex"], ["ai-studio"]][:FAST_COPIES] * 2
    assert all(c["extra_body"]["provider"]["data_collection"] == "deny" for c in fake.calls)


def test_fast_copy_providers_need_openrouter():
    from service.settings import StartupRefused, check_startup, load_settings

    assert load_settings({}).fast_copy_providers == ()
    settings = load_settings({"MIRA_DEV_TOKEN": "t", "MIRA_FAST_COPY_PROVIDERS": "a, b"})
    assert settings.fast_copy_providers == ("a", "b")
    with pytest.raises(StartupRefused, match="MIRA_FAST_COPY_PROVIDERS requires MIRA_LLM_PROVIDER=openrouter"):
        check_startup(settings, require_api_key=False)


def therapy_part() -> str:
    return json.dumps({
        "therapy": {
            "forDiagnosis": {"icd10": "K35.8", "label": "Acute appendicitis"},
            "regimen": [
                {"drug": "Ceftriaxone", "dose": "1x2g", "route": "IV", "duration": "dosis tunggal pra-rujukan", "note": ""},
                {"drug": "Metronidazole", "dose": "3x500mg", "route": "IV", "duration": "sampai dirujuk", "note": ""},
            ],
            "interactions": ["Metronidazole dengan alkohol: reaksi disulfiram"],
            "contraindications": ["Ceftriaxone: alergi sefalosporin"],
        }
    })


def test_fast_therapy_adds_a_third_raced_part_with_compact_doses(make_client, example_request, settings):
    outputs = [*fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
               completion(therapy_part(), "gpt-4o"), 5.0, 5.0][: 3 * FAST_COPIES]
    client, fake = make_client(outputs, fast_assessment=True, fast_therapy=True)
    body = post(client, example_request).json()

    assert body["status"] == "ok"
    assert errors(RESPONSE, body) == []
    assert body["therapy"]["regimen"][1] == {"drug": "Metronidazole", "dose": "3x500mg", "route": "IV", "duration": "sampai dirujuk", "note": ""}
    assert body["meta"]["version"].endswith("+assessment=fast+therapy=fast")
    names = [c["response_format"]["json_schema"]["name"] for c in fake.calls]
    assert names == ["step_diagnosis"] * FAST_COPIES + ["step_workup"] * FAST_COPIES + ["step_therapy"] * FAST_COPIES
    therapy_rules = " ".join(fake.calls[-1]["messages"][0]["content"].split())
    assert "frequency x strength with no spaces" in therapy_rules
    assert "never repeat the strength in drug" in therapy_rules
    assert "Never leave it empty when regimen has a drug" in therapy_rules
    assert "at least one contraindication" in therapy_rules
    assert "the causal drugs first" in therapy_rules
    [record] = audit_lines(settings)
    assert sorted(c["role"] for c in record["calls"]) == sorted(["diagnosis", "workup", "therapy"] * FAST_COPIES)


def test_fast_therapy_failure_leaves_the_assessment_without_therapy(make_client, example_request):
    outputs = [*fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
               *[RuntimeError("down")] * FAST_COPIES]
    client, _ = make_client(outputs, fast_assessment=True, fast_therapy=True)
    body = post(client, example_request).json()
    assert body["status"] == "ok"
    assert "therapy" not in body
    assert body["differential"]["likely"][0]["icd10"] == "K35.8"


def test_without_fast_therapy_the_response_has_no_therapy(make_client, example_request):
    client, fake = make_client(fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]), fast_assessment=True)
    body = post(client, example_request).json()
    assert "therapy" not in body and "+therapy" not in body["meta"]["version"]
    assert len(fake.calls) == 2 * FAST_COPIES


def test_fast_therapy_setting_needs_fast_assessment():
    from service.settings import StartupRefused, check_startup, load_settings

    assert load_settings({}).fast_therapy is False
    settings = load_settings({"MIRA_DEV_TOKEN": "t", "MIRA_FAST_THERAPY": "true"})
    assert settings.fast_therapy is True
    with pytest.raises(StartupRefused, match="MIRA_FAST_THERAPY requires MIRA_FAST_ASSESSMENT=true"):
        check_startup(settings, require_api_key=False)
    with pytest.raises(StartupRefused, match="MIRA_FAST_THERAPY"):
        load_settings({"MIRA_FAST_THERAPY": "on"})


def test_fast_therapy_prefers_a_complete_regimen_over_a_faster_empty_one(make_client, example_request, settings):
    empty = json.dumps({"therapy": {"forDiagnosis": {"icd10": "K35.8", "label": "Acute appendicitis"}, "regimen": [], "interactions": [], "contraindications": []}})
    outputs = [*fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
               completion(empty, "gpt-4o"), completion(therapy_part(), "gpt-4o"), 5.0]
    client, _ = make_client(outputs, fast_assessment=True, fast_therapy=True)
    body = post(client, example_request).json()
    assert [r["drug"] for r in body["therapy"]["regimen"]] == ["Ceftriaxone", "Metronidazole"]


def test_fast_therapy_keeps_an_empty_regimen_when_every_copy_agrees(make_client, example_request):
    empty = json.dumps({"therapy": {"forDiagnosis": {"icd10": "K35.8", "label": "Acute appendicitis"}, "regimen": [], "interactions": [], "contraindications": []}})
    outputs = [*fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
               *[completion(empty, "gpt-4o")] * FAST_COPIES]
    client, _ = make_client(outputs, fast_assessment=True, fast_therapy=True)
    body = post(client, example_request).json()
    assert body["status"] == "ok" and body["therapy"]["regimen"] == []


def test_fast_therapy_waits_only_a_short_grace_for_a_better_copy(make_client, example_request, monkeypatch):
    import time

    from service import engine

    monkeypatch.setattr(engine, "FALLBACK_GRACE_S", 0.05)
    empty = json.dumps({"therapy": {"forDiagnosis": {"icd10": "K35.8", "label": "Acute appendicitis"}, "regimen": [], "interactions": [], "contraindications": []}})
    outputs = [*fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
               completion(empty, "gpt-4o"), 5.0, 5.0]
    client, _ = make_client(outputs, fast_assessment=True, fast_therapy=True)
    started = time.monotonic()
    body = post(client, example_request).json()
    assert time.monotonic() - started < 1.0
    assert body["status"] == "ok" and body["therapy"]["regimen"] == []


def test_therapy_rules_ask_for_pre_referral_drugs():
    from service.prompts import FAST_THERAPY_RULES

    rules = " ".join(FAST_THERAPY_RULES.split())
    assert "A surgical or referral diagnosis still gets its pre-referral drugs" in rules


def test_therapy_rules_never_take_a_frequency_alone_as_a_dose():
    from service.prompts import FAST_THERAPY_RULES

    rules = " ".join(FAST_THERAPY_RULES.split())
    assert "never a frequency alone such as 1x or 2-3x" in rules
    assert "a single dose is 1x." not in rules


def test_grounding_reaches_fast_diagnosis_workup_and_therapy_prompts(make_client, example_request):
    outputs = [
        *fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
        completion(therapy_part(), "gpt-4o"), 5.0, 5.0,
    ][: 3 * FAST_COPIES]
    request = {**example_request, "grounding": theoracle_grounding()}
    original_case = json.loads(json.dumps(request["case"]))
    client, fake = make_client(outputs, fast_assessment=True, fast_therapy=True)
    body = post(client, request).json()

    assert body["status"] == "ok"
    assert request["case"] == original_case
    assert {call["response_format"]["json_schema"]["name"] for call in fake.calls} == {
        "step_diagnosis", "step_workup", "step_therapy"
    }
    for call in fake.calls:
        prompt = "\n".join(message["content"] for message in call["messages"])
        assert request["case"]["chiefComplaint"] in prompt
        assert "THEORACLE_QUOTE pneumonia guidance exact source passage" in prompt
        assert "separate from patient facts" in prompt


def test_grounding_constraints_have_system_priority_and_preserve_legacy_prompts(example_request):
    from service.prompts import (
        assessment_messages,
        fast_assessment_messages,
        planning_messages,
    )

    grounding = theoracle_grounding()
    case = example_request["case"]
    for messages in [
        planning_messages(case, "menu", grounding),
        assessment_messages(case, "plan", True, grounding),
        fast_assessment_messages(case, True, True, grounding),
    ]:
        assert messages[0]["role"] == "system"
        assert "take precedence over mandatory regimen" in messages[0]["content"]
        assert "If the supplied excerpts do not support a therapy regimen, leave regimen empty" in messages[0]["content"]
    assert planning_messages(case, "menu")[0]["role"] == "user"
    for messages in [assessment_messages(case, "plan", True), fast_assessment_messages(case, True, True)]:
        assert "take precedence over mandatory regimen" not in messages[0]["content"]


THERAPY = "/v1/therapy/step"


def therapy_request(example_request: dict, **overrides) -> dict:
    return {"contractVersion": "1", "traceId": "t-therapy", "case": example_request["case"],
            "diagnosis": {"icd10": "K35.8", "label": "Acute appendicitis"}, "grounding": theoracle_grounding(), **overrides}


def test_step_can_omit_therapy(make_client, example_request):
    client, fake = make_client(fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
                               fast_assessment=True, fast_therapy=True)
    body = post(client, {**example_request, "omitTherapy": True}).json()
    assert body["status"] == "ok"
    assert "therapy" not in body
    assert [c["response_format"]["json_schema"]["name"] for c in fake.calls].count("step_therapy") == 0


def test_therapy_step_writes_therapy_for_the_given_diagnosis(make_client, example_request, settings):
    client, fake = make_client([completion(therapy_part(), "gpt-4o")] * FAST_COPIES, fast_assessment=True, fast_therapy=True)
    response = client.post(THERAPY, content=json.dumps(therapy_request(example_request)), headers=AUTH)
    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["therapy"]["forDiagnosis"]["icd10"] == "K35.8"
    assert body["meta"]["costUsd"] > 0
    user = fake.calls[0]["messages"][1]["content"]
    assert "Diagnosis to treat: Acute appendicitis (K35.8)" in user
    assert "THEORACLE_QUOTE" in user
    [record] = audit_lines(settings)
    assert {c["role"] for c in record["calls"]} == {"therapy"}


def test_therapy_step_requires_grounding_and_diagnosis(make_client, example_request):
    client, fake = make_client([])
    for missing in ("grounding", "diagnosis"):
        request = therapy_request(example_request)
        del request[missing]
        assert client.post(THERAPY, content=json.dumps(request), headers=AUTH).status_code == 400
    assert fake.calls == []


def test_therapy_step_failure_is_unavailable(make_client, example_request):
    client, _ = make_client([RuntimeError("down")] * FAST_COPIES, fast_assessment=True, fast_therapy=True)
    body = client.post(THERAPY, content=json.dumps(therapy_request(example_request)), headers=AUTH).json()
    assert body["status"] == "unavailable"
    assert "therapy" not in body


def test_healthz_advertises_targeted_therapy(make_client):
    client, _ = make_client([])
    assert "theoracle-targeted-therapy-v1" in client.get("/healthz").json()["capabilities"]


def test_an_unexpected_failure_after_paid_calls_still_counts_toward_the_daily_budget(make_client, example_request, monkeypatch):
    # Row 40: the spend of a step that crashes outside the handled classes must reach the daily budget.
    def crash(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr(postchecks, "apply", crash)
    client, fake = make_client(model_outputs() + model_outputs(), daily_budget_usd=0.51)
    assert post(client, example_request).json()["error"]["code"] == "INTERNAL_ERROR"
    assert post(client, example_request).json()["error"]["code"] == "BUDGET_EXHAUSTED"
    assert len(fake.calls) == 2


def test_an_unexpected_therapy_failure_after_a_paid_call_still_counts_toward_the_daily_budget(make_client, example_request, monkeypatch):
    def crash(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr(postchecks, "resolve_code", crash)
    client, fake = make_client([completion(therapy_part(), "gpt-4o")] * (2 * FAST_COPIES), daily_budget_usd=0.51,
                               fast_assessment=True, fast_therapy=True)
    request = json.dumps(therapy_request(example_request))
    assert client.post(THERAPY, content=request, headers=AUTH).json()["error"]["code"] == "INTERNAL_ERROR"
    assert client.post(THERAPY, content=request, headers=AUTH).json()["error"]["code"] == "BUDGET_EXHAUSTED"
    assert len(fake.calls) == FAST_COPIES


def test_a_crashed_step_writes_its_spend_to_the_ledger_so_a_restart_keeps_it(make_client, example_request, settings, monkeypatch):
    # Row 40 (a): the ledger line of a crashed step carries its cost and calls; DailyBudget seeds from that ledger.
    def crash(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr(postchecks, "apply", crash)
    client, _ = make_client(model_outputs())
    body = post(client, example_request).json()
    assert body["error"]["code"] == "INTERNAL_ERROR" and body["meta"]["costUsd"] > 0
    [record] = audit_lines(settings)
    assert record["costUsd"] == body["meta"]["costUsd"]
    assert [call["role"] for call in record["calls"]] == ["plan", "assessment"]
    assert AuditLog(settings.audit_dir).spent_today() == pytest.approx(body["meta"]["costUsd"])


def test_a_crashed_therapy_step_writes_its_spend_to_the_ledger(make_client, example_request, settings, monkeypatch):
    def crash(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr(postchecks, "resolve_code", crash)
    client, _ = make_client([completion(therapy_part(), "gpt-4o")] * FAST_COPIES, fast_assessment=True, fast_therapy=True)
    body = client.post(THERAPY, content=json.dumps(therapy_request(example_request)), headers=AUTH).json()
    assert body["error"]["code"] == "INTERNAL_ERROR" and body["meta"]["costUsd"] > 0
    [record] = audit_lines(settings)
    assert record["costUsd"] == body["meta"]["costUsd"] and record["calls"]


def test_a_step_the_caller_hangs_up_on_is_cancelled_and_charged_its_cap(make_client, example_request, settings, monkeypatch):
    # Row 46: the gateway gives up on a step (stage timeout, the clinician cancels); the engine stops its calls too.
    # The call in flight reports no cost and may still be billed, so the step is charged its whole cap.
    client, fake = make_client([3.0])
    monkeypatch.setattr(Request, "is_disconnected", lambda request: asyncio.sleep(0, bool(fake.calls)))
    body = post(client, example_request).json()
    assert body["error"]["code"] == "CLIENT_DISCONNECTED"
    [record] = audit_lines(settings)
    assert record["errorCode"] == "CLIENT_DISCONNECTED" and record["costSource"] == ["estimated-cancelled"]
    assert record["costUsd"] == pytest.approx(settings.max_usd_per_step)
    assert AuditLog(settings.audit_dir).spent_today() == pytest.approx(settings.max_usd_per_step)
    assert len(fake.calls) == 1


def test_the_daily_budget_holds_a_step_cap_until_the_step_settles(tmp_path):
    budget = DailyBudget(0.6, AuditLog(tmp_path))
    assert budget.reserve(0.5)
    assert not budget.reserve(0.5)  # 0.5 held + 0.5 > 0.6
    budget.settle(0.5, 0.1)
    assert budget.reserve(0.4) and not budget.reserve(0.11)  # 0.1 spent + 0.4 held
    budget.settle(0.4, 0.0)
    assert not budget.exhausted()


def test_concurrent_steps_reserve_the_step_cap_so_they_cannot_all_pass(settings, example_request):
    # Row 40 (b): each step holds max_usd_per_step at start, so a second step started meanwhile is refused.
    step_settings = replace(settings, max_usd_per_step=0.5, daily_budget_usd=0.6)
    fake = FakeClient(model_outputs())
    budget = DailyBudget(step_settings.daily_budget_usd, AuditLog(step_settings.audit_dir))
    engine = StepEngine(step_settings, fake, budget, ApiErrorBreaker(3, 60.0))

    async def both():
        return await asyncio.gather(engine.run(example_request["case"]), engine.run(example_request["case"]))

    (first, _, _), (second, _, _) = asyncio.run(both())
    assert first["status"] == "ok"
    assert second["error"]["code"] == "BUDGET_EXHAUSTED"
    assert len(fake.calls) == 2
