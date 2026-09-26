"""Identity resolution (REVISION 01): match-first, create-with-stable-key, fail-closed.

Synthetic identifiers only. frappe meta/db lookups are mocked so no real
Patient data is touched.
"""

import json
from unittest.mock import MagicMock, patch

from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.satusehat_intake.identity import (
	IMPORT_PRACTITIONER_NAME,
	STAGING_RECORD,
	ensure_import_practitioner,
	resolve_patient,
)

SYNTHETIC_PATIENT_RAW = {
	"resourceType": "Patient",
	"id": "ihs-1",
	"identifier": [
		{"system": "https://fhir.kemkes.go.id/id/ihs-number", "value": "ihs-1"},
		{"system": "https://fhir.kemkes.go.id/id/nik", "value": "9999999999999999"},
	],
	"name": [{"text": "Pasien Sintetis"}],
	"gender": "female",
	"birthDate": "1990-01-01",
}


def _meta_with_fields(present: bool):
	meta = MagicMock()
	meta.get_field.return_value = object() if present else None
	return meta


def _get_all_dispatch(patient_by_ihs=(), patient_by_nik=(), staged=()):
	"""Route identity.py's frappe.get_all calls by doctype + filter shape."""

	def side_effect(doctype, filters=None, **kwargs):
		filters = filters or {}
		if doctype == STAGING_RECORD:
			return list(staged)
		if doctype == "Patient":
			if "satusehat_ihs" in filters:
				return list(patient_by_ihs)
			if "satusehat_nik" in filters:
				return list(patient_by_nik)
		raise AssertionError(f"unexpected get_all: {doctype} {filters}")

	return side_effect


def _staged_doc(raw=SYNTHETIC_PATIENT_RAW):
	doc = MagicMock()
	doc.raw_fhir_json = json.dumps(raw)
	return doc


