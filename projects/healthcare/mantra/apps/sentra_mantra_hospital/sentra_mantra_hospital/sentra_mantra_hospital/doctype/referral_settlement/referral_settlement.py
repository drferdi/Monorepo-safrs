# Copyright (c) 2026, Sentra and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


ALLOWED_STATE_TRANSITIONS = {
	"Draft": {"Finance Review", "Exception", "Rejected"},
	"Finance Review": {"Ready to Pay", "Rejected"},
	"Exception": {"Director Approved", "Rejected"},
	"Director Approved": {"Ready to Pay", "Rejected"},
	"Ready to Pay": {"Paid", "Payment Failed", "Rejected"},
	"Payment Failed": {"Ready to Pay", "Rejected"},
	"Rejected": set(),
	"Paid": set(),
}


class ReferralSettlement(Document):
	def validate(self):
		self.validate_amount()
		self.validate_state_transition()
		self.validate_paid_invariants()

	def validate_amount(self):
		if flt(self.amount) < 0:
			frappe.throw("Settlement amount cannot be negative.")

	def validate_state_transition(self):
		previous = self.get_doc_before_save()
		if not previous or previous.workflow_state == self.workflow_state:
			return
		if self.workflow_state not in ALLOWED_STATE_TRANSITIONS.get(
			previous.workflow_state, set()
		):
			frappe.throw(
				f"Invalid Referral Settlement transition: "
				f"{previous.workflow_state} -> {self.workflow_state}."
			)

	def validate_paid_invariants(self):
		is_paid = self.workflow_state == "Paid" or self.payment_status == "Paid"
		if not is_paid:
			return
		if self.workflow_state != "Paid" or self.payment_status != "Paid":
			frappe.throw("Paid workflow and payment status must be updated together.")
		if self.verified_by and self.paid_by and self.verified_by == self.paid_by:
			frappe.throw("Verifier and payment executor must be different users.")

		if self.payment_channel == "Cash":
			missing = [
				label
				for fieldname, label in (
					("cash_receiver_name", "Cash Receiver Name"),
					("cash_received_at", "Cash Received At"),
					("cash_receipt_attachment", "Cash Receipt Attachment"),
				)
				if not self.get(fieldname)
			]
		elif self.payment_channel == "Transfer":
			missing = [
				label
				for fieldname, label in (
					("transfer_reference", "Transfer Reference"),
					("transfer_proof_attachment", "Transfer Proof Attachment"),
				)
				if not self.get(fieldname)
			]
		else:
			frappe.throw("Payment Channel must be Cash or Transfer.")
		if missing:
			frappe.throw("Paid settlement requires evidence: " + ", ".join(missing) + ".")

		for doctype, fieldname, label in (
			("Purchase Invoice", "purchase_invoice", "Purchase Invoice"),
			("Payment Entry", "payment_entry", "Payment Entry"),
		):
			document_name = self.get(fieldname)
			if not document_name:
				frappe.throw(f"Paid settlement requires linked {label}.")
			if frappe.db.get_value(doctype, document_name, "docstatus") != 1:
				frappe.throw(f"Linked {label} must be submitted.")
