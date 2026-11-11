"""Evidence and linked-document invariants for MANTRA native procurement."""

import frappe


def _is_submitting(doc) -> bool:
	return bool(
		doc.docstatus == 1
		or getattr(doc.flags, "in_submit", False)
		or getattr(doc, "_action", None) == "submit"
	)


def _request_names_from_rows(rows) -> set[str]:
	names = {row.get("material_request") for row in rows if row.get("material_request")}
	purchase_orders = {
		row.get("purchase_order") for row in rows if row.get("purchase_order")
	}
	if purchase_orders:
		names.update(
			frappe.db.get_all(
				"Purchase Order Item",
				filters={
					"parent": ("in", sorted(purchase_orders)),
					"material_request": ("is", "set"),
				},
				pluck="material_request",
			)
		)
	purchase_receipts = {
		row.get("purchase_receipt")
		for row in rows
		if row.get("purchase_receipt")
	}
	if purchase_receipts:
		names.update(
			frappe.db.get_all(
				"Purchase Receipt Item",
				filters={
					"parent": ("in", sorted(purchase_receipts)),
					"material_request": ("is", "set"),
				},
				pluck="material_request",
			)
		)
	return {name for name in names if name}


def _linked_request_categories(doc) -> set[str]:
	if doc.doctype == "Material Request":
		return {doc.mantra_request_category} if doc.mantra_request_category else set()

	rows = list(doc.get("items") or [])
	if doc.doctype == "Payment Entry":
		purchase_invoices = {
			row.reference_name
			for row in doc.get("references") or []
			if row.reference_doctype == "Purchase Invoice" and row.reference_name
		}
		if purchase_invoices:
			rows.extend(
				frappe.db.get_all(
					"Purchase Invoice Item",
					filters={"parent": ("in", sorted(purchase_invoices))},
					fields=[
						"material_request",
						"purchase_order",
						"purchase_receipt",
					],
				)
			)

	request_names = _request_names_from_rows(rows)
	if not request_names:
		return set()
	return {
		category
		for category in frappe.db.get_all(
			"Material Request",
			filters={
				"name": ("in", sorted(request_names)),
				"mantra_request_category": ("is", "set"),
			},
			pluck="mantra_request_category",
		)
		if category
	}


def _validate_requester_separation(doc) -> None:
	if (
		doc.owner
		and doc.owner == frappe.session.user
		and doc.workflow_state in {"Director Review", "Approved"}
	):
		frappe.throw(
			"The requester cannot review or approve their own expenditure.",
			frappe.PermissionError,
		)


def validate_material_request(doc, method=None) -> None:
	"""Require rationale, evidence, warehouse, and separation for MANTRA requests."""
	if not doc.mantra_request_category:
		return
	missing = [
		label
		for fieldname, label in (
			("mantra_business_reason", "Business Reason"),
			("mantra_supporting_document", "Supporting Document"),
		)
		if not doc.get(fieldname)
	]
	if missing:
		frappe.throw(
			"MANTRA Material Request requires: " + ", ".join(missing) + "."
		)
	if doc.mantra_request_category == "Medicine":
		missing_warehouse = [
			row.idx or index
			for index, row in enumerate(doc.get("items") or [], start=1)
			if not row.warehouse
		]
		if missing_warehouse:
			frappe.throw(
				"Medicine request lines require a Target Warehouse: "
				+ ", ".join(str(index) for index in missing_warehouse)
				+ "."
			)
	_validate_requester_separation(doc)


def validate_expense_claim(doc, method=None) -> None:
	"""Prevent an Expense Claim owner from participating in its approval."""
	_validate_requester_separation(doc)


def validate_purchase_receipt(doc, method=None) -> None:
	"""Require receiving custody evidence for submitted medicine receipts."""
	if not _is_submitting(doc) or "Medicine" not in _linked_request_categories(doc):
		return
	missing = [
		label
		for fieldname, label in (
			("mantra_received_by_employee", "Received By Employee"),
			("mantra_receipt_evidence", "Receipt Evidence"),
		)
		if not doc.get(fieldname)
	]
	if missing:
		frappe.throw(
			"MANTRA medicine Purchase Receipt requires: "
			+ ", ".join(missing)
			+ "."
		)


def validate_purchase_invoice(doc, method=None) -> None:
	"""Require goods receipt for submitted controlled stock invoices."""
	if not _linked_request_categories(doc):
		return
	_validate_requester_separation(doc)
	if not _is_submitting(doc):
		return
	for row in doc.get("items") or []:
		if (
			row.item_code
			and frappe.db.get_value("Item", row.item_code, "is_stock_item")
			and not row.purchase_receipt
		):
			frappe.throw(
				f"MANTRA stock invoice line {row.idx or 1} requires a linked "
				"Purchase Receipt."
			)
def validate_payment_entry(doc, method=None) -> None:
	"""Require execution reference and proof for submitted MANTRA disbursements."""
	if not _is_submitting(doc) or not _linked_request_categories(doc):
		return
	missing = [
		label
		for fieldname, label in (
			("mantra_execution_reference", "Execution Reference"),
			("mantra_payment_evidence", "Payment Evidence"),
		)
		if not doc.get(fieldname)
	]
	if missing:
		frappe.throw(
			"MANTRA Payment Entry requires: " + ", ".join(missing) + "."
		)
