"""Referral settlement preparation, verification, and safe retry handling."""

import frappe
from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
from frappe.utils import flt, getdate, now_datetime, nowdate


def prepare_settlement(handover: str, payment_channel: str) -> str:
	"""Create or return the single settlement for a handover."""
	if payment_channel not in {"Cash", "Transfer"}:
		frappe.throw("Payment Channel must be Cash or Transfer.")

	existing = frappe.db.get_value(
		"Referral Settlement",
		{"referral_handover": handover},
		"name",
	)
	if existing:
		return existing

	handover_doc = frappe.get_doc("Referral Handover", handover)
	if not frappe.has_permission("Referral Handover", ptype="read", doc=handover_doc):
		frappe.throw("Referral Handover access is not permitted.", frappe.PermissionError)

	is_eligible = handover_doc.eligibility_status == "Eligible"
	accounting = frappe._dict()
	if is_eligible:
		accounting = frappe.db.get_value(
			"Referral Tariff Rule",
			handover_doc.tariff_rule,
			["service_item", "expense_account", "cost_center"],
			as_dict=True,
		)
		if not accounting or not all(
			accounting.get(fieldname)
			for fieldname in ("service_item", "expense_account", "cost_center")
		):
			frappe.throw(
				"Eligible handover requires a tariff with complete accounting configuration."
			)

	settlement = frappe.get_doc(
		{
			"doctype": "Referral Settlement",
			"referral_handover": handover_doc.name,
			"referral_partner": handover_doc.referral_partner,
			"company": handover_doc.company,
			"amount": handover_doc.eligible_amount if is_eligible else 0,
			"service_item": accounting.get("service_item"),
			"expense_account": accounting.get("expense_account"),
			"cost_center": accounting.get("cost_center"),
			"payment_channel": payment_channel,
			"payment_status": "Pending" if is_eligible else "Exception",
			"workflow_state": "Finance Review" if is_eligible else "Exception",
			"exception_reason": None if is_eligible else handover_doc.exception_reason,
		}
	).insert()
	return settlement.name


def verify_settlement(settlement: str) -> dict:
	"""Record Finance verification and move an approved path to Ready to Pay."""
	if not set(frappe.get_roles()) & {"Accounts Manager", "System Manager"}:
		frappe.throw("Accounts Manager verification is required.", frappe.PermissionError)

	doc = frappe.get_doc("Referral Settlement", settlement)
	if doc.workflow_state not in {"Finance Review", "Director Approved"}:
		frappe.throw("Settlement is not awaiting Finance verification.")
	if not doc.mode_of_payment:
		frappe.throw("Finance verification requires a Mode of Payment.")
	if doc.payment_channel == "Transfer":
		bank_account = frappe.db.get_value(
			"Referral Partner",
			doc.referral_partner,
			"bank_account",
		)
		if not bank_account:
			frappe.throw("Transfer settlement requires the partner Bank Account.")

	doc.verified_by = frappe.session.user
	doc.verified_at = now_datetime()
	doc.workflow_state = "Ready to Pay"
	doc.payment_status = "Pending"
	doc.save()
	return {
		"settlement": doc.name,
		"workflow_state": doc.workflow_state,
		"verified_by": doc.verified_by,
		"verified_at": doc.verified_at,
	}


def _validate_accounting_snapshot(doc) -> None:
	missing = [
		label
		for fieldname, label in (
			("service_item", "Service Item"),
			("expense_account", "Expense Account"),
			("cost_center", "Cost Center"),
			("mode_of_payment", "Mode of Payment"),
		)
		if not doc.get(fieldname)
	]
	if missing:
		frappe.throw(
			"Referral settlement is missing accounting configuration: "
			+ ", ".join(missing)
			+ "."
		)

	if frappe.db.get_value("Item", doc.service_item, "disabled") != 0:
		frappe.throw("Referral Service Item must exist and be enabled.")

	expense_account = frappe.db.get_value(
		"Account",
		doc.expense_account,
		["company", "root_type", "is_group", "disabled"],
		as_dict=True,
	)
	if (
		not expense_account
		or expense_account.company != doc.company
		or expense_account.root_type != "Expense"
		or expense_account.is_group
		or expense_account.disabled
	):
		frappe.throw(
			"Referral Expense Account must be an enabled leaf Expense account "
			"for the settlement Company."
		)

	cost_center = frappe.db.get_value(
		"Cost Center",
		doc.cost_center,
		["company", "is_group", "disabled"],
		as_dict=True,
	)
	if (
		not cost_center
		or cost_center.company != doc.company
		or cost_center.is_group
		or cost_center.disabled
	):
		frappe.throw(
			"Referral Cost Center must be an enabled leaf Cost Center "
			"for the settlement Company."
		)


