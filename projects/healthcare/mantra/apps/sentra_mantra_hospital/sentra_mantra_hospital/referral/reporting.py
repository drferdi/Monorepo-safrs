"""Permission-safe aggregate reporting for referral operations."""

import frappe
from frappe.utils import flt, getdate

REPORTING_ROLES = {
	"Accounts User",
	"Accounts Manager",
	"MANTRA Director",
	"System Manager",
}


def _require_reporting_access() -> None:
	if not set(frappe.get_roles()) & REPORTING_ROLES:
		frappe.throw(
			"Referral financial aggregate access is not permitted.",
			frappe.PermissionError,
		)


def _submitted(doctype: str, document_name: str | None) -> bool:
	return bool(
		document_name
		and frappe.db.get_value(doctype, document_name, "docstatus") == 1
	)


def daily_summary(posting_date: str) -> dict:
	"""Return a non-PHI referral handover and payout summary for one service date."""
	_require_reporting_access()
	if not posting_date:
		frappe.throw("Posting date is required.")
	date = str(getdate(posting_date))
	result = {
		"date": date,
		"handovers": 0,
		"eligible_amount": 0.0,
		"paid_amount": 0.0,
		"cash_amount": 0.0,
		"transfer_amount": 0.0,
		"pending": 0,
		"unreconciled": 0,
		"exceptions": 0,
	}

	handovers = frappe.get_list(
		"Referral Handover",
		filters={"arrival_service_date": date},
		fields=["name", "eligible_amount", "eligibility_status"],
		order_by="name asc",
	)
	if not handovers:
		return result

	result["handovers"] = len(handovers)
	result["eligible_amount"] = flt(
		sum(
			flt(row.eligible_amount)
			for row in handovers
			if row.eligibility_status == "Eligible"
		)
	)
	handover_names = [row.name for row in handovers]
	settlements = frappe.get_list(
		"Referral Settlement",
		filters={"referral_handover": ("in", handover_names)},
		fields=[
			"referral_handover",
			"amount",
			"payment_channel",
			"payment_status",
			"purchase_invoice",
			"payment_entry",
		],
		order_by="name asc",
	)
	settlement_by_handover = {row.referral_handover: row for row in settlements}
	exception_handovers = {
		row.name for row in handovers if row.eligibility_status == "Exception"
	}

	for handover in handovers:
		settlement = settlement_by_handover.get(handover.name)
		if not settlement:
			if handover.eligibility_status == "Eligible":
				result["pending"] += 1
			continue
		if settlement.payment_status == "Pending":
			result["pending"] += 1
		elif settlement.payment_status in {"Unreconciled", "Payment Failed"}:
			result["unreconciled"] += 1
		elif settlement.payment_status == "Exception":
			exception_handovers.add(handover.name)
		elif settlement.payment_status == "Paid":
			accounting_is_submitted = _submitted(
				"Purchase Invoice", settlement.purchase_invoice
			) and _submitted("Payment Entry", settlement.payment_entry)
			if not accounting_is_submitted:
				exception_handovers.add(handover.name)
				continue
			amount = flt(settlement.amount)
			result["paid_amount"] += amount
			if settlement.payment_channel == "Cash":
				result["cash_amount"] += amount
			elif settlement.payment_channel == "Transfer":
				result["transfer_amount"] += amount

	result["exceptions"] = len(exception_handovers)
	return result


def director_exceptions() -> list[dict]:
	"""Return permission-filtered, non-PHI exception rows for the Director inbox."""
	_require_reporting_access()
	return frappe.get_list(
		"Referral Settlement",
		filters={"payment_status": ("in", ("Exception", "Payment Failed"))},
		fields=["name", "amount", "creation", "payment_status as workflow_state"],
		order_by="creation asc, name asc",
		limit_page_length=100,
	)


def director_signal_counts() -> dict:
	"""Return permission-filtered referral exception buckets without named rows."""
	_require_reporting_access()
	rows = frappe.get_list(
		"Referral Settlement",
		filters={
			"payment_status": (
				"in",
				("Exception", "Unreconciled", "Payment Failed"),
			)
		},
		fields=["payment_status"],
		limit_page_length=500,
	)
	counts = {
		"exceptions": 0,
		"unreconciled": 0,
		"failed_transfers": 0,
	}
	key_by_status = {
		"Exception": "exceptions",
		"Unreconciled": "unreconciled",
		"Payment Failed": "failed_transfers",
	}
	for row in rows:
		status = (
			row.get("payment_status")
			if isinstance(row, dict)
			else row.payment_status
		)
		if status in key_by_status:
			counts[key_by_status[status]] += 1
	return counts
