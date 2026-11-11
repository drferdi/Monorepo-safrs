# Architected and built by codieverse+.
from __future__ import annotations

from typing import Any


def normalize_icd_prefix(icd10: str | None) -> str:
    return (icd10 or "")[:3].upper()


def find_by_icd(
    icd10: str | None,
    exact_index: dict[str, dict[str, Any]],
    prefix_index: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    code = (icd10 or "").upper()
    if not code:
        return None
    return exact_index.get(code) or prefix_index.get(normalize_icd_prefix(code))


def get_pharma_detail(
    icd10: str | None,
    d144_prefix_index: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    prefix = normalize_icd_prefix(icd10)
    if not prefix:
        return None
    disease = d144_prefix_index.get(prefix)
    return disease.get("pharmacotherapy") if disease else None
