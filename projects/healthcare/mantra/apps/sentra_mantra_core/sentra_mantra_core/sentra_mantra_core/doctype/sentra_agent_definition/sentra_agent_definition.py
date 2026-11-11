# Copyright (c) 2026, Sentra and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

# Aturan menyimpan dotted path sebagai data, sehingga siapa pun dengan hak tulis
# pada agen bisa mengarahkannya ke fungsi mana pun. Batasi ke paket detektor.
DETECTOR_PREFIX = "sentra_mantra_core.agents.detectors."


class SentraAgentDefinition(Document):
	def validate(self):
		self._check_handler_paths()
		self._check_unique_rule_codes()

	def _check_handler_paths(self):
		for rule in self.rules or []:
			path = (rule.handler_path or "").strip()
			if not path.startswith(DETECTOR_PREFIX):
				frappe.throw(
					_("Aturan {0}: handler_path harus berada di bawah {1}.").format(
						rule.rule_code, DETECTOR_PREFIX
					)
				)

	def _check_unique_rule_codes(self):
		seen = set()
		for rule in self.rules or []:
			code = (rule.rule_code or "").strip()
			if code in seen:
				frappe.throw(_("Kode aturan {0} muncul lebih dari sekali.").format(code))
			seen.add(code)
