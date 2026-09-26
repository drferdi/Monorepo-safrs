"""Audit bridge: emit SATUSEHAT sync events toward the core Audit Event Registry.

DECISIONS 2026-07-20: `Audit Event Registry` (sentra_mantra_core) does not
exist yet. Until it does, events are parked as JSON lines on the SATUSEHAT
Sync Batch itself — a temporary bridge, not a new permanent audit schema in
this app. Reached only via the string DocType name, never a Python import of
sentra_mantra_core (ADR-0001 S2 dependency direction). Events never carry PHI
or secret values; any field whose name looks secret-shaped is dropped before
it reaches a log, event, or parked note.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import now_datetime

REGISTRY_DOCTYPE = "Audit Event Registry"
BATCH_DOCTYPE = "SATUSEHAT Sync Batch"

_FORBIDDEN_FIELD_SUBSTRINGS = ("secret", "password", "token", "credential")


def registry_available() -> bool:
	return bool(frappe.db.exists("DocType", REGISTRY_DOCTYPE))


def _event_payload(event_type: str, source_app: str = "sentra_mantra_integrations", **fields: Any) -> dict[str, Any]:
	payload = {
		"event_type": event_type,
		"source_app": source_app,
		"actor": frappe.session.user if getattr(frappe, "session", None) else "Administrator",
		"timestamp": str(now_datetime()),
	}
	for key, value in fields.items():
		if value is None:
			continue
		if any(bad in key.lower() for bad in _FORBIDDEN_FIELD_SUBSTRINGS):
			continue  # never let a secret-looking field reach an audit event
		payload[key] = value
	return payload


def _park_locally(batch, payload: dict[str, Any]) -> None:
	"""Temporary bridge: append the event as one JSON line to the batch's notes.

	Always reloads by name: the caller's instance may be stale (finish_batch
	saves a fresh copy mid-pull) and saving it would TimestampMismatchError."""
	batch_doc = frappe.get_doc(BATCH_DOCTYPE, batch.name if hasattr(batch, "name") else batch)
	existing = batch_doc.notes or ""
	line = json.dumps(payload, ensure_ascii=False, sort_keys=True)
	batch_doc.notes = f"{existing}\n{line}".strip()
	batch_doc.save(ignore_permissions=True)


def emit(event_type: str, batch: Any = None, **fields: Any) -> dict[str, Any]:
	"""Emit one audit event.

	Registry-present path writes to the core registry by string DocType name
	only. Absent path parks the same metadata on the batch's notes field.
	NEVER pass PHI or secret values via `fields` — secret-shaped field names
	are dropped defensively, but that is a safety net, not a license to try.
	One summarized event per batch is emitted (not per-record): individual
	record audit trail already lives on SATUSEHAT Resource Record itself.
	"""
	payload = _event_payload(event_type, **fields)
	batch_name = batch.name if hasattr(batch, "name") else batch

	if registry_available():
		doc = frappe.get_doc(
			{
				"doctype": REGISTRY_DOCTYPE,
				"event_type": payload["event_type"],
				"source_app": payload["source_app"],
				"actor": payload["actor"],
				"resource_type": payload.get("resource_type"),
				"fhir_id": payload.get("fhir_id"),
				"hash": payload.get("hash"),
				"target_doctype": payload.get("target_doctype"),
				"batch": batch_name,
			}
		)
		doc.insert(ignore_permissions=True)
		return payload

	if batch is not None:
		_park_locally(batch, payload)
	return payload
