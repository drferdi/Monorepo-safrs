"""SATUSEHAT sync orchestration: PHI-free Aggregate mode and gated Resources mode.

Aggregate mode issues _count=0 and stores a total only — safe to run anywhere.
Resources mode pulls PHI-bearing FHIR bodies and must only run in-container
against production SATUSEHAT, on an explicit operator opt-in (BUILD SPEC S3/S7).

Handoff to the sentra_mantra_hospital materializer (S9.1) happens only through
a string-path frappe.enqueue call — never a Python import of that app. A
missing materializer must never break the durable pull (outbox discipline).
"""

from __future__ import annotations

import os

import frappe

from sentra_mantra_integrations.satusehat import audit, staging
from sentra_mantra_integrations.satusehat.client import (
	SatuSehatClientError,
	SatuSehatConfigError,
	is_configured,
)
from sentra_mantra_integrations.satusehat.client import org_id as client_org_id
from sentra_mantra_integrations.satusehat.resources import (
	condition,
	encounter,
	medication_request,
	observation,
	patient,
	procedure,
)

RESOURCE_TYPE = "Encounter"

_DERIVED = {
	"Condition": (condition.fetch_for_encounter, condition.normalize_condition),
	"Observation": (observation.fetch_for_encounter, observation.normalize_observation),
	"Procedure": (procedure.fetch_for_encounter, procedure.normalize_procedure),
	"MedicationRequest": (
		medication_request.fetch_for_encounter,
		medication_request.normalize_medication_request,
	),
}

# scheduler hook (deferred): "sentra_mantra_integrations.satusehat.reader.scheduled_encounter_sync"
# NOT registered in hooks.py — wiring deferred by Chief's decision (BUILD SPEC S7);
# hooks.py carries another lane's uncommitted changes.
MATERIALIZER_METHOD = "sentra_mantra_hospital.satusehat_intake.materializer.materialize_records"


def _satusehat_env() -> str | None:
	return os.getenv("MANTRA_SATUSEHAT_ENV")


def _aggregate_pull() -> dict:
	"""PHI-free: count Encounters via _count=0, store the total, no record rows."""
	total = encounter.count_encounters()
	batch = staging.record_aggregate_snapshot(
		org_id=client_org_id(),
		resource_type=RESOURCE_TYPE,
		total_records=total,
		satusehat_env=_satusehat_env(),
	)
	audit.emit("satusehat.pull.completed", batch=batch, resource_type=RESOURCE_TYPE)
	return {
		"batch": batch.name,
		"resource_type": RESOURCE_TYPE,
		"capture_mode": "Aggregate",
		"status": batch.status,
		"total_records": int(batch.total_records or 0),
	}


def _stage_derived_resources(batches: dict, encounter_fhir_id: str) -> dict[str, int]:
	"""Fetch + stage Condition/Observation/Procedure/MedicationRequest for one encounter.

	One summarized audit event per batch (not per derived record) — see S6:
	the per-record audit trail already lives on SATUSEHAT Resource Record
	itself; per-record events would multiply volume without adding information.
	"""
	counts: dict[str, int] = {}
	for resource_type, (fetch_fn, normalize_fn) in _DERIVED.items():
		try:
			resources = fetch_fn(encounter_fhir_id)
		except SatuSehatClientError:
			resources = []
		batch = batches[resource_type]
		for res in resources:
			normalized = normalize_fn(res)
			staging.add_record(
				batch,
				resource_type=resource_type,
				fhir_id=res.get("id"),
				raw_fhir=res,
				normalized=normalized,
				encounter_ref=normalized.get("encounter_ref"),
				subject_ref=normalized.get("subject_ref"),
				mapping_status="New",
				target_doctype=normalized.get("target_doctype"),
			)
		counts[resource_type] = len(resources)
	return counts


def _stage_patient_once(batch, subject_ref: str | None, staged_patient_ids: set[str]) -> bool:
	"""Fetch + stage the FHIR Patient behind an Encounter's `subject` reference,
	at most once per pull (`staged_patient_ids` is shared across the whole
	`_resources_pull` call). Unblocks `identity.resolve_patient`'s
	"no_patient_resource" fail-closed path (REVISION 01 DECISION A) — without
	this, auto-create never had a Patient body to create from.

	No `normalized` payload is stored (see resources/patient.py docstring):
	the raw FHIR body is the only copy of that PHI kept in staging.
	"""
	pid = patient.patient_id_from_reference(subject_ref)
	if not pid or pid in staged_patient_ids:
		return False
	raw_patient = patient.fetch_by_id(pid)
	if not raw_patient:
		return False
	staging.add_record(
		batch,
		resource_type="Patient",
		fhir_id=pid,
		raw_fhir=raw_patient,
		normalized=None,
		subject_ref=subject_ref,
		mapping_status="New",
		target_doctype=None,
	)
	staged_patient_ids.add(pid)
	return True


