# Architected and built by codieverse+.
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from sidelab.pharma_validator import enforce_minimum_three_therapies
from sidelab.safety.escalation import _ensure_emergency_referral_escalation
from sidelab.safety.fabrication import (
    _check_response_for_fabrication,
    _detect_response_fabrication,
)
from sidelab.safety.provisional import _enforce_provisional_language
from sidelab.safety.red_flags import (
    _check_emergency_response_consistency,
    _ensure_red_flag_in_diagnostic_frame,
)
from sidelab.safety.trauma import _suppress_routine_diagnoses_for_trauma

_FABRICATION_WARNING_MARKER = "PERINGATAN — DATA KLINIS TIDAK DIDUKUNG INPUT DOKTER"
_PROVISIONAL_CAVEAT_MARKER = "PEMBINGKAIAN PROVISIONAL"


@dataclass
class FinalizedClinicalOutput:
    text: str
    warnings: dict[str, Any] = field(default_factory=dict)


def finalize_clinical_output(
    *,
    response: str,
    prompt: str,
    kasus: dict,
    pasien: dict,
    rf_details: list[dict],
    deduplicate_fn: Callable[[str, str], str] | None = None,
    pharma_format_fn: Callable[..., str] | None = None,
    apply_pharma: bool = True,
    allow_pharma_backfill: bool = True,
    enforce_pharma_floor: bool = True,
) -> FinalizedClinicalOutput:
    text = response or ""
    warnings: dict[str, Any] = {}

    if deduplicate_fn is not None:
        text = deduplicate_fn(text, prompt)

    text = _ensure_red_flag_in_diagnostic_frame(text, rf_details)
    text = _suppress_routine_diagnoses_for_trauma(text, rf_details)
    text = _ensure_emergency_referral_escalation(text, rf_details)

    consistency = _check_emergency_response_consistency(text)
    warnings["emergency_consistency"] = consistency
    if consistency.get("has_inconsistency"):
        text = text.rstrip() + (
            "\n\n[PERHATIAN SISTEM — VAL-CROSS-005]\n"
            + consistency["issues"][0]
            + "\n"
            + "\n".join(f"• {issue}" for issue in consistency["issues"][1:])
            + "\n"
        )

    if apply_pharma and pharma_format_fn is not None:
        text = pharma_format_fn(
            text,
            pasien,
            allow_backfill=allow_pharma_backfill,
        )
        if enforce_pharma_floor:
            text, pharma_validation = enforce_minimum_three_therapies(text, pasien)
            warnings["pharma_validation"] = pharma_validation

    if _PROVISIONAL_CAVEAT_MARKER not in text:
        text = _enforce_provisional_language(text)

    fabrication = _detect_response_fabrication(text, kasus, pasien)
    warnings["fabrication"] = fabrication
    if (
        fabrication.get("has_fabrication")
        and _FABRICATION_WARNING_MARKER not in text
    ):
        text = _check_response_for_fabrication(text, kasus, pasien)

    return FinalizedClinicalOutput(text=text, warnings=warnings)
