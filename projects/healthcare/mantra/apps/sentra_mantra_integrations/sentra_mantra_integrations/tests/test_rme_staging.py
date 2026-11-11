import json

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.rme_bridge.staging import (
	add_record,
	create_batch,
	fail_batch,
	finish_batch,
	payload_hash,
	record_aggregate_snapshot,
)


class TestRMEStaging(FrappeTestCase):
	def test_batch_creation_stores_source_entity_status_and_timestamp(self):
		batch = create_batch(
			source_kind="readonly_db",
			entity="patient",
			connection_label="mysql:rme-prod",
		)

		self.assertEqual(batch.source_kind, "readonly_db")
		self.assertEqual(batch.entity, "patient")
		self.assertEqual(batch.status, "Running")
		self.assertTrue(batch.started_at)

	def test_record_creation_stores_audit_coordinates_payload_hash_and_pull_time(self):
		batch = create_batch("readonly_db", "patient", "mysql:rme-prod")
		payload = {"mrn": "RM001", "name": "Pasien Contoh"}

		record = add_record(
			batch=batch,
			entity="patient",
			raw_payload=payload,
			source_table="patients",
			source_primary_key="1",
		)

		self.assertEqual(record.batch, batch.name)
		self.assertEqual(record.source_table, "patients")
		self.assertEqual(record.source_primary_key, "1")
		self.assertEqual(json.loads(record.raw_payload_json), payload)
		self.assertEqual(record.raw_payload_hash, payload_hash(payload))
		self.assertTrue(record.pulled_at)

	def test_duplicate_raw_payload_produces_same_hash(self):
		left = {"name": "Pasien Contoh", "mrn": "RM001"}
		right = {"mrn": "RM001", "name": "Pasien Contoh"}

		self.assertEqual(payload_hash(left), payload_hash(right))

	def test_aggregate_snapshot_stores_count_without_patient_records(self):
		batch = record_aggregate_snapshot(
			source_kind="browser_ui",
			entity="patient",
			total_records=2180,
			connection_label="Medify RME /pasien",
		)

		self.assertEqual(batch.capture_mode, "Aggregate")
		self.assertEqual(batch.status, "Completed")
		self.assertEqual(batch.total_records, 2180)
		self.assertTrue(batch.started_at)
		self.assertTrue(batch.finished_at)
		self.assertEqual(frappe.db.count("RME Staging Record", {"batch": batch.name}), 0)

	def test_batch_totals_update_from_record_mapping_statuses(self):
		batch = create_batch("readonly_db", "patient", "mysql:rme-prod")
		add_record(batch, "patient", {"id": 1}, "patients", 1, mapping_status="New")
		add_record(batch, "patient", {"id": 2}, "patients", 2, mapping_status="Matched")
		add_record(batch, "patient", {"id": 3}, "patients", 3, mapping_status="Conflict")
		add_record(batch, "patient", {"id": 4}, "patients", 4, mapping_status="Failed")

		finished = finish_batch(batch)

		self.assertEqual(finished.status, "Completed")
		self.assertEqual(finished.total_records, 4)
		self.assertEqual(finished.new_records, 1)
		self.assertEqual(finished.matched_records, 1)
		self.assertEqual(finished.conflict_records, 1)
		self.assertEqual(finished.failed_records, 1)
		self.assertTrue(finished.finished_at)

	def _last_audit_event(self, batch_name):
		rows = frappe.get_all(
			"Audit Event",
			filters={"target_doctype": "RME Staging Batch", "target_name": batch_name},
			fields=["source_app", "producer", "event_type", "payload_json"],
			order_by="creation desc",
			limit=1,
		)
		return rows[0] if rows else None

	def test_finish_batch_records_external_pull_audit_event(self):
		batch = create_batch("readonly_db", "patient", "mysql:rme-prod")
		add_record(batch, "patient", {"id": 1}, "patients", 1)

		finished = finish_batch(batch)

		event = self._last_audit_event(finished.name)
		self.assertIsNotNone(event)
		self.assertEqual(event.source_app, "sentra_mantra_integrations")
		self.assertEqual(event.event_type, "External Pull")
		payload = json.loads(event.payload_json)
		self.assertEqual(payload["total_records"], 1)
		self.assertEqual(payload["connection_label"], "mysql:rme-prod")
		# Metadata saja — payload audit tidak boleh membawa isi baris pasien.
		self.assertNotIn("raw_payload_json", payload)
		self.assertNotIn("mrn", json.dumps(payload))

	def test_fail_batch_records_sync_failure_audit_event(self):
		batch = create_batch("readonly_db", "patient", "mysql:rme-prod")

		failed = fail_batch(batch, "connection reset")

		event = self._last_audit_event(failed.name)
		self.assertIsNotNone(event)
		self.assertEqual(event.event_type, "Sync Failure")

	def test_audit_failure_does_not_fail_the_pull(self):
		from unittest.mock import patch

		real_get_attr = frappe.get_attr

		def broken_registry(path):
			# Hanya jalur registry yang gagal — get_attr internal frappe tetap hidup.
			if path == "sentra_mantra_core.audit_registry.record_event":
				raise Exception("registry down")
			return real_get_attr(path)

		batch = create_batch("readonly_db", "patient", "mysql:rme-prod")
		with patch(
			"sentra_mantra_integrations.rme_bridge.staging.frappe.get_attr",
			side_effect=broken_registry,
		):
			finished = finish_batch(batch)
		self.assertEqual(finished.status, "Completed")
