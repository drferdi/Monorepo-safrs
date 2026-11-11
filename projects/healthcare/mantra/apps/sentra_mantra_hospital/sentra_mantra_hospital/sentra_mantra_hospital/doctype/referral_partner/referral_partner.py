# Copyright (c) 2026, Sentra and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate


class ReferralPartner(Document):
	def validate(self):
		self.validate_dates()
		self.validate_payment_destination()

	def validate_dates(self):
		if (
			self.effective_from
			and self.effective_to
			and getdate(self.effective_to) < getdate(self.effective_from)
		):
			frappe.throw("Effective To cannot be earlier than Effective From.")

	def validate_payment_destination(self):
		if self.active and self.default_payment_channel == "Transfer" and not self.bank_account:
			frappe.throw("Bank Account is required for an active Transfer referral partner.")
