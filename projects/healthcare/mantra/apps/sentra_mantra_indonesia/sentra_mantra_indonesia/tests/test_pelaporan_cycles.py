"""Generator siklus: hanya card Aktif, dedup, skip Harian/Event-based."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia import pelaporan_cycles
from sentra_mantra_indonesia.tests.test_pelaporan_register import make_card


class TestCycleGenerator(FrappeTestCase):
	def tearDown(self):
		frappe.db.rollback()

	def test_period_for_monthly(self):
		label, start, end = pelaporan_cycles.period_for("Bulanan", "2026-07-26")
		self.assertEqual(label, "2026-07")
		self.assertEqual(str(start), "2026-07-01")
		self.assertEqual(str(end), "2026-07-31")

	def test_period_for_quarterly_and_yearly(self):
		label_q, _s, _e = pelaporan_cycles.period_for("Triwulanan", "2026-07-26")
		self.assertEqual(label_q, "2026-Q3")
		label_y, _s, _e = pelaporan_cycles.period_for("Tahunan", "2026-07-26")
		self.assertEqual(label_y, "2026")

	def test_period_for_event_based_returns_none(self):
		self.assertIsNone(pelaporan_cycles.period_for("Event-based", "2026-07-26"))
		self.assertIsNone(pelaporan_cycles.period_for("Harian", "2026-07-26"))

	def test_generate_only_for_active_cards(self):
		make_card("T5-VERIF", status="Perlu Verifikasi")
		make_card("T5-RET", status="Retired")
		active = make_card("T5-AKTIF", status="Aktif")
		created = pelaporan_cycles.generate_cycles("2026-07-26")
		cards = {
			frappe.db.get_value("Sentra Report Cycle", n, "report_card") for n in created
		}
		self.assertIn(active.name, cards)
		self.assertNotIn("T5-VERIF", cards)
		self.assertNotIn("T5-RET", cards)

	def test_generate_idempotent(self):
		make_card("T5-IDEM", status="Aktif")
		first = pelaporan_cycles.generate_cycles("2026-07-26")
		second = pelaporan_cycles.generate_cycles("2026-07-26")
		self.assertTrue(any("T5-IDEM" in
			frappe.db.get_value("Sentra Report Cycle", n, "report_card") for n in first))
		self.assertEqual(
			[n for n in second
			 if frappe.db.get_value("Sentra Report Cycle", n, "report_card") == "T5-IDEM"],
			[],
		)

	def test_deadlines_computed_from_card_offsets(self):
		card = make_card("T5-DL", status="Aktif")
		frappe.db.set_value("Sentra Report Card", card.name, "tenggat_internal_hari", 5)
		frappe.db.set_value("Sentra Report Card", card.name, "deadline_eksternal_hari", 10)
		created = pelaporan_cycles.generate_cycles("2026-07-26")
		cyc_name = next(
			n for n in created
			if frappe.db.get_value("Sentra Report Cycle", n, "report_card") == card.name
		)
		cyc = frappe.get_doc("Sentra Report Cycle", cyc_name)
		self.assertEqual(str(cyc.tenggat_internal), "2026-08-05")
		self.assertEqual(str(cyc.deadline_eksternal), "2026-08-10")
