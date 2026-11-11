"""Read-only Tahap 2 cutover readiness and reconciliation checks."""

import frappe
from frappe.utils import flt, getdate

from sentra_mantra_core import saldo_awal, tahap2_gate


def _company() -> str | None:
	return (
		frappe.defaults.get_global_default("company")
		or frappe.db.get_value("Company", {}, "name")
	)


def _finance_user_count() -> int:
	users = set(
		frappe.get_all(
			"Has Role",
			filters={"parenttype": "User", "role": "Accounts Manager"},
			pluck="parent",
		)
	)
	if not users:
		return 0
	return frappe.db.count("User", {"name": ("in", tuple(users)), "enabled": 1})


def _master_counts(company: str | None) -> dict:
	company_filter = {"company": company} if company else {}
	return {
		"companies": frappe.db.count("Company"),
		"postable_accounts": frappe.db.count(
			"Account",
			{**company_filter, "is_group": 0},
		),
		"cost_centers": frappe.db.count("Cost Center", company_filter),
		"warehouses": frappe.db.count("Warehouse", company_filter),
		"cash_or_bank_accounts": frappe.db.count(
			"Account",
			{
				**company_filter,
				"is_group": 0,
				"account_type": ("in", ("Cash", "Bank")),
			},
		),
		"modes_of_payment": frappe.db.count("Mode of Payment", {"enabled": 1}),
		"finance_users": _finance_user_count(),
	}


def preflight() -> dict:
	"""Return a deterministic, read-only Tahap 2 readiness report."""
	opening_balance = saldo_awal.preview()
	gate = tahap2_gate.status()
	company = _company()
	counts = _master_counts(company)
	blocking: list[str] = []
	warnings: list[str] = []

	if not opening_balance.get("ok"):
		blocking.append("opening_balance")

	cutover_date = opening_balance.get("cutover_date")
	if cutover_date and not frappe.db.exists(
		"Fiscal Year",
		{
			"year_start_date": ("<=", cutover_date),
			"year_end_date": (">=", cutover_date),
		},
	):
		blocking.append("fiscal_year")

	if not counts["companies"]:
		blocking.append("company")
	if not counts["cash_or_bank_accounts"]:
		blocking.append("cash_or_bank_account")
	if not counts["cost_centers"]:
		blocking.append("cost_center")
	if not counts["modes_of_payment"]:
		blocking.append("mode_of_payment")
	if not counts["finance_users"]:
		blocking.append("finance_user")

	gate_states = {str(row.get("doc_status")) for row in gate.get("workflows", [])}
	if len(gate_states) > 1:
		blocking.append("gate_partially_open")
	if any(row.get("approved_masih_draft", 0) for row in gate.get("workflows", [])):
		warnings.append("approved_documents_remain_draft")

	return {
		"ok": not blocking,
		"blocking": blocking,
		"warnings": warnings,
		"gate": gate,
		"opening_balance": opening_balance,
		"counts": counts,
	}


def _difference(value: float) -> float:
	return round(flt(value), 2)


def reconcile(as_of_date: str) -> dict:
	"""Return aggregate, non-PHI reconciliation results through as_of_date."""
	if not as_of_date:
		frappe.throw("as_of_date is required.")
	as_of = str(getdate(as_of_date))
	params = {"as_of_date": as_of}

	gl = frappe.db.sql(
		"""
		SELECT
			COALESCE(SUM(gl.debit), 0) AS total_debit,
			COALESCE(SUM(gl.credit), 0) AS total_credit,
			COALESCE(SUM(
				CASE WHEN account.account_type IN ('Cash', 'Bank')
					THEN gl.debit - gl.credit ELSE 0 END
			), 0) AS cash_bank_balance,
			COALESCE(SUM(
				CASE WHEN account.account_type = 'Receivable'
					THEN gl.debit - gl.credit ELSE 0 END
			), 0) AS receivable_gl,
			COALESCE(SUM(
				CASE WHEN account.account_type = 'Payable'
					THEN gl.credit - gl.debit ELSE 0 END
			), 0) AS payable_gl
		FROM `tabGL Entry` gl
		LEFT JOIN `tabAccount` account ON account.name = gl.account
		WHERE gl.docstatus = 1
			AND COALESCE(gl.is_cancelled, 0) = 0
			AND gl.posting_date <= %(as_of_date)s
		""",
		params,
		as_dict=True,
	)[0]
	receivable = frappe.db.sql(
		"""
		SELECT COALESCE(SUM(outstanding_amount), 0) AS outstanding
		FROM `tabSales Invoice`
		WHERE docstatus = 1 AND posting_date <= %(as_of_date)s
		""",
		params,
		as_dict=True,
	)[0]
	payable = frappe.db.sql(
		"""
		SELECT COALESCE(SUM(outstanding_amount), 0) AS outstanding
		FROM `tabPurchase Invoice`
		WHERE docstatus = 1 AND posting_date <= %(as_of_date)s
		""",
		params,
		as_dict=True,
	)[0]
	source_rows = frappe.db.sql(
		"""
		SELECT DISTINCT gl.voucher_no
		FROM `tabGL Entry` gl
		WHERE gl.docstatus = 1
			AND COALESCE(gl.is_cancelled, 0) = 0
			AND gl.posting_date <= %(as_of_date)s
			AND gl.voucher_type IN (
				'Journal Entry',
				'Payment Entry',
				'Sales Invoice',
				'Purchase Invoice'
			)
		ORDER BY gl.voucher_no
		""",
		params,
		as_dict=True,
	)

	total_debit = flt(gl.total_debit)
	total_credit = flt(gl.total_credit)
	receivable_balance = flt(receivable.outstanding)
	payable_balance = flt(payable.outstanding)
	gl_difference = _difference(total_debit - total_credit)
	receivable_difference = _difference(flt(gl.receivable_gl) - receivable_balance)
	payable_difference = _difference(flt(gl.payable_gl) - payable_balance)
	unreconciled = []

	for difference_type, difference in (
		("general_ledger", gl_difference),
		("receivable", receivable_difference),
		("payable", payable_difference),
	):
		if difference:
			unreconciled.append({"type": difference_type, "difference": difference})

	return {
		"ok": not unreconciled,
		"as_of_date": as_of,
		"total_debit": total_debit,
		"total_credit": total_credit,
		"gl_difference": gl_difference,
		"cash_bank_balance": flt(gl.cash_bank_balance),
		"receivable_balance": receivable_balance,
		"payable_balance": payable_balance,
		"unreconciled": unreconciled,
		"source_documents": [row.voucher_no for row in source_rows],
	}
