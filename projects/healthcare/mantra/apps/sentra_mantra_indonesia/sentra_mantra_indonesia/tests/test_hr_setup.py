"""Holiday list manajemen: Sabtu + Minggu + libur nasional (Chief 17 Jul)."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.hr_setup import (
	MANAGEMENT_HOLIDAY_LIST,
	ensure_management_holiday_list,
)


class TestManagementHolidayList(FrappeTestCase):
	def test_creates_list_with_saturday_and_sunday_weekly_off(self):
		ensure_management_holiday_list()
		self.assertTrue(frappe.db.exists("Holiday List", MANAGEMENT_HOLIDAY_LIST))
		# 2026: 52 Sabtu + 52 Minggu (4 Jul & 5 Jul dst. tidak dobel dengan
		# libur nasional) + 17 libur nasional + cuti bersama — minimal >100
		days = frappe.get_all(
			"Holiday",
			filters={"parent": MANAGEMENT_HOLIDAY_LIST},
			fields=["holiday_date", "weekly_off"],
		)
		self.assertGreater(len(days), 100)
		# 2026-07-18 adalah Sabtu — wajib ada sebagai weekly off
		saturdays = [d for d in days if str(d.holiday_date) == "2026-07-18"]
		self.assertEqual(len(saturdays), 1)
		self.assertEqual(saturdays[0].weekly_off, 1)
		# Minggu juga tetap ada (2026-07-19)
		self.assertTrue(any(str(d.holiday_date) == "2026-07-19" for d in days))

	def test_idempotent(self):
		ensure_management_holiday_list()
		before = frappe.db.count("Holiday", {"parent": MANAGEMENT_HOLIDAY_LIST})
		out = ensure_management_holiday_list()
		self.assertFalse(out["created"])
		self.assertEqual(
			frappe.db.count("Holiday", {"parent": MANAGEMENT_HOLIDAY_LIST}), before
		)
