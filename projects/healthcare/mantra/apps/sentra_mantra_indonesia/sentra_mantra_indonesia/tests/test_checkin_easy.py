"""Check-in desk satu tombol → Employee Checkin + timestamp."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.checkin_easy import punch, status


class TestCheckinEasy(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.prefix = f"CKN-{frappe.generate_hash(length=6)}"
		self.email = f"{self.prefix.lower()}@mantra.test"
		self._docs = []
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": self.email,
				"first_name": self.prefix,
				"send_welcome_email": 0,
				"user_type": "System User",
			}
		).insert(ignore_permissions=True)
		self._docs.append(("User", user.name))
		emp = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": self.prefix,
				"gender": "Male",
				"date_of_birth": "1990-01-01",
				"date_of_joining": "2020-01-01",
				"status": "Active",
				"user_id": self.email,
			}
		).insert(ignore_permissions=True)
		self._docs.append(("Employee", emp.name))
		self.emp = emp.name
		frappe.db.commit()

	def tearDown(self):
		frappe.set_user("Administrator")
		for ck in frappe.get_all("Employee Checkin", filters={"employee": self.emp}, pluck="name"):
			frappe.delete_doc("Employee Checkin", ck, force=1, ignore_permissions=True)
		for dt, name in reversed(self._docs):
			if frappe.db.exists(dt, name):
				frappe.delete_doc(dt, name, force=1, ignore_permissions=True)
		super().tearDown()

	def test_guest_rejected(self):
		frappe.set_user("Guest")
		with self.assertRaises(frappe.PermissionError):
			status()

	def test_punch_in_then_out(self):
		frappe.set_user(self.email)
		st = status()
		self.assertTrue(st["ok"])
		self.assertEqual(st["next_type"], "IN")

		a = punch()
		self.assertEqual(a["log_type"], "IN")
		self.assertTrue(a["time"])
		self.assertEqual(a["next_type"], "OUT")
		self.assertTrue(a.get("attendance"))
		self.assertEqual(
			frappe.db.count("Attendance", {"employee": self.emp, "status": "Present"}),
			1,
		)

		b = punch()
		self.assertEqual(b["log_type"], "OUT")
		self.assertEqual(b["next_type"], "IN")

		n = frappe.db.count("Employee Checkin", {"employee": self.emp})
		self.assertEqual(n, 2)

	def test_cannot_punch_without_employee_link(self):
		email = f"nolink-{self.prefix.lower()}@mantra.test"
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": "NoLink",
				"send_welcome_email": 0,
				"user_type": "System User",
			}
		).insert(ignore_permissions=True)
		self._docs.append(("User", user.name))
		frappe.set_user(email)
		st = status()
		self.assertFalse(st["ok"])
		self.assertEqual(st["reason"], "no_employee")
