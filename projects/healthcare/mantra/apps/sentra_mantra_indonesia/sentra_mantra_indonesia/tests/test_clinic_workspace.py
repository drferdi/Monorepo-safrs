"""Layout workspace Pasien & Klinik — hanya Manajemen; Klinik/RME disembunyikan."""

import json
from unittest import TestCase
from unittest.mock import MagicMock, patch

from sentra_mantra_indonesia.clinic_workspace import BLOCK_ORDER, HIDE_FROM_CONTENT, apply


def _block(name, block_id="x"):
	return {
		"id": block_id,
		"type": "custom_block",
		"data": {"custom_block_name": name, "col": 12},
	}


class TestClinicWorkspaceLayout(TestCase):
	def test_keeps_manajemen_only_hides_klinik_and_rme(self):
		content = [
			_block("Jumlah Pasien RME", "rme1"),
			_block("Manajemen RSIA", "m"),
			_block("Status Extract RME", "rme2"),
			_block("Klinik Hari Ini RSIA", "k"),
			{"id": "sc", "type": "shortcut", "data": {}},
		]
		ws = MagicMock()
		ws.content = json.dumps(content)
		ws.custom_blocks = []

		with (
			patch("sentra_mantra_indonesia.clinic_workspace.frappe.db.exists", return_value=True),
			patch("sentra_mantra_indonesia.clinic_workspace.frappe.get_doc", return_value=ws),
			patch("sentra_mantra_indonesia.clinic_workspace.frappe.clear_document_cache"),
			patch("sentra_mantra_indonesia.clinic_workspace.frappe.db.commit"),
		):
			result = apply()

		self.assertTrue(result["ok"])
		self.assertEqual(result["order"], list(BLOCK_ORDER))
		self.assertIn("Klinik Hari Ini RSIA", result["hidden"])
		saved = json.loads(ws.content)
		names = [
			b["data"]["custom_block_name"]
			for b in saved
			if b.get("type") == "custom_block"
		]
		self.assertEqual(names, ["Manajemen RSIA"])
		self.assertEqual(saved[-1]["type"], "shortcut")
		ws.save.assert_called_once()
		self.assertEqual(sorted(HIDE_FROM_CONTENT), sorted(result["hidden"]))
