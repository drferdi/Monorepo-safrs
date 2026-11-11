"""Read-only financial cutover readiness and reconciliation checks."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core import financial_cutover
from sentra_mantra_core.saldo_awal import build_opening_je


class TestFinancialCutoverPreflight(FrappeTestCase):
	def _count_without(self, missing_doctype):
		real_count = frappe.db.count

		def count(doctype, filters=None, **kwargs):
			if doctype == missing_doctype:
				return 0
			return real_count(doctype, filters=filters, **kwargs)

		return count

	def test_preflight_blocks_an_invalid_opening_balance(self):
		"""Removing opening-balance validation must make this test fail."""
		with patch.object(
			financial_cutover.saldo_awal,
			"preview",
			return_value={
				"ok": False,
				"issues": ["OPENING kosong"],
				"cutover_date": "2026-08-01",
			},
		):
			report = financial_cutover.preflight()

		self.assertFalse(report["ok"])
		self.assertIn("opening_balance", report["blocking"])

	def test_preflight_blocks_when_cash_or_bank_master_is_missing(self):
		"""Treating a site with no postable cash/bank account as ready must fail."""
		real_count = frappe.db.count

		def count_without_cash_or_bank(doctype, filters=None, **kwargs):
			if doctype == "Account" and filters and filters.get("account_type") == ("in", ("Cash", "Bank")):
				return 0
			return real_count(doctype, filters=filters, **kwargs)

		with patch.object(frappe.db, "count", side_effect=count_without_cash_or_bank):
			report = financial_cutover.preflight()

		self.assertIn("cash_or_bank_account", report["blocking"])

	def test_preflight_does_not_create_gl_entries(self):
		"""Any write performed by preflight must make this test fail."""
		before = frappe.db.count("GL Entry")

		financial_cutover.preflight()

		self.assertEqual(frappe.db.count("GL Entry"), before)

	def test_preflight_reports_every_required_master_count(self):
		"""Dropping a mandatory finance-master count must make this test fail."""
		report = financial_cutover.preflight()

		self.assertEqual(
			set(report["counts"]),
			{
				"companies",
				"postable_accounts",
				"cost_centers",
				"warehouses",
				"cash_or_bank_accounts",
				"modes_of_payment",
				"finance_users",
			},
		)
		self.assertTrue(all(isinstance(value, int) for value in report["counts"].values()))

	def test_preflight_blocks_when_company_is_missing(self):
		"""A missing Company must never produce a ready report."""
		with patch.object(
			frappe.db,
			"count",
			side_effect=self._count_without("Company"),
		):
			report = financial_cutover.preflight()

		self.assertIn("company", report["blocking"])

	def test_preflight_blocks_when_cost_center_is_missing(self):
		"""A missing Company cost center must never produce a ready report."""
		with patch.object(
			frappe.db,
			"count",
			side_effect=self._count_without("Cost Center"),
		):
			report = financial_cutover.preflight()

		self.assertIn("cost_center", report["blocking"])

	def test_preflight_blocks_when_mode_of_payment_is_missing(self):
		"""A missing payment mode must never produce a ready report."""
		with patch.object(
			frappe.db,
			"count",
			side_effect=self._count_without("Mode of Payment"),
		):
			report = financial_cutover.preflight()

		self.assertIn("mode_of_payment", report["blocking"])

	def test_preflight_blocks_when_no_active_accounts_manager_exists(self):
		"""Removing every Accounts Manager assignment must block cutover."""
		real_get_all = frappe.get_all

		def get_all_without_finance_role(doctype, *args, **kwargs):
			if doctype == "Has Role":
				return []
			return real_get_all(doctype, *args, **kwargs)

		with patch.object(frappe, "get_all", side_effect=get_all_without_finance_role):
			report = financial_cutover.preflight()

		self.assertIn("finance_user", report["blocking"])

	def test_preflight_blocks_when_cutover_date_has_no_fiscal_year(self):
		"""A cutover date outside every Fiscal Year must block cutover."""
		with (
			patch.object(
				financial_cutover.saldo_awal,
				"preview",
				return_value={
					"ok": True,
					"issues": [],
					"cutover_date": "2099-08-01",
				},
			),
			patch.object(frappe.db, "exists", return_value=False),
		):
			report = financial_cutover.preflight()

		self.assertIn("fiscal_year", report["blocking"])

	def test_preflight_blocks_a_partially_open_gate(self):
		"""Mixed Approved doc_status values must fail closed."""
		with patch.object(
			financial_cutover.tahap2_gate,
			"status",
			return_value={
				"gate_terbuka": False,
				"workflows": [
					{"doc_status": 1, "approved_masih_draft": 0},
					{"doc_status": 0, "approved_masih_draft": 0},
					{"doc_status": 0, "approved_masih_draft": 0},
				],
			},
		):
			report = financial_cutover.preflight()

		self.assertIn("gate_partially_open", report["blocking"])

	def test_preflight_warns_when_approved_documents_remain_draft(self):
		"""Removing the stranded-approved-document warning must fail."""
		with patch.object(
			financial_cutover.tahap2_gate,
			"status",
			return_value={
				"gate_terbuka": False,
				"workflows": [
					{"doc_status": 0, "approved_masih_draft": 2},
					{"doc_status": 0, "approved_masih_draft": 0},
					{"doc_status": 0, "approved_masih_draft": 0},
				],
			},
		):
			report = financial_cutover.preflight()

		self.assertIn("approved_documents_remain_draft", report["warnings"])


class TestFinancialCutoverReconciliation(FrappeTestCase):
	def _query_results(
		self,
		*,
		total_debit=1_000_000,
		total_credit=1_000_000,
		cash_bank_balance=250_000,
		receivable_gl=300_000,
		payable_gl=175_000,
		receivable_source=300_000,
		payable_source=175_000,
		source_documents=None,
	):
		return [
			[
				frappe._dict(
					total_debit=total_debit,
					total_credit=total_credit,
					cash_bank_balance=cash_bank_balance,
					receivable_gl=receivable_gl,
					payable_gl=payable_gl,
				)
			],
			[frappe._dict(outstanding=receivable_source)],
			[frappe._dict(outstanding=payable_source)],
			[
				frappe._dict(voucher_no=name)
				for name in (source_documents or ["ACC-JV-2026-00001"])
			],
		]

	def test_reconcile_reports_balanced_submitted_sources(self):
		"""Dropping a submitted source aggregate must make reconciliation fail."""
		with patch.object(
			frappe.db,
			"sql",
			side_effect=self._query_results(),
		):
			report = financial_cutover.reconcile("2026-08-01")

		self.assertTrue(report["ok"])
		self.assertEqual(report["as_of_date"], "2026-08-01")
		self.assertEqual(report["total_debit"], 1_000_000)
		self.assertEqual(report["total_credit"], 1_000_000)
		self.assertEqual(report["gl_difference"], 0)
		self.assertEqual(report["cash_bank_balance"], 250_000)
		self.assertEqual(report["receivable_balance"], 300_000)
		self.assertEqual(report["payable_balance"], 175_000)
		self.assertEqual(report["unreconciled"], [])
		self.assertEqual(report["source_documents"], ["ACC-JV-2026-00001"])

	def test_reconcile_reports_gl_and_source_balance_differences(self):
		"""Masking any GL, receivable, or payable difference must fail."""
		with patch.object(
			frappe.db,
			"sql",
			side_effect=self._query_results(
				total_credit=999_900,
				receivable_gl=299_000,
				payable_gl=174_500,
			),
		):
			report = financial_cutover.reconcile("2026-08-01")

		self.assertFalse(report["ok"])
		self.assertEqual(report["gl_difference"], 100)
		self.assertEqual(
			[item["type"] for item in report["unreconciled"]],
			["general_ledger", "receivable", "payable"],
		)
		self.assertEqual(report["unreconciled"][1]["difference"], -1_000)
		self.assertEqual(report["unreconciled"][2]["difference"], -500)

	def test_reconcile_rejects_a_missing_as_of_date(self):
		"""Silently querying without an as-of boundary must fail."""
		with self.assertRaises(frappe.ValidationError):
			financial_cutover.reconcile(None)

	def test_reconcile_lists_submitted_source_and_excludes_draft_and_cancelled(self):
		"""Including a draft or cancelled voucher in drill-down must fail."""
		company = (
			frappe.defaults.get_global_default("company")
			or frappe.db.get_value("Company", {}, "name")
		)
		asset = frappe.db.get_value(
			"Account",
			{"company": company, "is_group": 0, "root_type": "Asset"},
			"name",
		)
		equity = frappe.db.get_value(
			"Account",
			{"company": company, "is_group": 0, "root_type": "Equity"},
			"name",
		)
		if not (asset and equity):
			self.skipTest("Synthetic reconciliation requires postable Asset and Equity accounts.")

		rows = [
			{"account": asset, "debit": 1_000, "credit": 0},
			{"account": equity, "debit": 0, "credit": 1_000},
		]
		submitted = build_opening_je(rows, "2026-08-01", submit=True)
		draft = build_opening_je(rows, "2026-08-01", submit=False)
		cancelled = build_opening_je(rows, "2026-08-01", submit=True)
		cancelled.cancel()

		report = financial_cutover.reconcile("2026-08-01")

		self.assertIn(submitted.name, report["source_documents"])
		self.assertNotIn(draft.name, report["source_documents"])
		self.assertNotIn(cancelled.name, report["source_documents"])
