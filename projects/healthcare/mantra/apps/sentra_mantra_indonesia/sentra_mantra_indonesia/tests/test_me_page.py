"""Profil Lengkap (/me): presence + tautan referensi kiri."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.www.me import _ref_links, get_context


class TestMePage(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_ref_links_include_core_institutions(self):
		links = _ref_links("umum", False)
		labels = [r["label"] for r in links]
		for required in (
			"RSIA Melinda DHAI",
			"Sentra Healthcare Artificial Intelligence",
			"Satu Sehat Indonesia",
			"Edit Profil Publik",
		):
			self.assertIn(required, labels)
		self.assertNotIn("Laporan Berkala", labels)
		self.assertNotIn("Akun Saya", labels)
		self.assertNotIn("Appointment Hari Ini", labels)

	def test_ref_links_clinical_extras_for_nakes(self):
		labels = [r["label"] for r in _ref_links("clinical", True)]
		self.assertIn("Appointment Hari Ini", labels)
		self.assertIn("Konsil Kedokteran Indonesia", labels)
		self.assertIn("BPJS Kesehatan", labels)
		self.assertIn("Direktori Karyawan", labels)

	def test_ref_links_chief_includes_pelaporan(self):
		labels = [r["label"] for r in _ref_links("chief", False)]
		self.assertIn("Pelaporan RSIA", labels)

	def test_get_context_includes_presence(self):
		frappe.set_user("Administrator")
		ctx = frappe._dict()
		get_context(ctx)
		self.assertIn("presence", ctx.rsia_profile)
		self.assertIsInstance(ctx.rsia_profile["presence"], list)
		self.assertTrue(ctx.rsia_refs)
		self.assertEqual(ctx.rsia_refs[0]["label"], "RSIA Melinda DHAI")
