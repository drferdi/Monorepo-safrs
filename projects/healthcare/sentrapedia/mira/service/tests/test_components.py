"""Contract copies, menu, post-checks, guard, settings and the simulation adapter."""

from __future__ import annotations

import ast
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

from service import ASSIST_DIR, SRC_DIR
from service.contract import CONTRACT_DIR, REQUEST, RESPONSE, UNFILLABLE_FIELDS, errors, unavailable_response
from service.menu import EXCLUDED_TOOLS, PLANNING_TOOLS
from service.postchecks import SERVICE_DIR, incompatible_rule, normalize_code
from service.prompts import ASSESSMENT_INSTRUCTIONS, ASSESSMENT_SCHEMA, THERAPY_SCHEMA, case_text
from service.settings import StartupRefused, check_startup, load_settings
from service.sim_benchmark import parse_args, simulation_response

VENDORED = [
    "mira-step-request.schema.json",
    "mira-step-response.schema.json",
    "examples/mira-step-request.example.json",
    "examples/mira-step-response.example.json",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# --------------------------------------------------------------------------- contract


def test_the_med_assist_examples_satisfy_the_vendored_schemas():
    request = json.loads((CONTRACT_DIR / VENDORED[2]).read_text(encoding="utf-8"))
    response = json.loads((CONTRACT_DIR / VENDORED[3]).read_text(encoding="utf-8"))
    assert errors(REQUEST, request) == []
    assert errors(RESPONSE, response) == []


def test_an_unavailable_response_is_contract_valid():
    assert errors(RESPONSE, unavailable_response("X", "y", "v", None, None)) == []


def test_source_files_record_the_real_hashes():
    source = (CONTRACT_DIR / "SOURCE.md").read_text(encoding="utf-8")
    for name in VENDORED:
        assert f"`{name}` | `{sha256(CONTRACT_DIR / name)}`" in source
    icd_source = (SERVICE_DIR / "data" / "SOURCE.md").read_text(encoding="utf-8")
    assert sha256(SERVICE_DIR / "data" / "icd10.json") in icd_source


@pytest.mark.skipif(not os.environ.get("MED_ASSIST_CONTRACT_DIR"), reason="MED_ASSIST_CONTRACT_DIR not set")
def test_vendored_contract_matches_med_assist():
    source_dir = Path(os.environ["MED_ASSIST_CONTRACT_DIR"])
    for name in VENDORED:
        assert (CONTRACT_DIR / name).read_bytes() == (source_dir / name).read_bytes(), name


def test_the_assessment_schema_uses_the_contract_field_names():
    response_schema = json.loads((CONTRACT_DIR / VENDORED[1]).read_text(encoding="utf-8"))
    assert response_schema["properties"]["unfilled"]["items"]["properties"]["field"]["enum"] == list(UNFILLABLE_FIELDS)
    contract_fields = set(response_schema["properties"]) - {"contractVersion", "status", "error", "meta", "therapy"}
    assert set(ASSESSMENT_SCHEMA["properties"]) == contract_fields
    therapy = response_schema["properties"]["therapy"]
    assert "therapy" not in response_schema["required"]
    assert set(therapy["properties"]) == set(THERAPY_SCHEMA["properties"])
    regimen = therapy["properties"]["regimen"]["items"]["properties"]
    assert set(regimen) == set(THERAPY_SCHEMA["properties"]["regimen"]["items"]["properties"])


# --------------------------------------------------------------------------- menu and import weight


def test_menu_matches_the_upstream_planning_tools_minus_procedure_search():
    tree = ast.parse((SRC_DIR / "run.py.txt").read_text(encoding="utf-8"))
    upstream = next(
        [element.id for element in node.value.generators[0].iter.elts]
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", None) == "tools"
    )
    assert [tool["function"]["name"] for tool in PLANNING_TOOLS] == [n for n in upstream if n not in EXCLUDED_TOOLS]
    assert all(tool["function"]["strict"] for tool in PLANNING_TOOLS)


def test_the_service_imports_without_torch_transformers_or_qdrant():
    code = (
        "import sys; sys.path.insert(0, sys.argv[1]); import service.app, service.sim_benchmark; "
        "print(sorted(m for m in ('torch', 'transformers', 'qdrant_client', 'tool_execs') if m in sys.modules))"
    )
    result = subprocess.run([sys.executable, "-c", code, str(ASSIST_DIR)], capture_output=True, text=True, check=True)
    assert result.stdout.strip() == "[]"


# --------------------------------------------------------------------------- post-checks


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("K35.8", "K35.8"), (" k35.8 ", "K35.8"), ("K35.80", "K35.8"), ("K35", "K35"), ("K99.1", None), ("X99.99", "X99.9"), ("", None)],
)
def test_icd_normalization(raw, expected):
    from service.postchecks import icd_codes

    assert normalize_code(raw, icd_codes()) == expected


