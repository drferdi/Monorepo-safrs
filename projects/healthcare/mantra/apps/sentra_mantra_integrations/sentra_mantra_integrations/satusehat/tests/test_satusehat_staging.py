"""Staging + hash determinism; aggregate mode never writes PHI-bearing record rows."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.satusehat.staging import (
	add_record,
	create_batch,
	finish_batch,
	payload_hash,
	record_aggregate_snapshot,
)


class TestSatuSehatStaging(FrappeTestCase):
	def test_batch_creation_stores_org_resource_type_and_status(self):
		batch = create_batch(org_id="100027810", resource_type="Encounter")
		self.assertEqual(batch.org_id, "100027810")
		self.assertEqual(batch.resource_type, "Encounter")
		self.assertEqual(batch.status, "Running")
		self.assertTrue(batch.started_at)

	def test_record_creation_stores_hash_and_raw_payload(self):
		batch = create_batch(org_id="100027810", resource_type="Encounter")
		raw = {"resourceType": "Encounter", "id": "enc-1", "status": "finished"}

		record = add_record(
			batch=batch,
			resource_type="Encounter",
			fhir_id="enc-1",
			raw_fhir=raw,
		)

		self.assertEqual(record.batch, batch.name)
		self.assertEqual(record.fhir_id, "enc-1")
		self.assertEqual(json.loads(record.raw_fhir_json), raw)
		self.assertEqual(record.payload_hash, payload_hash(raw))
		self.assertTrue(record.pulled_at)

	def test_duplicate_raw_payload_produces_same_hash(self):
		left = {"id": "enc-1", "status": "finished"}
		right = {"status": "finished", "id": "enc-1"}
		self.assertEqual(payload_hash(left), payload_hash(right))

	def test_aggregate_snapshot_stores_count_without_resource_rows(self):
		batch = record_aggregate_snapshot(org_id="100027810", resource_type="Encounter", total_records=6421)

		self.assertEqual(batch.capture_mode, "Aggregate")
		self.assertEqual(batch.status, "Completed")
		self.assertEqual(batch.total_records, 6421)
		self.assertTrue(batch.started_at)
		self.assertTrue(batch.finished_at)
		self.assertEqual(frappe.db.count("SATUSEHAT Resource Record", {"batch": batch.name}), 0)

	def test_aggregate_snapshot_rejects_negative_total(self):
		with self.assertRaises(ValueError):
			record_aggregate_snapshot(org_id="100027810", resource_type="Encounter", total_records=-1)

	def test_batch_totals_update_from_record_mapping_statuses(self):
		batch = create_batch(org_id="100027810", resource_type="Condition", capture_mode="Resources")
		add_record(batch, "Condition", "cond-1", {"id": "cond-1"}, mapping_status="New")
		add_record(batch, "Condition", "cond-2", {"id": "cond-2"}, mapping_status="Matched")
		add_record(batch, "Condition", "cond-3", {"id": "cond-3"}, mapping_status="Conflict")
		add_record(batch, "Condition", "cond-4", {"id": "cond-4"}, mapping_status="Failed")

		finished = finish_batch(batch)

		self.assertEqual(finished.status, "Completed")
		self.assertEqual(finished.total_records, 4)
		self.assertEqual(finished.new_records, 1)
		self.assertEqual(finished.matched_records, 1)
		self.assertEqual(finished.conflict_records, 1)
		self.assertEqual(finished.failed_records, 1)
		self.assertTrue(finished.finished_at)

	def test_create_batch_accepts_patient_identity_resource_type(self):
		# Resources mode stages the FHIR Patient behind each Encounter subject
		# (reader._stage_patient_once, REVISION 01 DECISION A) — the batch
		# resource_type Select must accept "Patient" or the whole pull crashes.
		batch = create_batch(org_id="100027810", resource_type="Patient", capture_mode="Resources")
		self.assertEqual(batch.resource_type, "Patient")

	def test_encounter_and_subject_refs_are_reference_strings_not_phi(self):
		batch = create_batch(org_id="100027810", resource_type="Encounter")
		record = add_record(
			batch,
			"Encounter",
			"enc-1",
			{"id": "enc-1"},
			subject_ref="Patient/synthetic-1",
		)
		self.assertEqual(record.subject_ref, "Patient/synthetic-1")
