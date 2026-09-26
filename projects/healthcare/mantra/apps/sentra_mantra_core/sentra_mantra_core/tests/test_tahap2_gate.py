"""Gate Tahap 2 for every versioned MANTRA posting workflow."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.tahap2_gate import (
	CONFIRM_PHRASE,
	WORKFLOWS,
	close_gate,
	open_gate,
	status,
)


class TestTahap2Gate(FrappeTestCase):
	def test_status_reports_all_gated_workflows_with_doc_status(self):
		s = status()
		self.assertEqual(sorted(r["workflow"] for r in s["workflows"]), sorted(WORKFLOWS))
		for row in s["workflows"]:
			self.assertIn(str(row["doc_status"]), ("0", "1"))
			self.assertIn("approved_masih_draft", row)

	def test_open_gate_requires_exact_confirmation_phrase(self):
		with self.assertRaises(frappe.ValidationError):
			open_gate(confirm="salah", commit=False, check_backup=False)
		with self.assertRaises(frappe.ValidationError):
			open_gate(confirm=None, commit=False, check_backup=False)

	def test_open_then_close_gate_flips_doc_status(self):
		open_gate(confirm=CONFIRM_PHRASE, commit=False, check_backup=False)
		self.assertTrue(all(str(r["doc_status"]) == "1" for r in status()["workflows"]))
		close_gate(confirm=CONFIRM_PHRASE, commit=False)
		self.assertTrue(all(str(r["doc_status"]) == "0" for r in status()["workflows"]))
