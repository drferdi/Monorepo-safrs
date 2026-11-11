"""Audit Event Registry — single spine for cross-app audit events (DECISIONS 2026-07-20)."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.audit_registry import DOCTYPE, record_event


class TestAuditRegistry(FrappeTestCase):
	def test_record_event_creates_doc_with_expected_fields(self):
		name = record_event(
			source_app="sentra_mantra_integrations",
			producer="rme_bridge.runner.scheduled_patient_extract",
			event_type="External Pull",
			target_doctype="DocType",
			target_name=DOCTYPE,
			payload={"total_records": 12, "connection_label": "readonly_db"},
			notes="hourly pull",
		)
		doc = frappe.get_doc(DOCTYPE, name)
		self.assertEqual(doc.source_app, "sentra_mantra_integrations")
		self.assertEqual(doc.producer, "rme_bridge.runner.scheduled_patient_extract")
		self.assertEqual(doc.event_type, "External Pull")
		self.assertEqual(doc.target_doctype, "DocType")
		self.assertEqual(doc.target_name, DOCTYPE)
		self.assertEqual(
			json.loads(doc.payload_json),
			{"total_records": 12, "connection_label": "readonly_db"},
		)

	def test_record_event_without_target_or_payload(self):
		name = record_event(
			source_app="sentra_mantra_integrations",
			producer="rme_bridge.runner.scheduled_patient_extract",
			event_type="Sync Failure",
			notes="source not configured",
		)
		doc = frappe.get_doc(DOCTYPE, name)
		self.assertIsNone(doc.target_doctype)
		self.assertIsNone(doc.payload_json)

	def test_record_event_rejects_missing_producer(self):
		with self.assertRaises(frappe.ValidationError):
			record_event(source_app="sentra_mantra_integrations", producer="", event_type="External Pull")

	def test_record_event_rejects_unknown_event_type(self):
		with self.assertRaises(frappe.ValidationError):
			record_event(source_app="x", producer="y", event_type="Made Up")

	def test_record_event_reachable_via_get_attr(self):
		name = frappe.get_attr("sentra_mantra_core.audit_registry.record_event")(
			source_app="sentra_mantra_indonesia",
			producer="insights._helpdesk_open",
			event_type="Record Change",
		)
		self.assertTrue(frappe.db.exists(DOCTYPE, name))
