"""SATUSEHAT Patient resource: reference parsing + fetch-by-id error handling.

All HTTP is mocked via the already-tested `client.fhir_get` boundary — no
network access, no real credentials, no PHI (fixture values are synthetic).
"""

from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_integrations.satusehat import client
from sentra_mantra_integrations.satusehat.resources import patient


class TestPatientIdFromReference(TestCase):
	def test_valid_patient_reference(self):
		self.assertEqual(patient.patient_id_from_reference("Patient/P123456"), "P123456")

	def test_none_reference_returns_none(self):
		self.assertIsNone(patient.patient_id_from_reference(None))

	def test_empty_string_returns_none(self):
		self.assertIsNone(patient.patient_id_from_reference(""))

	def test_no_slash_returns_none(self):
		self.assertIsNone(patient.patient_id_from_reference("P123456"))

	def test_wrong_resource_type_returns_none(self):
		# subject_ref could point at something other than Patient in a
		# malformed upstream resource — must not be treated as a patient id.
		self.assertIsNone(patient.patient_id_from_reference("Encounter/E9"))

	def test_trailing_slash_with_empty_tail_returns_none(self):
		self.assertIsNone(patient.patient_id_from_reference("Patient/"))

	def test_whitespace_only_tail_returns_none(self):
		self.assertIsNone(patient.patient_id_from_reference("Patient/   "))


class TestFetchById(TestCase):
	def test_successful_fetch_returns_raw_fhir_body(self):
		fake_patient = {"resourceType": "Patient", "id": "P123456", "name": [{"text": "Synthetic Test"}]}
		with patch(
			"sentra_mantra_integrations.satusehat.resources.patient.fhir_get",
			return_value=fake_patient,
		) as fhir_get:
			result = patient.fetch_by_id("P123456")
		self.assertEqual(result, fake_patient)
		fhir_get.assert_called_once_with("Patient/P123456")

	def test_client_error_returns_none_instead_of_raising(self):
		"""A missing/rejected Patient must not abort the encounter pull
		(outbox discipline) — identity.resolve_patient handles the None case
		by failing closed to Conflict, never by crashing the reader."""
		with patch(
			"sentra_mantra_integrations.satusehat.resources.patient.fhir_get",
			side_effect=client.SatuSehatClientError("not found"),
		):
			result = patient.fetch_by_id("P_DOES_NOT_EXIST")
		self.assertIsNone(result)