@pytest.mark.parametrize(
    ("code", "demographics", "violated"),
    [
        ("N70.0", {"sex": "M"}, "female"),
        ("N77", {"sex": "F"}, None),
        ("N40", {"sex": "F"}, "male"),
        ("N51", {"sex": "M"}, None),
        ("O80", {"sex": "M"}, "pregnancy"),
        ("O80", {"sex": "F", "pregnant": False}, "pregnancy"),
        ("O80", {"sex": "F"}, None),  # pregnancy status unknown: keep
        ("N70.0", {"sex": "unknown"}, None),
        ("N78", {"sex": "M"}, None),
    ],
)
def test_sex_and_pregnancy_rules(code, demographics, violated):
    assert incompatible_rule(code, demographics) == violated


# --------------------------------------------------------------------------- guard and runner


def test_runner_uses_the_shared_guard():
    runner = (SRC_DIR / "run_one_case.py.txt").read_text(encoding="utf-8")
    assert "from common.guard import ApiGuard, RunAborted" in runner
    assert not re.search(r"^class (ApiGuard|RunAborted)", runner, re.MULTILINE)


def test_guard_limits_calls_and_cost():
    from types import SimpleNamespace

    from common.guard import ApiGuard, RunAborted

    guard = ApiGuard(max_calls=2, max_usd=0.5)
    usage = SimpleNamespace(prompt_tokens=20_000, completion_tokens=1_000, completion_tokens_details=None)
    guard.before_call()
    record = guard.record_success("o1", "plan", SimpleNamespace(usage=usage, model="o1-2024-12-17"), 0)
    assert record["cost_usd"] == pytest.approx(0.36)
    guard.before_call()
    guard.record_success("gpt-4o-2024-11-20", "assessment", SimpleNamespace(usage=usage, model="gpt-4o"), 0)
    with pytest.raises(RunAborted):
        guard.before_call()


# --------------------------------------------------------------------------- settings


@pytest.mark.parametrize(
    ("env", "message"),
    [
        ({"MIRA_SERVICE_ENV": "production", "MIRA_DEV_TOKEN": "t", "OPENAI_API_KEY": "k"}, "MIRA_DATA_POLICY is not set"),
        (
            {"MIRA_SERVICE_ENV": "production", "MIRA_DATA_POLICY": "synthetic-only", "OPENAI_API_KEY": "k"},
            "no production token verifier",
        ),
        ({"MIRA_SERVICE_ENV": "staging", "MIRA_DEV_TOKEN": "t", "OPENAI_API_KEY": "k"}, "Unknown"),
        ({"MIRA_SERVICE_ENV": "development", "OPENAI_API_KEY": "k"}, "MIRA_DEV_TOKEN"),
        ({"MIRA_SERVICE_ENV": "development", "MIRA_DEV_TOKEN": "t"}, "OPENAI_API_KEY"),
    ],
)
def test_startup_is_refused(env, message):
    with pytest.raises(StartupRefused, match=message):
        check_startup(load_settings(env), environ=env)


def test_development_with_token_and_key_starts():
    env = {"MIRA_SERVICE_ENV": "development", "MIRA_DEV_TOKEN": "t", "OPENAI_API_KEY": "k"}
    check_startup(load_settings(env), environ=env)


