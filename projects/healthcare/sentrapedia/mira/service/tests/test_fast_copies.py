"""MIRA_FAST_COPIES: how many copies of each raced fast-assessment part the engine sends."""

from __future__ import annotations

import pytest

from service.engine import FAST_COPIES, fast_copies

from .conftest import completion
from .test_step_api import audit_lines, diagnosis_part, post, workup_part


def test_the_default_is_the_three_copy_race():
    assert fast_copies({}) == FAST_COPIES == 3


def test_mira_fast_copies_sets_the_copies_per_part():
    assert fast_copies({"MIRA_FAST_COPIES": "1"}) == 1


@pytest.mark.parametrize("value", ["0", "-1"])
def test_fewer_than_one_copy_is_refused(value):
    with pytest.raises(ValueError, match="MIRA_FAST_COPIES"):
        fast_copies({"MIRA_FAST_COPIES": value})


def test_one_copy_sends_each_part_once_and_cancels_nothing(make_client, example_request, settings, monkeypatch):
    monkeypatch.setenv("MIRA_FAST_COPIES", "1")
    outputs = [completion(diagnosis_part(), "gpt-4o"), completion(workup_part(), "gpt-4o")]
    client, fake = make_client(outputs, fast_assessment=True)

    body = post(client, example_request).json()

    assert body["status"] == "ok"
    assert [c["response_format"]["json_schema"]["name"] for c in fake.calls] == ["step_diagnosis", "step_workup"]
    [record] = audit_lines(settings)
    assert [c["role"] for c in record["calls"]] == ["diagnosis", "workup"]
    assert all(c["cost_source"] != "estimated-cancelled" for c in record["calls"])
