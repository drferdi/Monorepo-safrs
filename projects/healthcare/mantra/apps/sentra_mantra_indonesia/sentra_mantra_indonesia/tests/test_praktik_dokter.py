"""Jadwal praktik dokter (flyer Chief 17 Jul) — sync idempoten."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.praktik_dokter import SCHEDULES, sync


class TestPraktikDokter(FrappeTestCase):
	def test_sync_creates_schedules_and_attaches_to_practitioner(self):
		out = sync(commit=False)
		for sched_name, spec in SCHEDULES.items():
			self.assertTrue(
				frappe.db.exists("Practitioner Schedule", sched_name), sched_name
			)
			days = frappe.get_all(
				"Healthcare Schedule Time Slot",
				filters={"parent": sched_name, "parenttype": "Practitioner Schedule"},
				fields=["day", "from_time", "to_time"],
			)
			self.assertEqual(
				sorted(d.day for d in days), sorted(d[0] for d in spec["slots"])
			)
			prac = frappe.db.get_value(
				"Healthcare Practitioner",
				{"practitioner_name": spec["practitioner_name"]},
			)
			self.assertTrue(prac, spec["practitioner_name"])
			self.assertTrue(
				frappe.db.exists(
					"Practitioner Service Unit Schedule",
					{"parent": prac, "schedule": sched_name, "service_unit": spec["service_unit"]},
				)
			)
		self.assertFalse(out.get("skipped"), out.get("skipped"))

	def test_sync_idempotent(self):
		sync(commit=False)
		slot_count = frappe.db.count(
			"Healthcare Schedule Time Slot", {"parenttype": "Practitioner Schedule"}
		)
		sync(commit=False)
		self.assertEqual(
			frappe.db.count(
				"Healthcare Schedule Time Slot", {"parenttype": "Practitioner Schedule"}
			),
			slot_count,
		)
