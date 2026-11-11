# Copyright (c) 2026, Sentra and contributors
# For license information, please see license.txt

from hashlib import sha256

import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate


class ReferralHandover(Document):
	def validate(self):
		self.set_service_date_and_deduplication_key()
		self.validate_eligibility_snapshot()

	def set_service_date_and_deduplication_key(self):
		if not all((self.company, self.patient, self.arrival_at, self.service_line)):
			return
		self.arrival_service_date = getdate(self.arrival_at)
		deduplication_source = (
			f"{self.company}|{self.patient}|{self.arrival_service_date}|{self.service_line}"
		)
		self.deduplication_key = sha256(deduplication_source.encode()).hexdigest()

	def validate_eligibility_snapshot(self):
		if self.eligibility_status == "Eligible":
			if not self.tariff_rule or flt(self.eligible_amount) <= 0:
				frappe.throw("Eligible handover requires a tariff rule and positive amount.")
		elif self.eligibility_status == "Exception" and not self.exception_reason:
			frappe.throw("Exception handover requires an exception reason.")
