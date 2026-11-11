"""Pelaporan RSIA — peta divisi + PJ akhir."""

from unittest import TestCase

from sentra_mantra_indonesia.ws_pelaporan import DIVISIONS, FINAL_NOTE, data


class TestPelaporanMap(TestCase):
	def test_six_divisions_and_final_director(self):
		payload = data()
		self.assertEqual(len(payload["divisions"]), 6)
		self.assertEqual(len(DIVISIONS), 6)
		titles = [d["title"] for d in payload["divisions"]]
		self.assertIn("Rekam Medis (RM) & SIMRS", titles)
		self.assertIn("Bagian SDM / Kepegawaian (HRD)", titles)
		self.assertIn("Direktur Utama", payload["final"]["title"])
		self.assertIn("Kemenkes", FINAL_NOTE["desc"])

	def test_each_division_has_tugas_and_pj(self):
		for d in data()["divisions"]:
			self.assertTrue(d["n"])
			self.assertTrue(d["tugas"])
			self.assertTrue(d["pj"])
			self.assertNotIn("tone", d)
			self.assertNotIn("route", d)

	def test_profile_style_payload_has_head_and_refs(self):
		payload = data()
		self.assertEqual(payload["badge"], "RSIA Melinda")
		self.assertTrue(payload["title"])
		self.assertGreaterEqual(len(payload["refs"]), 3)
