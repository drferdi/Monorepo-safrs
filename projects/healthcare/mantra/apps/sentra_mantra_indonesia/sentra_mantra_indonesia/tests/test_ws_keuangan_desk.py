"""Keuangan desk wave 2 — pipeline age, AR buckets, aging penjamin."""

from contextlib import ExitStack
from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_indonesia.ws_keuangan import (
	_aging_penjamin,
	_ar_aging_buckets,
	_ar_aging_cards,
	_pipeline,
	_procurement_pipeline,
	_recent_transactions,
	data,
)


class TestPipeline(TestCase):
	def test_orders_by_age_desc(self):
		def get_all(doctype, **kwargs):
			# Umur pipeline dihitung dari creation — modified me-reset umur
			# dokumen basi setiap kali diedit (C3-F9).
			self.assertIn("creation", kwargs["fields"])
			if doctype == "Purchase Order":
				return [
					{
						"name": "PO-OLD",
						"workflow_state": "Pending",
						"creation": "2026-07-01",
					}
				]
			if doctype == "Payment Entry":
				return [
					{
						"name": "PE-NEW",
						"workflow_state": "Pending",
						"creation": "2026-07-22",
					}
				]
			return []

		with (
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_keuangan.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_keuangan.frappe.get_all",
				side_effect=get_all,
			),
		):
			items = _pipeline()
		self.assertEqual(items[0]["title"], "PO PO-OLD")
		self.assertEqual(items[0]["right"], "22d")
		self.assertEqual(items[1]["title"], "PE PE-NEW")

	def test_procurement_pipeline_reports_all_native_stages(self):
		"""Dropping a stage, age, or confirmed amount must fail."""
		def get_list(doctype, **kwargs):
			if doctype == "Purchase Order":
				return [
					{"creation": "2026-07-22", "base_grand_total": 500000},
					{"creation": "2026-07-24", "base_grand_total": 400000},
					{"creation": "2026-07-25", "base_grand_total": 600000},
				]
			return [{"creation": "2026-07-25"}]

		with (
			patch(
				"sentra_mantra_indonesia.ws_keuangan.ws_common.can",
				return_value=True,
			),
			patch(
				"sentra_mantra_indonesia.ws_keuangan.today",
				return_value="2026-07-26",
			),
			patch(
				"sentra_mantra_indonesia.ws_keuangan.frappe.get_list",
				side_effect=get_list,
			),
		):
			stages = _procurement_pipeline()

		self.assertEqual(
			{stage["route"] for stage in stages},
			{
				"/app/material-request",
				"/app/purchase-order",
				"/app/purchase-receipt",
				"/app/purchase-invoice",
				"/app/payment-entry",
			},
		)
		purchase_order = next(
			stage for stage in stages if stage["route"] == "/app/purchase-order"
		)
		self.assertEqual(
			purchase_order,
			{
				"status": "pending",
				"count": 3,
				"amount": 1500000.0,
				"oldest_days": 4,
				"route": "/app/purchase-order",
			},
		)
		material_request = next(
			stage for stage in stages if stage["route"] == "/app/material-request"
		)
		self.assertNotIn("amount", material_request)

	def test_procurement_pipeline_omits_unauthorized_stages(self):
		"""Returning even aggregate stage data without read permission must fail."""
		with patch(
			"sentra_mantra_indonesia.ws_keuangan.ws_common.can",
			return_value=False,
		):
			self.assertEqual(_procurement_pipeline(), [])


class TestArAgingBuckets(TestCase):
	def test_four_buckets_ordered_including_empty(self):
		rows = [
			{"bucket": "0–30 hari", "outstanding": 100000, "n": 2},
			{"bucket": ">90 hari", "outstanding": 500000, "n": 1},
		]
		with (
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_keuangan.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_keuangan.frappe.db.sql",
				return_value=rows,
			),
		):
			items = _ar_aging_buckets()
		self.assertEqual([i["title"] for i in items], [
			"0–30 hari",
			"31–60 hari",
			"61–90 hari",
			">90 hari",
		])
		self.assertEqual(items[1]["sub"], "Kosong")
		self.assertIn("Rp", items[0]["right"])
		self.assertEqual(items[3]["sub"], "1 tagihan")

	def test_cards_omit_empty_buckets(self):
		rows = [{"bucket": "31–60 hari", "outstanding": 250000, "n": 4}]
		with (
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_keuangan.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_keuangan.frappe.db.sql",
				return_value=rows,
			),
		):
			cards = _ar_aging_cards()
		self.assertEqual(len(cards), 1)
		self.assertEqual(cards[0]["label"], "AR 31–60 hari")

	def test_no_permission_empty(self):
		with patch("sentra_mantra_indonesia.ws_keuangan.ws_common.can", return_value=False):
			self.assertEqual(_ar_aging_buckets(), [])
			self.assertEqual(_ar_aging_cards(), [])


