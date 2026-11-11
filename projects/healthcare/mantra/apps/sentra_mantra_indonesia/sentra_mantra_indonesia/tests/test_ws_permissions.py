"""Permission gates for workspace / Beranda widget counts (spec §4)."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.home_today import _tasks_chief, my_today
from sentra_mantra_indonesia.ws_common import gated_count


class TestWsPermissions(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_gated_count_skips_db_without_permission(self):
		with patch("sentra_mantra_indonesia.ws_common.can", return_value=False):
			with patch("sentra_mantra_indonesia.ws_common.count") as count_mock:
				self.assertEqual(gated_count("Purchase Order", {"docstatus": 0}), 0)
				count_mock.assert_not_called()

	def test_gated_count_queries_when_allowed(self):
		with patch("sentra_mantra_indonesia.ws_common.can", return_value=True):
			with patch("sentra_mantra_indonesia.ws_common.count", return_value=3) as count_mock:
				self.assertEqual(gated_count("Purchase Order", {"docstatus": 0}), 3)
				count_mock.assert_called_once_with("Purchase Order", {"docstatus": 0})

	def test_guest_task_counts_are_zero_without_traceback(self):
		frappe.set_user("Guest")
		tasks = _tasks_chief()
		self.assertTrue(tasks)
		self.assertTrue(all(t.get("count") == 0 for t in tasks))

	def test_guest_my_today_returns_safely(self):
		frappe.set_user("Guest")
		payload = my_today()
		self.assertIn(payload["persona"], ("chief", "clinical", "hr", "finance", "umum"))
		self.assertEqual(payload["level"], "success")
		self.assertTrue(all(t.get("count") == 0 for t in payload["tasks"]))
		self.assertEqual(payload["actions"], [])

	def test_administrator_my_today_surfaces_actions(self):
		frappe.set_user("Administrator")
		payload = my_today()
		self.assertEqual(payload["persona"], "chief")
		self.assertEqual(len(payload["actions"]), 4)
		self.assertEqual(payload["actions"][0]["label"], "Persetujuan")
		# counts may be zero on an empty ledger; structure must still be present
		self.assertIsInstance(payload["tasks"], list)
		self.assertLessEqual(len(payload["tasks"]), 4)
