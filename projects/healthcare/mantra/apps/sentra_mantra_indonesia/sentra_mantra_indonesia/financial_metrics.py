"""Permission-neutral aggregate builders for the MANTRA operating cockpit."""

from __future__ import annotations

import frappe
from frappe.utils import flt, getdate

ALLOWED_STATUSES = {"confirmed", "pending", "unreconciled", "exception"}
SERVICE_LINES = ("Rawat Jalan", "Rawat Inap", "Farmasi")


def metric(
	*,
	key: str,
	label: str,
	value: float | int | str,
	status: str,
	as_of: str,
	route: str,
	unit: str | None = None,
	note: str | None = None,
) -> dict:
	"""Build one raw, traceable cockpit metric."""
	if status not in ALLOWED_STATUSES:
		frappe.throw(f"Unsupported cockpit metric status: {status}.")
	if not as_of:
		frappe.throw("Cockpit metric requires an as-of timestamp.")
	if not route:
		frappe.throw("Cockpit metric requires a source route.")
	result = {
		"key": key,
		"label": label,
		"value": value,
		"status": status,
		"as_of": str(as_of),
		"route": route,
	}
	if unit:
		result["unit"] = unit
	if note:
		result["note"] = note
	return result


def _scalar(query: str, values: tuple) -> float:
	rows = frappe.db.sql(query, values, as_dict=True)
	return flt(frappe._dict(rows[0]).value if rows else 0)


def _exception_metrics(definitions, as_of: str, note: str) -> list[dict]:
	return [
		metric(
			key=key,
			label=label,
			value=0,
			status="exception",
			as_of=as_of,
			route=route,
			unit="IDR",
			note=note,
		)
		for key, label, route in definitions
	]


def financial_position(as_of_date: str) -> dict:
	"""Return Cash/Bank, AR, and AP without account or party names."""
	as_of = str(getdate(as_of_date))
	definitions = (
		("cash_bank", "Cash and Bank", "/app/general-ledger"),
		("accounts_receivable", "Accounts Receivable", "/app/sales-invoice"),
		("accounts_payable", "Accounts Payable", "/app/purchase-invoice"),
	)
	try:
		cash_bank = _scalar(
			"""
			select ifnull(sum(gle.debit - gle.credit), 0) as value
			from `tabGL Entry` gle
			inner join `tabAccount` account on account.name = gle.account
			where gle.docstatus = 1
				and gle.posting_date <= %s
				and account.account_type in ('Cash', 'Bank')
			""",
			(as_of,),
		)
		receivable = _scalar(
			"""
			select ifnull(sum(outstanding_amount), 0) as value
			from `tabSales Invoice`
			where docstatus = 1 and posting_date <= %s
			""",
			(as_of,),
		)
		payable = _scalar(
			"""
			select ifnull(sum(outstanding_amount), 0) as value
			from `tabPurchase Invoice`
			where docstatus = 1 and posting_date <= %s
			""",
			(as_of,),
		)
	except Exception:
		metrics = _exception_metrics(
			definitions,
			as_of,
			"Financial position query failed; value is not confirmed.",
		)
	else:
		metrics = [
			metric(
				key=key,
				label=label,
				value=value,
				status="confirmed",
				as_of=as_of,
				route=route,
				unit="IDR",
			)
			for (key, label, route), value in zip(
				definitions,
				(cash_bank, receivable, payable),
				strict=True,
			)
		]
	return {"as_of": as_of, "metrics": metrics}


