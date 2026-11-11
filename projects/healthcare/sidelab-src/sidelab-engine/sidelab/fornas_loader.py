# Architected and built by codieverse+.
"""Loader for the FORNAS (Formularium Nasional Indonesia) reference set.

The loader is responsible for:
  1. Reading `data/fornas_2026.json` (primary, e-fornas public dump) or
     falling back to `data/fornas.json` (alt Alt-2 schema).
  2. Validating minimum shape and building precomputed cross-references:
        - by_name_lower  (canonical + english + sinonim)
        - by_atc         (optional — empty for public dump)
        - by_kfa         (optional — empty for public dump)
        - by_class_name  (kelas_terapi utama — populated for all entries)
        - by_availability (one entry per ketersediaan flag)
  3. Providing typed accessor helpers: resolve_by_name, find_interactions,
     supports_facility, resolve_by_class, resolve_by_availability.

The loader is intentionally tolerant of missing or malformed files: it
returns an empty result instead of raising so the rest of the
pharmacology pipeline can run on its existing fallback (pharma_lookup.json).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sidelab.fornas_records import (
    FacilityLevel,
    FornasDrugRecord,
    FornasFile,
    FornasIndex,
    InteractionLevel,
)

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Default lookup order: latest public dump, then alt Alt-2 file.
_DEFAULT_FORNAS_PATHS: tuple[Path, ...] = (
    _DATA_DIR / "fornas_2026.json",
    _DATA_DIR / "fornas.json",
)

_ENRICHMENT_PATH = _DATA_DIR / "fornas_enrichment.json"

_FORNAS_FILE: FornasFile | None = None
_LAST_PATH: Path | None = None
_ENRICHMENT_FILE: dict[str, dict[str, Any]] | None = None
_LAST_ENRICHMENT_PATH: Path | None = None
_FORNAS_INDEX: FornasIndex = {
    "by_name_lower": {},
    "by_atc": {},
    "by_kfa": {},
    "by_class_name": {},
    "by_availability": {},
}


def _first_token_availability(value: Any) -> bool:
    """Coerce Ketersediaan field to bool, treating None/empty as False."""
    if isinstance(value, bool):
        return value
    return bool(value)


def _build_index(drugs: list[dict[str, Any]]) -> FornasIndex:
    """Build precomputed cross-references from the raw drugs list."""
    by_name: dict[str, str] = {}
    by_atc: dict[str, list[str]] = {}
    by_kfa: dict[str, list[str]] = {}
    by_class: dict[str, list[str]] = {}
    by_avail: dict[str, list[str]] = {}

    for drug in drugs:
        drug_id = str(drug.get("id", "")).strip()
        if not drug_id:
            continue
        canon = str(drug.get("canonical_name", "")).strip().lower()
        if canon:
            by_name.setdefault(canon, drug_id)
        canon_en = str(drug.get("canonical_name_en", "")).strip().lower()
        if canon_en and canon_en != canon:
            by_name.setdefault(canon_en, drug_id)
        for sin in drug.get("sinonim", []) or []:
            sin_l = str(sin).strip().lower()
            if sin_l:
                by_name.setdefault(sin_l, drug_id)

        atc = str(drug.get("atc_code", "")).strip().upper()
        if atc:
            by_atc.setdefault(atc, []).append(drug_id)
        kfa = str(drug.get("kfa_code", "")).strip().upper()
        if kfa:
            by_kfa.setdefault(kfa, []).append(drug_id)

        kelas = drug.get("kelas_terapi") or {}
        # Alt-2 path: kelas.nama_id (lowered)
        class_name = str(kelas.get("nama_id", "")).strip().lower()
        if class_name:
            by_class.setdefault(class_name, []).append(drug_id)
        # e-fornas path: kelas.utama (lowered) wins because it is the public dump
        utama = str(kelas.get("utama", "")).strip().lower()
        if utama and utama != class_name:
            by_class.setdefault(utama, []).append(drug_id)

        ketersediaan = drug.get("ketersediaan") or {}
        if isinstance(ketersediaan, dict):
            for flag_key, flag_val in ketersediaan.items():
                if _first_token_availability(flag_val):
                    by_avail.setdefault(str(flag_key), []).append(drug_id)
        for fasilitas in drug.get("fasilitas_penyedia", []) or []:
            key = str(fasilitas).strip().lower()
            if key:
                by_avail.setdefault(key, []).append(drug_id)

    return FornasIndex(
        by_name_lower=by_name,
        by_atc=by_atc,
        by_kfa=by_kfa,
        by_class_name=by_class,
        by_availability=by_avail,
    )


def _coerce_fornas_file(raw: dict[str, Any]) -> FornasFile:
    drugs_raw = raw.get("drugs", []) or []
    if not isinstance(drugs_raw, list):
        drugs_raw = []
    enrichment_map = load_enrichment()
    if enrichment_map:
        drugs_raw = [_merge_enrichment(d, enrichment_map) for d in drugs_raw]
    index = _build_index(drugs_raw)
    return FornasFile(
        version=str(raw.get("version", "")),
        schema_version=str(raw.get("schema_version", "")),
        updated_at=str(raw.get("updated_at", "")),
        source=dict(raw.get("source", {}) or {}),
        notes=list(raw.get("notes", []) or []),
        metadata=dict(raw.get("metadata", {}) or {}),
        drugs=drugs_raw,
        index=index,
    )


def _merge_enrichment(
    drug: dict[str, Any],
    enrichment_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Shallow-merge enrichment sidecar onto a catalog drug entry.

    Non-empty enrichment keys override catalog values. Arrays/lists from
    enrichment REPLACE (not concat) — that is intentional because a
    curated sinonim list should reflect the curated taxonomy rather
    than the public endpoint's possibly noisy aliases.
    """
    drug_id = str(drug.get("id", "")).strip()
    if not drug_id:
        return drug
    enrich = enrichment_map.get(drug_id)
    if not enrich:
        return drug
    merged: dict[str, Any] = dict(drug)
    for key, value in enrich.items():
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        if isinstance(value, (list, dict)) and not value:
            continue
        merged[key] = value
    return merged


