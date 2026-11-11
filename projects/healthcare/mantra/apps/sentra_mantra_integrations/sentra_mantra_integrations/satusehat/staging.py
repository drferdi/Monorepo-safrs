"""Staging + audit trail for SATUSEHAT pulls.

Raw + normalized FHIR resources always land here first as audited Frappe
documents. This module never creates final clinical records (Patient
Encounter, etc.) and never writes back to SATUSEHAT — outbox/retry discipline
per ADR-0001 S3 (sentra_mantra_integrations is not a system of record).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

import frappe
from frappe.utils import now_datetime

BATCH_DOCTYPE = "SATUSEHAT Sync Batch"
RECORD_DOCTYPE = "SATUSEHAT Resource Record"
STATE_DOCTYPE = "SATUSEHAT Sync State"

MAPPING_STATUSES = ("New", "Matched", "Conflict", "Failed")


def canonical_payload(payload: dict[str, Any]) -> str:
	"""Stable JSON representation for hashing and duplicate detection."""
	return json.dumps(payload, default=str, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def pretty_payload(payload: dict[str, Any]) -> str:
	"""Human-readable JSON stored on the staging record."""
	return json.dumps(payload, default=str, ensure_ascii=False, sort_keys=True, indent=2)


def payload_hash(payload: dict[str, Any]) -> str:
	return hashlib.sha256(canonical_payload(payload).encode("utf-8")).hexdigest()


def create_batch(
	org_id: str,
	resource_type: str,
	satusehat_env: str | None = None,
	status: str = "Running",
	capture_mode: str = "Aggregate",
	notes: str | None = None,
):
	"""Create a SATUSEHAT sync batch for one resource-type pull."""
	doc = frappe.new_doc(BATCH_DOCTYPE)
	doc.satusehat_env = satusehat_env
	doc.org_id = org_id
	doc.resource_type = resource_type
	doc.capture_mode = capture_mode
	doc.status = status
	doc.started_at = now_datetime()
	doc.notes = notes
	doc.insert(ignore_permissions=True)
	return doc


def record_aggregate_snapshot(
	org_id: str,
	resource_type: str,
	total_records: int,
	satusehat_env: str | None = None,
	notes: str | None = None,
):
	"""Store a PHI-free audited count without pulling any resource body."""
	total = int(total_records)
	if total < 0:
		raise ValueError("total_records cannot be negative")

	batch = create_batch(
		org_id=org_id,
		resource_type=resource_type,
		satusehat_env=satusehat_env,
		status="Completed",
		capture_mode="Aggregate",
		notes=notes,
	)
	batch.total_records = total
	batch.finished_at = now_datetime()
	batch.save(ignore_permissions=True)
	return batch


def add_record(
	batch,
	resource_type: str,
	fhir_id: str,
	raw_fhir: dict[str, Any],
	normalized: dict[str, Any] | None = None,
	encounter_ref: str | None = None,
	subject_ref: str | None = None,
	validation_status: str = "Pending",
	mapping_status: str = "Pending",
	target_doctype: str | None = None,
	error_message: str | None = None,
):
	"""Store one raw + normalized FHIR resource with a deterministic hash."""
	batch_name = batch.name if hasattr(batch, "name") else batch
	doc = frappe.new_doc(RECORD_DOCTYPE)
	doc.batch = batch_name
	doc.resource_type = resource_type
	doc.fhir_id = fhir_id
	doc.encounter_ref = encounter_ref
	doc.subject_ref = subject_ref
	doc.pulled_at = now_datetime()
	doc.raw_fhir_json = pretty_payload(raw_fhir)
	doc.normalized_json = pretty_payload(normalized) if normalized is not None else None
	doc.payload_hash = payload_hash(raw_fhir)
	doc.validation_status = validation_status
	doc.mapping_status = mapping_status
	doc.target_doctype = target_doctype
	doc.error_message = error_message
	doc.insert(ignore_permissions=True)
	return doc


def refresh_batch_totals(batch):
	"""Recalculate batch totals from stored staging records (Resources mode only)."""
	batch_doc = frappe.get_doc(BATCH_DOCTYPE, batch.name if hasattr(batch, "name") else batch)
	if batch_doc.capture_mode == "Aggregate":
		return batch_doc
	filters = {"batch": batch_doc.name}
	batch_doc.total_records = frappe.db.count(RECORD_DOCTYPE, filters)
	for status in MAPPING_STATUSES:
		field = f"{status.lower()}_records"
		batch_doc.set(field, frappe.db.count(RECORD_DOCTYPE, {**filters, "mapping_status": status}))
	batch_doc.save(ignore_permissions=True)
	return batch_doc


def finish_batch(batch, status: str = "Completed", notes: str | None = None, next_link: str | None = None):
	"""Mark a batch terminal after refreshing its counters."""
	batch_doc = refresh_batch_totals(batch)
	batch_doc.status = status
	batch_doc.finished_at = now_datetime()
	if notes is not None:
		batch_doc.notes = notes
	if next_link is not None:
		batch_doc.next_link = next_link
	batch_doc.save(ignore_permissions=True)
	return batch_doc


def fail_batch(batch, error_message: str):
	return finish_batch(batch, status="Failed", notes=error_message)


def get_or_create_sync_state(resource_type: str):
	if frappe.db.exists(STATE_DOCTYPE, resource_type):
		return frappe.get_doc(STATE_DOCTYPE, resource_type)
	doc = frappe.new_doc(STATE_DOCTYPE)
	doc.resource_type = resource_type
	doc.insert(ignore_permissions=True)
	return doc


def record_sync_success(resource_type: str, next_link: str | None, high_watermark: str | None = None):
	"""Outbox bookkeeping: resume cursor + reset the failure counter."""
	state = get_or_create_sync_state(resource_type)
	state.last_success_at = now_datetime()
	state.last_next_link = next_link
	if high_watermark is not None:
		state.high_watermark = high_watermark
	state.consecutive_failures = 0
	state.save(ignore_permissions=True)
	return state


def record_sync_failure(resource_type: str):
	state = get_or_create_sync_state(resource_type)
	state.consecutive_failures = (state.consecutive_failures or 0) + 1
	state.save(ignore_permissions=True)
	return state
