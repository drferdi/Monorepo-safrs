"""MANTRA evidence and linked-document controls on native procurement."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.purchase_controls import (
	validate_expense_claim,
	validate_material_request,
	validate_payment_entry,
	validate_purchase_invoice,
	validate_purchase_receipt,
)


class TestPurchaseControls(FrappeTestCase):
	def _material_request(self, *, category="Medicine"):
		doc = frappe.new_doc("Material Request")
		doc.mantra_request_category = category
		doc.material_request_type = "Purchase"
		return doc

	def test_material_request_requires_reason_and_evidence(self):
		"""Allowing a controlled request without rationale or evidence must fail."""
		doc = self._material_request(category="Service")

		with self.assertRaises(frappe.ValidationError):
			validate_material_request(doc)

		doc.mantra_business_reason = "Synthetic operational need."
		with self.assertRaises(frappe.ValidationError):
			validate_material_request(doc)

	def test_medicine_request_requires_every_target_warehouse(self):
		"""A medicine line without its receiving warehouse must fail."""
		doc = self._material_request()
		doc.mantra_business_reason = "Synthetic medicine replenishment."
		doc.mantra_supporting_document = "/private/files/synthetic-request.pdf"
		doc.append("items", {"item_code": "SYNTHETIC-MEDICINE", "qty": 10})

		with self.assertRaises(frappe.ValidationError):
			validate_material_request(doc)

		doc.items[0].warehouse = "SYNTHETIC-PHARMACY-WAREHOUSE"
		validate_material_request(doc)

	def test_request_owner_cannot_approve_their_own_document(self):
		"""A requester who also has approval roles must still fail separation of duties."""
		doc = self._material_request(category="Other")
		doc.mantra_business_reason = "Synthetic controlled request."
		doc.mantra_supporting_document = "/private/files/synthetic-request.pdf"
		doc.owner = frappe.session.user
		doc.workflow_state = "Approved"

		with self.assertRaises(frappe.PermissionError):
			validate_material_request(doc)

	def test_expense_claim_owner_cannot_approve_their_own_document(self):
		"""An employee must not use a second role to approve their own claim."""
		doc = frappe.new_doc("Expense Claim")
		doc.owner = frappe.session.user
		doc.workflow_state = "Approved"

		with self.assertRaises(frappe.PermissionError):
			validate_expense_claim(doc)

	def test_purchase_invoice_owner_cannot_approve_their_own_document(self):
		"""An invoice owner must not bypass independent Director approval."""
		doc = frappe.new_doc("Purchase Invoice")
		doc.owner = frappe.session.user
		doc.workflow_state = "Approved"

		with (
			patch(
				"sentra_mantra_core.purchase_controls._linked_request_categories",
				return_value={"Service"},
			),
			self.assertRaises(frappe.PermissionError),
		):
			validate_purchase_invoice(doc)

	def test_medicine_receipt_requires_receiver_and_evidence_on_submit(self):
		"""Submitting received medicine without custody evidence must fail."""
		doc = frappe.new_doc("Purchase Receipt")
		doc.docstatus = 1

		with (
			patch(
				"sentra_mantra_core.purchase_controls._linked_request_categories",
				return_value={"Medicine"},
			),
			self.assertRaises(frappe.ValidationError),
		):
			validate_purchase_receipt(doc)

		doc.mantra_received_by_employee = "SYNTHETIC-EMPLOYEE"
		doc.mantra_receipt_evidence = "/private/files/synthetic-receipt.pdf"
		with patch(
			"sentra_mantra_core.purchase_controls._linked_request_categories",
			return_value={"Medicine"},
		):
			validate_purchase_receipt(doc)

	def test_stock_invoice_requires_purchase_receipt_on_submit(self):
		"""Directly invoicing controlled stock without goods receipt must fail."""
		doc = frappe.new_doc("Purchase Invoice")
		doc.docstatus = 1
		doc.append(
			"items",
			{"item_code": "SYNTHETIC-STOCK-ITEM", "material_request": "MR-SYNTHETIC"},
		)

		with (
			patch(
				"sentra_mantra_core.purchase_controls._linked_request_categories",
				return_value={"Medicine"},
			),
			patch.object(frappe.db, "get_value", return_value=1),
			self.assertRaises(frappe.ValidationError),
		):
			validate_purchase_invoice(doc)

		doc.items[0].purchase_receipt = "PR-SYNTHETIC"
		with (
			patch(
				"sentra_mantra_core.purchase_controls._linked_request_categories",
				return_value={"Medicine"},
			),
			patch.object(frappe.db, "get_value", return_value=1),
		):
			validate_purchase_invoice(doc)

	def test_mantra_payment_requires_execution_reference_and_evidence(self):
		"""Submitting a controlled disbursement without proof must fail."""
		doc = frappe.new_doc("Payment Entry")
		doc.docstatus = 1

		with (
			patch(
				"sentra_mantra_core.purchase_controls._linked_request_categories",
				return_value={"Operational Supply"},
			),
			self.assertRaises(frappe.ValidationError),
		):
			validate_payment_entry(doc)

		doc.mantra_execution_reference = "SYNTHETIC-PAYMENT-REFERENCE"
		doc.mantra_payment_evidence = "/private/files/synthetic-payment.pdf"
		with patch(
			"sentra_mantra_core.purchase_controls._linked_request_categories",
			return_value={"Operational Supply"},
		):
			validate_payment_entry(doc)

	def test_unrelated_native_documents_remain_unaffected(self):
		"""MANTRA hooks must not impose evidence fields on unrelated transactions."""
		material_request = frappe.new_doc("Material Request")
		validate_material_request(material_request)

		payment_entry = frappe.new_doc("Payment Entry")
		payment_entry.docstatus = 1
		with patch(
			"sentra_mantra_core.purchase_controls._linked_request_categories",
			return_value=set(),
		):
			validate_payment_entry(payment_entry)
