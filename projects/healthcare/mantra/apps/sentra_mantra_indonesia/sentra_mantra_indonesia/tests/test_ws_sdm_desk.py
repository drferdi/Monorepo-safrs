"""SDM desk wave 2 — rasio hadir, kredensial, shift board."""

from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_indonesia.ws_sdm import _cards, _credential_alerts, _leave_overlap_by_dept


class TestSdmCards(TestCase):
	def test_hadir_ratio_and_gap(self):
		with (
			patch("sentra_mantra_indonesia.ws_sdm.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_sdm.ws_common.count",
				side_effect=[100, 80, 2],
			),
			patch("sentra_mantra_indonesia.ws_sdm._shift_aktif", return_value=12),
		):
			cards, aktif, hadir = _cards()
		labels = {c["label"]: c["value"] for c in cards}
		self.assertEqual(labels["Karyawan Aktif"], 100)
		self.assertEqual(labels["Hadir Hari Ini"], 80)
		self.assertEqual(labels["Rasio Hadir"], "80%")
		self.assertEqual(labels["Absen Tanpa Keterangan"], 20)
		self.assertEqual(aktif, 100)
		self.assertEqual(hadir, 80)


class TestCredentialAlerts(TestCase):
	def test_expiring_and_missing_ihs(self):
		rows = [
			{
				"name": "H1",
				"practitioner_name": "dr. Alpha",
				"str_expiry": "2026-08-01",
				"sip_expiry": None,
				"satusehat_ihs": "",
			},
			{
				"name": "H2",
				"practitioner_name": "dr. Beta",
				"str_expiry": None,
				"sip_expiry": None,
				"satusehat_ihs": "IHS-1",
			},
		]
		with (
			patch("sentra_mantra_indonesia.ws_sdm.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_sdm.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_sdm.frappe.db.sql",
				return_value=rows,
			),
		):
			items = _credential_alerts()
		titles = " ".join(i["title"] for i in items)
		self.assertIn("STR", titles)
		self.assertIn("binding IHS", titles)

	def test_no_permission_empty(self):
		with patch("sentra_mantra_indonesia.ws_sdm.ws_common.can", return_value=False):
			self.assertEqual(_credential_alerts(), [])
			self.assertEqual(_leave_overlap_by_dept(), [])
