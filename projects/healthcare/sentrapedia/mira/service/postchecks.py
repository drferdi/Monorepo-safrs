"""Deterministic clinical post-checks on the model's assessment (step S5)."""

from __future__ import annotations

import json
import re
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


# Words that carry no meaning when a diagnosis label is compared with an official ICD-10 name.
_FILLER = frozenset("a an and as by due in not of or the to with without".split())
_GENERIC = _FILLER | frozenset(
    "acute chronic disease diseases disorder disorders other specified unspecified nos site type classified elsewhere".split()
)


def _words(text: str) -> list[str]:
    return [word for word in re.findall(r"[a-z0-9]+", text.lower()) if word not in _FILLER]


@lru_cache(maxsize=1)
def _name_index() -> tuple[dict[str, str], dict[str, str], dict[str, frozenset[str]]]:
    """Official names by code, codes by exact name (unique names only), codes by name word."""
    entries = json.loads((SERVICE_DIR / "data" / "icd10.json").read_text(encoding="utf-8"))["icd10"]
    names = {entry["kode"]: entry["nama_en"].strip() for entry in entries}
    by_name: dict[str, list[str]] = {}
    by_word: dict[str, set[str]] = {}
    for code, name in names.items():
        words = _words(name)
        by_name.setdefault(" ".join(words), []).append(code)
        for word in words:
            by_word.setdefault(word, set()).add(code)
    unique = {key: found[0] for key, found in by_name.items() if key and len(found) == 1}
    return names, unique, {word: frozenset(found) for word, found in by_word.items()}


def code_for_label(label: str, near: str) -> str | None:
    """The code whose official name the label states, or None when that is not unambiguous.
    An exact name wins. Otherwise every label word must occur in the official name, and exactly
    one such code may exist in the nearest scope that has any: the three-character category of
    `near`, then its chapter letter, then the whole list."""
    _, unique, by_word = _name_index()
    words = _words(label)
    exact = unique.get(" ".join(words))
    if exact:
        return exact
    if not set(words) - _GENERIC:
        return None
    found: frozenset[str] | None = None
    for word in set(words):
        matches = by_word.get(word, frozenset())
        found = matches if found is None else found & matches
        if not found:
            return None
    near = near.strip().upper()
    for scope in (near[:3], near[:1], ""):
        scoped = [code for code in found if code.startswith(scope)] if scope or not near else list(found)
        if scoped:
            return scoped[0] if len(scoped) == 1 else None
    return None


def resolve_code(raw: str, label: str, codes: frozenset[str]) -> tuple[str | None, str | None]:
    """The WHO code for a diagnosis the model wrote as (code, label), and an audit note when the
    code was repaired or looks wrong. The label is the model's own statement of the diagnosis, so
    a code that names another disease is replaced only when the label identifies one code
    unambiguously; otherwise the code is kept and the mismatch is noted. A code that is not in the
    list is recovered from the label, then from its three-character category, before it is given up."""
    names, _, _ = _name_index()
    shown = raw.strip().upper()
    code = normalize_code(raw, codes)
    if code is None:
        repaired = code_for_label(label, shown)
        if repaired is None and shown[:3] in codes and set(_words(label)) & set(_words(names[shown[:3]])) - _GENERIC:
            repaired = shown[:3]
        return (repaired, f"repaired {shown} to {repaired} from its label") if repaired else (None, None)
    label_words = set(_words(label)) - _GENERIC
    own_words = set(_words(names[code])) | set(_words(names.get(code[:3], "")))
    exact = _name_index()[1].get(" ".join(_words(label)))
    if exact and exact not in (code, code[:3]):
        return exact, f"repaired {code} to {exact}: label is the official name of {exact}"
    if label_words and not label_words & own_words:
        repaired = code_for_label(label, code)
        if repaired and repaired != code:
            return repaired, f"repaired {code} to {repaired} from its label"
        return code, f"{code} kept: label does not match its official name"
    return code, None


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
            code, note = resolve_code(item["icd10"], item["label"], codes)
            if code is None:
                removed.append(f"{item['icd10']} (not a WHO ICD-10 code)")
                continue
            rule = incompatible_rule(code, case["demographics"])
            if rule:
                removed.append(f"{code} (requires {rule})")
                continue
            if note:
                notes.append(note)
            elif code != item["icd10"]:
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
        code, note = resolve_code(target["icd10"], target["label"], codes)
        if note:
            notes.append(f"therapy: {note}")
        code = code or target["icd10"]
        fields["therapy"] = {**therapy, "forDiagnosis": {**target, "icd10": code}}
    return fields, notes
