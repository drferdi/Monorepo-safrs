"""SmartHealth Link (Instalasi Modul SATUSEHAT): POST shl/get, fail-closed.

The link opens the patient's national medical record — the request body and the
returned link are never logged; failures raise a user-facing error instead of
returning a fabricated/partial link (clinical fail-closed rule).
"""

import os
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.satusehat import smarthealth

ENV = {
	"MANTRA_SATUSEHAT_ORG_ID": "100027810",
	"MANTRA_SATUSEHAT_CLIENT_ID": "test-client-id",
	"MANTRA_SATUSEHAT_CLIENT_SECRET": "test-client-secret-value",
	"MANTRA_SATUSEHAT_AUTH_URL": "https://example.invalid/oauth2/v1/accesstoken",
	"MANTRA_SATUSEHAT_FHIR_BASE": "https://example.invalid/fhir-r4/v1",
}


def _patient_doc(fields):
	doc = MagicMock()
	doc.get.side_effect = fields.get
	doc.name = fields.get("name", "RM-000001")
	return doc


class TestShlUrl(FrappeTestCase):
	def test_derived_from_fhir_base_host(self):
		with patch.dict(os.environ, ENV, clear=True):
			self.assertEqual(
				smarthealth._shl_url(),
				"https://example.invalid/ssrme/api-dto/v1/shl/get",
			)

	def test_env_override_wins(self):
		env = dict(ENV, MANTRA_SATUSEHAT_SHL_URL="https://api-stg.dto.example/ssrme/api-dto/v1/shl/get")
		with patch.dict(os.environ, env, clear=True):
			self.assertEqual(smarthealth._shl_url(), env["MANTRA_SATUSEHAT_SHL_URL"])


class TestPractitionerForUser(FrappeTestCase):
	def test_resolves_linked_practitioner_with_ihs(self):
		row = {"name": "HLC-PRAC-0001", "practitioner_name": "dr. Contoh", "satusehat_ihs": "10001234567"}
		with patch(
			"sentra_mantra_integrations.satusehat.smarthealth.frappe.get_all", return_value=[row]
		):
			result = smarthealth._practitioner_for_user("dokter@melinda.test")
		self.assertEqual(result["practitioner_name"], "dr. Contoh")
		self.assertEqual(result["satusehat_ihs"], "10001234567")

	def test_no_linked_practitioner_fails_closed(self):
		with patch(
			"sentra_mantra_integrations.satusehat.smarthealth.frappe.get_all", return_value=[]
		):
			with self.assertRaises(frappe.ValidationError):
				smarthealth._practitioner_for_user("bukan-dokter@melinda.test")

	def test_practitioner_without_ihs_fails_closed(self):
		row = {"name": "HLC-PRAC-0001", "practitioner_name": "dr. Contoh", "satusehat_ihs": None}
		with patch(
			"sentra_mantra_integrations.satusehat.smarthealth.frappe.get_all", return_value=[row]
		):
			with self.assertRaises(frappe.ValidationError):
				smarthealth._practitioner_for_user("dokter@melinda.test")


class TestGetLink(FrappeTestCase):
	PRACTITIONER = {
		"name": "HLC-PRAC-0001",
		"practitioner_name": "dr. Contoh",
		"satusehat_ihs": "10001234567",
	}

	def _call(self, patient_fields, api_response=None, api_side_effect=None):
		api_post = MagicMock()
		if api_side_effect:
			api_post.side_effect = api_side_effect
		else:
			api_post.return_value = api_response
		with (
			patch.dict(os.environ, ENV, clear=True),
			patch(
				"sentra_mantra_integrations.satusehat.smarthealth.frappe.get_doc",
				return_value=_patient_doc(patient_fields),
			),
			patch(
				"sentra_mantra_integrations.satusehat.smarthealth._practitioner_for_user",
				return_value=self.PRACTITIONER,
			),
			patch("sentra_mantra_integrations.satusehat.smarthealth.api_post", api_post),
		):
			result = smarthealth.get_link("RM-000001")
		return result, api_post

	def test_posts_full_identity_body_and_returns_link(self):
		result, api_post = self._call(
			{"name": "RM-000001", "patient_name": "Pasien Contoh", "satusehat_ihs": "P02029589317"},
			api_response={"success": True, "code": 200, "data": "https://satusehat.example/rekammedis/#shlink:abc"},
		)
		self.assertEqual(result, {"link": "https://satusehat.example/rekammedis/#shlink:abc"})
		url, body = api_post.call_args.args
		self.assertEqual(url, "https://example.invalid/ssrme/api-dto/v1/shl/get")
		self.assertEqual(
			body,
			{
				"patient_id": "P02029589317",
				"patient_name": "Pasien Contoh",
				"practitioner_id": "10001234567",
				"practitioner_name": "dr. Contoh",
				"organization_id": "100027810",
				"organization_name": smarthealth.DEFAULT_ORG_NAME,
			},
		)

	def test_patient_without_ihs_fails_closed_without_api_call(self):
		with self.assertRaises(frappe.ValidationError):
			self._call({"name": "RM-000001", "patient_name": "Pasien Contoh", "satusehat_ihs": None})

	def test_api_error_fails_closed(self):
		from sentra_mantra_integrations.satusehat.client import SatuSehatClientError

		with self.assertRaises(frappe.ValidationError):
			self._call(
				{"name": "RM-000001", "patient_name": "Pasien Contoh", "satusehat_ihs": "P1"},
				api_side_effect=SatuSehatClientError("rejected"),
			)

	def test_unsuccessful_response_fails_closed_never_partial_link(self):
		with self.assertRaises(frappe.ValidationError):
			self._call(
				{"name": "RM-000001", "patient_name": "Pasien Contoh", "satusehat_ihs": "P1"},
				api_response={"success": False, "code": 404, "data": None},
			)

	def test_unconfigured_fails_closed(self):
		with patch.dict(os.environ, {}, clear=True):
			with self.assertRaises(frappe.ValidationError):
				smarthealth.get_link("RM-000001")