def load_enrichment(path: Path | str | None = None) -> dict[str, dict[str, Any]]:
    """Load `data/fornas_enrichment.json` (sidecar) keyed by drug id.

    Returns an empty dict when missing. Behavior mirrors the catalog
    loader: sticky cache, graceful degradation on malformed JSON.
    """
    global _ENRICHMENT_FILE, _LAST_ENRICHMENT_PATH
    target = Path(path) if path is not None else _ENRICHMENT_PATH

    if (
        _ENRICHMENT_FILE is not None
        and _LAST_ENRICHMENT_PATH == target
        and path is not None
    ) and _ENRICHMENT_FILE is not None:
        return _ENRICHMENT_FILE
    if _ENRICHMENT_FILE is not None and path is None:
        return _ENRICHMENT_FILE

    if not target.exists():
        _ENRICHMENT_FILE = {}
        _LAST_ENRICHMENT_PATH = target
        return {}
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _ENRICHMENT_FILE = {}
        _LAST_ENRICHMENT_PATH = target
        return {}
    if not isinstance(raw, dict):
        _ENRICHMENT_FILE = {}
        _LAST_ENRICHMENT_PATH = target
        return {}
    items = raw.get("enrichment", []) or []
    if not isinstance(items, list):
        _ENRICHMENT_FILE = {}
        _LAST_ENRICHMENT_PATH = target
        return {}
    out: dict[str, dict[str, Any]] = {}
    for entry in items:
        if not isinstance(entry, dict):
            continue
        eid = str(entry.get("id", "")).strip()
        if not eid:
            continue
        out[eid] = entry
    _ENRICHMENT_FILE = out
    _LAST_ENRICHMENT_PATH = target
    return out


def reset_enrichment_cache() -> None:
    """Clear the enrichment-sidecar cache (used by tests)."""
    global _ENRICHMENT_FILE, _LAST_ENRICHMENT_PATH
    _ENRICHMENT_FILE = None
    _LAST_ENRICHMENT_PATH = None


