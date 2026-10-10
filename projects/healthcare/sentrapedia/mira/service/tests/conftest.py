"""Shared fixtures. The model client is always a mock: no test can reach OpenAI."""

from __future__ import annotations

import asyncio
import copy
import json
from dataclasses import replace
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from service.app import create_app
from service.contract import CONTRACT_DIR
from service.settings import load_settings

TOKEN = "test-dev-token"
# Tests send the synthetic example case, marked as the development data policy requires.
AUTH = {"Authorization": f"Bearer {TOKEN}", "X-MIRA-Case-Origin": "synthetic"}


def completion(
    content: str | None,
    model: str,
    prompt_tokens: int = 10_000,
    completion_tokens: int = 1_000,
    cost: float | None = None,
    provider: str | None = None,
):
    """A chat completion as the SDK exposes it; `cost`/`provider` are OpenRouter's extra fields."""
    usage = SimpleNamespace(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        completion_tokens_details=SimpleNamespace(reasoning_tokens=0),
    )
    if cost is not None:
        usage.cost = cost
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content, refusal=None))], usage=usage, model=model
    )
    if provider is not None:
        response.provider = provider
    return response


class FakeCompletions:
    """Returns queued outputs in order: a response object, an exception to raise, or a delay."""

    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls: list[dict] = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        output = self.outputs.pop(0)
        if isinstance(output, float):
            await asyncio.sleep(output)
            return completion("late", kwargs["model"])
        if isinstance(output, BaseException):
            raise output
        return output


class FakeClient:
    def __init__(self, outputs):
        self.chat = SimpleNamespace(completions=FakeCompletions(outputs))

    @property
    def calls(self) -> list[dict]:
        return self.chat.completions.calls


def assessment(**overrides) -> dict:
    base = {
        "differential": {
            "likely": [{"icd10": "K35.8", "label": "Acute appendicitis", "confidenceTier": "high"}],
            "alternatives": [{"icd10": "A09", "label": "Infectious gastroenteritis", "confidenceTier": "low"}],
            "cannotMiss": [{"icd10": "K65.0", "label": "Acute peritonitis", "confidenceTier": "low"}],
        },
        "evidence": [
            {"icd10": "K35.8", "supporting": ["right lower quadrant pain", "leukocytosis"], "opposing": []},
        ],
        "missingInformation": ["Rovsing sign"],
        "nextBestActions": [
            {"kind": "exam", "item": "Rovsing sign", "reason": "supports appendicitis", "matchedCapability": None},
            {"kind": "test", "item": "Abdominal ultrasound", "reason": "confirm appendicitis", "matchedCapability": None},
        ],
        "disposition": {"decision": "refer", "urgency": "urgent"},
        "unfilled": [],
    }
    base.update(overrides)
    return base


def model_outputs(assessment_body: dict | str | None = None) -> list:
    body = assessment() if assessment_body is None else assessment_body
    content = body if isinstance(body, str) else json.dumps(body)
    return [completion("1. Examine the abdomen. 2. Ultrasound.", "o1"), completion(content, "gpt-4o")]


@pytest.fixture
def example_request() -> dict:
    return json.loads((CONTRACT_DIR / "examples" / "mira-step-request.example.json").read_text(encoding="utf-8"))


@pytest.fixture
def settings(tmp_path):
    env = {"MIRA_SERVICE_ENV": "development", "MIRA_DEV_TOKEN": TOKEN, "MIRA_AUDIT_DIR": str(tmp_path / "audit")}
    return load_settings(env)


@pytest.fixture
def make_client(settings):
    def build(outputs, **setting_overrides):
        fake = FakeClient(outputs)
        app = create_app(replace(settings, **setting_overrides), client=fake)
        return TestClient(app), fake

    return build


def with_case(request: dict, **case_overrides) -> dict:
    changed = copy.deepcopy(request)
    changed["case"].update(case_overrides)
    return changed
