"""Deterministic clinical post-checks on the model's assessment (step S5)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
NOT_AVAILABLE_NOTE = "Not available here; consider referral."


@lru_cache(maxsize=1)
def icd_codes() -> frozenset[str]:
    entries = json.loads((SERVICE_DIR / "data" / "icd10.json").read_text(encoding="utf-8"))["icd10"]
    return frozenset(entry["kode"] for entry in entries)


@lru_cache(maxsize=1)
def sex_rules() -> tuple[dict, ...]:
    return tuple(json.loads((SERVICE_DIR / "rules" / "sex_icd_ranges.json").read_text(encoding="utf-8"))["rules"])


def normalize_code(raw: str, codes: frozenset[str]) -> str | None:
    """The WHO code for `raw`, or None. An ICD-10-CM style code (e.g. K35.80) whose first four
    characters exist is shortened to that WHO code."""
    code = raw.strip().upper()
    if code in codes:
        return code
    if len(code) > 5 and code[:5] in codes:
        return code[:5]
    return None


def incompatible_rule(code: str, demographics: dict) -> str | None:
    """The requirement a known sex or pregnancy status violates, or None."""
    category = code[:3]
    sex, pregnant = demographics["sex"], demographics.get("pregnant")
    for rule in sex_rules():
        if not rule["from"] <= category <= rule["to"]:
            continue
        requires = rule["requires"]
        if requires == "female" and sex == "M":
            return requires
        if requires == "male" and sex == "F":
            return requires
        if requires == "pregnancy" and (sex == "M" or pregnant is False):
            return requires
    return None


def apply(assessment: dict, case: dict) -> tuple[dict, list[str]]:
    """Return the contract fields after the checks, plus notes for the audit log."""
    codes = icd_codes()
    notes: list[str] = []
    unfilled = list(assessment["unfilled"])
    kept_codes: dict[str, str] = {}
    differential = {}
    for list_name, items in assessment["differential"].items():
        kept, removed = [], []
        for item in items:
            code = normalize_code(item["icd10"], codes)
            if code is None:
                removed.append(f"{item['icd10']} (not a WHO ICD-10 code)")
                continue
            rule = incompatible_rule(code, case["demographics"])
            if rule:
                removed.append(f"{code} (requires {rule})")
                continue
            if code != item["icd10"]:
                notes.append(f"normalized {item['icd10']} to {code}")
            kept_codes[item["icd10"]] = code
            kept.append({**item, "icd10": code})
        differential[list_name] = kept
        if removed:
            unfilled.append(
                {"field": f"differential.{list_name}", "reason": "Removed by deterministic checks: " + "; ".join(removed)}
            )

    evidence = [
        {**entry, "icd10": kept_codes[entry["icd10"]]} for entry in assessment["evidence"] if entry["icd10"] in kept_codes
    ]

    capabilities = case["facilityCapabilities"]
    actions = []
    for action in assessment["nextBestActions"]:
        reason = action["reason"]
        if action["kind"] == "test" and capabilities and action["matchedCapability"] not in capabilities:
            reason = f"{reason} {NOT_AVAILABLE_NOTE}".strip()
        actions.append({"kind": action["kind"], "item": action["item"], "reason": reason})

    fields = {
        "differential": differential,
        "evidence": evidence,
        "missingInformation": assessment["missingInformation"],
        "nextBestActions": actions,
        "disposition": assessment["disposition"],
        "unfilled": unfilled,
    }
    if "therapy" in assessment:
        therapy = assessment["therapy"]
        target = therapy["forDiagnosis"]
        code = normalize_code(target["icd10"], codes) or target["icd10"]
        fields["therapy"] = {**therapy, "forDiagnosis": {**target, "icd10": code}}
    return fields, notes
