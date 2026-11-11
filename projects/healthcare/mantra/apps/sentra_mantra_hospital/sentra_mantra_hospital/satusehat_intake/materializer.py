"""Materialize staged SATUSEHAT records into native healthcare DocTypes.

The staging DocType `SATUSEHAT Resource Record` (owned by
sentra_mantra_integrations) is accessed ONLY via Frappe string DocType queries
— never a Python import of that app (ADR-0001 dependency direction; boundary
checker stays green). Only its status fields are written back
(mapping_status/target_doctype/target_name/error_message); its schema is never
touched.

Fail-closed per record: unresolved identity or data -> Conflict (human review);
error -> rollback this record's own writes (savepoint) and mark Failed; child
whose parent Encounter is not yet materialized -> back to Pending for the next
run. Nothing here posts to GL or touches financial DocTypes.
"""

from __future__ import annotations

import json
from typing import Any

import frappe

from sentra_mantra_hospital.satusehat_intake import identity
from sentra_mantra_hospital.satusehat_intake.mapping import (
	diagnosis_label,
	encounter_fields,
	fhir_ref_id,
	practitioner_attribution,
	procedure_fields,
	vital_signs_fields,
)

STAGING_RECORD = "SATUSEHAT Resource Record"  # string access only — no import
FHIR_ID_FIELD = "satusehat_fhir_id"
CONSUMABLE_STATUSES = ("Pending", "New")

# Terse, PHI-free reasons for mapping_status="Conflict".
_IDENTITY_REASONS = {
	"no_subject_ref": "no patient reference on staged record (no stable identity key)",
	"no_identity_field": "identity fields missing on Patient (patch not migrated)",
	"ambiguous": "multiple identity matches",
	"no_patient_resource": "patient not staged (Resources mode Patient pull required)",
	"missing_patient_name": "staged patient resource has no usable name",
	"missing_patient_sex": "staged patient resource has no mappable gender",
}

# scheduler hook: "sentra_mantra_hospital.satusehat_intake.materializer.scheduled_materialize"
# — registered hourly in hooks.py (task X1, 26 Jul 2026; deferral lifted).


def _find_by_fhir_id(doctype: str, fhir_id: str) -> str | None:
	return frappe.db.exists(doctype, {FHIR_ID_FIELD: fhir_id})


def _write_status(
	record_name: str,
	mapping_status: str,
	target_doctype: str | None = None,
	target_name: str | None = None,
	error_message: str | None = None,
) -> None:
	frappe.db.set_value(
		STAGING_RECORD,
		record_name,
		{
			"mapping_status": mapping_status,
			"target_doctype": target_doctype,
			"target_name": target_name,
			"error_message": error_message,
		},
		update_modified=False,
	)


def _conflict(reason_key: str) -> tuple[str, None, None, str]:
	return "Conflict", None, None, _IDENTITY_REASONS.get(reason_key, reason_key)


def _parent_encounter(encounter_ref: str | None) -> str | None:
	parent_fhir_id = fhir_ref_id(encounter_ref)
	if not parent_fhir_id:
		return None
	return _find_by_fhir_id("Patient Encounter", parent_fhir_id)


def _materialize_encounter(record, normalized: dict[str, Any], raw: dict[str, Any]):
	patient, reason = identity.resolve_patient(record.subject_ref, normalized)
	if not patient:
		return _conflict(reason)
	fields, reason = encounter_fields(normalized)
	if not fields:
		return _conflict(reason)
	# DECISION B: never attribute a real named doctor to an imported historical
	# encounter — one Disabled "SATUSEHAT Import" placeholder carries them all,
	# while the real attribution is preserved verbatim for a future wave.
	practitioner = identity.ensure_import_practitioner()
	prac_ihs, prac_name = practitioner_attribution(raw)
	attribution = {
		"satusehat_practitioner_ihs": prac_ihs,
		"satusehat_practitioner_name": prac_name,
	}

	existing = _find_by_fhir_id("Patient Encounter", record.fhir_id)
	if existing:
		doc = frappe.get_doc("Patient Encounter", existing)
		doc.update(fields)
		doc.update(attribution)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.new_doc("Patient Encounter")
		doc.patient = patient
		doc.practitioner = practitioner
		doc.update(fields)
		doc.update(attribution)
		doc.set(FHIR_ID_FIELD, record.fhir_id)
		doc.insert(ignore_permissions=True)  # stays draft — human review before submit
	return "Matched", "Patient Encounter", doc.name, None


