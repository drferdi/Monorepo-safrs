# Architected and built by codieverse+.
"""Typed records for `sidelab/validator_config.py`.

Total=False permits sparse overrides; the loader fills missing keys
with safe defaults.
"""
from __future__ import annotations

from typing import TypedDict


class ValidatorConfig(TypedDict, total=False):
    min_verified_therapies: int
    max_therapies_before_overpolypharmacy: int
    kausal_primer_kelas: list[str]
    kausal_primer_atc: list[str]
    justifikasi_section_keyword: str
    accept_if_two_kausal_plus_justification: bool
    panel_emitted_when_justifikasi_accepted: str
