"""Register induk pelaporan RSIA (RSIAM-PP-02).

Aturan: dalam satu report_group hanya boleh ada satu card berstatus Aktif —
mencegah dua versi form aktif untuk laporan dan periode efektif yang sama.
"""

import frappe
from frappe import _
from frappe.model.document import Document


class SentraReportCard(Document):
	def validate(self):
		self._check_single_active_version()

	def _check_single_active_version(self):
		if self.status != "Aktif" or not self.report_group:
			return
		clash = frappe.db.exists(
			"Sentra Report Card",
			{
				"report_group": self.report_group,
				"status": "Aktif",
				"name": ("!=", self.name or ""),
			},
		)
		if clash:
			frappe.throw(
				_(
					"Grup laporan {0} sudah memiliki versi Aktif ({1}). "
					"Retired-kan versi lama sebelum mengaktifkan yang baru."
				).format(self.report_group, clash)
			)
