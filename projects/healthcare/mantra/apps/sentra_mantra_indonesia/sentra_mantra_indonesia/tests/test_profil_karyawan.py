"""Profil Karyawan directory page — safe-field payload only (K6)."""

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

# Keys that must never appear in the directory payload (PHI/PII / HR-sensitive).
FORBIDDEN = (
	"date_of_birth",
	"dob",
	"nik",
	"passport_number",
	"cell_number",
	"personal_email",
	"company_email",
	"current_address",
	"permanent_address",
	"salary",
	"ctc",
	"bank_ac_no",
	"iban",
	"marital_status",
	"blood_group",
	"family_background",
	"health_details",
)


class TestProfilKaryawan(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		self.prefix = f"E2E-PK-{frappe.generate_hash(length=6)}"
		self._docs = []

		self.emp_plain = self._insert(
			{
				"doctype": "Employee",
				"first_name": f"{self.prefix} Staff",
				"gender": "Female",
				"date_of_birth": "1992-02-02",
				"date_of_joining": "2024-01-01",
				"company": "RSIA Melinda",
				"status": "Active",
				"designation": "Bidan",
				"current_address": "Jl. Rahasia 1",
				"cell_number": "08123456789",
			}
		)

		self.emp_clin = self._insert(
			{
				"doctype": "Employee",
				"first_name": f"{self.prefix} Klinis",
				"gender": "Male",
				"date_of_birth": "1988-03-03",
				"date_of_joining": "2023-01-01",
				"company": "RSIA Melinda",
				"status": "Active",
				"designation": "Dokter Umum",
			}
		)
		self.prac = self._insert(
			{
				"doctype": "Healthcare Practitioner",
				"first_name": f"{self.prefix} Klinis",
				"practitioner_name": f"{self.prefix} Klinis",
				"status": "Active",
				"employee": self.emp_clin,
				"str_no": "STR-E2E-1",
				"sip_no": "SIP-E2E-1",
				"str_expiry": add_days(today(), 30),
				"sip_expiry": add_days(today(), 120),
			}
		)

	def tearDown(self):
		frappe.set_user("Administrator")
		for doctype, name in reversed(self._docs):
			if frappe.db.exists(doctype, name):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()
		super().tearDown()

	def _insert(self, payload):
		doc = frappe.get_doc(payload)
		doc.insert(ignore_permissions=True)
		self._docs.append((doc.doctype, doc.name))
		frappe.db.commit()
		return doc.name

	def _assert_no_forbidden(self, payload):
		keys = set(payload.keys())
		for key in FORBIDDEN:
			self.assertNotIn(key, keys)
		# nested values must not smuggle DOB/NIK either
		blob = frappe.as_json(payload)
		self.assertNotIn("1992-02-02", blob)
		self.assertNotIn("08123456789", blob)
		self.assertNotIn("Jl. Rahasia", blob)

	def test_plain_employee_directory_fields_without_credentials(self):
		from sentra_mantra_indonesia.profil_karyawan import data

		frappe.set_user("Administrator")
		out = data(self.emp_plain)
		self.assertEqual(out["employee"], self.emp_plain)
		self.assertIn("name_main", out)
		self.assertIn("designation", out)
		self.assertIn("department", out)
		self.assertIn("branch", out)
		self.assertIn("status", out)
		self.assertIn("rank_badge", out)
		self.assertFalse(out.get("is_clinical"))
		self.assertNotIn("str_no", out)
		self.assertNotIn("sip_no", out)
		self._assert_no_forbidden(out)

	def test_clinical_employee_includes_str_sip_status(self):
		from sentra_mantra_indonesia.profil_karyawan import data

		frappe.set_user("Administrator")
		out = data(self.emp_clin)
		self.assertTrue(out.get("is_clinical"))
		self.assertEqual(out.get("str_no"), "STR-E2E-1")
		self.assertEqual(out.get("sip_no"), "SIP-E2E-1")
		self.assertIn("hari lagi", out.get("str_status") or "")
		self.assertIn("Berlaku s.d.", out.get("sip_status") or "")
		self._assert_no_forbidden(out)

	def test_missing_employee_throws_cleanly(self):
		from sentra_mantra_indonesia.profil_karyawan import data

		frappe.set_user("Administrator")
		with self.assertRaises(frappe.ValidationError):
			data("EMP-DOES-NOT-EXIST-K6")

	def test_guest_rejected(self):
		from sentra_mantra_indonesia.profil_karyawan import data

		frappe.set_user("Guest")
		with self.assertRaises((frappe.PermissionError, frappe.AuthenticationError, frappe.ValidationError)):
			data(self.emp_plain)

	def test_forbidden_keys_never_in_payload(self):
		from sentra_mantra_indonesia.profil_karyawan import data

		frappe.set_user("Administrator")
		for emp in (self.emp_plain, self.emp_clin):
			self._assert_no_forbidden(data(emp))

	def test_presence_links_from_user_details(self):
		"""Profil Publik already saved on User must appear for directory viewers."""
		from sentra_mantra_indonesia.profil_karyawan import data

		email = f"{self.prefix.lower()}@mantra.test"
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": self.prefix,
				"send_welcome_email": 0,
				"user_type": "System User",
			}
		).insert(ignore_permissions=True)
		self._docs.append(("User", user.name))
		user.append(
			"sentra_profil_links",
			{"platform": "Website", "label": "contoh.id", "url": "https://contoh.id/pk"},
		)
		user.append(
			"sentra_profil_links",
			{"platform": "ORCID", "label": "orcid", "url": "https://orcid.org/0000-0000-0000-0000"},
		)
		user.save(ignore_permissions=True)
		frappe.db.set_value("Employee", self.emp_plain, "user_id", email)
		frappe.db.commit()

		frappe.set_user("Administrator")
		out = data(self.emp_plain)
		self.assertEqual([p["platform"] for p in out["presence"]], ["Website", "ORCID"])
		self.assertEqual(out["presence"][0]["url"], "https://contoh.id/pk")
		self._assert_no_forbidden(out)
