"""Observation (LOINC) fetch + normalization."""

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

RESOURCE_TYPE = "Observation"


def fetch_for_encounter(encounter_fhir_id: str) -> list[dict[str, Any]]:
	bundle = fhir_get("Observation", {"encounter": f"Encounter/{encounter_fhir_id}", "_count": 50})
	return [entry["resource"] for entry in bundle.get("entry", []) or [] if entry.get("resource")]


def _value(fhir: dict[str, Any]) -> dict[str, Any]:
	if "valueQuantity" in fhir:
		quantity = fhir["valueQuantity"]
		return {"value": quantity.get("value"), "unit": quantity.get("unit")}
	if "valueString" in fhir:
		return {"value": fhir["valueString"], "unit": None}
	if "valueCodeableConcept" in fhir:
		concept = fhir["valueCodeableConcept"]
		return {"value": coding_display(concept) or coding_code(concept), "unit": None}
	return {"value": None, "unit": None}


def normalize_observation(fhir: dict[str, Any]) -> dict[str, Any]:
	code = fhir.get("code") or {}
	value = _value(fhir)
	return {
		"fhir_id": fhir.get("id"),
		"resource_type": RESOURCE_TYPE,
		"status": fhir.get("status"),
		"code_system": coding_system(code),
		"code_value": coding_code(code),
		"code_display": coding_display(code),
		"value": value["value"],
		"unit": value["unit"],
		"effective_datetime": fhir.get("effectiveDateTime"),
		"subject_ref": reference_id(fhir.get("subject")),
		"encounter_ref": reference_id(fhir.get("encounter")),
		"target_doctype": target_doctype_hint(RESOURCE_TYPE),
	}
