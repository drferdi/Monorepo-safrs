"""Single audit spine for external-data producers across the five custom apps.

Producers write via `frappe.get_attr("sentra_mantra_core.audit_registry.record_event")(...)`
— cross-app calls are always a dotted string, never a Python import (ADR-0001).
This is the only DocType allowed to accumulate cross-producer audit history;
do not create a second one (.agent/DECISIONS.md, 2026-07-20 — Satu audit spine).

`payload` is metadata about a pull (counts, connection label, batch reference),
never patient data or other PHI — callers must not put identifiers in it.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import now_datetime

DOCTYPE = "Audit Event"

EVENT_TYPES = ("External Pull", "Record Change", "Sync Failure")


def record_event(
	source_app: str,
	producer: str,
	event_type: str,
	target_doctype: str | None = None,
	target_name: str | None = None,
	payload: dict[str, Any] | None = None,
	notes: str | None = None,
) -> str:
	"""Create one audit event; returns the created document name."""
	if not source_app or not producer:
		frappe.throw("record_event requires source_app and producer")
	if event_type not in EVENT_TYPES:
		frappe.throw(f"Unsupported event_type: {event_type}")

	doc = frappe.new_doc(DOCTYPE)
	doc.source_app = source_app
	doc.producer = producer
	doc.event_type = event_type
	doc.occurred_at = now_datetime()
	doc.target_doctype = target_doctype
	doc.target_name = target_name
	doc.payload_json = (
		json.dumps(payload, default=str, ensure_ascii=False, sort_keys=True) if payload else None
	)
	doc.notes = notes
	doc.insert(ignore_permissions=True)
	return doc.name
