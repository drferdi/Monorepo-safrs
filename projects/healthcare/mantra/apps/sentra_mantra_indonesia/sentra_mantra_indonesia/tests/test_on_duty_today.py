"""Praktisi Bertugas panel — roster from Practitioner Schedule (K2)."""

from datetime import timedelta
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.ws_common import weekday_name
from sentra_mantra_indonesia.ws_klinik import data as klinik_data
from sentra_mantra_indonesia.ws_klinik import on_duty_today


def _other_weekday(day: str) -> str:
	days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
	return days[(days.index(day) + 1) % 7]


class TestOnDutyToday(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		self.today = weekday_name()
		self.other = _other_weekday(self.today)
		self.prefix = f"E2E-OD-{frappe.generate_hash(length=6)}"
		self._docs = []

		unit = frappe.db.get_value("Healthcare Service Unit", {}, "name")
		if not unit:
			self.skipTest("no Healthcare Service Unit fixture on site")
		self.unit = unit

		self.schedule = self._insert(
			{
				"doctype": "Practitioner Schedule",
				"schedule_name": f"{self.prefix}-SCH",
				"time_slots": [
					{
						"day": self.today,
						"from_time": timedelta(hours=8),
						"to_time": timedelta(hours=12),
					},
					{
						"day": self.other,
						"from_time": timedelta(hours=14),
						"to_time": timedelta(hours=16),
					},
				],
			}
		)

		self.prac = self._insert(
			{
				"doctype": "Healthcare Practitioner",
				"first_name": f"{self.prefix} Doc",
				"status": "Active",
				"practitioner_name": f"{self.prefix} Doc",
				"practitioner_schedules": [
					{"schedule": self.schedule, "service_unit": self.unit},
				],
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

	def _panel(self):
		payload = klinik_data()
		for panel in payload["panels"]:
			if panel["title"] == "Praktisi Bertugas":
				return panel
		self.fail("panel Praktisi Bertugas missing from ws_klinik.data()")

	def test_today_slot_selected_and_formatted(self):
		items = on_duty_today()
		mine = [i for i in items if i["title"] == f"{self.prefix} Doc"]
		self.assertEqual(len(mine), 1)
		self.assertEqual(mine[0]["right"], "08:00–12:00")
		# konsisten dengan kartu profil Beranda: sufiks abbr perusahaan dibuang
		self.assertEqual(mine[0]["sub"], self.unit.removesuffix(" - MEL"))
		# No Employee linked on this fixture → fallback Practitioner form route.
		self.assertEqual(mine[0]["route"], f"/app/healthcare-practitioner/{self.prac}")

	def test_route_uses_profil_karyawan_when_employee_linked(self):
		emp = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": f"{self.prefix} Linked",
				"gender": "Male",
				"date_of_birth": "1991-01-01",
				"date_of_joining": "2024-01-01",
				"company": "RSIA Melinda",
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		self._docs.append(("Employee", emp.name))
		frappe.db.set_value("Healthcare Practitioner", self.prac, "employee", emp.name)
		frappe.db.commit()

		mine = [i for i in on_duty_today() if i["title"] == f"{self.prefix} Doc"]
		self.assertEqual(len(mine), 1)
		self.assertEqual(mine[0]["route"], f"/app/profil-karyawan?emp={emp.name}")

	def test_other_day_slots_excluded(self):
		items = on_duty_today()
		rights = [i["right"] for i in items if i["title"] == f"{self.prefix} Doc"]
		self.assertEqual(rights, ["08:00–12:00"])
		self.assertNotIn("14:00–16:00", rights)

	def test_card_praktisi_bertugas_matches_panel(self):
		"""Kartu angka dan panel bernama sama harus memakai definisi yang sama:
		praktisi TERJADWAL hari ini (bukan praktisi ber-appointment)."""
		items = on_duty_today()
		expected = len({i["title"] for i in items})
		self.assertGreaterEqual(expected, 1)  # fixture setUp pasti terjadwal
		payload = klinik_data()
		card = next(
			(c for c in payload["cards"] if c["label"] == "Praktisi Bertugas"), None
		)
		self.assertIsNotNone(card, "kartu Praktisi Bertugas hilang")
		self.assertEqual(card["value"], expected)

	def test_no_permission_returns_empty_items(self):
		with patch("sentra_mantra_indonesia.ws_common.can", return_value=False):
			self.assertEqual(on_duty_today(), [])
			panel = self._panel()
			self.assertEqual(panel["items"], [])
			self.assertEqual(panel["empty"], "Belum ada jadwal praktik hari ini.")

	def test_empty_state_when_no_schedules(self):
		# Wipe today's slots from synthetic schedule — leave other day only.
		doc = frappe.get_doc("Practitioner Schedule", self.schedule)
		doc.set("time_slots", [s for s in doc.time_slots if s.day != self.today])
		doc.save(ignore_permissions=True)
		frappe.db.commit()

		mine = [i for i in on_duty_today() if i["title"] == f"{self.prefix} Doc"]
		self.assertEqual(mine, [])
		panel = self._panel()
		self.assertEqual(panel["empty"], "Belum ada jadwal praktik hari ini.")
		# Panel still present; empty message is for the renderer when items=[].
		self.assertIsInstance(panel["items"], list)
