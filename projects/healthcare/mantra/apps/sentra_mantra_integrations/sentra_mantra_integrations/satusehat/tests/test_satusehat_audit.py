"""Audit bridge: registry-present path (mocked) and local park fallback."""

import json
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.satusehat import audit, staging


class TestSatuSehatAudit(FrappeTestCase):
	def test_park_locally_when_registry_absent(self):
		batch = staging.create_batch(org_id="100027810", resource_type="Encounter")
		with patch("sentra_mantra_integrations.satusehat.audit.registry_available", return_value=False):
			payload = audit.emit("satusehat.pull.started", batch=batch, resource_type="Encounter")

		self.assertEqual(payload["event_type"], "satusehat.pull.started")
		refreshed = frappe.get_doc("SATUSEHAT Sync Batch", batch.name)
		self.assertIn("satusehat.pull.started", refreshed.notes or "")

	def test_registry_path_writes_via_string_doctype_only(self):
		batch = staging.create_batch(org_id="100027810", resource_type="Encounter")
		fake_doc = MagicMock()

		with (
			patch("sentra_mantra_integrations.satusehat.audit.registry_available", return_value=True),
			patch("frappe.get_doc", return_value=fake_doc) as get_doc,
		):
			payload = audit.emit(
				"satusehat.pull.completed",
				batch=batch,
				resource_type="Encounter",
				hash="deadbeef",
			)

		self.assertEqual(payload["event_type"], "satusehat.pull.completed")
		fake_doc.insert.assert_called_once_with(ignore_permissions=True)
		called_with = get_doc.call_args.args[0]
		self.assertEqual(called_with["doctype"], "Audit Event Registry")
		self.assertEqual(called_with["hash"], "deadbeef")
		self.assertEqual(called_with["batch"], batch.name)

	def test_emit_drops_secret_shaped_field_names(self):
		batch = staging.create_batch(org_id="100027810", resource_type="Encounter")
		with patch("sentra_mantra_integrations.satusehat.audit.registry_available", return_value=False):
			payload = audit.emit(
				"satusehat.pull.completed",
				batch=batch,
				resource_type="Encounter",
				client_secret="should-never-appear",
			)
		self.assertNotIn("client_secret", payload)
		self.assertNotIn("should-never-appear", json.dumps(payload))

	def test_park_survives_stale_batch_instance(self):
		# _resources_pull holds the batch instance from create_batch while
		# finish_batch saves a FRESH copy underneath it; the closing
		# audit.emit must not explode with TimestampMismatchError.
		batch = staging.create_batch(org_id="100027810", resource_type="Encounter")
		staging.finish_batch(batch)  # saves a fresh copy -> `batch` is now stale
		with patch("sentra_mantra_integrations.satusehat.audit.registry_available", return_value=False):
			audit.emit("satusehat.pull.completed", batch=batch, resource_type="Encounter")
		refreshed = frappe.get_doc("SATUSEHAT Sync Batch", batch.name)
		self.assertIn("satusehat.pull.completed", refreshed.notes or "")
		self.assertEqual(refreshed.status, "Completed")

	def test_emit_without_batch_and_registry_absent_is_a_no_op(self):
		with patch("sentra_mantra_integrations.satusehat.audit.registry_available", return_value=False):
			payload = audit.emit("satusehat.pull.started", batch=None, resource_type="Encounter")
		self.assertEqual(payload["event_type"], "satusehat.pull.started")
