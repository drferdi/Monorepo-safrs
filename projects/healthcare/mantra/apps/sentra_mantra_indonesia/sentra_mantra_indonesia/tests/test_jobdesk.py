"""Jobdesk RSIA: prefix match + payload untuk modal /me."""

from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.jobdesk import get_jobdesk
from sentra_mantra_indonesia.presence_icons import icon_for


class TestJobdesk(FrappeTestCase):
	def test_direktur_utama_has_maternal_scope(self):
		jd = get_jobdesk("Direktur Utama")
		self.assertEqual(jd["title"], "Direktur Utama")
		self.assertTrue(jd["duties"])
		self.assertIn("ibu", jd["summary"].lower() + jd["scope"].lower())

	def test_wadir_prefix_match(self):
		jd = get_jobdesk("WADIR Keuangan")
		self.assertEqual(jd["title"], "Wakil Direktur")
		self.assertEqual(jd["designation"], "WADIR Keuangan")

	def test_unknown_designation_returns_generic(self):
		jd = get_jobdesk("Analis Laboratorium")
		self.assertTrue(jd.get("generic"))
		self.assertIn("Analis Laboratorium", jd["title"])

	def test_presence_icon_known_platforms(self):
		self.assertTrue(icon_for("ORCID").startswith("M12"))
		self.assertEqual(icon_for("Unknown"), icon_for("Website"))
