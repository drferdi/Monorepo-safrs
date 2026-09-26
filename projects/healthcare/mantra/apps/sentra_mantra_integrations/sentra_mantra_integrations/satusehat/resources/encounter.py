"""Encounter fetch (org-scoped, paginated) + normalization."""

from __future__ import annotations

from typing import Any

from sentra_mantra_integrations.satusehat.client import fhir_get, fhir_get_absolute
from sentra_mantra_integrations.satusehat.mapping import reference_id, target_doctype_hint

RESOURCE_TYPE = "Encounter"
PAGE_SIZE = 50


def count_encounters() -> int:
	"""PHI-free aggregate count via _count=0 — safe to run anywhere."""
	bundle = fhir_get("Encounter", {"_count": 0})
	return int(bundle.get("total") or 0)


def fetch_page(next_link: str | None = None) -> dict[str, Any]:
	"""Fetch one org-scoped Encounter Bundle page; pass next_link to resume a paged pull."""
	if next_link:
		return fhir_get_absolute(next_link)
	return fhir_get("Encounter", {"_count": PAGE_SIZE})


def next_link_of(bundle: dict[str, Any]) -> str | None:
	for link in bundle.get("link", []) or []:
		if link.get("relation") == "next":
			return link.get("url")
	return None


def entries_of(bundle: dict[str, Any]) -> list[dict[str, Any]]:
	return [entry["resource"] for entry in bundle.get("entry", []) or [] if entry.get("resource")]


def normalize_encounter(fhir: dict[str, Any]) -> dict[str, Any]:
	period = fhir.get("period") or {}
	encounter_class = fhir.get("class") or {}
	return {
		"fhir_id": fhir.get("id"),
		"resource_type": RESOURCE_TYPE,
		"status": fhir.get("status"),
		"class_code": encounter_class.get("code"),
		"class_display": encounter_class.get("display"),
		"period_start": period.get("start"),
		"period_end": period.get("end"),
		"subject_ref": reference_id(fhir.get("subject")),
		"service_provider_ref": reference_id(fhir.get("serviceProvider")),
		"encounter_ref": None,
		"target_doctype": target_doctype_hint(RESOURCE_TYPE),
	}
