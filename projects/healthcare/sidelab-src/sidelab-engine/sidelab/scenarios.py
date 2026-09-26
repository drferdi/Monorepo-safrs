# Architected and built by codieverse+.
"""Loader for `data/scenarios_puskesmas.json` — data-driven scenario fixtures.

Replaces the previously hardcoded ``SKENARIO_PUSKESMAS`` list that lived
in ``tests/performance/scenarios.py``. The 20 Puskesmas scenarios are
now stored as JSON, with structured ``pasien`` context so end-to-end
tests can trigger the DDI/KI lint layer (which requires non-empty
``pasien``).

Schema (informal, see ``data/scenarios_puskesmas.json``):

    {
      "nama":   "<nama singkat>",
      "query":  "<kalimat pasien, bahasa Indonesia>",
      "tags":   ["..."],                // optional, for grouping/categorisation
      "pasien": {                       // optional, default {}
        "umur": <int>,
        "gender": "L" | "P",
        "komorbid": ["..."],            // optional
        "alergi": ["..."],              // optional
        "obat_rutin": ["..."]           // optional, context for DDI
      }
    }

The loader is intentionally tolerant: missing fields fall back to
empty strings / empty lists so existing call sites still receive the
``(nama, query)`` 2-tuple shape used by manual timing probes and
``run_e2e_terminal.py``. A second helper returns the 3-tuple variant
``(nama, query, pasien)`` so the new E2E flow can forward patient
context to ``_chat(...)`` without code changes elsewhere.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sidelab.scenarios_records import ScenarioItem

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DEFAULT_PATH = _DATA_DIR / "scenarios_puskesmas.json"

_CACHE: list[ScenarioItem] | None = None
_LAST_PATH: Path | None = None


def load_scenarios(path: Path | str | None = None) -> list[ScenarioItem]:
    """Load scenarios fixture from JSON (lazy, sticky cache)."""
    global _CACHE, _LAST_PATH
    target = Path(path) if path is not None else _DEFAULT_PATH
    if _CACHE is not None and _LAST_PATH == target and path is None:
        return _CACHE
    if _CACHE is not None and path is None:
        return _CACHE

    if not target.exists():
        _CACHE = []
        _LAST_PATH = target
        return []
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _CACHE = []
        _LAST_PATH = target
        return []
    items_raw = raw.get("items") if isinstance(raw, dict) else None
    if not isinstance(items_raw, list):
        _CACHE = []
        _LAST_PATH = target
        return []

    out: list[ScenarioItem] = []
    for entry in items_raw:
        if not isinstance(entry, dict):
            continue
        nama = str(entry.get("nama") or "").strip()
        query = str(entry.get("query") or "").strip()
        if not nama or not query:
            # Skip incomplete entries — they would never match the
            # fixture contract used by the test scripts anyway.
            continue
        tags = entry.get("tags") or []
        if not isinstance(tags, list):
            tags = []
        pasien = entry.get("pasien") or {}
        if not isinstance(pasien, dict):
            pasien = {}
        out.append(
            ScenarioItem(
                nama=nama,
                query=query,
                tags=[str(t) for t in tags if t],
                pasien=pasien,
            )
        )
    _CACHE = out
    _LAST_PATH = target
    return out


def reset_cache() -> None:
    """Force re-read on next load_scenarios(). Tests use this."""
    global _CACHE, _LAST_PATH
    _CACHE = None
    _LAST_PATH = None


def as_pairs(scenarios: list[ScenarioItem] | None = None) -> list[tuple[str, str]]:
    """Return [(nama, query), ...] for legacy and manual timing callers."""
    src = scenarios if scenarios is not None else load_scenarios()
    return [(s["nama"], s["query"]) for s in src if s.get("nama")]


def with_pasien(
    scenarios: list[ScenarioItem] | None = None,
) -> list[tuple[str, str, dict[str, Any]]]:
    """Return [(nama, query, pasien), ...] — used by run_e2e_terminal.py."""
    src = scenarios if scenarios is not None else load_scenarios()
    return [
        (s["nama"], s["query"], s.get("pasien") or {})
        for s in src
        if s.get("nama")
    ]


def by_tag(tag: str) -> list[ScenarioItem]:
    """Filter scenarios by exact tag match (case-insensitive)."""
    needle = tag.lower()
    return [
        s for s in load_scenarios()
        if any(needle == str(t).lower() for t in (s.get("tags") or []))
    ]
