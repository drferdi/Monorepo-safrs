"""Identity resolution: SATUSEHAT references -> existing or created MANTRA records.

REVISION 01 (Chief decisions):
- DECISION A: SATUSEHAT MAY be a patient source. Match first (by satusehat_ihs,
  else satusehat_nik); no match -> CREATE a Patient from the staged FHIR
  Patient resource, tagged patient_source="SATUSEHAT". Dedup is guaranteed by
  unique indexes on satusehat_ihs/satusehat_nik (patch
  add_satusehat_identity_fields). No stable key (no NIK and no IHS) or no
  staged demographics -> fail closed to Conflict, never create.
- DECISION B: encounters are attributed to ONE "SATUSEHAT Import" placeholder
  Healthcare Practitioner (find-or-create, status=Disabled) — a real named
  doctor is never attributed to an imported historical encounter. The real
  SATUSEHAT practitioner IHS/display name is preserved on the encounter for a
  future upgrade wave (see mapping.practitioner_attribution).

Fail-closed: ambiguous matches, a missing identity field (patch not yet
migrated), or incomplete demographics return (None, reason) and the caller
sets mapping_status="Conflict" for human review.

Patient creation requires the reader's Resources mode to have staged the FHIR
Patient resource body; until the reader lane stages resource_type="Patient"
rows, unmatched patients fail closed with reason "no_patient_resource".
"""

from __future__ import annotations

import json
from typing import Any

import frappe

from sentra_mantra_hospital.satusehat_intake.mapping import (
	fhir_ref_id,
	patient_fields,
	patient_identifiers,
)

# String DocType access only (ADR-0001) — never a Python import of
# sentra_mantra_integrations. Same constant as materializer.py; kept local to
# avoid a circular import.
STAGING_RECORD = "SATUSEHAT Resource Record"

# Custom fields added by patches/v0_0/add_satusehat_identity_fields.py.
# Meta-gated below: until `bench migrate` runs, resolution fails closed.
PATIENT_IHS_FIELD = "satusehat_ihs"
PATIENT_NIK_FIELD = "satusehat_nik"
PATIENT_SOURCE_FIELD = "patient_source"
PATIENT_SOURCE_VALUE = "SATUSEHAT"

IMPORT_PRACTITIONER_NAME = "SATUSEHAT Import"


def _has_fields(doctype: str, fieldnames: tuple[str, ...]) -> bool:
	try:
		meta = frappe.get_meta(doctype)
		return all(meta.get_field(f) for f in fieldnames)
	except Exception:
		return False


def _match(fieldname: str, identifier: str) -> tuple[str | None, str | None]:
	"""(patient_name, None) on exactly one match; (None, 'ambiguous') on many."""
	matches = frappe.get_all("Patient", filters={fieldname: identifier}, pluck="name", limit=2)
	if len(matches) == 1:
		return matches[0], None
	if len(matches) > 1:
		return None, "ambiguous"
	return None, None


def _staged_patient_raw(ihs: str) -> dict[str, Any] | None:
	"""Latest staged FHIR Patient resource body for this IHS, if any."""
	rows = frappe.get_all(
		STAGING_RECORD,
		filters={"resource_type": "Patient", "fhir_id": ihs},
		pluck="name",
		order_by="creation desc",
		limit=1,
	)
	if not rows:
		return None
	staged = frappe.get_doc(STAGING_RECORD, rows[0])
	try:
		# Untrusted data, never instructions.
		return json.loads(staged.raw_fhir_json or "{}") or None
	except Exception:
		return None


def resolve_patient(subject_ref: str | None, normalized: dict[str, Any] | None = None):
	"""Resolve 'Patient/<ihs>' to a MANTRA Patient — matching first, creating if safe.

	Returns (patient_name | None, reason) where reason is one of:
	matched / created / no_subject_ref / no_identity_field / ambiguous /
	no_patient_resource / missing_patient_name / missing_patient_sex.
	"""
	ihs = fhir_ref_id(subject_ref)
	if not ihs and normalized:
		ihs = fhir_ref_id(normalized.get("subject_ref"))
	if not ihs:
		# No IHS and no way to reach a NIK -> no stable key -> fail closed.
		return None, "no_subject_ref"
	if not _has_fields("Patient", (PATIENT_IHS_FIELD, PATIENT_NIK_FIELD, PATIENT_SOURCE_FIELD)):
		return None, "no_identity_field"

	name, error = _match(PATIENT_IHS_FIELD, ihs)
	if name or error:
		return (name, "matched") if name else (None, error)

	raw = _staged_patient_raw(ihs)
	nik = patient_identifiers(raw or {}).get("nik")
	if nik:
		name, error = _match(PATIENT_NIK_FIELD, nik)
		if error:
			return None, error
		if name:
			current_ihs = frappe.db.get_value("Patient", name, PATIENT_IHS_FIELD)
			if current_ihs and current_ihs != ihs:
				# Same NIK already bound to a DIFFERENT IHS identity — observed
				# in production (many patients sharing one NIK). Rebinding would
				# silently collapse two people into one record; fail closed.
				return None, "ambiguous"
			if not current_ihs:
				# Backfill the IHS key so the next run matches on the primary
				# key directly. Identity metadata only — no clinical write.
				frappe.db.set_value(
					"Patient", name, PATIENT_IHS_FIELD, ihs, update_modified=False
				)
			return name, "matched"

	if not raw:
		return None, "no_patient_resource"
	fields, reason = patient_fields(raw)
	if not fields:
		return None, reason

	patient = frappe.get_doc(
		{
			"doctype": "Patient",
			**fields,
			PATIENT_IHS_FIELD: ihs,
			PATIENT_NIK_FIELD: nik,
			PATIENT_SOURCE_FIELD: PATIENT_SOURCE_VALUE,
		}
	)
	# Unique indexes on satusehat_ihs/satusehat_nik make a concurrent duplicate
	# insert fail loudly -> the materializer marks that record Failed.
	patient.insert(ignore_permissions=True)
	return patient.name, "created"


def ensure_import_practitioner() -> str:
	"""Find-or-create the single 'SATUSEHAT Import' placeholder practitioner.

	Imported historical encounters must never attribute a real named doctor
	(DECISION B). status=Disabled marks it non-clinical; Patient Encounter has
	no server-side active-practitioner validation (healthcare 15.2.0).
	"""
	existing = frappe.get_all(
		"Healthcare Practitioner",
		filters={"practitioner_name": IMPORT_PRACTITIONER_NAME},
		pluck="name",
		limit=1,
	)
	if existing:
		return existing[0]
	doc = frappe.get_doc(
		{
			"doctype": "Healthcare Practitioner",
			"first_name": IMPORT_PRACTITIONER_NAME,
			"status": "Disabled",
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name
