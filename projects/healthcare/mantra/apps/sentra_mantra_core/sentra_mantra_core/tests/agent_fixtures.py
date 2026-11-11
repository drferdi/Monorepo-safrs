"""Fixture bersama suite kerangka agen (Tahap A)."""

from __future__ import annotations

import frappe
from frappe.permissions import add_permission, update_permission_property

from sentra_mantra_core.agents import setup as agent_setup
from sentra_mantra_core.agents.permissions import AgentContext

CHIEF_ROLE = agent_setup.CHIEF_ROLE
CARD_DOCTYPE = "Sentra Decision Card"

SMOKE_HANDLER = "sentra_mantra_core.agents.detectors.smoke.smoke_pulse"
OUT_OF_SCOPE_HANDLER = "sentra_mantra_core.agents.detectors.selftest.out_of_scope_probe"
FAILING_HANDLER = "sentra_mantra_core.agents.detectors.selftest.always_fails"
LEAKY_HANDLER = "sentra_mantra_core.agents.detectors.selftest.fails_with_document_data"


PROBE_ROLE = "Sentra Uji Chamber"


def ensure_probe_role() -> None:
	"""Peran penerima khusus uji, tanpa satu pun kartu bawaan site.

	Hitungan di kepala Chamber (kartu kedaluwarsa tujuh hari terakhir) bersifat
	global untuk peran penerima. Memakai peran Chief membuat tesnya bergantung
	pada kartu yang kebetulan sudah ter-commit di site dev; peran sendiri
	membuat angkanya berasal murni dari kartu yang dibuat tes itu.
	"""
	if not frappe.db.exists("Role", PROBE_ROLE):
		frappe.get_doc({"doctype": "Role", "role_name": PROBE_ROLE, "desk_access": 1}).insert(
			ignore_permissions=True
		)
	if not frappe.db.exists(
		"Custom DocPerm", {"parent": CARD_DOCTYPE, "role": PROBE_ROLE, "permlevel": 0}
	):
		add_permission(CARD_DOCTYPE, PROBE_ROLE, permlevel=0)
	update_permission_property(CARD_DOCTYPE, PROBE_ROLE, 0, "write", 1)
	frappe.db.commit()


def ensure_chamber_access() -> None:
	"""Peran dan izin Chief, di-commit supaya bertahan melewati rollback per-tes.

	FrappeTestCase hanya rollback di akhir kelas; suite ini melakukan rollback
	sendiri di setiap tearDown agar batas 7 kartu per hari tidak tercemar kartu
	dari tes sebelumnya. Fixture peran harus selamat dari rollback itu.
	"""
	agent_setup.ensure_chief_role()
	agent_setup.ensure_permissions()
	frappe.db.commit()


def rule(
	rule_code: str = "UJI-PULSE",
	handler_path: str = SMOKE_HANDLER,
	severity: str = "Informasi",
	threshold_value: float = 1,
	enabled: int = 1,
) -> dict:
	return {
		"rule_code": rule_code,
		"description": "Aturan uji",
		"handler_path": handler_path,
		"threshold_value": threshold_value,
		"threshold_unit": "Jumlah",
		"severity": severity,
		"enabled": enabled,
	}


def make_agent(
	prefix: str = "UJI",
	rules=(),
	read_scope=(),
	audience_role: str = CHIEF_ROLE,
	enabled: int = 1,
	schedule: str = "Bulanan",
	max_cards_per_run: int = 5,
):
	"""Agen uji berjadwal Bulanan — tidak ikut terangkut runner harian/mingguan."""
	doc = frappe.new_doc("Sentra Agent Definition")
	doc.agent_code = f"{prefix}-{frappe.generate_hash(length=6).upper()}"
	doc.agent_name = f"Agen uji {prefix}"
	doc.domain = "Uji"
	doc.enabled = enabled
	doc.schedule = schedule
	doc.audience_role = audience_role
	doc.max_cards_per_run = max_cards_per_run
	for source_doctype in read_scope:
		doc.append("read_scope", {"source_doctype": source_doctype})
	for row in rules:
		doc.append("rules", row)
	doc.insert(ignore_permissions=True)
	return doc


def context(agent) -> AgentContext:
	return AgentContext(
		agent.name,
		[row.source_doctype for row in agent.read_scope or []],
		agent.audience_role,
	)


def make_user(email: str, *roles: str) -> str:
	if not frappe.db.exists("User", email):
		frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": email.split("@")[0],
				"user_type": "System User",
				"send_welcome_email": 0,
			}
		).insert(ignore_permissions=True)
	user = frappe.get_doc("User", email)
	# "All" membawa desk_access; tanpa itu User.validate() menurunkan user_type
	# ke Website User saat disimpan tanpa role desk lain.
	user.add_roles("All", *roles)
	return email
