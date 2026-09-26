"""Normalized SATUSEHAT dicts -> native healthcare DocType field dicts.

Pure functions, no frappe import, no I/O — materializer.py owns persistence.
Target schemas confirmed against the installed `healthcare` 15.2.0 source
(patient_encounter.json, vital_signs.json, clinical_procedure.json,
patient_encounter_diagnosis.json).

Fail-closed rules encoded here:
- Vital signs accept only an allowlisted set of LOINC codes AND the expected
  unit per code — a unit mismatch is a Conflict, never a silent conversion.
- Height/weight are deliberately excluded from v1: healthcare stores height in
  metres while FHIR commonly reports centimetres; a silent unit error would be
  a clinical defect, so they wait for an explicit conversion decision.
- Missing period/effective timestamps yield None -> caller sets Conflict
  (encounter_date / signs_date are mandatory on the targets).
"""

from __future__ import annotations

from typing import Any

# FHIR Encounter.status -> Patient Encounter.status (Select: Open/Ordered/Completed/Cancelled)
ENCOUNTER_STATUS_MAP = {
	"planned": "Open",
	"arrived": "Open",
	"triaged": "Open",
	"in-progress": "Open",
	"onleave": "Open",
	"finished": "Completed",
	"cancelled": "Cancelled",
}

# Kemkes identifier systems on a FHIR Patient resource (REVISION 01 DECISION A).
IHS_SYSTEM = "https://fhir.kemkes.go.id/id/ihs-number"
NIK_SYSTEM = "https://fhir.kemkes.go.id/id/nik"

# FHIR administrative gender -> frappe Gender master. "unknown" is deliberately
# absent: an unknown sex must fail closed (sex is mandatory on Patient), never
# be coerced to a value.
GENDER_MAP = {
	"male": "Male",
	"female": "Female",
	"other": "Other",
}

# LOINC code -> (Vital Signs fieldname, expected FHIR unit). Data fields only —
# free-text numerics, no unit conversion. Unit must match or the reading is a
# Conflict (wrong-unit vitals are clinically unsafe to store silently).
VITALS_LOINC_MAP = {
	"8310-5": ("temperature", "Cel"),
	"8867-4": ("pulse", "/min"),
	"9279-1": ("respiratory_rate", "/min"),
	"8480-6": ("bp_systolic", "mm[Hg]"),
	"8462-4": ("bp_diastolic", "mm[Hg]"),
}


def fhir_ref_id(reference: str | None) -> str | None:
	"""'Patient/xxx' / 'Encounter/xxx' -> 'xxx'; None when absent/malformed."""
	if not reference or "/" not in reference:
		return None
	tail = reference.rsplit("/", 1)[1].strip()
	return tail or None


def split_fhir_datetime(value: str | None) -> tuple[str | None, str | None]:
	"""'2026-01-01T08:00:00+07:00' -> ('2026-01-01', '08:00:00').

	No timezone conversion — SATUSEHAT timestamps for this org are already
	WIB and the split is deterministic. Date-only values yield a None time.
	"""
	if not value:
		return None, None
	raw = str(value).strip()
	if "T" not in raw:
		return raw or None, None
	date_part, _, time_part = raw.partition("T")
	for sep in ("+", "Z", "z"):
		time_part = time_part.split(sep)[0]
	if "-" in time_part:  # negative tz offset
		time_part = time_part.split("-")[0]
	return date_part or None, time_part or None


def encounter_fields(normalized: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
	"""Patient Encounter field dict, or (None, reason) when mandatory data is missing."""
	date, time = split_fhir_datetime(normalized.get("period_start"))
	if not date:
		return None, "missing_period_start"
	fields = {"encounter_date": date, "encounter_time": time or "00:00:00"}
	status = ENCOUNTER_STATUS_MAP.get(normalized.get("status") or "")
	if status:
		fields["status"] = status
	return fields, None


def vital_signs_fields(normalized: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
	"""Vital Signs field dict for an allowlisted LOINC observation, else (None, reason)."""
	code = normalized.get("code_value")
	mapped = VITALS_LOINC_MAP.get(code or "")
	if not mapped:
		return None, "unsupported_observation_code"
	fieldname, expected_unit = mapped
	value = normalized.get("value")
	if value is None or value == "":
		return None, "missing_observation_value"
	unit = normalized.get("unit")
	if unit != expected_unit:
		return None, "unit_mismatch"
	date, time = split_fhir_datetime(normalized.get("effective_datetime"))
	if not date:
		return None, "missing_effective_datetime"
	return {
		fieldname: str(value),
		"signs_date": date,
		"signs_time": time or "00:00:00",
	}, None


def diagnosis_label(normalized: dict[str, Any]) -> str | None:
	"""Human-readable Diagnosis master label: 'J45.9 - Asthma' style."""
	code = (normalized.get("code_value") or "").strip()
	display = (normalized.get("code_display") or "").strip()
	if code and display:
		return f"{code} - {display}"
	return display or code or None


def patient_identifiers(raw: dict[str, Any]) -> dict[str, str | None]:
	"""IHS number and NIK from a FHIR Patient resource's identifier list."""
	found: dict[str, str | None] = {"ihs": None, "nik": None}
	for entry in (raw or {}).get("identifier") or []:
		system = (entry.get("system") or "").strip()
		value = (entry.get("value") or "").strip() or None
		if system == IHS_SYSTEM and not found["ihs"]:
			found["ihs"] = value
		elif system == NIK_SYSTEM and not found["nik"]:
			found["nik"] = value
	return found


def patient_fields(raw: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
	"""Patient demographic field dict from a FHIR Patient resource.

	Fail-closed: missing name or unmapped/unknown gender returns (None, reason)
	— both first_name and sex are mandatory on Patient and must never be
	fabricated.
	"""
	names = (raw or {}).get("name") or []
	first = names[0] if names else {}
	full_name = (first.get("text") or "").strip()
	if not full_name:
		parts = [*(first.get("given") or []), first.get("family") or ""]
		full_name = " ".join(p.strip() for p in parts if p and p.strip())
	if not full_name:
		return None, "missing_patient_name"
	sex = GENDER_MAP.get((raw.get("gender") or "").strip().lower())
	if not sex:
		return None, "missing_patient_sex"
	fields: dict[str, Any] = {"first_name": full_name, "sex": sex}
	birth_date = (raw.get("birthDate") or "").strip()
	if birth_date:
		fields["dob"] = birth_date
	return fields, None


def practitioner_attribution(raw: dict[str, Any]) -> tuple[str | None, str | None]:
	"""(ihs, display_name) of the first Practitioner participant on a FHIR Encounter.

	Stored verbatim on the materialized encounter (REVISION 01 DECISION B) so a
	later wave can replace the import placeholder with the real practitioner
	without re-pulling data. Never used to pick a real practitioner now.
	"""
	for participant in (raw or {}).get("participant") or []:
		individual = participant.get("individual") or {}
		reference = individual.get("reference") or ""
		if reference.startswith("Practitioner/"):
			display = (individual.get("display") or "").strip() or None
			return fhir_ref_id(reference), display
	return None, None


def procedure_fields(normalized: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
	"""Clinical Procedure date/time fields; template resolution happens in materializer."""
	date, time = split_fhir_datetime(normalized.get("performed_datetime"))
	if not date:
		return None, "missing_performed_datetime"
	return {"start_date": date, "start_time": time or "00:00:00"}, None
