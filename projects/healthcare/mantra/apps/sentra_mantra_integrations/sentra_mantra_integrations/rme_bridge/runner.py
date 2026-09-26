"""Executable source-to-staging wiring for the RME bridge.

The runner only reads from the configured RME source and writes audited
staging documents in MANTRA. It never creates final Patient records or writes
back to the RME.
"""

from __future__ import annotations

import os

import frappe

from sentra_mantra_integrations.rme_bridge.staging import BATCH_DOCTYPE, stage_records
from sentra_mantra_integrations.rme_bridge.sources import FolderSource, ReadOnlyDBSource

SUPPORTED_ENTITIES = {"patient", "visit"}


def _source_kind() -> str:
	return (os.getenv("MANTRA_RME_SOURCE_KIND") or "readonly_db").strip().lower()


def source_is_configured() -> bool:
	"""Return whether the selected source has the minimum safe configuration."""
	kind = _source_kind()
	if kind == "folder":
		return bool(os.getenv("MANTRA_RME_EXPORT_DIR"))
	if kind in {"readonly_db", "mysql", "mariadb", "postgres", "postgresql"}:
		return all(
			os.getenv(name)
			for name in (
				"MANTRA_RME_DB_HOST",
				"MANTRA_RME_DB_NAME",
				"MANTRA_RME_DB_USER",
				"MANTRA_RME_DB_PASSWORD",
				"MANTRA_RME_TABLE_PATIENT",
			)
		)
	return False


def _build_source(entity: str):
	kind = _source_kind()
	if kind == "folder":
		base_dir = os.getenv("MANTRA_RME_EXPORT_DIR")
		if not base_dir:
			raise ValueError("MANTRA_RME_EXPORT_DIR is required for folder RME extraction.")
		return FolderSource(base_dir), entity
	if kind in {"readonly_db", "mysql", "mariadb", "postgres", "postgresql"}:
		source = ReadOnlyDBSource(driver=None if kind == "readonly_db" else kind)
		return source, source.table_map.get(entity, entity)
	raise ValueError(f"Unsupported MANTRA_RME_SOURCE_KIND: {kind}")


def _extract(entity: str) -> dict:
	if entity not in SUPPORTED_ENTITIES:
		raise ValueError(f"Unsupported RME entity: {entity}")
	source, source_table = _build_source(entity)
	batch = stage_records(
		source=source,
		entity=entity,
		source_table=source_table,
		primary_key_field=os.getenv(f"MANTRA_RME_{entity.upper()}_PRIMARY_KEY", "id"),
		updated_at_field=os.getenv(f"MANTRA_RME_{entity.upper()}_UPDATED_AT") or None,
		connection_label=source.describe().get("connection_label") or source.describe().get("base_dir"),
	)
	return {
		"batch": batch.name,
		"entity": batch.entity,
		"source_kind": batch.source_kind,
		"status": batch.status,
		"total_records": int(batch.total_records or 0),
	}


def extract_entity(entity: str = "patient") -> dict:
	"""Pull one RME entity into audited staging; no final records are created."""
	return _extract(entity)


@frappe.whitelist()
def pull_patients() -> dict:
	"""Operator command for an immediate read-only patient extract."""
	if frappe.session.user == "Guest" or not frappe.has_permission(BATCH_DOCTYPE, "create"):
		frappe.throw("You do not have permission to extract RME data.")
	return _extract("patient")


def scheduled_patient_extract() -> dict:
	"""Hourly job; skip quietly until an RME source is explicitly configured."""
	if not source_is_configured():
		frappe.logger("rme_bridge").info("Scheduled RME patient extract skipped: source not configured")
		return {"status": "Skipped", "reason": "RME source is not configured"}
	try:
		return _extract("patient")
	except Exception:
		frappe.log_error(title="RME patient extract failed")
		return {"status": "Failed"}
