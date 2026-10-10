"""Validation against the vendored Med Assist contract (contract/*.schema.json)."""

from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator

CONTRACT_DIR = Path(__file__).resolve().parent / "contract"
CONTRACT_VERSION = "1"

UNFILLABLE_FIELDS = (
    "differential.likely",
    "differential.alternatives",
    "differential.cannotMiss",
    "evidence.supporting",
    "evidence.opposing",
    "missingInformation",
    "nextBestActions",
    "disposition",
)


def _validator(name: str) -> Draft202012Validator:
    schema = json.loads((CONTRACT_DIR / name).read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


REQUEST = _validator("mira-step-request.schema.json")
RESPONSE = _validator("mira-step-response.schema.json")


def errors(validator: Draft202012Validator, value: object) -> list[str]:
    """Readable validation errors; paths only, never the offending values (they may be case text)."""
    found = sorted(validator.iter_errors(value), key=lambda e: list(e.absolute_path))
    return [f"$.{'.'.join(str(p) for p in e.absolute_path)}: {e.validator} failed" for e in found]


def unavailable_response(code: str, message: str, version: str, model: str | None, cost_usd: float | None) -> dict:
    """A contract-valid 'unavailable' response: every field empty and listed as unfilled."""
    return {
        "contractVersion": CONTRACT_VERSION,
        "status": "unavailable",
        "differential": {"likely": [], "alternatives": [], "cannotMiss": []},
        "evidence": [],
        "missingInformation": [],
        "nextBestActions": [],
        "disposition": None,
        "unfilled": [{"field": f, "reason": f"engine unavailable ({code})"} for f in UNFILLABLE_FIELDS],
        "error": {"code": code, "message": message},
        "meta": {"version": version, "model": model, "costUsd": cost_usd},
    }
