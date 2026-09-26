"""Clinical Home tasks use management tone, not EMR wording."""

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.home_today import _tasks_clinical


def _gc(doctype, filters=None):
	return 2 if doctype == "Patient Encounter" else 0


class TestClinicalTasksManagementTone(FrappeTestCase):
	def test_encounter_task_uses_management_wording(self):
		with patch("sentra_mantra_indonesia.home_today.gated_count", side_effect=_gc):
			tasks = _tasks_clinical(None)
		labels = [t["label"] for t in tasks]
		self.assertIn("Encounter belum ditutup", labels)
		self.assertNotIn("Pemeriksaan belum selesai", labels)
		encounter = next(t for t in tasks if t["label"] == "Encounter belum ditutup")
		self.assertEqual(encounter["count"], 2)
