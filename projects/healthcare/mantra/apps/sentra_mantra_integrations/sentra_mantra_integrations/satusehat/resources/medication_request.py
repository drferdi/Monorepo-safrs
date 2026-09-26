"""MedicationRequest (KFA) fetch + normalization."""

from __future__ import annotations

from typing import Any

from sentra_mantra_integrations.satusehat.client import fhir_get
from sentra_mantra_integrations.satusehat.mapping import (
	coding_code,
	coding_display,
	coding_system,
	reference_id,
	target_doctype_hint,
)

RESOURCE_TYPE = "MedicationRequest"


def fetch_for_encounter(encounter_fhir_id: str) -> list[dict[str, Any]]:
	bundle = fhir_get("MedicationRequest", {"encounter": f"Encounter/{encounter_fhir_id}", "_count": 50})
	return [entry["resource"] for entry in bundle.get("entry", []) or [] if entry.get("resource")]


def normalize_medication_request(fhir: dict[str, Any]) -> dict[str, Any]:
	medication = fhir.get("medicationCodeableConcept") or {}
	dosage_list = fhir.get("dosageInstruction") or []
	dosage_text = dosage_list[0].get("text") if dosage_list else None
	return {
		"fhir_id": fhir.get("id"),
		"resource_type": RESOURCE_TYPE,
		"status": fhir.get("status"),
		"intent": fhir.get("intent"),
		"code_system": coding_system(medication),
		"code_value": coding_code(medication),
		"code_display": coding_display(medication),
		"dosage_text": dosage_text,
		"subject_ref": reference_id(fhir.get("subject")),
		"encounter_ref": reference_id(fhir.get("encounter")),
		"target_doctype": target_doctype_hint(RESOURCE_TYPE),
	}
