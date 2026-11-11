# Copyright (c) 2026, Sentra and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate


class ReferralTariffRule(Document):
	def validate(self):
		self.validate_dates()
		self.validate_amount()
		self.validate_approval()

	def validate_dates(self):
		if (
			self.effective_from
			and self.effective_to
			and getdate(self.effective_to) < getdate(self.effective_from)
		):
			frappe.throw("Effective To cannot be earlier than Effective From.")

	def validate_amount(self):
		if flt(self.amount) <= 0:
			frappe.throw("Amount must be greater than zero.")

	def validate_approval(self):
		if not self.active:
			return

		missing = [
			label
			for fieldname, label in (
				("service_item", "Service Item"),
				("expense_account", "Expense Account"),
				("cost_center", "Cost Center"),
				("approved_by", "Approved By"),
				("approved_on", "Approved On"),
				("approval_reference", "Approval Reference"),
			)
			if not self.get(fieldname)
		]
		if missing:
			frappe.throw(
				"Active tariff requires accounting configuration and approval evidence: "
				+ ", ".join(missing)
				+ "."
			)

		if not set(frappe.get_roles()) & {"MANTRA Director", "System Manager"}:
			frappe.throw(
				"Only MANTRA Director or System Manager can activate a referral tariff.",
				frappe.PermissionError,
			)