def _resolve_cached_path(path: Path | None) -> FornasFile:
    """Return cached file if available; otherwise load and cache.

    Cache is sticky: once a successful or empty load has happened, calls
    with no path (`path is None`) reuse the cache rather than
    re-scanning default file paths. This gives tests deterministic
    isolation: an explicit `load_fornas(path="/missing")` followed by
    `resolve_by_name("...")` reflects the missing-file state. Use
    `reset_fornas_cache()` to flush.
    """
    global _FORNAS_FILE, _LAST_PATH, _FORNAS_INDEX
    if _FORNAS_FILE is not None:
        if path is None:
            return _FORNAS_FILE
        if _LAST_PATH == path:
            return _FORNAS_FILE

    empty = FornasFile(
        version="",
        schema_version="",
        updated_at="",
        source={},
        notes=[],
        metadata={},
        drugs=[],
        index=FornasIndex(
            by_name_lower={},
            by_atc={},
            by_kfa={},
            by_class_name={},
            by_availability={},
        ),
    )
    if path is None or not Path(path).exists():
        _FORNAS_FILE = empty
        _LAST_PATH = path
        _FORNAS_INDEX = empty.get("index", {})
        return empty
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _FORNAS_FILE = empty
        _LAST_PATH = path
        _FORNAS_INDEX = empty.get("index", {})
        return empty
    if not isinstance(raw, dict):
        _FORNAS_FILE = empty
        _LAST_PATH = path
        _FORNAS_INDEX = empty.get("index", {})
        return empty

    parsed = _coerce_fornas_file(raw)
    _FORNAS_FILE = parsed
    _LAST_PATH = path
    _FORNAS_INDEX = parsed.get("index", {})
    return parsed


def load_fornas(path: Path | str | None = None) -> FornasFile:
    """Load FORNAS reference data with lazy, sticky cache.

    Args:
        path: explicit override. When None the loader walks the
            default path list (`fornas_2026.json` first, then
            `fornas.json`). Once a load has happened, the cache binds
            to that source — calls with no path will not re-scan the
            filesystem unless `reset_fornas_cache()` is called first.

    Returns: FornasFile (possibly empty when the data is missing or
    malformed).
    """
    if path is not None:
        return _resolve_cached_path(Path(path))

    # No-arg: serve from cache when available, else walk defaults.
    if _FORNAS_FILE is not None:
        return _FORNAS_FILE
    for candidate in _DEFAULT_FORNAS_PATHS:
        if candidate.exists():
            return _resolve_cached_path(candidate)
    return _resolve_cached_path(None)


def reset_fornas_cache() -> None:
    """Clear the loader cache. Used by tests that swap data files."""
    global _FORNAS_FILE, _LAST_PATH, _FORNAS_INDEX
    _FORNAS_FILE = None
    _LAST_PATH = None
    _FORNAS_INDEX = {
        "by_name_lower": {},
        "by_atc": {},
        "by_kfa": {},
        "by_class_name": {},
        "by_availability": {},
    }
    reset_enrichment_cache()


def _index() -> FornasIndex:
    return load_fornas().get("index", {}) or {}


def _all_drugs() -> list[dict[str, Any]]:
    return list(load_fornas().get("drugs", []) or [])


def resolve_by_name(name: str) -> FornasDrugRecord | None:
    """Look up a drug by canonical name / English / any synonym (case-insensitive)."""
    if not name:
        return None
    cache_idx = _index()
    by_name = cache_idx.get("by_name_lower") or {}
    drug_id = by_name.get(name.strip().lower())
    if not drug_id:
        return None
    for drug in _all_drugs():
        if isinstance(drug, dict) and drug.get("id") == drug_id:
            return drug  # type: ignore[return-value]
    return None


def resolve_by_atc(atc_code: str) -> list[FornasDrugRecord]:
    """Look up drugs by WHO ATC classification code.

    Only populated for drugs whose enrichment sidecar (or catalog)
    supplies an `atc_code` field. Returns the full list when the code
    is matched exactly; prefix matches fall back to a substring scan
    (useful for ATC level-3 grouping, e.g. `M01A`).
    """
    if not atc_code:
        return []
    code = atc_code.strip().upper()
    by_atc = (_index().get("by_atc") or {})
    ids = list(by_atc.get(code, []) or [])
    if not ids:
        # Prefix fallback.
        for key, ids_under_key in by_atc.items():
            if key.startswith(code):
                ids.extend(ids_under_key or [])
    if not ids:
        return []
    id_set = set(ids)
    out: list[FornasDrugRecord] = []
    for drug in _all_drugs():
        if isinstance(drug, dict) and drug.get("id") in id_set:
            out.append(drug)  # type: ignore[arg-type]
    return out


