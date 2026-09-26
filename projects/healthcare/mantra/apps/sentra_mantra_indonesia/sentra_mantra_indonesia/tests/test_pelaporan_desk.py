"""Blok Laporan Saya: gating System User + isi per role (tanpa ignore_permissions)."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia import pelaporan_desk, pelaporan_setup
from sentra_mantra_indonesia.tests.test_pelaporan_register import make_card
from sentra_mantra_indonesia.tests.test_pelaporan_cycle import make_cycle


class TestPelaporanDesk(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		pelaporan_setup.ensure_roles()
		pelaporan_setup.ensure_permissions()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def _user(self, email, *roles):
		if not frappe.db.exists("User", email):
			doc = frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"user_type": "System User",
				}
			)
			doc.insert(ignore_permissions=True)
		user = frappe.get_doc("User", email)
		# "All" carries desk_access — without it User.validate() recomputes
		# user_type to "Website User" on save when no other desk role is set,
		# which would make the no-pelaporan-role case indistinguishable from
		# the non-desk-user case this suite also covers.
		user.add_roles("All", *roles)
		return email

	def test_non_desk_user_rejected(self):
		email = self._user("t7-web@example.com")
		frappe.db.set_value("User", email, "user_type", "Website User")
		frappe.set_user(email)
		with self.assertRaises(frappe.PermissionError):
			pelaporan_desk.my_reports()

	def test_penyusun_sees_needs_me_flag_on_open_cycle(self):
		card = make_card("T7-CARD", status="Aktif")
		make_cycle(card, "2026-07")  # status awal "Dibuka" = antrean Penyusun
		email = self._user("t7-penyusun@example.com", "Pelaporan Penyusun")
		frappe.set_user(email)
		data = pelaporan_desk.my_reports()
		mine = next(c for c in data["cards"] if c["code"] == card.name)
		self.assertTrue(mine["needs_me"])
		self.assertEqual(mine["needs_label"], "Perlu diisi")
		self.assertEqual(mine["cycle"]["periode"], "2026-07")
		# kartu ber-aksi tampil paling depan
		self.assertTrue(data["cards"][0]["needs_me"])

	def test_all_register_cards_visible_without_needs_flag_for_other_queue(self):
		card = make_card("T7-VLD", status="Aktif")
		make_cycle(card, "2026-07")  # "Dibuka" bukan antrean Validator
		email = self._user("t7-validator@example.com", "Pelaporan Validator")
		frappe.set_user(email)
		data = pelaporan_desk.my_reports()
		mine = next(c for c in data["cards"] if c["code"] == card.name)
		self.assertFalse(mine["needs_me"])
		self.assertIsNone(mine["needs_label"])
		self.assertIsNotNone(mine["cycle"])  # siklusnya tetap terlihat

	def test_user_without_pelaporan_role_gets_empty_cards(self):
		card = make_card("T7-EMPTY", status="Aktif")
		make_cycle(card, "2026-07")
		email = self._user("t7-none@example.com")
		frappe.set_user(email)
		data = pelaporan_desk.my_reports()
		self.assertEqual(data["cards"], [])
		self.assertEqual(data["roles"], [])
