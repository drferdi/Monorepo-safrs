# Architected and built by codieverse+.
"""Typed records for the scenarios loader (`sidelab/scenarios.py`).

Kept in a dedicated module so other code (test runners, linters) can
import the type without pulling in the JSON loader, which can be
headless or have its own stateful cache.
"""
from __future__ import annotations

from typing import TypedDict


class ScenarioItem(TypedDict, total=False):
    """A single scenario fixture entry.

    All fields are total=False (an entry may omit some) but the loader
    will only return items that have at least ``nama`` and ``query``
    populated. ``pasien`` is intentionally a typed-dict-shaped dict (not
    a TypedDict subclass) because its shape may evolve with the lint
    layer — new flags / signals (alergi, komorbid, obat_rutin, ...) are
    accepted via the loader's passthrough behaviour.
    """

    nama: str
    query: str
    tags: list[str]
    pasien: dict[str, object]
