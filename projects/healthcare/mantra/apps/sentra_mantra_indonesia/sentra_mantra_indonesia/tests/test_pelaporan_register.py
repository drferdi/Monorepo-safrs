"""Sentra Report Card: register induk pelaporan — aturan versi aktif."""

import frappe
from frappe.tests.utils import FrappeTestCase


def make_card(code, **kw):
	doc = frappe.get_doc(
		{
			"doctype": "Sentra Report Card",
			"report_code": code,
			"report_name": kw.get("report_name", code),
			"kategori": kw.get("kategori", "A - Pelaporan nasional RS"),
			"divisi": kw.get("divisi", "01 - Rekam Medis (RM) & SIMRS"),
			"jenis": kw.get("jenis", "Eksternal"),
			"status": kw.get("status", "Perlu Verifikasi"),
			"frekuensi": kw.get("frekuensi", "Bulanan"),
			"report_group": kw.get("report_group"),
			"kerahasiaan": kw.get("kerahasiaan", "Biasa"),
		}
	)
	doc.insert()
	return doc


class TestReportCard(FrappeTestCase):
	def tearDown(self):
		frappe.db.rollback()

	def test_default_status_is_perlu_verifikasi(self):
		doc = make_card("T1-DEFAULT", status=None)
		self.assertEqual(doc.status, "Perlu Verifikasi")

	def test_only_one_active_card_per_report_group(self):
		make_card("T1-A1", report_group="grp-x", status="Aktif")
		with self.assertRaisesRegex(frappe.ValidationError, "versi Aktif"):
			make_card("T1-A2", report_group="grp-x", status="Aktif")

	def test_two_active_cards_without_group_allowed(self):
		make_card("T1-B1", status="Aktif")
		make_card("T1-B2", status="Aktif")  # no group ⇒ no clash

	def test_retired_plus_active_same_group_allowed(self):
		make_card("T1-C1", report_group="grp-y", status="Retired")
		make_card("T1-C2", report_group="grp-y", status="Aktif")
