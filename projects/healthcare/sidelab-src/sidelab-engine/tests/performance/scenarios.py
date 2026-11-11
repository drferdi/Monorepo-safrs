# Architected and built by codieverse+.
"""Backward-compatible adapter — the 20-skenario fixtures now live in
``data/scenarios_puskesmas.json`` so the lint layer can verify patient
context (alergi, komorbid, obat_rutin) end-to-end.

This module re-exports the data-driven tuples for legacy/manual call
sites such as ``run_e2e_terminal.py`` and the timing probe.
New code should prefer ``sidelab/scenarios.py::with_pasien`` so the
patient context reaches the pipeline.
"""
from typing import List, Tuple

from sidelab.scenarios import as_pairs, by_tag, load_scenarios, with_pasien

SKENARIO_PUSKESMAS: List[Tuple[str, str]] = as_pairs()

# Returned by helpers below — Klinik env / conftest fixtures consume this.
SKENARIO_WITH_PASIEN: List[Tuple[str, str, dict]] = with_pasien()


def get_skenario_pairs() -> List[Tuple[str, str]]:
    """Re-fetch fresh tuples, bypassing stale cache in tests."""
    return as_pairs()


def get_skenario_with_pasien() -> List[Tuple[str, str, dict]]:
    """Same as above, with the patient context included."""
    return with_pasien()


def get_skenario_by_tag(tag: str) -> List[Tuple[str, str, dict]]:
    return [
        (s.nama, s.query, s.pasien) for s in by_tag(tag)
    ]


__all__ = [
    "SKENARIO_PUSKESMAS",
    "SKENARIO_WITH_PASIEN",
    "get_skenario_pairs",
    "get_skenario_with_pasien",
    "get_skenario_by_tag",
    "load_scenarios",
]
