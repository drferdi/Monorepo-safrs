"""Siklus pelaporan per periode (RSIAM-PP-02 §6).

Gate fail-closed di validate() — berlaku untuk jalur mana pun (workflow, API,
edit manual):
- satu siklus per (report_card, periode_label);
- Disetujui terlarang selama ada defect Open (FR-06);
- Diterima terlarang tanpa nomor_referensi/receipt (FR-07).
"""

import frappe
from frappe import _
from frappe.model.document import Document


class SentraReportCycle(Document):
	def validate(self):
		self._check_duplicate_period()
		self._check_defect_gate()
		self._check_receipt_gate()

	def _check_duplicate_period(self):
		clash = frappe.db.exists(
			"Sentra Report Cycle",
			{
				"report_card": self.report_card,
				"periode_label": self.periode_label,
				"name": ("!=", self.name or ""),
			},
		)
		if clash:
			frappe.throw(
				_("Siklus {0} untuk periode {1} sudah ada ({2}).").format(
					self.report_card, self.periode_label, clash
				)
			)

	def _check_defect_gate(self):
		if self.status not in ("Disetujui", "Dikirim Eksternal", "Diterima", "Ditutup"):
			return
		open_defects = [d for d in (self.defects or []) if d.status == "Open"]
		if open_defects:
			frappe.throw(
				_("Tidak bisa {0}: masih ada {1} defect validasi berstatus Open.").format(
					self.status, len(open_defects)
				)
			)

	def _check_receipt_gate(self):
		if self.status in ("Diterima", "Ditutup") and not (self.nomor_referensi or "").strip():
			frappe.throw(
				_(
					"Tidak bisa {0}: nomor referensi/receipt submission wajib "
					"dicatat sebagai bukti."
				).format(self.status)
			)

	def on_update(self):
		self._audit_status_change()

	def _audit_status_change(self):
		"""Catat transisi status ke registry audit inti.

		Pada insert, get_doc_before_save() kosong sehingga event terbit dengan
		"from": null — ini disengaja: baris tersebut adalah rekaman pembuatan
		siklus, titik awal jejak audit, bukan noise.
		"""
		old = self.get_doc_before_save()
		old_status = old.status if old else None
		if old_status == self.status:
			return
		record_event = frappe.get_attr("sentra_mantra_core.audit_registry.record_event")
		record_event(
			source_app="sentra_mantra_indonesia",
			producer="pelaporan_cycles",
			event_type="Record Change",
			target_doctype=self.doctype,
			target_name=self.name,
			payload={
				"from": old_status,
				"to": self.status,
				"periode": self.periode_label,
				"report_card": self.report_card,
			},
		)
