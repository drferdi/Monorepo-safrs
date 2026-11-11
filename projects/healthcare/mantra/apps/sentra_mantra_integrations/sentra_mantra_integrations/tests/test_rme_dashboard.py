import json
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.rme_bridge.dashboard import (
	BLOCK_ID,
	BLOCK_NAME,
	CLINIC_BLOCK_ID,
	CLINIC_BLOCK_NAME,
	_batch_summary,
	get_dashboard_data,
	get_patient_total,
	install_dashboard,
)
from sentra_mantra_integrations.rme_bridge.staging import (
	add_record,
	create_batch,
	finish_batch,
	record_aggregate_snapshot,
)


class TestRMEDashboard(FrappeTestCase):
	def test_batch_summary_uses_real_staging_statuses(self):
		batch = create_batch("readonly_db", "patient", "rme-readonly")
		add_record(
			batch,
			"patient",
			{"id": 1},
			"patients",
			1,
			validation_status="Pending",
			mapping_status="New",
		)
		add_record(
			batch,
			"patient",
			{"id": 2},
			"patients",
			2,
			validation_status="Invalid",
			mapping_status="Conflict",
		)

		summary = _batch_summary(batch.name)

		self.assertEqual(summary["total_records"], 2)
		self.assertEqual(summary["validation"]["Pending"], 1)
		self.assertEqual(summary["validation"]["Invalid"], 1)
		self.assertEqual(summary["mapping"]["New"], 1)
		self.assertEqual(summary["mapping"]["Conflict"], 1)
		self.assertNotIn("raw_payload_json", summary)

	def test_dashboard_data_requires_staging_read_permission(self):
		with (
			patch(
				"sentra_mantra_integrations.rme_bridge.dashboard.frappe.has_permission",
				return_value=False,
			),
			patch("sentra_mantra_integrations.rme_bridge.dashboard._latest_batch") as latest,
		):
			result = get_dashboard_data()

		self.assertEqual(result, {"visible": False})
		latest.assert_not_called()

	def test_dashboard_data_reports_empty_state_without_dummy_batches(self):
		with (
			patch(
				"sentra_mantra_integrations.rme_bridge.dashboard.frappe.has_permission",
				return_value=True,
			),
			patch(
				"sentra_mantra_integrations.rme_bridge.dashboard._latest_batch",
				return_value=None,
			),
		):
			result = get_dashboard_data()

		self.assertTrue(result["visible"])
		self.assertFalse(result["has_data"])
		self.assertEqual(result["batches"], [])
		self.assertEqual(result["totals"]["records"], 0)

	def test_dashboard_data_combines_latest_patient_and_visit_batches(self):
		patient = {
			"entity": "patient",
			"total_records": 12,
			"validation": {"Pending": 2},
			"mapping": {"Conflict": 1, "Failed": 0},
		}
		visit = {
			"entity": "visit",
			"total_records": 7,
			"validation": {"Pending": 1},
			"mapping": {"Conflict": 0, "Failed": 1},
		}
		with (
			patch(
				"sentra_mantra_integrations.rme_bridge.dashboard.frappe.has_permission",
				return_value=True,
			),
			patch(
				"sentra_mantra_integrations.rme_bridge.dashboard._latest_batch",
				side_effect=["PATIENT-BATCH", "VISIT-BATCH"],
			),
			patch(
				"sentra_mantra_integrations.rme_bridge.dashboard._batch_summary",
				side_effect=[patient, visit],
			),
		):
			result = get_dashboard_data()

		self.assertTrue(result["visible"])
		self.assertTrue(result["has_data"])
		self.assertEqual(result["batches"], [patient, visit])
		self.assertEqual(result["totals"]["records"], 19)
		self.assertEqual(result["totals"]["pending_validation"], 3)
		self.assertEqual(result["totals"]["conflict"], 1)
		self.assertEqual(result["totals"]["failed"], 1)

	def test_patient_total_returns_latest_audited_aggregate(self):
		older = record_aggregate_snapshot(
			"browser_ui", "patient", 2100, "Medify RME /pasien"
		)
		newer = record_aggregate_snapshot(
			"browser_ui", "patient", 2180, "Medify RME /pasien"
		)

		with patch(
			"sentra_mantra_integrations.rme_bridge.dashboard.frappe.has_permission",
			return_value=True,
		):
			result = get_patient_total()

		self.assertTrue(result["visible"])
		self.assertEqual(result["total"], 2180)
		self.assertEqual(result["batch"], newer.name)
		self.assertNotEqual(result["batch"], older.name)
		self.assertEqual(result["source_kind"], "browser_ui")

	def test_patient_total_hides_data_without_staging_permission(self):
		with patch(
			"sentra_mantra_integrations.rme_bridge.dashboard.frappe.has_permission",
			return_value=False,
		):
			result = get_patient_total()

		self.assertEqual(result, {"visible": False})

	def test_patient_total_counts_latest_completed_record_batch(self):
		batch = create_batch("readonly_db", "patient", "mysql:rme-prod")
		add_record(batch, "patient", {"id": 1}, "patients", 1)
		add_record(batch, "patient", {"id": 2}, "patients", 2)
		finish_batch(batch)

		with patch(
			"sentra_mantra_integrations.rme_bridge.dashboard.frappe.has_permission",
			return_value=True,
		):
			result = get_patient_total()

		self.assertTrue(result["has_data"])
		self.assertEqual(result["total"], 2)
		self.assertEqual(result["batch"], batch.name)

	def test_install_dashboard_is_idempotent(self):
		install_dashboard()
		install_dashboard()

		workspace = frappe.get_doc("Workspace", "Home")
		content = json.loads(workspace.content)
		matching_blocks = [item for item in content if item.get("id") == BLOCK_ID]
		matching_rows = [
			row for row in workspace.custom_blocks if row.custom_block_name == BLOCK_NAME
		]

		self.assertEqual(len(matching_blocks), 1)
		self.assertEqual(len(matching_rows), 1)

		clinic = frappe.get_doc("Workspace", "Pasien & Klinik")
		clinic_content = json.loads(clinic.content)
		clinic_blocks = [item for item in clinic_content if item.get("id") == CLINIC_BLOCK_ID]
		clinic_rows = [
			row
			for row in clinic.custom_blocks
			if row.custom_block_name == CLINIC_BLOCK_NAME
		]
		self.assertEqual(len(clinic_blocks), 1)
		self.assertEqual(len(clinic_rows), 1)
