"""MIRA_DATA_POLICY: required in production, synthetic-only by default in development."""

from __future__ import annotations

import json

import pytest

from common.data_policy import DATA_POLICIES, is_synthetic_case_file, policy_problem
from service.settings import StartupRefused, check_startup, load_settings

from .conftest import AUTH, model_outputs

STEP = "/v1/diagnosis/step"
UNMARKED = {"Authorization": AUTH["Authorization"]}


def test_the_four_policies():
    assert DATA_POLICIES == ("synthetic-only", "openai-standard-retention", "openai-zdr-approved", "openrouter-zdr")


def test_development_defaults_to_synthetic_only_and_production_has_no_default():
    assert load_settings({}).data_policy == "synthetic-only"
    assert load_settings({"MIRA_SERVICE_ENV": "production"}).data_policy is None


def test_production_refuses_to_start_without_a_data_policy():
    env = {"MIRA_SERVICE_ENV": "production", "OPENAI_API_KEY": "k"}
    with pytest.raises(StartupRefused, match="MIRA_DATA_POLICY is not set"):
        check_startup(load_settings(env), environ=env)


@pytest.mark.parametrize(
    ("policy", "provider", "problem"),
    [
        ("synthetic-only", "openai", None),
        ("synthetic-only", "openrouter", None),
        ("openai-standard-retention", "openai", None),
        ("openai-zdr-approved", "openai", None),
        ("openrouter-zdr", "openrouter", None),
        ("openrouter-zdr", "openai", "requires provider 'openrouter'"),
        ("openai-zdr-approved", "openrouter", "requires provider 'openai'"),
        ("everything", "openai", "Unknown MIRA_DATA_POLICY"),
        (None, "openai", "not set"),
    ],
)
def test_policy_and_provider_must_match(policy, provider, problem):
    result = policy_problem(policy, provider)
    assert result is None if problem is None else problem in result


def test_a_mismatched_policy_refuses_to_start():
    env = {"MIRA_DATA_POLICY": "openrouter-zdr", "MIRA_DEV_TOKEN": "t", "OPENAI_API_KEY": "k"}
    with pytest.raises(StartupRefused, match="requires provider 'openrouter'"):
        check_startup(load_settings(env), environ=env)


def test_synthetic_only_refuses_an_unmarked_request_before_any_model_call(make_client, example_request, settings):
    client, fake = make_client(model_outputs())
    body = client.post(STEP, json=example_request, headers=UNMARKED).json()

    assert body["status"] == "unavailable"
    assert body["error"]["code"] == "DATA_POLICY"
    assert fake.calls == []
    [path] = settings.audit_dir.glob("audit-*.jsonl")
    record = json.loads(path.read_text(encoding="utf-8"))
    assert record["dataPolicy"] == "synthetic-only" and "request" not in record


def test_a_marked_synthetic_request_is_served_and_the_policy_is_recorded(make_client, example_request, settings):
    client, fake = make_client(model_outputs())
    body = client.post(STEP, json=example_request, headers=AUTH).json()

    assert body["status"] == "ok"
    assert "+data=synthetic-only+" in body["meta"]["version"]
    [path] = settings.audit_dir.glob("audit-*.jsonl")
    assert json.loads(path.read_text(encoding="utf-8"))["dataPolicy"] == "synthetic-only"


def test_other_policies_do_not_need_the_marker(make_client, example_request):
    client, _ = make_client(model_outputs(), data_policy="openai-standard-retention")
    body = client.post(STEP, json=example_request, headers=UNMARKED).json()
    assert body["status"] == "ok"
    assert "+data=openai-standard-retention+" in body["meta"]["version"]


def test_case_files_are_synthetic_only_when_marked_true():
    from service import ASSIST_DIR

    case = json.loads((ASSIST_DIR / "cases" / "synthetic_appendicitis_001.json").read_text(encoding="utf-8"))
    assert is_synthetic_case_file(case)
    assert not is_synthetic_case_file({"case_id": "x"})
    assert not is_synthetic_case_file({"case_id": "x", "synthetic": "yes"})


@pytest.mark.parametrize(
    ("extra_args", "mark", "message"),
    [
        ([], False, 'not marked "synthetic": true'),
        (["--data-policy", "openrouter-zdr"], True, "requires provider 'openrouter'"),
    ],
)
def test_the_runner_stops_before_any_model_call(tmp_path, extra_args, mark, message):
    import ast
    import subprocess
    import sys

    from service import ASSIST_DIR

    case = json.loads((ASSIST_DIR / "cases" / "synthetic_appendicitis_001.json").read_text(encoding="utf-8"))
    if not mark:
        del case["synthetic"]
    case["case_id"] = case["dataset_name"] = "policy_check_case"
    path = tmp_path / "case.json"
    path.write_text(json.dumps(case), encoding="utf-8")
    env = {k: v for k, v in __import__("os").environ.items() if k not in ("OPENAI_API_KEY", "OPENROUTER_API_KEY")}
    # The simulation CLI is not a Sentrapedia runtime dependency. Exercise its
    # exact policy function from the attributed snapshot before any model code.
    source = (ASSIST_DIR / "provenance" / "run_one_case.py.txt").read_text(encoding="utf-8")
    policy = next(node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name == "check_data_policy")
    script = (
        "import json,sys; sys.path.insert(0, sys.argv[1]); "
        "from common.data_policy import policy_problem,is_synthetic_case_file\n"
        + ast.get_source_segment(source, policy)
        + '\ncheck_data_policy(sys.argv[3], "openai", [json.loads(open(sys.argv[2]).read())])\n'
    )
    result = subprocess.run(
        [sys.executable, "-I", "-c", script, str(ASSIST_DIR), str(path), extra_args[-1] if extra_args else "synthetic-only"],
        capture_output=True, text=True, env=env, timeout=120,
    )
    assert result.returncode != 0
    assert message in result.stderr
    assert "[guard] call" not in result.stdout