def daily_movement(posting_date: str) -> dict:
	"""Return submitted same-day receipts, disbursements, and net movement."""
	as_of = str(getdate(posting_date))
	definitions = (
		("receipts", "Receipts", "/app/payment-entry"),
		("disbursements", "Disbursements", "/app/payment-entry"),
		("net_movement", "Net Movement", "/app/payment-entry"),
	)
	try:
		receipts = _scalar(
			"""
			select ifnull(sum(base_paid_amount), 0) as value
			from `tabPayment Entry`
			where docstatus = 1 and payment_type = 'Receive' and posting_date = %s
			""",
			(as_of,),
		)
		disbursements = _scalar(
			"""
			select ifnull(sum(base_paid_amount), 0) as value
			from `tabPayment Entry`
			where docstatus = 1 and payment_type = 'Pay' and posting_date = %s
			""",
			(as_of,),
		)
	except Exception:
		metrics = _exception_metrics(
			definitions,
			as_of,
			"Daily movement query failed; value is not confirmed.",
		)
	else:
		metrics = [
			metric(
				key=key,
				label=label,
				value=value,
				status="confirmed",
				as_of=as_of,
				route=route,
				unit="IDR",
			)
			for (key, label, route), value in zip(
				definitions,
				(receipts, disbursements, receipts - disbursements),
				strict=True,
			)
		]
	return {"as_of": as_of, "metrics": metrics}


def _normalize_service_line(value: str | None) -> str:
	return value if value in SERVICE_LINES else "Unmapped"


def revenue_mix(from_date: str, to_date: str) -> list[dict]:
	"""Group submitted invoice revenue by exact approved Cost Center names."""
	as_of = str(getdate(to_date))
	try:
		rows = frappe.db.sql(
			"""
			select cc.cost_center_name as dimension,
				ifnull(sum(item.base_net_amount), 0) as amount
			from `tabSales Invoice Item` item
			inner join `tabSales Invoice` invoice on invoice.name = item.parent
			left join `tabCost Center` cc on cc.name = item.cost_center
			where invoice.docstatus = 1
				and invoice.posting_date between %s and %s
			group by cc.cost_center_name
			""",
			(str(getdate(from_date)), as_of),
			as_dict=True,
		)
	except Exception:
		return [
			metric(
				key="revenue_unmapped",
				label="Unmapped",
				value=0,
				status="exception",
				as_of=as_of,
				route="/app/sales-invoice",
				unit="IDR",
				note="Revenue mix query failed.",
			)
		]

	amounts = {line: 0.0 for line in (*SERVICE_LINES, "Unmapped")}
	for row in rows:
		row = frappe._dict(row)
		amounts[_normalize_service_line(row.dimension)] += flt(row.amount)
	return [
		metric(
			key=f"revenue_{frappe.scrub(line)}",
			label=line,
			value=amounts[line],
			status="confirmed",
			as_of=as_of,
			route="/app/sales-invoice",
			unit="IDR",
		)
		for line in (*SERVICE_LINES, "Unmapped")
	]


def expense_mix(from_date: str, to_date: str) -> list[dict]:
	"""Group submitted expense GL by Account and Cost Center."""
	as_of = str(getdate(to_date))
	try:
		rows = frappe.db.sql(
			"""
			select gle.account, gle.cost_center,
				ifnull(sum(gle.debit - gle.credit), 0) as amount
			from `tabGL Entry` gle
			inner join `tabAccount` account on account.name = gle.account
			where gle.docstatus = 1
				and gle.posting_date between %s and %s
				and account.root_type = 'Expense'
			group by gle.account, gle.cost_center
			order by amount desc, gle.account asc, gle.cost_center asc
			""",
			(str(getdate(from_date)), as_of),
			as_dict=True,
		)
	except Exception:
		return [
			metric(
				key="expense_mix",
				label="Expense Mix",
				value=0,
				status="exception",
				as_of=as_of,
				route="/app/general-ledger",
				unit="IDR",
				note="Expense mix query failed.",
			)
		]

	return [
		metric(
			key=f"expense_{index}",
			label=f"{row.account} · {row.cost_center or 'No Cost Center'}",
			value=flt(row.amount),
			status="confirmed",
			as_of=as_of,
			route="/app/general-ledger",
			unit="IDR",
		)
		for index, row in enumerate((frappe._dict(row) for row in rows), start=1)
	]
