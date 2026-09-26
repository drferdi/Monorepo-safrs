"""Kontrak Kartu Keputusan — dedup, batas harian, de-identifikasi, narasi (§3)."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.agents import contract, narration
from sentra_mantra_core.tests import agent_fixtures as fx


def _evidence(value="1"):
	return [
		{
			"label": "Temuan uji",
			"value": value,
			"raw_value": 1,
			"source_doctype": "Sentra Agent Rule",
			"source_name": "UJI-PULSE",
			"tone": "Netral",
		}
	]


def _options():
	return [{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}]


class TestDecisionContract(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def setUp(self):
		self.agent = fx.make_agent("KONTRAK", rules=[fx.rule()])
		self.ctx = fx.context(self.agent)
		self.rule = self.agent.rules[0]

	def tearDown(self):
		frappe.db.rollback()

	def _emit(self, subject="kondisi", title="Kartu uji kontrak", **kwargs):
		payload = {
			"subject": subject,
			"title": title,
			"evidence": _evidence(),
			"options": _options(),
			"trigger_explanation": "Dipicu karena aturan uji melaporkan 1 temuan.",
		}
		payload.update(kwargs)
		return contract.emit_decision_card(self.ctx, self.rule, **payload)

	# -- dedup -------------------------------------------------------------

	def test_dedup_key_has_no_date_component(self):
		key = contract.build_dedup_key("AGEN", "ATURAN", "subjek")
		self.assertEqual(key, "AGEN:ATURAN:subjek")

	def test_same_condition_twice_publishes_one_card(self):
		first = self._emit()
		second = self._emit()
		self.assertFalse(first["skipped"])
		self.assertTrue(second["skipped"])
		self.assertEqual(second["card"], first["card"])

	def test_condition_reopens_after_the_card_is_decided(self):
		first = self._emit()
		frappe.db.set_value("Sentra Decision Card", first["card"], "status", "Diputuskan")
		second = self._emit()
		self.assertFalse(second["skipped"])
		self.assertNotEqual(second["card"], first["card"])

	# -- batas anti-banjir --------------------------------------------------

	def test_eighth_card_of_the_day_is_queued_not_published(self):
		baseline = contract.published_today()
		outcomes = [
			self._emit(subject=f"batas-{i}")
			for i in range(contract.MAX_CARDS_PER_DAY + 1 - baseline)
		]
		self.assertTrue(all(o["published"] for o in outcomes[:-1]))
		self.assertFalse(outcomes[-1]["published"])
		self.assertTrue(outcomes[-1]["queued"])
		self.assertEqual(contract.published_today(), contract.MAX_CARDS_PER_DAY)
		self.assertEqual(
			frappe.db.get_value(
				"Sentra Decision Card", outcomes[-1]["card"], "queued_for_summary"
			),
			1,
		)

	# -- de-identifikasi ----------------------------------------------------

	def test_card_with_employee_name_is_rejected(self):
		employee = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": "Sintetis Namasamaran",
				"company": frappe.db.get_value("Company", {}, "name"),
				"date_of_birth": "1990-01-01",
				"date_of_joining": "2026-01-01",
				"gender": frappe.db.get_value("Gender", {}, "name"),
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		with self.assertRaises(frappe.ValidationError):
			self._emit(
				subject="nama-karyawan",
				title=f"Lembur berlebih pada {employee.employee_name}",
			)

	def test_card_with_nik_pattern_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self._emit(subject="nik", title="Pasien dengan NIK 9999000000000001 tertunda")

	def test_card_with_medical_record_number_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self._emit(
				subject="rm",
				title="Berkas tertunda",
				trigger_explanation="Dipicu karena berkas RM-000123 belum lengkap.",
			)

	def test_identifier_scan_ignores_clean_text(self):
		self.assertIsNone(
			contract.scan_for_identifiers("Selisih opname farmasi Rp 1.200.000 pada 3 item")
		)

	def test_aggregate_card_is_accepted(self):
		outcome = self._emit(
			subject="agregat", title="Selisih opname farmasi melewati ambang"
		)
		self.assertTrue(frappe.db.exists(contract.CARD_DOCTYPE, outcome["card"]))

	# -- registry handler ---------------------------------------------------

	def test_option_with_unregistered_handler_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self._emit(
				subject="handler",
				options=[{"label": "Setujui PO", "handler": "erpnext.approve_po"}],
			)

	# -- narasi -------------------------------------------------------------

	def test_narrative_defaults_to_template_and_quotes_the_facts(self):
		outcome = self._emit(subject="narasi")
		card = frappe.get_doc("Sentra Decision Card", outcome["card"])
		self.assertEqual(card.narrative_source, narration.NARRATIVE_SOURCE_TEMPLATE)
		self.assertIn("Temuan uji: 1", card.narrative)

	def test_card_still_publishes_when_the_narration_layer_fails(self):
		with patch.object(narration, "narrate", side_effect=RuntimeError("penarasi mati")):
			outcome = self._emit(subject="narasi-gagal", title="Kondisi tetap terbit")
		self.assertTrue(frappe.db.exists(contract.CARD_DOCTYPE, outcome["card"]))
		self.assertFalse(outcome["narration_ok"])
		card = frappe.get_doc("Sentra Decision Card", outcome["card"])
		self.assertEqual(card.narrative_source, narration.NARRATIVE_SOURCE_TEMPLATE)
		self.assertEqual(card.narrative, "Kondisi tetap terbit")

	def test_unknown_severity_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self._emit(subject="tingkat", severity="Sangat Mendesak Sekali")
