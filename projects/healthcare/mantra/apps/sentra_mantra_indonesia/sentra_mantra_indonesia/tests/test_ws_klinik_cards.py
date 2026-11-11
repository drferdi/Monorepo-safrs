from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_indonesia import ws_klinik
from sentra_mantra_indonesia.ws_klinik import _cards


class TestKlinikZoneCopy(TestCase):
	def test_setup_html_has_no_operasi_lokal_label(self):
		html = ws_klinik._block_html()
		self.assertNotIn("Operasi lokal", html)

class TestKlinikCards(TestCase):
	def test_cards_use_successful_live_counts(self):
		def count(doctype, filters):
			if doctype == "Patient Appointment":
				return 3
			if doctype == "Patient Encounter":
				return 2
			if doctype == "Healthcare Service Unit":
				if filters.get("occupancy_status") == "Occupied":
					return 4
				if filters.get("occupancy_status") == "Vacant":
					return 6
			raise RuntimeError(f"unexpected {doctype}")

		with (
			patch("sentra_mantra_indonesia.ws_klinik.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_klinik.frappe.db.count",
				side_effect=count,
			),
			patch(
				"sentra_mantra_indonesia.ws_klinik._on_duty_count",
				return_value=4,
			),
		):
			cards = _cards()

		self.assertEqual(
			[(card["label"], card["value"]) for card in cards],
			[
				("Appointment Hari Ini", 3),
				("Checked-in Hari Ini", 3),
				("Encounter Belum Ditutup", 2),
				("Praktisi Bertugas", 4),
				("Okupansi Unit", "40%"),
				("Unit Terisi", 4),
				("Unit Kosong", 6),
			],
		)
		self.assertFalse(any(c.get("sub") == "Operasi lokal" for c in cards))

	def test_failed_queries_do_not_render_fake_zero_cards(self):
		with (
			patch("sentra_mantra_indonesia.ws_klinik.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_klinik.frappe.db.count",
				side_effect=RuntimeError("database unavailable"),
			),
			patch(
				"sentra_mantra_indonesia.ws_klinik._on_duty_count",
				return_value=None,
			),
		):
			self.assertEqual(_cards(), [])
