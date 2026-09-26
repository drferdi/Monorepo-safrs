# Copyright (c) 2026, Sentra and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname

from sentra_mantra_core.agents import contract


class SentraDecisionCard(Document):
	def autoname(self):
		self.name = make_autoname("DC-.YYYY.-.MM.-.####")
		self.card_id = self.name

	def validate(self):
		contract.assert_deidentified(self)
		self._check_option_handlers()
		self._check_dedup_key()

	def _check_option_handlers(self):
		"""Handler adalah kunci registry, bukan dotted path yang bisa dieksekusi bebas."""
		for option in self.options or []:
			if option.handler not in contract.DECISION_HANDLERS:
				frappe.throw(
					_("Opsi {0}: handler {1} tidak terdaftar di registry keputusan.").format(
						option.label, option.handler
					)
				)

	def _check_dedup_key(self):
		if not (self.dedup_key or "").strip():
			frappe.throw(_("dedup_key wajib diisi — tanpa itu kartu kembar tidak tercegah."))
