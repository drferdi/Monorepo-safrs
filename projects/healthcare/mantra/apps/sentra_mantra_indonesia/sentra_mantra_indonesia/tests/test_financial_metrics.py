"""Canonical, source-traceable financial cockpit metrics."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.financial_metrics import (
	daily_movement,
	expense_mix,
	financial_position,
	metric,
	revenue_mix,
)


class TestMetricContract(FrappeTestCase):
	def test_metric_keeps_raw_value_and_traceability(self):
		"""Formatting a numeric value or dropping status metadata must fail."""
		result = metric(
			key="cash_bank",
			label="Cash and Bank",
			value=1_250_000.5,
			status="confirmed",
			as_of="2026-07-26",
			route="/app/general-ledger",
			unit="IDR",
		)

		self.assertEqual(
			result,
			{
				"key": "cash_bank",
				"label": "Cash and Bank",
				"value": 1_250_000.5,
				"status": "confirmed",
				"as_of": "2026-07-26",
				"route": "/app/general-ledger",
				"unit": "IDR",
			},
		)

	def test_metric_rejects_unknown_status_and_missing_traceability(self):
		"""Accepting an untraceable or ambiguous metric must fail."""
		for kwargs in (
			{"status": "draft", "as_of": "2026-07-26", "route": "/app/x"},
			{"status": "confirmed", "as_of": "", "route": "/app/x"},
			{"status": "confirmed", "as_of": "2026-07-26", "route": ""},
		):
			with self.assertRaises(frappe.ValidationError):
				metric(key="x", label="X", value=0, **kwargs)


class TestFinancialPosition(FrappeTestCase):
	def test_position_uses_submitted_sources_and_accounting_signs(self):
		"""Including draft/cancelled sources or reversing balance signs must fail."""
		rows = [
			[{"value": 1_500_000}],
			[{"value": 700_000}],
			[{"value": 450_000}],
		]
		with patch.object(frappe.db, "sql", side_effect=rows) as sql:
			result = financial_position("2026-07-26")

		self.assertEqual(
			[entry["value"] for entry in result["metrics"]],
			[1_500_000.0, 700_000.0, 450_000.0],
		)
		self.assertTrue(
			all(entry["status"] == "confirmed" for entry in result["metrics"])
		)
		for call in sql.call_args_list:
			self.assertIn("docstatus = 1", call.args[0].lower())
			self.assertNotIn("customer_name", call.args[0].lower())
			self.assertNotIn("supplier_name", call.args[0].lower())

	def test_empty_position_is_confirmed_zero(self):
		"""Treating a valid empty ledger as unknown must fail."""
		with patch.object(frappe.db, "sql", return_value=[{"value": None}]):
			result = financial_position("2026-07-26")

		self.assertEqual([entry["value"] for entry in result["metrics"]], [0, 0, 0])
		self.assertTrue(
			all(entry["status"] == "confirmed" for entry in result["metrics"])
		)

	def test_query_failure_returns_exception_metrics(self):
		"""Silently reporting query failure as confirmed zero must fail."""
		with patch.object(frappe.db, "sql", side_effect=RuntimeError("synthetic")):
			result = financial_position("2026-07-26")

		self.assertTrue(
			all(entry["status"] == "exception" for entry in result["metrics"])
		)
		self.assertTrue(all(entry.get("note") for entry in result["metrics"]))


class TestDailyMovement(FrappeTestCase):
	def test_movement_uses_only_submitted_payment_entries(self):
		"""Counting draft receipts or reversing payment direction must fail."""
		with patch.object(
			frappe.db,
			"sql",
			side_effect=[[{"value": 900_000}], [{"value": 350_000}]],
		) as sql:
			result = daily_movement("2026-07-26")

		self.assertEqual(
			[entry["value"] for entry in result["metrics"]],
			[900_000.0, 350_000.0, 550_000.0],
		)
		self.assertTrue(
			all("docstatus = 1" in call.args[0].lower() for call in sql.call_args_list)
		)


class TestFinancialMix(FrappeTestCase):
	def test_revenue_mix_maps_only_exact_approved_dimensions(self):
		"""Guessing a service line from free text or a partial name must fail."""
		rows = [
			{"dimension": "Rawat Jalan", "amount": 500_000},
			{"dimension": "Farmasi Barat", "amount": 300_000},
			{"dimension": None, "amount": 200_000},
		]
		with patch.object(frappe.db, "sql", return_value=rows):
			result = revenue_mix("2026-07-01", "2026-07-26")

		self.assertEqual(
			[(entry["label"], entry["value"]) for entry in result],
			[
				("Rawat Jalan", 500_000.0),
				("Rawat Inap", 0.0),
				("Farmasi", 0.0),
				("Unmapped", 500_000.0),
			],
		)
		self.assertTrue(all(entry["status"] == "confirmed" for entry in result))

	def test_expense_mix_keeps_account_and_cost_center_dimensions(self):
		"""Dropping either reviewed accounting dimension must fail."""
		rows = [
			{
				"account": "Medicine Expense - SYN",
				"cost_center": "Pharmacy - SYN",
				"amount": 275_000,
			}
		]
		with patch.object(frappe.db, "sql", return_value=rows):
			result = expense_mix("2026-07-01", "2026-07-26")

		self.assertEqual(result[0]["label"], "Medicine Expense - SYN · Pharmacy - SYN")
		self.assertEqual(result[0]["value"], 275_000.0)
		self.assertEqual(result[0]["route"], "/app/general-ledger")