class TestResolvePatient(FrappeTestCase):
	def _frappe(self):
		return patch("sentra_mantra_hospital.satusehat_intake.identity.frappe")

	def test_missing_subject_ref_fails_closed(self):
		name, reason = resolve_patient(None)
		self.assertIsNone(name)
		self.assertEqual(reason, "no_subject_ref")

	def test_missing_identity_fields_fail_closed(self):
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(False)
			name, reason = resolve_patient("Patient/ihs-1")
		self.assertIsNone(name)
		self.assertEqual(reason, "no_identity_field")

	def test_exactly_one_ihs_match_resolves(self):
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(patient_by_ihs=["RM-000001"])
			name, reason = resolve_patient("Patient/ihs-1")
		self.assertEqual(name, "RM-000001")
		self.assertEqual(reason, "matched")

	def test_ambiguous_ihs_matches_fail_closed(self):
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(
				patient_by_ihs=["RM-000001", "RM-000002"]
			)
			name, reason = resolve_patient("Patient/ihs-dup")
		self.assertIsNone(name)
		self.assertEqual(reason, "ambiguous")

	def test_nik_fallback_match_backfills_ihs(self):
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(
				staged=["SS-REC-1"], patient_by_nik=["RM-000003"]
			)
			mock_frappe.get_doc.return_value = _staged_doc()
			mock_frappe.db.get_value.return_value = None  # no IHS bound yet
			name, reason = resolve_patient("Patient/ihs-1")
			mock_frappe.db.set_value.assert_called_once_with(
				"Patient", "RM-000003", "satusehat_ihs", "ihs-1", update_modified=False
			)
		self.assertEqual(name, "RM-000003")
		self.assertEqual(reason, "matched")

	def test_nik_match_with_conflicting_ihs_fails_closed_never_merges(self):
		# Real-world dirty data: many distinct IHS identities sharing one NIK
		# (observed in Melinda's production SATUSEHAT records). Silently
		# rebinding would collapse two people into one Patient.
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(
				staged=["SS-REC-1"], patient_by_nik=["RM-000003"]
			)
			mock_frappe.get_doc.return_value = _staged_doc()
			mock_frappe.db.get_value.return_value = "ihs-other"  # already another identity
			name, reason = resolve_patient("Patient/ihs-1")
			mock_frappe.db.set_value.assert_not_called()
		self.assertIsNone(name)
		self.assertEqual(reason, "ambiguous")

	def test_no_staged_patient_resource_fails_closed_no_create(self):
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch()
			name, reason = resolve_patient("Patient/ihs-unstaged")
			created = [c for c in mock_frappe.get_doc.call_args_list if isinstance(c.args[0], dict)]
		self.assertIsNone(name)
		self.assertEqual(reason, "no_patient_resource")
		self.assertEqual(created, [])

	def test_no_match_creates_patient_tagged_satusehat(self):
		def get_doc(arg, *args):
			if isinstance(arg, dict):
				doc = MagicMock()
				doc.name = "RM-NEW"
				get_doc.created = arg
				return doc
			return _staged_doc()

		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(staged=["SS-REC-1"])
			mock_frappe.get_doc.side_effect = get_doc
			name, reason = resolve_patient("Patient/ihs-1")

		self.assertEqual(name, "RM-NEW")
		self.assertEqual(reason, "created")
		self.assertEqual(get_doc.created["doctype"], "Patient")
		self.assertEqual(get_doc.created["first_name"], "Pasien Sintetis")
		self.assertEqual(get_doc.created["sex"], "Female")
		self.assertEqual(get_doc.created["dob"], "1990-01-01")
		self.assertEqual(get_doc.created["satusehat_ihs"], "ihs-1")
		self.assertEqual(get_doc.created["satusehat_nik"], "9999999999999999")
		self.assertEqual(get_doc.created["patient_source"], "SATUSEHAT")

	def test_incomplete_demographics_fail_closed(self):
		incomplete = {**SYNTHETIC_PATIENT_RAW, "gender": "unknown"}
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(staged=["SS-REC-1"])
			mock_frappe.get_doc.return_value = _staged_doc(incomplete)
			name, reason = resolve_patient("Patient/ihs-1")
		self.assertIsNone(name)
		self.assertEqual(reason, "missing_patient_sex")

	def test_falls_back_to_normalized_subject_ref(self):
		with self._frappe() as mock_frappe:
			mock_frappe.get_meta.return_value = _meta_with_fields(True)
			mock_frappe.get_all.side_effect = _get_all_dispatch(patient_by_ihs=["RM-000004"])
			name, reason = resolve_patient(None, {"subject_ref": "Patient/ihs-4"})
		self.assertEqual(name, "RM-000004")
		self.assertEqual(reason, "matched")


class TestEnsureImportPractitioner(FrappeTestCase):
	def test_existing_placeholder_is_reused_not_recreated(self):
		with patch("sentra_mantra_hospital.satusehat_intake.identity.frappe") as mock_frappe:
			mock_frappe.get_all.return_value = ["HLC-PRAC-0009"]
			name = ensure_import_practitioner()
			mock_frappe.get_doc.assert_not_called()
		self.assertEqual(name, "HLC-PRAC-0009")

	def test_absent_placeholder_created_once_disabled(self):
		with patch("sentra_mantra_hospital.satusehat_intake.identity.frappe") as mock_frappe:
			mock_frappe.get_all.return_value = []
			doc = MagicMock()
			doc.name = "HLC-PRAC-0010"
			mock_frappe.get_doc.return_value = doc
			name = ensure_import_practitioner()
			payload = mock_frappe.get_doc.call_args.args[0]
		self.assertEqual(name, "HLC-PRAC-0010")
		self.assertEqual(payload["first_name"], IMPORT_PRACTITIONER_NAME)
		self.assertEqual(payload["status"], "Disabled")
		doc.insert.assert_called_once_with(ignore_permissions=True)
