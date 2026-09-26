"""Materializer: idempotency, Conflict/Failed isolation, Pending child, status write-back.

Synthetic data only. The integrations staging DocTypes are accessed via string
names (they are installed on the same site); identity resolution is mocked so
no real Patient matching runs. Requires the satusehat_fhir_id Custom Field
patch (bench migrate) — tests run in-container post-migrate.
"""

import json
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.satusehat_intake.materializer import (
	FHIR_ID_FIELD,
	STAGING_RECORD,
	materialize_records,
)

STAGING_BATCH = "SATUSEHAT Sync Batch"

SYNTHETIC_ENCOUNTER_RAW = {
	"resourceType": "Encounter",
	"id": "enc-mat-1",
	"status": "finished",
	"subject": {"reference": "Patient/ihs-synthetic-1"},
	"participant": [
		{"individual": {"reference": "Practitioner/ihs-doc-1", "display": "dr. Sintetis"}}
	],
	"period": {"start": "2026-01-05T08:00:00+07:00"},
}
SYNTHETIC_ENCOUNTER_NORMALIZED = {
	"fhir_id": "enc-mat-1",
	"resource_type": "Encounter",
	"status": "finished",
	"period_start": "2026-01-05T08:00:00+07:00",
	"subject_ref": "Patient/ihs-synthetic-1",
}