def _resources_pull() -> dict:
	"""Pull PHI-bearing Encounter + derived resource bodies. In-container only."""
	env = _satusehat_env()
	oid = client_org_id()

	batches = {
		rt: staging.create_batch(org_id=oid, resource_type=rt, satusehat_env=env, capture_mode="Resources")
		for rt in (RESOURCE_TYPE, "Patient", *_DERIVED.keys())
	}
	encounter_batch = batches[RESOURCE_TYPE]
	audit.emit("satusehat.pull.started", batch=encounter_batch, resource_type=RESOURCE_TYPE)

	staged_records: list[str] = []
	staged_patient_ids: set[str] = set()
	next_link = None
	try:
		bundle = encounter.fetch_page()
		for res in encounter.entries_of(bundle):
			normalized = encounter.normalize_encounter(res)
			record = staging.add_record(
				encounter_batch,
				resource_type=RESOURCE_TYPE,
				fhir_id=res.get("id"),
				raw_fhir=res,
				normalized=normalized,
				subject_ref=normalized.get("subject_ref"),
				mapping_status="New",
				target_doctype=normalized.get("target_doctype"),
			)
			staged_records.append(record.name)
			_stage_patient_once(batches["Patient"], normalized.get("subject_ref"), staged_patient_ids)
			if res.get("id"):
				_stage_derived_resources(batches, res["id"])
		next_link = encounter.next_link_of(bundle)
	except Exception:
		for batch in batches.values():
			staging.fail_batch(batch, "SATUSEHAT resources pull failed")
		staging.record_sync_failure(RESOURCE_TYPE)
		frappe.log_error(title="SATUSEHAT resources pull failed")
		audit.emit("satusehat.pull.failed", batch=encounter_batch, resource_type=RESOURCE_TYPE)
		raise

	for rt, batch in batches.items():
		staging.finish_batch(batch, next_link=next_link if rt == RESOURCE_TYPE else None)
	staging.record_sync_success(RESOURCE_TYPE, next_link=next_link)
	audit.emit("satusehat.pull.completed", batch=encounter_batch, resource_type=RESOURCE_TYPE)

	return {
		"batch": encounter_batch.name,
		"resource_type": RESOURCE_TYPE,
		"capture_mode": "Resources",
		"status": "Completed",
		"staged_records": staged_records,
	}


def _promote(record_names: list[str]) -> None:
	"""Optional handoff to the hospital materializer (S9.1) — string path only,
	never a Python import of sentra_mantra_hospital. A missing materializer must
	not break the durable pull: catch and log, never raise into the caller."""
	if not record_names:
		return
	try:
		frappe.enqueue(MATERIALIZER_METHOD, queue="long", record_names=record_names)
	except Exception:
		frappe.log_error(title="SATUSEHAT materializer handoff failed (non-fatal)")


@frappe.whitelist()
def pull_encounters(capture_mode: str = "Aggregate", promote: int = 0):
	"""Operator command. PHI-free Aggregate by default; Resources requires an
	explicit opt-in and PHI execution is gated to in-container use (BUILD SPEC S3)."""
	if frappe.session.user == "Guest" or not frappe.has_permission(staging.BATCH_DOCTYPE, "create"):
		frappe.throw("You do not have permission to pull SATUSEHAT data.")
	if not is_configured():
		frappe.throw("SATUSEHAT is not configured (missing env vars).")
	if capture_mode not in ("Aggregate", "Resources"):
		frappe.throw(f"Unsupported capture_mode: {capture_mode}")

	if capture_mode == "Aggregate":
		return _aggregate_pull()

	result = _resources_pull()
	if int(promote or 0) and result.get("staged_records"):
		_promote(result["staged_records"])
	return result


def scheduled_encounter_sync():
	"""Hourly-style entrypoint; skips quietly until SATUSEHAT is configured.
	NOT wired into hooks.py — see the module-level comment above (BUILD SPEC S7)."""
	if not is_configured():
		return {"status": "Skipped", "reason": "SATUSEHAT is not configured"}
	try:
		return _aggregate_pull()
	except (SatuSehatConfigError, SatuSehatClientError):
		frappe.log_error(title="SATUSEHAT scheduled sync failed")
		return {"status": "Failed"}
