import os
from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_integrations.rme_bridge.runner import (
	_extract,
	scheduled_patient_extract,
	source_is_configured,
)


class TestRMERunner(TestCase):
	def test_readonly_db_source_is_configured_without_printing_credentials(self):
		environ = {
			"MANTRA_RME_SOURCE_KIND": "readonly_db",
			"MANTRA_RME_DB_HOST": "rme-db",
			"MANTRA_RME_DB_NAME": "rme",
			"MANTRA_RME_DB_USER": "mantra_ro",
			"MANTRA_RME_DB_PASSWORD": "secret-value",
			"MANTRA_RME_TABLE_PATIENT": "patients",
		}
		with patch.dict(os.environ, environ, clear=True):
			self.assertTrue(source_is_configured())

	def test_missing_source_configuration_skips_scheduled_job(self):
		with patch.dict(os.environ, {}, clear=True):
			self.assertEqual(
				scheduled_patient_extract(),
				{"status": "Skipped", "reason": "RME source is not configured"},
			)

	def test_extract_stages_rows_and_returns_only_batch_metadata(self):
		class FakeSource:
			table_map = {"patient": "patients"}

			def describe(self):
				return {"kind": "readonly_db", "connection_label": "mysql:rme"}

		class FakeBatch:
			name = "RME-BATCH-TEST"
			entity = "patient"
			source_kind = "readonly_db"
			status = "Completed"
			total_records = 12

		with (
			patch(
				"sentra_mantra_integrations.rme_bridge.runner._build_source",
				return_value=(FakeSource(), "patients"),
			),
			patch(
				"sentra_mantra_integrations.rme_bridge.runner.stage_records",
				return_value=FakeBatch(),
			) as stage,
		):
			result = _extract("patient")

		self.assertEqual(result["batch"], "RME-BATCH-TEST")
		self.assertEqual(result["total_records"], 12)
		self.assertNotIn("raw_payload_json", result)
		stage.assert_called_once()