class TestAging(TestCase):
	def test_top_customers_for_accounts_role(self):
		rows = [
			{
				"customer": "CUST-1",
				"customer_name": "BPJS",
				"outstanding": 1500000,
				"n": 3,
				"over_90": 400000,
			}
		]
		with (
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.has_role", return_value=True),
			patch("sentra_mantra_indonesia.ws_keuangan.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_keuangan.frappe.db.sql",
				return_value=rows,
			),
		):
			items = _aging_penjamin()
		self.assertEqual(items[0]["title"], "BPJS")
		self.assertIn("Rp", items[0]["right"])
		self.assertIn(">90h", items[0]["sub"])

	def test_named_rows_hidden_without_accounts_role(self):
		"""Baris bernama (bisa memuat pasien self-pay) tersembunyi tanpa role akuntansi (C3-F5)."""
		with (
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_keuangan.ws_common.has_role", return_value=False),
		):
			self.assertEqual(_aging_penjamin(), [])
			self.assertEqual(_recent_transactions(), [])


class TestFinanceCockpitEndpoint(TestCase):
	def _base_patches(self):
		return (
			patch("sentra_mantra_indonesia.ws_keuangan._cards", return_value=[]),
			patch(
				"sentra_mantra_indonesia.ws_keuangan._ar_aging_cards",
				return_value=[],
			),
			patch(
				"sentra_mantra_indonesia.ws_keuangan._ar_aging_buckets",
				return_value=[],
			),
			patch(
				"sentra_mantra_indonesia.ws_keuangan._procurement_pipeline",
				return_value=[],
			),
			patch("sentra_mantra_indonesia.ws_keuangan._pipeline", return_value=[]),
			patch(
				"sentra_mantra_indonesia.ws_keuangan._aging_penjamin",
				return_value=[],
			),
			patch(
				"sentra_mantra_indonesia.ws_keuangan._recent_transactions",
				return_value=[],
			),
		)

	def test_closed_gate_retains_note_and_omits_gl_balances(self):
		"""Showing balance metrics while the Class C gate is closed must fail."""
		with ExitStack() as stack:
			for context in self._base_patches():
				stack.enter_context(context)
			stack.enter_context(
				patch(
					"sentra_mantra_indonesia.ws_keuangan._gl_gate_open",
					return_value=False,
				)
			)
			payload = data(as_of_date="2026-07-26")

		self.assertNotIn("financial_position", payload)
		self.assertNotIn("daily_movement", payload)
		self.assertIn("Gate GL Tahap 2 masih tertutup", payload["note"]["title"])
		self.assertEqual(payload["cards"][0]["label"], "Gate GL Tahap 2")
		self.assertEqual(payload["cards"][0]["value"], "Tertutup")

	def test_open_gate_exposes_traceable_financial_sections(self):
		"""Dropping a required open-gate section or metric status must fail."""
		sample = {
			"as_of": "2026-07-26",
			"metrics": [
				{
					"key": "sample",
					"label": "Sample",
					"value": 100,
					"status": "confirmed",
					"as_of": "2026-07-26",
					"route": "/app/general-ledger",
				}
			],
		}
		with ExitStack() as stack:
			for context in self._base_patches():
				stack.enter_context(context)
			for context in (
				patch(
					"sentra_mantra_indonesia.ws_keuangan._gl_gate_open",
					return_value=True,
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.ws_common.can",
					return_value=True,
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.financial_position",
					return_value=sample,
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.daily_movement",
					return_value=sample,
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.revenue_mix",
					return_value=sample["metrics"],
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.expense_mix",
					return_value=sample["metrics"],
				),
			):
				stack.enter_context(context)
			payload = data(as_of_date="2026-07-26", from_date="2026-07-01")

		for key in (
			"financial_position",
			"daily_movement",
			"revenue_mix",
			"expense_mix",
		):
			self.assertIn(key, payload)
		for section in payload["financial_position"]["metrics"]:
			self.assertTrue(section["as_of"])
			self.assertIn(section["status"], {"confirmed", "exception"})
		self.assertTrue(
			any(card["label"] == "Sample" for card in payload["cards"]),
			"Financial metrics must be projected into rendered cards.",
		)
		panel_titles = {panel["title"] for panel in payload["panels"]}
		self.assertIn("Revenue Mix", panel_titles)
		self.assertIn("Expense Mix", panel_titles)

	def test_gl_permission_removes_balance_and_expense_sections(self):
		"""Leaking GL aggregates without GL Entry read permission must fail."""
		def can(doctype):
			return doctype != "GL Entry"

		with ExitStack() as stack:
			for context in self._base_patches():
				stack.enter_context(context)
			for context in (
				patch(
					"sentra_mantra_indonesia.ws_keuangan._gl_gate_open",
					return_value=True,
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.ws_common.can",
					side_effect=can,
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.daily_movement",
					return_value={"as_of": "2026-07-26", "metrics": []},
				),
				patch(
					"sentra_mantra_indonesia.ws_keuangan.revenue_mix",
					return_value=[],
				),
			):
				stack.enter_context(context)
			payload = data(as_of_date="2026-07-26")

		self.assertNotIn("financial_position", payload)
		self.assertNotIn("expense_mix", payload)
		self.assertIn("daily_movement", payload)
		self.assertIn("revenue_mix", payload)
