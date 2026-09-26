from unittest import TestCase

from sentra_mantra_core.workspace_nav import WORKSPACES


class TestKlinikShortcutOrder(TestCase):
	def test_pelayanan_row_puts_appointment_before_encounter(self):
		clinic = next(w for w in WORKSPACES if w["title"] == "Pasien & Klinik")
		pelayanan = dict(clinic["rows"])["Pelayanan Pasien"]
		labels = [s["label"] for s in pelayanan]
		self.assertLess(labels.index("Appointment"), labels.index("Pemeriksaan Pasien"))
		self.assertEqual(labels[0], "Appointment")

	def test_native_request_to_pay_chain_is_reachable_from_workspaces(self):
		"""Dropping a native request, receipt, invoice, or claim route must fail."""
		finance = next(w for w in WORKSPACES if w["title"] == "Keuangan")
		finance_links = {
			shortcut["link_to"]
			for _header, shortcuts in finance["rows"]
			for shortcut in shortcuts
		}
		hr = next(w for w in WORKSPACES if w["title"] == "SDM")
		hr_links = {
			shortcut["link_to"]
			for _header, shortcuts in hr["rows"]
			for shortcut in shortcuts
		}

		self.assertTrue(
			{
				"Material Request",
				"Purchase Order",
				"Purchase Receipt",
				"Purchase Invoice",
			}.issubset(finance_links)
		)
		self.assertIn("Expense Claim", hr_links)
