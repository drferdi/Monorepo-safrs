"""Staging + audit trail for RME Bridge pulls.

Data from the legacy RME always lands here first. This module stores raw
source rows as auditable Frappe documents; it does not create final Patient or
Encounter records and never writes back to the legacy RME.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

import frappe
from frappe.utils import now_datetime

BATCH_DOCTYPE = "RME Staging Batch"
RECORD_DOCTYPE = "RME Staging Record"

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
	source_kind: str,
	entity: str,
	connection_label: str | None = None,
	status: str = "Running",
	notes: str | None = None,
	capture_mode: str = "Records",
):
	"""Create an RME staging batch for one source/entity pull."""
	doc = frappe.new_doc(BATCH_DOCTYPE)
	doc.source_kind = source_kind
	doc.connection_label = connection_label
	doc.entity = entity
	doc.capture_mode = capture_mode
	doc.status = status
	doc.started_at = now_datetime()
	doc.notes = notes
	doc.insert(ignore_permissions=True)
	return doc


def record_aggregate_snapshot(
	source_kind: str,
	entity: str,
	total_records: int,
	connection_label: str | None = None,
	notes: str | None = None,
):
	"""Store an audited source count without copying source-row payloads."""
	total = int(total_records)
	if total < 0:
		raise ValueError("total_records cannot be negative")

	batch = create_batch(
		source_kind=source_kind,
		entity=entity,
		connection_label=connection_label,
		status="Completed",
		notes=notes,
		capture_mode="Aggregate",
	)
	batch.total_records = total
	batch.finished_at = now_datetime()
	batch.save(ignore_permissions=True)
	return batch


def add_record(
	batch,
	entity: str,
	raw_payload: dict[str, Any],
	source_table: str,
	source_primary_key: str | int,
	source_updated_at=None,
	validation_status: str = "Pending",
	mapping_status: str = "Pending",
	target_doctype: str | None = None,
	target_name: str | None = None,
	error_message: str | None = None,
):
	"""Store one raw RME row with source coordinates and deterministic hash."""
	batch_name = batch.name if hasattr(batch, "name") else batch
	doc = frappe.new_doc(RECORD_DOCTYPE)
	doc.batch = batch_name
	doc.entity = entity
	doc.pulled_at = now_datetime()
	doc.source_table = source_table
	doc.source_primary_key = str(source_primary_key)
	doc.source_updated_at = source_updated_at
	doc.raw_payload_json = pretty_payload(raw_payload)
	doc.raw_payload_hash = payload_hash(raw_payload)
	doc.validation_status = validation_status
	doc.mapping_status = mapping_status
	doc.target_doctype = target_doctype
	doc.target_name = target_name
	doc.error_message = error_message
	doc.insert(ignore_permissions=True)
	return doc


def refresh_batch_totals(batch):
	"""Recalculate batch totals from stored staging records."""
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


def _record_audit_event(batch_doc, status: str) -> None:
	"""Tulis ke Audit Event Registry (core) — satu audit spine (DECISIONS 2026-07-20).

	Payload metadata saja (jumlah + label koneksi), TIDAK PERNAH isi
	raw_payload_json/data pasien. Kegagalan audit tidak boleh menggagalkan
	pull RME yang sebenarnya — staging lokal tetap system of record tambahan.
	"""
	try:
		frappe.get_attr("sentra_mantra_core.audit_registry.record_event")(
			source_app="sentra_mantra_integrations",
			producer="rme_bridge.staging.finish_batch",
			event_type="External Pull" if status != "Failed" else "Sync Failure",
			target_doctype=BATCH_DOCTYPE,
			target_name=batch_doc.name,
			payload={
				"total_records": int(batch_doc.total_records or 0),
				"connection_label": batch_doc.connection_label,
				"entity": batch_doc.entity,
				"status": status,
			},
		)
	except Exception:
		pass


def finish_batch(batch, status: str = "Completed", notes: str | None = None):
	"""Mark a batch terminal after refreshing its counters."""
	batch_doc = refresh_batch_totals(batch)
	batch_doc.status = status
	batch_doc.finished_at = now_datetime()
	if notes is not None:
		batch_doc.notes = notes
	batch_doc.save(ignore_permissions=True)
	_record_audit_event(batch_doc, status)
	return batch_doc


def fail_batch(batch, error_message: str):
	return finish_batch(batch, status="Failed", notes=error_message)


def stage_records(
	source,
	entity: str,
	source_table: str,
	primary_key_field: str = "id",
	updated_at_field: str | None = None,
	connection_label: str | None = None,
):
	"""Fetch raw rows from a Source and store them as staging records."""
	source_meta = source.describe()
	batch = create_batch(
		source_kind=source_meta.get("kind", "unknown"),
		entity=entity,
		connection_label=connection_label or source_meta.get("connection_label") or source_meta.get("base_dir"),
	)
	try:
		rows = source.fetch(entity)
		for index, row in enumerate(rows, 1):
			source_primary_key = row.get(primary_key_field) or row.get(primary_key_field.upper()) or index
			source_updated_at = row.get(updated_at_field) if updated_at_field else None
			add_record(
				batch=batch,
				entity=entity,
				raw_payload=dict(row),
				source_table=source_table,
				source_primary_key=source_primary_key,
				source_updated_at=source_updated_at,
			)
	except Exception as exc:
		fail_batch(batch, str(exc))
		raise
	return finish_batch(batch)
