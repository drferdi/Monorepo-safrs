# Architected and built by codieverse+.
from sidelab.safety.escalation import (
    _EMERGENCY_REFERRAL_MAP,
    _ROUTINE_FOLLOWUP_KEYWORDS,
    _URGENT_REFERRAL_KEYWORDS,
    _ensure_emergency_referral_escalation,
)
from sidelab.safety.provisional import (
    _ABSOLUTE_PATTERNS_COMPILED,
    _ABSOLUTE_PATTERNS_RAW,
    _detect_absolute_language,
    _enforce_provisional_language,
)
from sidelab.safety.fabrication import (
    _FABRICATION_PATTERNS,
    _field_has_data,
    _build_no_fabrication_instruction,
    _detect_response_fabrication,
    _describe_fabricated_item,
    _check_response_for_fabrication,
)
from sidelab.safety.patient_safety import (
    _is_pediatric,
    _is_reproductive_age_female,
    _build_pediatric_dose_instruction,
    _build_pregnancy_warning,
    _check_dose_critical_data,
    _build_provisional_dose_instruction,
)
from sidelab.safety.red_flags import (
    RED_FLAGS,
    _EMERGENCY_DIAGNOSIS_PATTERNS,
    _EMERGENCY_HOME_CARE_PATTERNS,
    _EMERGENCY_REFERRAL_PATTERNS,
    _check_emergency_response_consistency,
    _detect_red_flags,
    _ensure_red_flag_in_diagnostic_frame,
    _get_red_flag_disease_details,
    _red_flag_disease_context,
)
from sidelab.safety.trauma import (
    _ROUTINE_OUTPATIENT_DIAGNOSES,
    _ROUTINE_OUTPATIENT_PATTERNS,
    _is_trauma_red_flag,
    _suppress_routine_diagnoses_for_trauma,
)
from sidelab.safety.output_pipeline import (
    FinalizedClinicalOutput,
    finalize_clinical_output,
)
from sidelab.safety.intake_pipeline import build_clinical_intake_context
from sidelab.safety.output_contract import commit_final_response
