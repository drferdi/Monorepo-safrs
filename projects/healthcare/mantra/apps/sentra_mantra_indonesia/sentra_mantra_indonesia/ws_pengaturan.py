"""Blok cockpit IT/admin — workspace Pengaturan.

Checklist operasional, kesehatan integrasi SATUSEHAT, tiket Helpdesk per queue,
tautan SOP Wiki. Bukan permukaan klinis.

    bench --site mantra.localhost execute sentra_mantra_indonesia.ws_pengaturan.setup
"""

from __future__ import annotations

import frappe
from frappe.utils import now_datetime, time_diff_in_seconds

from sentra_mantra_indonesia import ws_common

BLOCK_NAME = "Cockpit Admin RSIA"
WORKSPACE = "Pengaturan"

ACTIONS = [
	{"label": "User", "desc": "Akun desk", "route": "/app/user"},
	{"label": "Role", "desc": "Hak akses", "route": "/app/role"},
	{"label": "Workflow", "desc": "Approval PO/PE/JE", "route": "/app/workflow"},
	{"label": "Email Account", "desc": "Kanal surat", "route": "/app/email-account"},
	{"label": "Print Format", "desc": "Template cetak", "route": "/app/print-format"},
	{"label": "Helpdesk", "desc": "Tiket fasilitas/IT", "route": "/app/hd-ticket"},
	{"label": "SATUSEHAT Batch", "desc": "Pull agregat", "route": "/app/satusehat-sync-batch"},
]

# Dokumentasi hidup: persona → workspace yang terlihat (ADR desk).
PERSONA_MAP = (
	("chief", "Home · semua workspace · Pandangan Direktur"),
	("clinical", "Home · Pasien & Klinik · Profil"),
	("hr", "Home · SDM · Profil"),
	("finance", "Home · Keuangan"),
	("umum", "Home · Profil terbatas"),
)

# Placeholder SOP — tanpa href sampai halaman Wiki spesifik tersedia.
WIKI_SOPS = (
	{"title": "SOP Shift & Roster", "sub": "Modul SDM · Wiki belum diisi"},
	{"title": "SOP Approval PO/PE/JE", "sub": "Modul Keuangan · gate GL"},
	{"title": "SOP Labeling SATUSEHAT", "sub": "Pelaporan via RME"},
)


def _mute_emails_on():
	try:
		return int(frappe.db.get_single_value("System Settings", "mute_emails") or 0) == 1
	except Exception:
		return None


def _gl_gate_closed():
	"""True bila Workflow State Approved masih doc_status=0 (aman testing)."""
	try:
		rows = frappe.get_all(
			"Workflow State",
			filters={"workflow_state_name": "Approved"},
			fields=["doc_status"],
			limit=5,
		)
		if not rows:
			return None
		return all(int(r.doc_status or 0) == 0 for r in rows)
	except Exception:
		return None


def _satusehat_configured():
	try:
		return bool(
			frappe.get_attr("sentra_mantra_integrations.satusehat.client.is_configured")()
		)
	except Exception:
		return None


def _ops_checklist():
	# State konfigurasi sistem (gate GL, mute_emails, SATUSEHAT) = intel admin;
	# tidak ada doctype tunggal yang mewakilinya, jadi gate langsung per role.
	if not ws_common.has_role("System Manager"):
		return []
	items = []
	mute = _mute_emails_on()
	if mute is not None:
		items.append(
			{
				"title": "mute_emails",
				"sub": "System Settings",
				"right": "ON" if mute else "OFF",
				"route": "/app/system-settings",
			}
		)
	gate = _gl_gate_closed()
	if gate is not None:
		items.append(
			{
				"title": "Gate GL Tahap 2",
				"sub": "Workflow Approved.doc_status",
				"right": "TERTUTUP (aman)" if gate else "TERBUKA",
				"route": "/app/workflow",
			}
		)
	cfg = _satusehat_configured()
	if cfg is not None:
		items.append(
			{
				"title": "SATUSEHAT configured",
				"sub": "Env MANTRA_SATUSEHAT_*",
				"right": "YES" if cfg else "NO",
				"route": "/app/satusehat-sync-batch",
			}
		)
	# Insights RO — view wave1 ada?
	try:
		frappe.db.sql("select 1 from `v_mantra_wave1_ops_agg` limit 1")
		insights_ok = True
	except Exception:
		insights_ok = False
	items.append(
		{
			"title": "Insights RO view",
			"sub": "v_mantra_wave1_ops_agg",
			"right": "SEHAT" if insights_ok else "MISSING",
		}
	)
	return items


