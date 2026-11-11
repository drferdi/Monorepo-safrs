"""End-to-end intake WITHOUT mocks: staged FHIR bodies -> live materialization.

Proves REVISION 01 on the real site schema: identity.resolve_patient reads the
actual staging rows, really creates the Patient (DECISION A) with its unique
identity keys, the Disabled "SATUSEHAT Import" placeholder (DECISION B), and a
draft Patient Encounter with preserved attribution. Synthetic identifiers only.
"""

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.satusehat_intake.identity import IMPORT_PRACTITIONER_NAME
from sentra_mantra_hospital.satusehat_intake.materializer import (
	FHIR_ID_FIELD,
	STAGING_RECORD,
	materialize_records,
)

STAGING_BATCH = "SATUSEHAT Sync Batch"


class TestEndToEndIntake(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		suffix = frappe.generate_hash(length=8)
		self.ihs = f"e2e-ihs-{suffix}"
		self.nik = f"E2E{suffix}"
		self.enc_fhir_id = f"e2e-enc-{suffix}"
		self._docs = []
		self._placeholder_preexisted = bool(
			frappe.get_all(
				"Healthcare Practitioner",
				filters={"practitioner_name": IMPORT_PRACTITIONER_NAME},
				limit=1,
			)
		)

		batch = frappe.get_doc(
			{
				"doctype": STAGING_BATCH,
				"org_id": "100027810",
				"resource_type": "Encounter",
				"capture_mode": "Resources",
				"status": "Completed",
			}
		).insert(ignore_permissions=True)
		self.batch = batch.name

		self.raw_patient = {
			"resourceType": "Patient",
			"id": self.ihs,
			"identifier": [
				{"system": "https://fhir.kemkes.go.id/id/ihs-number", "value": self.ihs},
				{"system": "https://fhir.kemkes.go.id/id/nik", "value": self.nik},
			],
			"name": [{"text": "Pasien E2E Sintetis"}],
			"gender": "female",
			"birthDate": "1991-02-03",
		}
		self.raw_encounter = {
			"resourceType": "Encounter",
			"id": self.enc_fhir_id,
			"status": "finished",
			"subject": {"reference": f"Patient/{self.ihs}"},
			"participant": [
				{
					"individual": {
						"reference": "Practitioner/e2e-doc-1",
						"display": "dr. E2E Sintetis",
					}
				}
			],
			"period": {"start": "2026-01-06T09:00:00+07:00"},
		}
		self.norm_encounter = {
			"fhir_id": self.enc_fhir_id,
			"resource_type": "Encounter",
			"status": "finished",
			"period_start": "2026-01-06T09:00:00+07:00",
			"subject_ref": f"Patient/{self.ihs}",
		}

		# Exactly what the reader lane stages in Resources mode: the Patient
		# body keyed by its FHIR id (raw only), plus the Encounter.
		self._staging_record("Patient", self.ihs, self.raw_patient, {})
		self.enc_record = self._staging_record(
			"Encounter", self.enc_fhir_id, self.raw_encounter, self.norm_encounter
		)

	def tearDown(self):
		frappe.set_user("Administrator")
		for name in frappe.get_all(
			"Patient Encounter", filters={FHIR_ID_FIELD: self.enc_fhir_id}, pluck="name"
		):
			frappe.delete_doc("Patient Encounter", name, force=True, ignore_permissions=True)
		for name in frappe.get_all(STAGING_RECORD, filters={"batch": self.batch}, pluck="name"):
			frappe.delete_doc(STAGING_RECORD, name, force=True, ignore_permissions=True)
		frappe.delete_doc(STAGING_BATCH, self.batch, force=True, ignore_permissions=True)
		for name in frappe.get_all("Patient", filters={"satusehat_ihs": self.ihs}, pluck="name"):
			customer = frappe.db.get_value("Patient", name, "customer")
			frappe.delete_doc("Patient", name, force=True, ignore_permissions=True)
			if customer and frappe.db.exists("Customer", customer):
				frappe.delete_doc("Customer", customer, force=True, ignore_permissions=True)
		if not self._placeholder_preexisted:
			for name in frappe.get_all(
				"Healthcare Practitioner",
				filters={"practitioner_name": IMPORT_PRACTITIONER_NAME},
				pluck="name",
			):
				frappe.delete_doc(
					"Healthcare Practitioner", name, force=True, ignore_permissions=True
				)
		super().tearDown()

	def _staging_record(self, resource_type, fhir_id, raw, normalized):
		doc = frappe.get_doc(
			{
				"doctype": STAGING_RECORD,
				"batch": self.batch,
				"resource_type": resource_type,
				"fhir_id": fhir_id,
				"subject_ref": normalized.get("subject_ref"),
				"pulled_at": frappe.utils.now_datetime(),
				"raw_fhir_json": json.dumps(raw),
				"normalized_json": json.dumps(normalized) if normalized else None,
				"payload_hash": frappe.generate_hash(length=16),
				"validation_status": "Pending",
				"mapping_status": "New",
			}
		).insert(ignore_permissions=True)
		return doc.name

	def test_full_chain_creates_patient_and_draft_encounter(self):
		result = materialize_records([self.enc_record])

		self.assertEqual(result["by_status"], {"Matched": 1})

		# DECISION A: Patient really created from the staged body, keyed + tagged
		patient_name = frappe.db.get_value("Patient", {"satusehat_ihs": self.ihs})
		self.assertTrue(patient_name)
		patient = frappe.get_doc("Patient", patient_name)
		self.assertEqual(patient.get("satusehat_nik"), self.nik)
		self.assertEqual(patient.get("patient_source"), "SATUSEHAT")
		self.assertEqual(patient.sex, "Female")

		row = frappe.db.get_value(
			STAGING_RECORD,
			self.enc_record,
			["mapping_status", "target_doctype", "target_name"],
			as_dict=True,
		)
		self.assertEqual(row.mapping_status, "Matched")
		self.assertEqual(row.target_doctype, "Patient Encounter")

		pe = frappe.get_doc("Patient Encounter", row.target_name)
		self.assertEqual(pe.docstatus, 0)  # draft — human review before submit
		self.assertEqual(pe.patient, patient_name)

		# DECISION B: Disabled placeholder attributed, real attribution preserved
		practitioner = frappe.get_doc("Healthcare Practitioner", pe.practitioner)
		self.assertEqual(practitioner.practitioner_name, IMPORT_PRACTITIONER_NAME)
		self.assertEqual(practitioner.status, "Disabled")
		self.assertEqual(pe.get("satusehat_practitioner_ihs"), "e2e-doc-1")
		self.assertEqual(pe.get("satusehat_practitioner_name"), "dr. E2E Sintetis")

	def test_rerun_matches_created_patient_and_never_duplicates(self):
		materialize_records([self.enc_record])
		# a later pull stages the same encounter again -> match by IHS, update in place
		enc2 = self._staging_record(
			"Encounter", self.enc_fhir_id, self.raw_encounter, self.norm_encounter
		)
		result = materialize_records([enc2])

		self.assertEqual(result["by_status"], {"Matched": 1})
		self.assertEqual(frappe.db.count("Patient", {"satusehat_ihs": self.ihs}), 1)
		self.assertEqual(
			frappe.db.count("Patient Encounter", {FHIR_ID_FIELD: self.enc_fhir_id}), 1
		)