class TestMaterializer(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		self.prefix = f"SSMAT-{frappe.generate_hash(length=6)}"
		self._docs = []

		patient = frappe.get_doc(
			{"doctype": "Patient", "first_name": f"{self.prefix} Pasien", "sex": "Female"}
		).insert(ignore_permissions=True)
		self._docs.append(("Patient", patient.name))
		self.patient = patient.name

		prac = frappe.get_doc(
			{
				"doctype": "Healthcare Practitioner",
				"first_name": f"{self.prefix} Dokter",
				"practitioner_name": f"{self.prefix} Dokter",
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		self._docs.append(("Healthcare Practitioner", prac.name))
		self.practitioner = prac.name

		batch = frappe.get_doc(
			{
				"doctype": STAGING_BATCH,
				"org_id": "100027810",
				"resource_type": "Encounter",
				"capture_mode": "Resources",
				"status": "Completed",
			}
		).insert(ignore_permissions=True)
		self._docs.append((STAGING_BATCH, batch.name))
		self.batch = batch.name

	def tearDown(self):
		frappe.set_user("Administrator")
		for doctype in ("Patient Encounter", "Vital Signs"):
			for name in frappe.get_all(
				doctype, filters={FHIR_ID_FIELD: ("like", "enc-mat-%")}, pluck="name"
			):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		for name in frappe.get_all(STAGING_RECORD, filters={"batch": self.batch}, pluck="name"):
			frappe.delete_doc(STAGING_RECORD, name, force=True, ignore_permissions=True)
		for doctype, name in reversed(self._docs):
			if frappe.db.exists(doctype, name):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		super().tearDown()

	def _staging_record(self, resource_type, fhir_id, raw, normalized, **overrides):
		doc = frappe.get_doc(
			{
				"doctype": STAGING_RECORD,
				"batch": self.batch,
				"resource_type": resource_type,
				"fhir_id": fhir_id,
				"subject_ref": normalized.get("subject_ref"),
				"encounter_ref": normalized.get("encounter_ref"),
				"pulled_at": frappe.utils.now_datetime(),
				"raw_fhir_json": json.dumps(raw),
				"normalized_json": json.dumps(normalized),
				"payload_hash": frappe.generate_hash(length=16),
				"validation_status": "Pending",
				"mapping_status": "New",
				**overrides,
			}
		).insert(ignore_permissions=True)
		return doc.name

	def _identity_patches(self):
		return (
			patch(
				"sentra_mantra_hospital.satusehat_intake.materializer.identity.resolve_patient",
				return_value=(self.patient, "matched"),
			),
			patch(
				"sentra_mantra_hospital.satusehat_intake.materializer.identity.ensure_import_practitioner",
				return_value=self.practitioner,
			),
		)

	def test_encounter_materializes_and_writes_status_back(self):
		record = self._staging_record(
			"Encounter", "enc-mat-1", SYNTHETIC_ENCOUNTER_RAW, SYNTHETIC_ENCOUNTER_NORMALIZED
		)
		p1, p2 = self._identity_patches()
		with p1, p2:
			result = materialize_records([record])

		self.assertEqual(result["by_status"], {"Matched": 1})
		row = frappe.db.get_value(
			STAGING_RECORD, record,
			["mapping_status", "target_doctype", "target_name"], as_dict=True,
		)
		self.assertEqual(row.mapping_status, "Matched")
		self.assertEqual(row.target_doctype, "Patient Encounter")
		pe = frappe.get_doc("Patient Encounter", row.target_name)
		self.assertEqual(pe.patient, self.patient)
		self.assertEqual(pe.get(FHIR_ID_FIELD), "enc-mat-1")
		self.assertEqual(pe.docstatus, 0)  # draft — human review before submit
		# DECISION B: real attribution preserved for a future remap wave
		self.assertEqual(pe.get("satusehat_practitioner_ihs"), "ihs-doc-1")
		self.assertEqual(pe.get("satusehat_practitioner_name"), "dr. Sintetis")

	def test_double_run_never_duplicates(self):
		r1 = self._staging_record(
			"Encounter", "enc-mat-1", SYNTHETIC_ENCOUNTER_RAW, SYNTHETIC_ENCOUNTER_NORMALIZED
		)
		p1, p2 = self._identity_patches()
		with p1, p2:
			materialize_records([r1])
			# same record again -> skipped (already Matched)
			second = materialize_records([r1])
			# a NEW staging record with the SAME fhir_id -> update-in-place, no dup
			r2 = self._staging_record(
				"Encounter", "enc-mat-1", SYNTHETIC_ENCOUNTER_RAW, SYNTHETIC_ENCOUNTER_NORMALIZED
			)
			materialize_records([r2])

		self.assertTrue(second["results"][0].get("skipped"))
		count = frappe.db.count("Patient Encounter", {FHIR_ID_FIELD: "enc-mat-1"})
		self.assertEqual(count, 1)

	def test_unresolved_identity_fails_closed_to_conflict(self):
		record = self._staging_record(
			"Encounter", "enc-mat-2", SYNTHETIC_ENCOUNTER_RAW,
			{**SYNTHETIC_ENCOUNTER_NORMALIZED, "fhir_id": "enc-mat-2"},
		)
		with patch(
			"sentra_mantra_hospital.satusehat_intake.materializer.identity.resolve_patient",
			return_value=(None, "no_patient_resource"),
		):
			result = materialize_records([record])

		self.assertEqual(result["by_status"], {"Conflict": 1})
		row = frappe.db.get_value(
			STAGING_RECORD, record, ["mapping_status", "error_message"], as_dict=True
		)
		self.assertEqual(row.mapping_status, "Conflict")
		self.assertEqual(row.error_message, "patient not staged (Resources mode Patient pull required)")
		self.assertEqual(frappe.db.count("Patient Encounter", {FHIR_ID_FIELD: "enc-mat-2"}), 0)

	def test_bad_record_is_isolated_and_rest_continue(self):
		bad = self._staging_record(
			"Encounter", "enc-mat-3", SYNTHETIC_ENCOUNTER_RAW,
			SYNTHETIC_ENCOUNTER_NORMALIZED, normalized_json="{not valid json",
		)
		good = self._staging_record(
			"Encounter", "enc-mat-4", SYNTHETIC_ENCOUNTER_RAW,
			{**SYNTHETIC_ENCOUNTER_NORMALIZED, "fhir_id": "enc-mat-4"},
		)
		p1, p2 = self._identity_patches()
		with p1, p2:
			result = materialize_records([bad, good])

		self.assertEqual(result["by_status"], {"Failed": 1, "Matched": 1})
		self.assertEqual(frappe.db.get_value(STAGING_RECORD, bad, "mapping_status"), "Failed")
		self.assertEqual(frappe.db.get_value(STAGING_RECORD, good, "mapping_status"), "Matched")

	def test_child_without_parent_encounter_goes_back_to_pending(self):
		record = self._staging_record(
			"Condition", "cond-mat-1",
			{"resourceType": "Condition", "id": "cond-mat-1"},
			{
				"fhir_id": "cond-mat-1",
				"code_value": "J45.9",
				"code_display": "Asthma",
				"subject_ref": "Patient/ihs-synthetic-1",
				"encounter_ref": "Encounter/enc-not-materialized",
			},
		)
		result = materialize_records([record])

		self.assertEqual(result["by_status"], {"Pending": 1})
		row = frappe.db.get_value(
			STAGING_RECORD, record, ["mapping_status", "error_message"], as_dict=True
		)
		self.assertEqual(row.mapping_status, "Pending")
		self.assertEqual(row.error_message, "awaiting parent encounter")

	def test_condition_attaches_diagnosis_to_materialized_encounter(self):
		enc = self._staging_record(
			"Encounter", "enc-mat-1", SYNTHETIC_ENCOUNTER_RAW, SYNTHETIC_ENCOUNTER_NORMALIZED
		)
		cond = self._staging_record(
			"Condition", "cond-mat-2",
			{"resourceType": "Condition", "id": "cond-mat-2"},
			{
				"fhir_id": "cond-mat-2",
				"code_value": "J45.9",
				"code_display": "Asthma",
				"subject_ref": "Patient/ihs-synthetic-1",
				"encounter_ref": "Encounter/enc-mat-1",
			},
		)
		p1, p2 = self._identity_patches()
		with p1, p2:
			result = materialize_records([enc, cond])
			# re-run the condition -> no duplicate diagnosis row
			cond2 = self._staging_record(
				"Condition", "cond-mat-2",
				{"resourceType": "Condition", "id": "cond-mat-2"},
				{
					"fhir_id": "cond-mat-2",
					"code_value": "J45.9",
					"code_display": "Asthma",
					"subject_ref": "Patient/ihs-synthetic-1",
					"encounter_ref": "Encounter/enc-mat-1",
				},
			)
			materialize_records([cond2])

		self.assertEqual(result["by_status"], {"Matched": 2})
		pe_name = frappe.db.get_value("Patient Encounter", {FHIR_ID_FIELD: "enc-mat-1"})
		pe = frappe.get_doc("Patient Encounter", pe_name)
		rows = [d for d in pe.get("diagnosis") or [] if d.diagnosis == "J45.9 - Asthma"]
		self.assertEqual(len(rows), 1)

	def test_diagnosis_dedup_keys_on_code_not_display(self):
		code = f"{self.prefix}.9"
		existing = frappe.get_doc(
			{"doctype": "Diagnosis", "diagnosis": f"{code} - Asma"}
		).insert(ignore_permissions=True)
		self._docs.append(("Diagnosis", existing.name))

		enc = self._staging_record(
			"Encounter", "enc-mat-1", SYNTHETIC_ENCOUNTER_RAW, SYNTHETIC_ENCOUNTER_NORMALIZED
		)
		cond = self._staging_record(
			"Condition", "cond-mat-3",
			{"resourceType": "Condition", "id": "cond-mat-3"},
			{
				"fhir_id": "cond-mat-3",
				"code_value": code,
				"code_display": "Asthma",  # different display, same ICD-10 code
				"subject_ref": "Patient/ihs-synthetic-1",
				"encounter_ref": "Encounter/enc-mat-1",
			},
		)
		p1, p2 = self._identity_patches()
		with p1, p2:
			result = materialize_records([enc, cond])

		self.assertEqual(result["by_status"], {"Matched": 2})
		# the pre-existing code-keyed master is reused; no display-keyed twin
		self.assertFalse(frappe.db.exists("Diagnosis", f"{code} - Asthma"))
		pe_name = frappe.db.get_value("Patient Encounter", {FHIR_ID_FIELD: "enc-mat-1"})
		pe = frappe.get_doc("Patient Encounter", pe_name)
		rows = [d for d in pe.get("diagnosis") or [] if d.diagnosis == f"{code} - Asma"]
		self.assertEqual(len(rows), 1)

	def test_pending_excludes_patient_identity_rows(self):
		# Staged Patient bodies exist only as an identity source for
		# resolve_patient — they are never materialization targets, so
		# _pending must not feed them into the dispatch (which would mark
		# them Conflict "unsupported resource type" and pollute human review).
		from sentra_mantra_hospital.satusehat_intake.materializer import _pending

		self._staging_record(
			"Patient", "ihs-synthetic-1",
			{"resourceType": "Patient", "id": "ihs-synthetic-1"}, {},
		)
		enc = self._staging_record(
			"Encounter", "enc-mat-5", SYNTHETIC_ENCOUNTER_RAW,
			{**SYNTHETIC_ENCOUNTER_NORMALIZED, "fhir_id": "enc-mat-5"},
		)
		self.assertEqual(_pending(50, self.batch), [enc])

	def test_medication_request_fails_closed_in_v1(self):
		record = self._staging_record(
			"MedicationRequest", "med-mat-1",
			{"resourceType": "MedicationRequest", "id": "med-mat-1"},
			{"fhir_id": "med-mat-1", "subject_ref": "Patient/ihs-synthetic-1"},
		)
		result = materialize_records([record])
		self.assertEqual(result["by_status"], {"Conflict": 1})
