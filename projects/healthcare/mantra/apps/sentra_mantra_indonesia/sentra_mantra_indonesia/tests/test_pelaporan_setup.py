"""pelaporan_setup: roles + workflow idempoten."""

import frappe
from frappe.model.workflow import WorkflowPermissionError
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia import pelaporan_setup
from sentra_mantra_indonesia.tests.test_pelaporan_cycle import (
	CYCLE_DOCTYPE,
	make_cycle,
	set_cycle_workflow_active,
)
from sentra_mantra_indonesia.tests.test_pelaporan_register import make_card


class TestPelaporanSetup(FrappeTestCase):
	def test_ensure_roles_idempotent(self):
		created_1 = pelaporan_setup.ensure_roles()
		created_2 = pelaporan_setup.ensure_roles()
		for role in pelaporan_setup.ROLES:
			self.assertTrue(frappe.db.exists("Role", role))
		self.assertEqual(created_2, [])  # second run creates nothing

	def test_ensure_workflow_states_match_register_model(self):
		pelaporan_setup.ensure_roles()
		pelaporan_setup.ensure_permissions()
		name = pelaporan_setup.ensure_workflow()
		wf = frappe.get_doc("Workflow", name)
		self.assertEqual(wf.document_type, "Sentra Report Cycle")
		self.assertEqual(wf.workflow_state_field, "status")
		states = {s.state for s in wf.states}
		self.assertEqual(
			states,
			{
				"Dibuka", "Draf", "Diajukan untuk Validasi", "Dikembalikan",
				"Tervalidasi", "Disetujui", "Dikirim Eksternal", "Diterima",
				"Perlu Koreksi", "Ditutup",
			},
		)
		# semua state non-finansial: doc_status 0 (tidak menyentuh gate Tahap 2)
		self.assertTrue(all(str(s.doc_status) == "0" for s in wf.states))
		# idempoten
		pelaporan_setup.ensure_workflow()
		self.assertEqual(frappe.db.count("Workflow", {"name": name}), 1)

	def test_pelaporan_roles_can_read_cycles(self):
		pelaporan_setup.ensure_roles()
		pelaporan_setup.ensure_permissions()
		perms = frappe.get_all(
			"Custom DocPerm",
			filters={"parent": "Sentra Report Cycle", "role": "Pelaporan Penyusun"},
			fields=["read", "write"],
		)
		self.assertTrue(perms and perms[0].read)

	def test_penyusun_can_create_cycles_but_not_edit_register(self):
		pelaporan_setup.ensure_roles()
		pelaporan_setup.ensure_permissions()
		cycle_perm = frappe.get_all(
			"Custom DocPerm",
			filters={"parent": CYCLE_DOCTYPE, "role": "Pelaporan Penyusun"},
			fields=["create", "write"],
		)
		self.assertTrue(cycle_perm and cycle_perm[0].create)
		self.assertTrue(cycle_perm[0].write)
		# the register (Report Card) stays read-only for pelaporan roles —
		# activating a family is a governance act, not a Penyusun act
		card_perm = frappe.get_all(
			"Custom DocPerm",
			filters={"parent": "Sentra Report Card", "role": "Pelaporan Penyusun"},
			fields=["read", "write", "create"],
		)
		self.assertTrue(card_perm and card_perm[0].read)
		self.assertFalse(card_perm[0].write)
		self.assertFalse(card_perm[0].create)


class TestPelaporanWorkflowEnforced(FrappeTestCase):
	"""The active workflow must reject a status jump that has no transition."""

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		pelaporan_setup.ensure_roles()
		pelaporan_setup.ensure_permissions()
		pelaporan_setup.ensure_workflow()
		set_cycle_workflow_active(1)

	def tearDown(self):
		frappe.db.rollback()
		set_cycle_workflow_active(1)

	def test_illegal_status_jump_rejected(self):
		card = make_card("T3-WF", status="Aktif")
		cyc = make_cycle(card, "2026-07")
		cyc.status = "Disetujui"  # Dibuka -> Disetujui: no declared transition
		with self.assertRaises(WorkflowPermissionError):
			cyc.save()


class TestPelaporanSeed(FrappeTestCase):
	def test_seed_creates_11_cards_perlu_verifikasi(self):
		pelaporan_setup.ensure_roles()
		pelaporan_setup.seed_report_cards()
		codes = [c["report_code"] for c in pelaporan_setup.SEED_CARDS]
		self.assertEqual(len(codes), 11)
		for code in codes:
			self.assertEqual(
				frappe.db.get_value("Sentra Report Card", code, "status"),
				"Perlu Verifikasi",
			)

	def test_seed_idempotent_and_preserves_manual_edits(self):
		pelaporan_setup.ensure_roles()
		pelaporan_setup.seed_report_cards()
		# operator memverifikasi satu card → Aktif; seed ulang tidak boleh menimpa
		frappe.db.set_value("Sentra Report Card", "RPT-INM", "status", "Aktif")
		created = pelaporan_setup.seed_report_cards()
		self.assertEqual(created, [])
		self.assertEqual(
			frappe.db.get_value("Sentra Report Card", "RPT-INM", "status"), "Aktif"
		)

	def test_restricted_families_marked_terbatas(self):
		pelaporan_setup.ensure_roles()
		pelaporan_setup.seed_report_cards()
		for code in ("RPT-IKP", "RPT-AMPSR"):
			self.assertEqual(
				frappe.db.get_value("Sentra Report Card", code, "kerahasiaan"), "Terbatas"
			)