def _resolve_paid_from(doc) -> str:
	if frappe.db.get_value("Mode of Payment", doc.mode_of_payment, "enabled") != 1:
		frappe.throw("Mode of Payment must exist and be enabled.")

	accounts = frappe.db.get_all(
		"Mode of Payment Account",
		filters={
			"parent": doc.mode_of_payment,
			"parenttype": "Mode of Payment",
			"company": doc.company,
		},
		pluck="default_account",
	)
	accounts = sorted({account for account in accounts if account})
	if len(accounts) != 1:
		frappe.throw(
			"Mode of Payment must map to exactly one account for the settlement Company."
		)

	paid_from = accounts[0]
	account = frappe.db.get_value(
		"Account",
		paid_from,
		["company", "account_type", "is_group", "disabled"],
		as_dict=True,
	)
	expected_type = "Cash" if doc.payment_channel == "Cash" else "Bank"
	if (
		not account
		or account.company != doc.company
		or account.account_type != expected_type
		or account.is_group
		or account.disabled
	):
		frappe.throw(
			f"{doc.payment_channel} settlement requires an enabled leaf "
			f"{expected_type} account for the settlement Company."
		)
	return paid_from


def _get_or_create_purchase_invoice(doc):
	if doc.purchase_invoice:
		purchase_invoice = frappe.get_doc("Purchase Invoice", doc.purchase_invoice)
		if purchase_invoice.docstatus == 0:
			purchase_invoice.submit()
		elif purchase_invoice.docstatus != 1:
			frappe.throw("Linked Purchase Invoice is cancelled and cannot be reused.")
		return purchase_invoice

	supplier = frappe.db.get_value(
		"Referral Partner", doc.referral_partner, "supplier"
	)
	if not supplier or not frappe.db.exists("Supplier", supplier):
		frappe.throw("Referral Partner requires an existing Supplier.")

	posting_date = (
		frappe.db.get_value(
			"Referral Handover", doc.referral_handover, "arrival_service_date"
		)
		or nowdate()
	)
	purchase_invoice = frappe.get_doc(
		{
			"doctype": "Purchase Invoice",
			"company": doc.company,
			"supplier": supplier,
			"posting_date": posting_date,
			"due_date": posting_date,
			"remarks": f"Referral settlement {doc.name}",
			"items": [
				{
					"item_code": doc.service_item,
					"qty": 1,
					"rate": doc.amount,
					"expense_account": doc.expense_account,
					"cost_center": doc.cost_center,
				}
			],
		}
	)
	purchase_invoice.insert()
	purchase_invoice.submit()
	doc.purchase_invoice = purchase_invoice.name
	doc.save()
	return purchase_invoice


def _get_or_create_payment_entry(doc, purchase_invoice, paid_from):
	if doc.payment_entry:
		payment_entry = frappe.get_doc("Payment Entry", doc.payment_entry)
		if payment_entry.docstatus == 0:
			payment_entry.submit()
		elif payment_entry.docstatus != 1:
			frappe.throw("Linked Payment Entry is cancelled and cannot be reused.")
		return payment_entry

	payment_entry = get_payment_entry(
		"Purchase Invoice",
		purchase_invoice.name,
		party_amount=flt(doc.amount),
		bank_account=paid_from,
		reference_date=getdate(purchase_invoice.posting_date),
	)
	payment_entry.mode_of_payment = doc.mode_of_payment
	if doc.payment_channel == "Transfer":
		payment_entry.reference_no = doc.transfer_reference
		payment_entry.reference_date = getdate(purchase_invoice.posting_date)
	payment_entry.insert()
	payment_entry.submit()
	doc.payment_entry = payment_entry.name
	doc.save()
	return payment_entry


def execute_payment(settlement: str) -> dict:
	"""Create or reuse submitted accounting documents and complete the payout."""
	doc = frappe.get_doc("Referral Settlement", settlement)
	if doc.workflow_state == "Paid" and doc.payment_status == "Paid":
		doc.validate_paid_invariants()
		return {
			"settlement": doc.name,
			"purchase_invoice": doc.purchase_invoice,
			"payment_entry": doc.payment_entry,
			"payment_status": doc.payment_status,
		}

	if not set(frappe.get_roles()) & {"Accounts User", "System Manager"}:
		frappe.throw("Accounts User payment execution is required.", frappe.PermissionError)
	if doc.workflow_state != "Ready to Pay":
		frappe.throw("Settlement must be Ready to Pay before execution.")
	if doc.verified_by == frappe.session.user:
		frappe.throw("Verifier and payment executor must be different users.", frappe.PermissionError)

	_validate_accounting_snapshot(doc)
	paid_from = _resolve_paid_from(doc)
	purchase_invoice = _get_or_create_purchase_invoice(doc)
	payment_entry = _get_or_create_payment_entry(doc, purchase_invoice, paid_from)

	doc.reload()
	doc.paid_by = frappe.session.user
	doc.paid_at = now_datetime()
	doc.workflow_state = "Paid"
	doc.payment_status = "Paid"
	doc.save()
	return {
		"settlement": doc.name,
		"purchase_invoice": purchase_invoice.name,
		"payment_entry": payment_entry.name,
		"payment_status": doc.payment_status,
	}
