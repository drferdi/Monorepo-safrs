"""Penegakan batas agen — izin baca dan izin tindakan (spesifikasi §2).

Batas agen ditentukan izin, bukan prompt. Dua penegakan hidup di sini:

* `read_scope` — daftar putih DocType per agen. Kueri di luar daftar ditolak
  sebelum menyentuh basis data, dan pelanggarannya dicatat pada
  `Sentra Agent Run` oleh runner.
* `action_scope` — hanya `emit_decision_card` yang terdaftar. Tidak ada jalur
  lain yang bisa dipanggil agen; menambah entri di `ACTION_SCOPE` berarti
  memberi agen kemampuan baru dan itu keputusan arsitektural, bukan detail
  implementasi.

Modul ini juga menyimpan gerbang visibilitas kartu: sebuah Kartu Keputusan
hanya terlihat oleh pemegang `audience_role`-nya, ditegakkan di lapisan kueri
(`permission_query_conditions`) dan pada pembacaan dokumen tunggal
(`has_permission`) — keduanya dipasang lewat hooks.py.
"""

from __future__ import annotations

import frappe
from frappe.utils import now_datetime

CARD_DOCTYPE = "Sentra Decision Card"

# Satu-satunya tindakan yang dimiliki agen (spesifikasi §2b).
ACTION_SCOPE = ("emit_decision_card",)


class AgentScopeError(frappe.PermissionError):
	"""Agen menyentuh sesuatu di luar izin baca atau izin tindakannya."""


def action_registry() -> dict:
	"""Peta nama tindakan -> fungsi. Impor ditunda agar tidak ada siklus impor."""
	from sentra_mantra_core.agents import contract

	return {"emit_decision_card": contract.emit_decision_card}


class AgentContext:
	"""Satu-satunya pintu agen ke basis data dan ke tindakan.

	Detektor tidak pernah memanggil `frappe.get_all` langsung; ia menerima
	context ini dan memakainya. Pelanggaran dikumpulkan di `violations` agar
	runner dapat menuliskannya ke `Sentra Agent Run` sekalipun eksekusi aturan
	di-rollback ke savepoint.
	"""

	def __init__(self, agent_code: str, read_scope, audience_role: str | None = None):
		self.agent_code = agent_code
		self.read_scope = frozenset(d for d in (read_scope or ()) if d)
		self.audience_role = audience_role
		self.violations: list[dict] = []

	# -- izin baca ---------------------------------------------------------

	def assert_can_read(self, doctype: str) -> None:
		if doctype not in self.read_scope:
			self._reject("read_scope", doctype)

	def get_all(self, doctype: str, **kwargs):
		self.assert_can_read(doctype)
		return frappe.get_all(doctype, **kwargs)

	def get_doc(self, doctype: str, name: str):
		"""Dokumen utuh beserta tabel anaknya.

		Tabel anak tidak pernah dikueri langsung: ia bagian dari dokumen
		induknya, dan izinnya adalah izin induk itu. Ini yang membuat
		`read_scope` cukup menyebut DocType induk saja.
		"""
		self.assert_can_read(doctype)
		return frappe.get_doc(doctype, name)

	def get_value(self, doctype: str, *args, **kwargs):
		self.assert_can_read(doctype)
		return frappe.db.get_value(doctype, *args, **kwargs)

	def count(self, doctype: str, filters=None):
		self.assert_can_read(doctype)
		return frappe.db.count(doctype, filters)

	# -- izin tindakan -----------------------------------------------------

	def call_action(self, action: str, **kwargs):
		if action not in ACTION_SCOPE:
			self._reject("action_scope", action)
		return action_registry()[action](self, **kwargs)

	# ----------------------------------------------------------------------

	def _reject(self, kind: str, target: str):
		self.violations.append(
			{
				"agent": self.agent_code,
				"kind": kind,
				"target": target,
				"at": str(now_datetime()),
			}
		)
		if kind == "read_scope":
			message = f"Agen {self.agent_code} tidak memiliki izin baca atas DocType {target}."
		else:
			message = f"Agen {self.agent_code} tidak memiliki tindakan bernama {target}."
		raise AgentScopeError(message)


# -- gerbang visibilitas kartu ----------------------------------------------


def decision_card_query_conditions(user: str | None = None) -> str:
	"""Kondisi WHERE: kartu hanya terlihat oleh pemegang audience_role-nya."""
	roles = frappe.get_roles(user or frappe.session.user)
	if not roles:
		return "1 = 0"
	allowed = ", ".join(frappe.db.escape(role) for role in roles)
	return f"(`tab{CARD_DOCTYPE}`.`audience_role` in ({allowed}))"


def has_decision_card_permission(doc, ptype=None, user=None, **kwargs):
	"""Gerbang dokumen tunggal. Hook has_permission hanya bisa menolak."""
	return doc.audience_role in frappe.get_roles(user or frappe.session.user)