# --------------------------------------------------------------------------- simulation adapter


@pytest.mark.parametrize(
    ("summary", "status", "likely"),
    [
        ({"status": "completed", "final_diagnosis": "Acute appendicitis"}, "ok", ["K35"]),
        ({"status": "completed", "final_diagnosis": "Perforated appendix with abscess"}, "ok", []),
        ({"status": "aborted by guard: limit", "final_diagnosis": None}, "unavailable", []),
    ],
)
def test_simulation_responses_fit_the_contract(summary, status, likely):
    response = simulation_response(summary, 2.5, "mira-sim/test", "gpt-4o+o1")
    assert errors(RESPONSE, response) == []
    assert response["status"] == status
    assert [d["icd10"] for d in response["differential"]["likely"]] == likely
    if status == "ok":
        assert len(response["unfilled"]) == 8 - len(likely)


def test_simulation_cli_requires_an_explicit_cost_cap():
    with pytest.raises(SystemExit):
        parse_args(["--cases", "c", "--out", "o", "--max-calls", "10"])


# --------------------------------------------------------------------------- privacy


@pytest.mark.parametrize(
    ("text", "kinds"),
    [
        ("bising usus normal, abdomen supel", []),
        ("Ibu pasien mengatakan demam sejak 2 hari", []),
        ("TD 120/80, nadi 88", []),
        ("Ibu Sari mengeluh nyeri", ["TITLED_NAME"]),
        ("dirujuk oleh dr. Hartono", ["TITLED_NAME"]),
        ("email pasien: a.b@contoh.id", ["EMAIL"]),
        ("hp +6281234567890", ["BPJS", "PHONE_62", "PHONE_GENERAL"]),
    ],
)
def test_pii_patterns_without_clinical_false_positives(text, kinds):
    from service.privacy import pii_kinds

    assert pii_kinds(text) == kinds


def test_empty_settings_fall_back_to_defaults():
    settings = load_settings({"MIRA_PLAN_MODEL": "", "MIRA_STEP_DEADLINE_S": "", "MIRA_DEV_TOKEN": "t"})
    assert settings.plan_model == "o1" and settings.step_deadline_s == 12 and settings.dev_token == "t"
    assert settings.plan_model_choices == ("o1",)


def test_plan_model_choices_always_include_the_default_and_carry_the_provider_prefix():
    settings = load_settings(
        {"MIRA_LLM_PROVIDER": "openrouter", "MIRA_PLAN_MODEL": "inception/mercury-2",
         "MIRA_PLAN_MODEL_CHOICES": " gpt-6-luna, inception/mercury-2,,google/gemini-3.1-flash-lite:nitro "}
    )
    assert settings.plan_model_choices == (
        "inception/mercury-2", "openai/gpt-6-luna", "google/gemini-3.1-flash-lite:nitro"
    )


def test_live_smoke_requires_an_explicit_cost_cap():
    from service.smoke_live import parse_args as smoke_args

    with pytest.raises(SystemExit):
        smoke_args([])
    assert smoke_args(["--max-usd", "1"]).deadline_s == 120.0


def test_recorded_finding_states_reach_the_model_as_written_and_are_explained():
    """Med Assist sends present and absent findings with DITEMUKAN / TIDAK DITEMUKAN and leaves
    unexamined ones out; the assessment rules say what each means."""
    case = json.loads((CONTRACT_DIR / "examples" / "mira-step-request.example.json").read_text(encoding="utf-8"))["case"]
    case["physicalExam"] = [
        "Auskultasi paru: Ronki basah halus — DITEMUKAN",
        "Auskultasi paru: Wheezing — TIDAK DITEMUKAN",
    ]
    text = case_text(case)
    assert "Auskultasi paru: Ronki basah halus — DITEMUKAN; Auskultasi paru: Wheezing — TIDAK DITEMUKAN" in text
    assert '"TIDAK DITEMUKAN" means it was examined and is\n  absent' in ASSESSMENT_INSTRUCTIONS
    assert "never treat it as absent" in ASSESSMENT_INSTRUCTIONS
