"""Sentra Report Cycle: dedup periode + gate defect/receipt (fail-closed)."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.tests.test_pelaporan_register import make_card

WORKFLOW_NAME = "Sentra Pelaporan Cycle"
CYCLE_DOCTYPE = "Sentra Report Cycle"


def set_cycle_workflow_active(is_active):
	"""Toggle the installed cycle workflow; no-op when it is not installed.

	v15 resolves the active workflow through the "workflow" cache hash
	(frappe.model.workflow.get_workflow_name), so the hash entry must be
	dropped for the new is_active value to take effect in-process.
	"""
	if not frappe.db.exists("Workflow", WORKFLOW_NAME):
		return
	frappe.db.set_value(
		"Workflow", WORKFLOW_NAME, "is_active", is_active, update_modified=False
	)
	frappe.cache.hdel("workflow", CYCLE_DOCTYPE)


class WorkflowOffMixin:
	"""Suspend the cycle workflow for suites that set `status` directly.

	The defect/receipt/dedup gates are a controller-level contract: they must
	fire on ANY save path. Testing them means writing `status` without going
	through a declared transition, which the active workflow would reject
	first. The workflow graph itself is covered in test_pelaporan_setup.
	"""

	def setUp(self):
		super().setUp()
		set_cycle_workflow_active(0)

	def tearDown(self):
		frappe.db.rollback()
		set_cycle_workflow_active(1)


def make_cycle(card, periode="2026-07", **kw):
	doc = frappe.get_doc(
		{
			"doctype": "Sentra Report Cycle",
			"report_card": card.name,
			"periode_label": periode,
			"period_start": kw.get("period_start", "2026-07-01"),
			"period_end": kw.get("period_end", "2026-07-31"),
			"status": kw.get("status", "Dibuka"),
			"nomor_referensi": kw.get("nomor_referensi"),
			"defects": kw.get("defects", []),
		}
	)
	doc.insert()
	return doc


class TestReportCycle(WorkflowOffMixin, FrappeTestCase):
	def test_duplicate_period_rejected(self):
		card = make_card("T2-DUP", status="Aktif")
		make_cycle(card, "2026-07")
		with self.assertRaisesRegex(frappe.ValidationError, "sudah ada"):
			make_cycle(card, "2026-07")

	def test_open_defect_blocks_disetujui(self):
		card = make_card("T2-DEF", status="Aktif")
		cyc = make_cycle(card, defects=[{"deskripsi": "angka janggal", "status": "Open"}])
		cyc.status = "Disetujui"
		with self.assertRaisesRegex(frappe.ValidationError, "defect validasi berstatus Open"):
			cyc.save()

	def test_resolved_defect_allows_disetujui(self):
		card = make_card("T2-RES", status="Aktif")
		cyc = make_cycle(card, defects=[{"deskripsi": "sudah beres", "status": "Resolved"}])
		cyc.status = "Disetujui"
		cyc.save()
		self.assertEqual(cyc.status, "Disetujui")

	def test_diterima_requires_nomor_referensi(self):
		card = make_card("T2-RCPT", status="Aktif")
		cyc = make_cycle(card)
		cyc.status = "Diterima"
		with self.assertRaisesRegex(frappe.ValidationError, "nomor referensi"):
			cyc.save()
		cyc.reload()
		cyc.nomor_referensi = "SIRS/2026/000123"
		cyc.status = "Diterima"
		cyc.save()
		self.assertEqual(cyc.status, "Diterima")


class TestCycleAudit(WorkflowOffMixin, FrappeTestCase):
	def test_status_change_writes_audit_event(self):
		card = make_card("T6-AUD", status="Aktif")
		cyc = make_cycle(card)
		before = frappe.db.count("Audit Event", {"target_name": cyc.name})
		cyc.status = "Draf"
		cyc.save()
		events = frappe.get_all(
			"Audit Event",
			filters={"target_doctype": "Sentra Report Cycle", "target_name": cyc.name},
			fields=["event_type", "payload_json"],
		)
		self.assertEqual(len(events), before + 1)
		self.assertTrue(all(e.event_type == "Record Change" for e in events))
		self.assertTrue(any('"to": "Draf"' in (e.payload_json or "") for e in events))

	def test_no_audit_event_without_status_change(self):
		card = make_card("T6-NOAUD", status="Aktif")
		cyc = make_cycle(card)
		before = frappe.db.count("Audit Event", {"target_name": cyc.name})
		cyc.catatan_penyusun = "hanya catatan"
		cyc.save()
		after = frappe.db.count("Audit Event", {"target_name": cyc.name})
		self.assertEqual(after, before)