def _escape_like(value: str) -> str:
	"""Escape SQL LIKE wildcards in untrusted staged data (MariaDB backslash escape)."""
	return value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


def _ensure_diagnosis_master(normalized: dict[str, Any]) -> str | None:
	"""Existing-or-created Diagnosis master, deduped on the ICD-10 CODE.

	Dedup keys on the code, not the display string (REVISION 01): 'J45.9 - Asma'
	and 'J45.9 - Asthma' are the same diagnosis. Lookup order: exact label ->
	exact code -> alphabetically-first 'CODE - *' match -> create the label.
	Vocabulary master only — not clinical certainty about the patient.
	"""
	label = diagnosis_label(normalized)
	if not label:
		return None
	code = (normalized.get("code_value") or "").strip()
	if label and frappe.db.exists("Diagnosis", label):
		return label
	if code:
		if frappe.db.exists("Diagnosis", code):
			return code
		prefixed = frappe.get_all(
			"Diagnosis",
			filters={"diagnosis": ("like", f"{_escape_like(code)} - %")},
			pluck="name",
			order_by="name asc",
			limit=1,
		)
		if prefixed:
			return prefixed[0]
	frappe.get_doc({"doctype": "Diagnosis", "diagnosis": label}).insert(ignore_permissions=True)
	return label


def _materialize_condition(record, normalized: dict[str, Any], raw: dict[str, Any]):
	parent = _parent_encounter(record.encounter_ref)
	if not parent:
		return "Pending", None, None, "awaiting parent encounter"
	master = _ensure_diagnosis_master(normalized)
	if not master:
		return _conflict("condition has no code or display")

	pe = frappe.get_doc("Patient Encounter", parent)
	already = any(
		row.get(FHIR_ID_FIELD) == record.fhir_id or row.diagnosis == master
		for row in pe.get("diagnosis") or []
	)
	if not already:
		pe.append("diagnosis", {"diagnosis": master, FHIR_ID_FIELD: record.fhir_id})
		pe.save(ignore_permissions=True)
	return "Matched", "Patient Encounter", pe.name, None


def _materialize_observation(record, normalized: dict[str, Any], raw: dict[str, Any]):
	fields, reason = vital_signs_fields(normalized)
	if not fields:
		return _conflict(reason)
	patient, reason = identity.resolve_patient(record.subject_ref, normalized)
	if not patient:
		return _conflict(reason)

	existing = _find_by_fhir_id("Vital Signs", record.fhir_id)
	if existing:
		doc = frappe.get_doc("Vital Signs", existing)
		doc.update(fields)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.new_doc("Vital Signs")
		doc.patient = patient
		doc.update(fields)
		doc.set(FHIR_ID_FIELD, record.fhir_id)
		parent = _parent_encounter(record.encounter_ref)
		if parent:
			doc.encounter = parent
		doc.insert(ignore_permissions=True)
	return "Matched", "Vital Signs", doc.name, None


def _resolve_procedure_template(normalized: dict[str, Any]) -> str | None:
	"""Exactly one Clinical Procedure Template whose codification matches the code."""
	code = normalized.get("code_value")
	if not code:
		return None
	parents = frappe.get_all(
		"Codification Table",
		filters={"parenttype": "Clinical Procedure Template", "code": code},
		pluck="parent",
		limit=2,
	)
	unique = sorted(set(parents))
	return unique[0] if len(unique) == 1 else None


def _materialize_procedure(record, normalized: dict[str, Any], raw: dict[str, Any]):
	patient, reason = identity.resolve_patient(record.subject_ref, normalized)
	if not patient:
		return _conflict(reason)
	template = _resolve_procedure_template(normalized)
	if not template:
		return _conflict("no unique Clinical Procedure Template for code")
	fields, reason = procedure_fields(normalized)
	if not fields:
		return _conflict(reason)

	existing = _find_by_fhir_id("Clinical Procedure", record.fhir_id)
	if existing:
		doc = frappe.get_doc("Clinical Procedure", existing)
		doc.update(fields)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.new_doc("Clinical Procedure")
		doc.patient = patient
		doc.procedure_template = template
		doc.update(fields)
		doc.set(FHIR_ID_FIELD, record.fhir_id)
		doc.insert(ignore_permissions=True)
	return "Matched", "Clinical Procedure", doc.name, None


