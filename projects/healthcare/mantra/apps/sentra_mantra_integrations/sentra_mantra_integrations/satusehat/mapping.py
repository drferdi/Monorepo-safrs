"""FHIR -> canonical MANTRA mapping: pure helpers + resource dispatch.

No side effects, no I/O. Functions here never call the network or the Frappe
ORM; `staging.py` and `reader.py` own persistence. `target_doctype` values are
hints only (SoR = `healthcare`) — this app never creates the target record.
"""

from __future__ import annotations

from typing import Any

TARGET_DOCTYPE_HINTS = {
	"Encounter": "Patient Encounter",
	"Condition": "Patient Encounter",  # diagnosis line, hint only
	"Observation": "Vital Signs",
	"Procedure": "Clinical Procedure",
	"MedicationRequest": "Drug Prescription",
}


def reference_id(reference: dict[str, Any] | None) -> str | None:
	"""Return the raw FHIR reference string (e.g. 'Patient/xxxx') — never resolved PHI."""
	if not reference:
		return None
	return reference.get("reference")


def first_coding(codeable_concept: dict[str, Any] | None) -> dict[str, Any]:
	if not codeable_concept:
		return {}
	codings = codeable_concept.get("coding") or []
	return codings[0] if codings else {}


def coding_code(codeable_concept: dict[str, Any] | None) -> str | None:
	return first_coding(codeable_concept).get("code")


def coding_display(codeable_concept: dict[str, Any] | None) -> str | None:
	return first_coding(codeable_concept).get("display")


def coding_system(codeable_concept: dict[str, Any] | None) -> str | None:
	return first_coding(codeable_concept).get("system")


def target_doctype_hint(resource_type: str) -> str | None:
	return TARGET_DOCTYPE_HINTS.get(resource_type)


def normalize(resource_type: str, fhir: dict[str, Any]) -> dict[str, Any]:
	"""Dispatch to the per-resource normalizer. Raises ValueError for unknown types.

	Import is deferred to avoid a circular import: the resource modules import
	the helpers above from this module.
	"""
	from sentra_mantra_integrations.satusehat.resources import (
		condition,
		encounter,
		medication_request,
		observation,
		procedure,
	)

	dispatch = {
		"Encounter": encounter.normalize_encounter,
		"Condition": condition.normalize_condition,
		"Observation": observation.normalize_observation,
		"Procedure": procedure.normalize_procedure,
		"MedicationRequest": medication_request.normalize_medication_request,
	}
	fn = dispatch.get(resource_type)
	if not fn:
		raise ValueError(f"Unsupported SATUSEHAT resource type: {resource_type}")
	return fn(fhir)