def _integration_health():
	"""Last Aggregate pull + kelengkapan — tanpa daftar pasien."""
	if not ws_common.can("SATUSEHAT Sync Batch"):
		return []
	items = []
	try:
		row = frappe.get_all(
			"SATUSEHAT Sync Batch",
			filters={"capture_mode": "Aggregate", "status": "Completed"},
			fields=["name", "resource_type", "total_records", "finished_at"],
			order_by="finished_at desc",
			limit=1,
		)
	except Exception:
		row = []
	if row:
		r = row[0]
		age = ""
		if r.finished_at:
			secs = time_diff_in_seconds(now_datetime(), r.finished_at)
			age = f"{int(secs // 60)}m lalu" if secs < 3600 else f"{int(secs // 3600)}j lalu"
		items.append(
			{
				"title": f"Aggregate terakhir · {r.resource_type}",
				"sub": f"{r.total_records or 0} records · {age}",
				"route": f"/app/satusehat-sync-batch/{r.name}",
			}
		)
	try:
		quality = frappe.get_attr(
			"sentra_mantra_integrations.satusehat.metrics.reporting_quality"
		)()
	except Exception:
		quality = None
	if quality and quality.get("completeness_pct") is not None:
		pct = f"{quality['completeness_pct']:.1f}".replace(".", ",")
		items.append(
			{
				"title": f"Kelengkapan pelaporan {pct}%",
				"sub": f"{quality.get('finished')}/{quality.get('total')} finished",
			}
		)
	return items


def _helpdesk_by_queue():
	if not ws_common.can("HD Ticket"):
		return []
	try:
		rows = frappe.db.sql(
			"""
			select ifnull(nullif(agent_group, ''), 'Tanpa Queue') as queue,
				count(name) as n
			from `tabHD Ticket`
			where ifnull(status, '') not in ('Closed', 'Resolved')
			group by queue
			order by n desc
			limit 8
			""",
			as_dict=True,
		)
	except Exception:
		return []
	return [
		{
			"title": r.queue,
			"sub": "Tiket open",
			"right": str(r.n),
		}
		for r in rows
	]


def _persona_docs():
	return [{"title": persona, "sub": surfaces} for persona, surfaces in PERSONA_MAP]


def _wiki_links():
	return [{"title": w["title"], "sub": w["sub"]} for w in WIKI_SOPS]


@frappe.whitelist()
def data():
	"""Cockpit admin — permission-gated, tanpa PHI."""
	return {
		"cards": [],
		"actions": ACTIONS,
		"panels": [
			{
				"title": "Checklist Operasional",
				"items": _ops_checklist(),
				"empty": "Checklist belum dapat dimuat.",
			},
			{
				"title": "Kesehatan Integrasi",
				"items": _integration_health(),
				"empty": "Belum ada sinyal integrasi (izin / konfigurasi).",
			},
			{
				"title": "Helpdesk · Tiket Open per Queue",
				"items": _helpdesk_by_queue(),
				"empty": "Tidak ada tiket open / Helpdesk belum terpasang.",
			},
			{
				"title": "Persona → Workspace",
				"items": _persona_docs(),
				"empty": "",
			},
			{
				"title": "SOP Wiki (tautan modul)",
				"items": _wiki_links(),
				"empty": "Buat halaman Wiki lalu tautkan ulang di sini.",
			},
		],
		"note": {
			"title": "Cockpit IT/admin RS",
			"desc": "Bukan tempat klinis. Untuk operasi, buka SDM / Keuangan / Pasien & Klinik.",
		},
	}


def setup():
	ws_common.upsert_block(
		BLOCK_NAME,
		ws_common.block_html("Pengaturan", "Cockpit Admin"),
		ws_common.block_script("sentra_mantra_indonesia.ws_pengaturan.data"),
		ws_common.BLOCK_STYLE,
	)
	# Workspace mungkin bernama berbeda di situs — coba beberapa.
	for name in (WORKSPACE, "Settings", "Pengaturan"):
		if frappe.db.exists("Workspace", name):
			ws_common.inject_top(name, BLOCK_NAME, "rsiaCockpitAdmin")
			frappe.db.commit()
			return {"block": BLOCK_NAME, "workspace": name}
	frappe.db.commit()
	return {"block": BLOCK_NAME, "workspace": None, "reason": "workspace missing"}
