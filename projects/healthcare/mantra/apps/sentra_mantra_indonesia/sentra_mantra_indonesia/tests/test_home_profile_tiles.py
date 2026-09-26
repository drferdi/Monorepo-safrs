"""Dynamic Beranda profile tiles per persona."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

from sentra_mantra_indonesia.home_profile import _badge_for, _cred_sub, _tiles, my_profile
from sentra_mantra_indonesia.home_today import (
	_actions_for,
	_tasks_finance,
	_tasks_pharmacy,
)


class TestHomeProfileTiles(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_clinical_tiles_use_unit_layanan_and_jadwal(self):
		emp = frappe._dict(name="EMP-T", employment_type=None)
		prac = frappe._dict(name="HCP-T", str_no="STR1", sip_no="SIP1")
		with patch(
			"sentra_mantra_indonesia.home_profile._jadwal_praktik_hari_ini",
			return_value="08:00–12:00",
		):
			tiles = _tiles("clinical", "Poli Anak", emp, prac, "5 hari", "Dari 12 hari", None)
		keys = [t["key"] for t in tiles]
		self.assertIn("jadwal_praktik", keys)
		self.assertNotIn("employee_id", keys)
		unit = next(t for t in tiles if t["key"] == "department")
		self.assertEqual(unit["label"], "Unit Layanan")

	def test_umum_tiles_exclude_str_sip(self):
		emp = frappe._dict(name="EMP-U", employment_type="Full-time")
		prac = frappe._dict(name="HCP-U", str_no="X", sip_no="Y")
		tiles = _tiles("umum", "IT", emp, prac, None, None, "Full-time")
		keys = [t["key"] for t in tiles]
		self.assertEqual(keys, ["sisa_cuti", "notifikasi", "department", "employee_id"])
		self.assertNotIn("str_no", keys)

	def test_badge_for_maps_rank_designations(self):
		base = "/assets/sentra_mantra_core/images/rank"
		self.assertEqual(_badge_for("Direktur Utama"), f"{base}/dirut.png")
		self.assertEqual(_badge_for("WADIR Keuangan"), f"{base}/wadir.png")
		self.assertEqual(_badge_for("Komisaris"), f"{base}/komisaris.png")
		self.assertEqual(_badge_for("Kepala Ruang"), f"{base}/karu.png")
		self.assertIsNone(_badge_for("Bidan"))
		self.assertIsNone(_badge_for(None))

	def test_cred_sub_status(self):
		self.assertIsNone(_cred_sub(None))
		self.assertIn("Kedaluwarsa", _cred_sub(add_days(today(), -1)))
		soon = _cred_sub(add_days(today(), 30))
		self.assertIn("hari lagi", soon)
		self.assertIn("Berlaku s.d.", soon)
		far = _cred_sub(add_days(today(), 365))
		self.assertIn("Berlaku s.d.", far)
		self.assertNotIn("hari lagi", far)

	def test_clinical_str_sip_tiles_carry_expiry_status(self):
		emp = frappe._dict(name="EMP-T", employment_type=None)
		prac = frappe._dict(
			name="HCP-T",
			str_no="STR1",
			sip_no="SIP1",
			str_expiry=add_days(today(), -5),
			sip_expiry=None,
		)
		with patch(
			"sentra_mantra_indonesia.home_profile._jadwal_praktik_hari_ini",
			return_value="08:00–12:00",
		):
			tiles = _tiles("clinical", "Poli Anak", emp, prac, "5 hari", None, None)
		str_tile = next(t for t in tiles if t["key"] == "str_no")
		self.assertIn("Kedaluwarsa", str_tile["sub"])
		sip_tile = next(t for t in tiles if t["key"] == "sip_no")
		self.assertIsNone(sip_tile.get("sub"))

	def test_administrator_my_profile_returns_tiles(self):
		frappe.set_user("Administrator")
		payload = my_profile()
		self.assertEqual(payload["persona"], "chief")
		self.assertTrue(payload["tiles"])
		self.assertLessEqual(len(payload["tiles"]), 6)
		self.assertEqual(payload["tiles"][0]["key"], "sisa_cuti")

	def test_requester_actions_use_native_create_routes(self):
		"""Replacing native Material Request or Expense Claim routes must fail."""
		with patch.object(frappe, "has_permission", return_value=True):
			actions = _actions_for("umum")

		routes = {action["route"] for action in actions}
		self.assertIn("/app/material-request/new", routes)
		self.assertIn("/app/expense-claim/new", routes)

	def test_quick_actions_are_removed_without_required_permission(self):
		"""Showing a create action to a user without create permission must fail."""
		def permission(doctype, ptype=None, **kwargs):
			return doctype == "Leave Application" and ptype == "create"

		with patch.object(frappe, "has_permission", side_effect=permission):
			actions = _actions_for("umum")

		self.assertEqual(
			actions,
			[
				{
					"label": "Ajukan Cuti",
					"desc": "Pengajuan baru",
					"route": "/app/leave-application/new",
				},
				{
					"label": "Profil Saya",
					"desc": "Akun & data diri",
					"route": "/me",
				},
			],
		)

	def test_finance_and_pharmacy_tasks_cover_native_pipeline(self):
		"""Dropping a review or receipt stage from pending work must fail."""
		with patch(
			"sentra_mantra_indonesia.home_today.gated_count", return_value=2
		):
			finance = _tasks_finance()
			pharmacy = _tasks_pharmacy()

		self.assertEqual(
			{task["route"] for task in finance},
			{
				"/app/material-request",
				"/app/purchase-receipt",
				"/app/purchase-invoice",
				"/app/expense-claim",
			},
		)
		self.assertIn("/app/material-request", {task["route"] for task in pharmacy})
		self.assertIn("/app/purchase-receipt", {task["route"] for task in pharmacy})
