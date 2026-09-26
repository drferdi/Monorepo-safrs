"""Patient identity fetch (by FHIR id) — read-only, staged verbatim for identity.py.

Unlike Condition/Observation/Procedure/MedicationRequest (fetched per-encounter
via a search), a Patient is fetched by direct FHIR id from an Encounter's
`subject` reference. No `normalize_patient` is produced deliberately: the raw
FHIR body already carries every field `sentra_mantra_hospital.satusehat_intake`
needs (name, gender, birthDate, identifier list) — normalizing it here would
duplicate PHI into a second JSON column for no benefit.

Verified 2026-07-22 (zero-PHI test against our own Organization/<id> read):
`client.fhir_get()`'s automatic `service-provider` query param does not break
a direct resource-id `read` interaction (SATUSEHAT returns 200 either way) —
safe to reuse `fhir_get` here rather than adding a second HTTP path in client.py.
"""

from __future__ import annotations

from typing import Any

from sentra_mantra_integrations.satusehat.client import SatuSehatClientError, fhir_get

RESOURCE_TYPE = "Patient"


def patient_id_from_reference(reference: str | None) -> str | None:
	"""'Patient/xxxx' -> 'xxxx'; None when absent/malformed/not a Patient reference."""
	if not reference or "/" not in reference:
		return None
	kind, _, tail = reference.partition("/")
	if kind != "Patient" or not tail.strip():
		return None
	return tail.strip()


def fetch_by_id(patient_fhir_id: str) -> dict[str, Any] | None:
	"""Direct FHIR read. Returns None on a not-found/rejected id rather than
	raising — a missing Patient must not abort the encounter pull (outbox
	discipline); the caller leaves that encounter's identity resolution to
	fail closed later (identity.resolve_patient -> reason="no_patient_resource")."""
	try:
		return fhir_get(f"Patient/{patient_fhir_id}")
	except SatuSehatClientError:
		return None