def resolve_by_class(
    kelas_utama_eq: str,
    *,
    exact: bool = True,
) -> list[FornasDrugRecord]:
    """Return drugs whose kelas_terapi.utama matches `kelas_utama_eq`."""
    if not kelas_utama_eq:
        return []
    key = kelas_utama_eq.strip().lower()
    cache_idx = _index()
    by_class = cache_idx.get("by_class_name") or {}
    if exact:
        target_ids = set(by_class.get(key, []) or [])
    else:
        target_ids = {
            drug_id
            for class_name, ids in by_class.items()
            if key in class_name
            for drug_id in (ids or [])
        }
    if not target_ids:
        return []
    out: list[FornasDrugRecord] = []
    for drug in _all_drugs():
        if isinstance(drug, dict) and drug.get("id") in target_ids:
            out.append(drug)  # type: ignore[arg-type]
    return out


def resolve_by_availability(
    *,
    fkktp: bool | None = None,
    fpkktl: bool | None = None,
    pp: bool | None = None,
    prb: bool | None = None,
    oen: bool | None = None,
    program_kemenkes: bool | None = None,
    kanker: bool | None = None,
) -> list[FornasDrugRecord]:
    """Return drugs matching all selected availability flags (AND filter).

    Each kwarg is a tri-state: True=required, False=must be False, None=ignore.
    """
    flag_map = {
        "fpktp": fkktp,
        "fpktl": fpkktl,
        "pp": pp,
        "prb": prb,
        "oen": oen,
        "program": program_kemenkes,
        "kanker": kanker,
    }
    out: list[FornasDrugRecord] = []
    for drug in _all_drugs():
        if not isinstance(drug, dict):
            continue
        ketersediaan = drug.get("ketersediaan") or {}
        ok = True
        for flag, state in flag_map.items():
            if state is None:
                continue
            actual = _first_token_availability(ketersediaan.get(flag, False))
            if state and not actual:
                ok = False
                break
            if (state is False) and actual:
                ok = False
                break
        if ok:
            out.append(drug)  # type: ignore[arg-type]
    return out


def find_interactions(
    drug: FornasDrugRecord, severity_at_least: InteractionLevel = "minor"
) -> list[dict[str, Any]]:
    """Return interactions filtered by minimum severity.

    Severity ordering: kontraindikasi > mayor > moderate > minor > tidak_signifikan
    """
    severity_rank = {
        "kontraindikasi": 5,
        "mayor": 4,
        "moderate": 3,
        "minor": 2,
        "tidak_signifikan": 1,
    }
    threshold = severity_rank.get(severity_at_least, 0)
    out: list[dict[str, Any]] = []
    for inter in drug.get("interaksi", []) or []:
        if not isinstance(inter, dict):
            continue
        level_key = str(inter.get("level", "")).lower()
        inter_rank = severity_rank.get(level_key, -1)
        if inter_rank >= threshold:
            out.append(inter)
    return out


def supports_facility(drug: FornasDrugRecord, facility: FacilityLevel) -> bool:
    """True when the drug is on the FORNAS list at the given facility level."""
    fornas_block = drug.get("fornas") or {}
    fasilitas = list(fornas_block.get("fasilitas", []) or [])
    if facility in [str(f) for f in fasilitas]:
        return True
    # e-fornas public payload uses ketersediaan/fasilitas_penyedia:
    if isinstance(facility, str):
        kf = facility.lower()
        for entry in drug.get("fasilitas_penyedia", []) or []:
            if kf == str(entry).strip().lower():
                return True
        ketersediaan = drug.get("ketersediaan") or {}
        flag_for_facility = {
            "FKTP": "fpktp",
            "FPKTP": "fpktp",
            "FPKTL": "fpktl",
            "PP": "pp",
            "PRB": "prb",
            "OEN": "oen",
            "PROGRAM": "program",
        }
        flag_key = flag_for_facility.get(facility)
        if flag_key:
            return _first_token_availability(ketersediaan.get(flag_key, False))
    return False
