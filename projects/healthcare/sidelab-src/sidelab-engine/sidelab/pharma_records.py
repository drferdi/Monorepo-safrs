# Architected and built by codieverse+.
"""Typed records for pharmacology verification pipeline.

TherapyRecord and EnforcementResult are the typed carriers exchanged
between _format_farmakologi_tree, the new pharma validator, and the
visible "disruption panel" that surfaces when the system cannot meet
the minimum-3 verified therapies floor.
"""
from __future__ import annotations

from typing import Literal, TypedDict

Source = Literal[
    "llm",
    "rules.json:supportive",
    "rules.json:cluster",
    "rules.json:fallback",
    "fornas:catalog_hit",
    "manual_required",
]


class TherapyRecord(TypedDict, total=False):
    """A single pharmacology entry as seen by the validator.

    All fields are total=False so partial records (e.g. after LLM
    partial output) remain representable, but the validator treats
    missing `name` as unverifiable.
    """

    raw: str
    name: str
    canonical_name: str
    lookup_key: str
    dose: str
    route: str
    freq: str
    duration: str
    timing: str
    has_ddi: bool
    has_ki: bool
    verified: bool
    fell_back: bool
    source: Source
    reason: str
    # FORNAS-specific verification (best practice 2026: distinguish
    # pharma_lookup-derived vs FORNAS-catalog-canonical verification).
    fornas_verified: bool
    fornas_id: str
    fornas_kelas_utama: str


class EnforcementResult(TypedDict, total=False):
    """Summary returned by the validator pipeline."""

    verified_count: int
    total_count: int
    shortfall: int
    fell_back: bool
    source_breakdown: dict[str, int]
    panel_emitted: bool
    # Best practice 2026 — sub-totals by verification provenance.
    fornas_verified_count: int
    lookup_verified_count: int
    fornas_available: bool
    # Cross-drug / patient-KI lint results (CDSS safety alerts).
    lint_alerts: dict[str, list[dict[str, object]]]  # {ddi: [...], ki_pasien: [...]}
    # Saran #4 floor relaxation flags. Populated only when the
    # accept_if_two_kausal_plus_justifikasi knob fires; otherwise absent.
    floor_relaxation: str
    kausal_primer_hits: int


MIN_VERIFIED_THERAPIES = 3
MAX_THERAPIES_BEFORE_OVERPOLYPHARMACY = 5