def _materialize_medication_request(record, normalized: dict[str, Any], raw: dict[str, Any]):
	# Drug Prescription child rows require Prescription Duration + Dosage Form
	# master links that cannot be resolved confidently from SATUSEHAT dosage
	# text. v1 fails closed; Chief decides the master-mapping strategy later.
	return _conflict("prescription dosage masters unresolvable (v1)")


_DISPATCH = {
	"Encounter": _materialize_encounter,
	"Condition": _materialize_condition,
	"Observation": _materialize_observation,
	"Procedure": _materialize_procedure,
	"MedicationRequest": _materialize_medication_request,
}


def _materialize_one(record_name: str, index: int) -> dict[str, Any]:
	"""One staging record, isolated: own savepoint, own status write-back."""
	record = frappe.get_doc(STAGING_RECORD, record_name)
	if record.mapping_status not in CONSUMABLE_STATUSES:
		return {"record": record_name, "status": record.mapping_status, "skipped": True}

	savepoint = f"ss_materialize_{index}"
	frappe.db.savepoint(savepoint)
	try:
		handler = _DISPATCH.get(record.resource_type)
		if not handler:
			status, target_dt, target_name, error = _conflict(
				f"unsupported resource type: {record.resource_type}"
			)
		else:
			normalized = json.loads(record.normalized_json or "{}")
			raw = json.loads(record.raw_fhir_json or "{}")
			status, target_dt, target_name, error = handler(record, normalized, raw)
	except Exception:
		frappe.db.rollback(save_point=savepoint)
		# PHI-free: record name + fhir_id only, never clinical values.
		frappe.log_error(
			title=f"SATUSEHAT materialize failed: {record_name} ({record.fhir_id})"
		)
		_write_status(record_name, "Failed", error_message="materialization error (see Error Log)")
		return {"record": record_name, "status": "Failed"}

	_write_status(record_name, status, target_dt, target_name, error)
	return {"record": record_name, "status": status, "target": target_name}


def _run(record_names: list[str]) -> dict[str, Any]:
	results = [_materialize_one(name, index) for index, name in enumerate(record_names)]
	summary: dict[str, int] = {}
	for row in results:
		summary[row["status"]] = summary.get(row["status"], 0) + 1
	return {"processed": len(results), "by_status": summary, "results": results}


def materialize_records(record_names: list[str] | str) -> dict[str, Any]:
	"""Enqueue target the reader calls by string path via frappe.enqueue."""
	if isinstance(record_names, str):
		record_names = json.loads(record_names)
	return _run(list(record_names or []))


def _pending(limit: int, batch: str | None) -> list[str]:
	"""Pending staging rows, Encounters first — they anchor every child resource."""
	filters: dict[str, Any] = {"mapping_status": ("in", CONSUMABLE_STATUSES)}
	if batch:
		filters["batch"] = batch
	encounters = frappe.get_all(
		STAGING_RECORD,
		filters={**filters, "resource_type": "Encounter"},
		pluck="name",
		order_by="creation asc",
		limit=limit,
	)
	remaining = max(limit - len(encounters), 0)
	# "Patient" rows are an identity source for resolve_patient, never a
	# materialization target — feeding them to _DISPATCH would Conflict them.
	others = frappe.get_all(
		STAGING_RECORD,
		filters={**filters, "resource_type": ("not in", ("Encounter", "Patient"))},
		pluck="name",
		order_by="creation asc",
		limit=remaining,
	) if remaining else []
	return encounters + others


@frappe.whitelist()
def materialize_pending(limit: int = 50, batch: str | None = None) -> dict[str, Any]:
	"""Operator command: materialize a bounded set of pending staged records."""
	if frappe.session.user == "Guest" or not frappe.has_permission("Patient Encounter", "write"):
		frappe.throw("You do not have permission to materialize SATUSEHAT records.")
	names = _pending(int(limit), batch)
	if not names:
		return {"processed": 0, "by_status": {}, "results": []}
	return _run(names)


def scheduled_materialize() -> dict[str, Any]:
	"""Scheduler entrypoint (hourly, hooks.py); skips quietly when nothing is pending."""
	if not frappe.db.exists("DocType", STAGING_RECORD):
		return {"status": "Skipped", "reason": "staging DocType not installed"}
	names = _pending(50, None)
	if not names:
		return {"status": "Skipped", "reason": "nothing pending"}
	return _run(names)
