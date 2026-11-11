"""Komponen bersama blok workspace Sentra (spec docs/SENTRA MANTRA.md).

Satu kontrak data generik untuk blok Pasien & Klinik / SDM / Keuangan:

    {
      "cards":   [{"value", "label", "sub", "route"}],       # SentraNumberCard
      "actions": [{"label", "desc", "route"}],               # SentraActionCard
      "panels":  [{"title", "items": [{"title", "sub", "right", "route"}],
                   "empty"}],                                # SentraSection
      "note":    {"title", "desc"} | None                    # kartu statis (payroll)
    }

Endpoint TIDAK boleh memakai ignore_permissions; setiap angka dijaga
frappe.has_permission terhadap doctype sumbernya (aturan spec §Keuangan).
"""

import json

import frappe


def bar(title, tag=None):
	tag_html = (
		f'<span class="rsia-bar-tag"><i></i>{tag}</span>' if tag else ""
	)
	return f"""
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / {title}</span>
		{tag_html}
	</div>"""


def block_html(title, tag, actions_title="Aksi Cepat"):
	return f"""
<div class="rsia-ws">
	{bar(title, tag)}
	<div class="rsia-inner">
		<div class="rsia-note" data-sec="note" hidden></div>
		<div class="rsia-cards" data-sec="cards"><i class="rsia-skel"></i><i class="rsia-skel"></i><i class="rsia-skel"></i><i class="rsia-skel"></i></div>
		<div class="rsia-ws-kicker" data-sec="actions-title" hidden>{actions_title}</div>
		<div class="rsia-actions" data-sec="actions"></div>
		<div class="rsia-panels" data-sec="panels"></div>
	</div>
</div>
"""


def block_script(endpoint):
	# Loading = skeleton ringan; Error = pesan singkat tanpa traceback;
	# Empty = pesan positif per panel (spec §Loading, empty, dan error states).
	return (
		"""
frappe.call("%s").then((r) => {
	const d = r.message || {};
	const esc = frappe.utils.escape_html;
	const sec = (n) => root_element.querySelector(`[data-sec="${n}"]`);

	if (d.note) {
		const n = sec("note");
		n.hidden = false;
		n.innerHTML = `<b>${esc(d.note.title)}</b><small>${esc(d.note.desc)}</small>`;
	}

	const cards = sec("cards");
	cards.innerHTML = "";
	(d.cards || []).forEach((c) => {
		const el = document.createElement(c.route ? "a" : "div");
		el.className = "rsia-card";
		if (c.route) el.href = c.route;
		el.innerHTML = `<b>${esc(String(c.value))}</b><label>${esc(c.label)}</label>` +
			(c.sub ? `<small>${esc(c.sub)}</small>` : "");
		cards.appendChild(el);
	});
	if (!(d.cards || []).length) cards.remove();

	const actions = sec("actions");
	(d.actions || []).forEach((q) => {
		if (!q.route) return;
		const a = document.createElement("a");
		a.className = "rsia-quick";
		a.href = q.route;
		a.innerHTML = `<b>${esc(q.label)}</b><small>${esc(q.desc || "")}</small>`;
		actions.appendChild(a);
	});
	if ((d.actions || []).length) sec("actions-title").hidden = false;

	const panels = sec("panels");
	(d.panels || []).forEach((p) => {
		const col = document.createElement("div");
		col.className = "rsia-panel";
		col.innerHTML = `<div class="rsia-ws-kicker">${esc(p.title)}</div>`;
		const list = document.createElement("div");
		list.className = "rsia-list";
		if (!(p.items || []).length) {
			list.innerHTML = `<div class="rsia-empty">${esc(p.empty || "Belum ada data.")}</div>`;
		} else {
			p.items.forEach((it) => {
				const a = document.createElement(it.route ? "a" : "div");
				a.className = "rsia-row";
				if (it.route) a.href = it.route;
				a.innerHTML = `<span class="rsia-row-txt"><b>${esc(it.title)}</b>` +
					(it.sub ? `<small>${esc(it.sub)}</small>` : "") + `</span>` +
					(it.right ? `<span class="rsia-row-right">${esc(it.right)}</span>` : "");
				list.appendChild(a);
			});
		}
		col.appendChild(list);
		panels.appendChild(col);
	});
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Ringkasan belum dapat dimuat. Buka daftar lengkap untuk melihat data.</div>';
});
"""
		% endpoint
	)


# Bahasa desain desk: struktur Sentra, netral seperti Profil (/me).
# Tanpa aksen warna brand per kartu (Chief: no rainbow cards).
BLOCK_STYLE = """
.rsia-ws {
	position: relative;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
	color: #525252;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 14px;
	line-height: 22px;
	overflow: hidden;
}
:host-context([data-theme="dark"]) .rsia-ws { color: var(--text-color); }
.rsia-bar {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 16px;
	border-bottom: 1px solid var(--border-color);
	background: var(--card-bg);
}
.rsia-dots { display: flex; gap: 6px; padding-right: 12px; border-right: 1px solid var(--border-color); }
.rsia-dots i { width: 9px; height: 9px; border-radius: 50%; }
.rsia-dots i:nth-child(1) { background: #FF5F57; }
.rsia-dots i:nth-child(2) { background: #FEBC2E; }
.rsia-dots i:nth-child(3) { background: #28C840; }
.rsia-bar-title, .rsia-bar-tag {
	font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
	color: #171717; font-weight: 600;
}
:host-context([data-theme="dark"]) .rsia-bar-title { color: var(--text-color); }
.rsia-bar-tag { margin-left: auto; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-weight: 500; }
.rsia-bar-tag i { display: block; width: 34px; height: 1px; background: var(--border-color); }
.rsia-inner { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.rsia-ws-kicker {
	font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
	color: var(--text-muted); padding-bottom: 6px;
	border-bottom: 1px solid var(--border-color);
}
.rsia-skel { display: block; height: 74px; border-radius: 8px; background: var(--border-color); opacity: .35; }
.rsia-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.rsia-card {
	position: relative; display: block; padding: 14px 14px 12px; min-width: 0;
	border: 1px solid var(--border-color); border-radius: 8px;
	text-decoration: none; overflow: hidden;
	transition: border-color 160ms ease;
}
.rsia-card b { display: block; font-size: 24px; line-height: 30px; font-weight: 600; color: #0a0a0a; }
:host-context([data-theme="dark"]) .rsia-card b { color: var(--text-color); }
.rsia-card label { display: block; margin-top: 2px; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); cursor: pointer; }
.rsia-card small { display: block; font-size: 12px; color: var(--text-muted); }
a.rsia-card:hover {
	border-color: #171717;
	text-decoration: none;
}
a.rsia-card:hover b { color: #0a0a0a; }
div.rsia-card { cursor: default; }
div.rsia-card label { cursor: default; }
.rsia-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.rsia-quick {
	display: block; padding: 12px 14px;
	border: 1px solid var(--border-color); border-radius: 8px;
	text-decoration: none; transition: border-color 160ms ease, background 160ms ease;
}
.rsia-quick b { display: block; font-size: 13.5px; font-weight: 600; color: #171717; }
:host-context([data-theme="dark"]) .rsia-quick b { color: var(--text-color); }
.rsia-quick small { display: block; margin-top: 2px; font-size: 12px; line-height: 18px; color: var(--text-muted); }
.rsia-quick:hover {
	border-color: #171717;
	background: var(--card-bg);
	text-decoration: none;
}
.rsia-quick:hover b { color: #0a0a0a; }
.rsia-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.rsia-panel { min-width: 0; }
.rsia-list { display: flex; flex-direction: column; margin-top: 4px; }
.rsia-row {
	display: flex; align-items: center; gap: 10px; min-width: 0;
	color: #525252; text-decoration: none; padding: 7px 0;
	border-bottom: 1px solid var(--border-color);
}
.rsia-row:last-of-type { border-bottom: none; }
:host-context([data-theme="dark"]) .rsia-row { color: var(--text-color); }
.rsia-row-txt { min-width: 0; }
.rsia-row-txt b {
	display: block; font-size: 13.5px; font-weight: 600; color: #171717;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
:host-context([data-theme="dark"]) .rsia-row-txt b { color: var(--text-color); }
.rsia-row-txt small { display: block; font-size: 12px; line-height: 18px; color: var(--text-muted); }
a.rsia-row:hover .rsia-row-txt b {
	color: #0a0a0a; text-decoration: underline; text-underline-offset: 3px;
}
.rsia-row-right { flex: none; margin-left: auto; font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.rsia-empty { color: var(--text-muted); padding: 6px 0; }
.rsia-note {
	padding: 12px 14px; border-radius: 8px;
	border: 1px dashed var(--border-color);
	background: var(--card-bg);
}
.rsia-note b { display: block; font-size: 13.5px; font-weight: 600; color: #171717; }
:host-context([data-theme="dark"]) .rsia-note b { color: var(--text-color); }
.rsia-note small { color: var(--text-muted); }
"""


def can(doctype):
	"""True bila user boleh membaca doctype — jangan agregasi tanpa izin."""
	try:
		return bool(frappe.has_permission(doctype))
	except Exception:
		return False


def has_role(*roles):
	"""True bila user memegang salah satu role.

	Untuk data yang tidak terwakili satu doctype (state konfigurasi, baris
	bernama lintas-pihak) — `can()` saja tidak cukup karena doctype-level
	read tidak berarti boleh melihat konfigurasi sistem atau nama pihak lain.
	"""
	try:
		return bool(set(roles) & set(frappe.get_roles()))
	except Exception:
		return False


def count(doctype, filters):
	try:
		return frappe.db.count(doctype, filters)
	except Exception:
		return 0


def gated_count(doctype, filters):
	"""Hitung hanya bila user punya read permission pada doctype sumber."""
	if not can(doctype):
		return 0
	return count(doctype, filters)


def persona():
	"""(persona, practitioner_name|None) — first-match: chief > clinical > hr > finance > umum."""
	roles = set(frappe.get_roles())
	practitioner = frappe.db.get_value(
		"Healthcare Practitioner", {"user_id": frappe.session.user}
	)
	if "System Manager" in roles:
		return "chief", practitioner
	if practitioner or roles & {"Physician", "Nursing User"}:
		return "clinical", practitioner
	if roles & {"HR Manager", "HR User"}:
		return "hr", practitioner
	if roles & {"Accounts Manager", "Accounts User"}:
		return "finance", practitioner
	return "umum", practitioner


def weekday_name():
	"""English weekday for Healthcare Schedule Time Slot.day (e.g. Monday)."""
	from frappe.utils import getdate

	return getdate().strftime("%A")


def hhmm(value):
	"""'8:00:00' (timedelta/str) -> '08:00'."""
	try:
		h, m = str(value).split(":")[:2]
		return f"{int(h):02d}:{m}"
	except Exception:
		return ""


def schedule_hours_text(schedule_names, day=None):
	"""Aggregate from_time/to_time for Practitioner Schedule names on a weekday.

	Returns 'HH:MM–HH:MM' or None when no slots match.
	"""
	schedules = [s for s in (schedule_names or []) if s]
	if not schedules:
		return None
	day = day or weekday_name()
	try:
		row = frappe.db.sql(
			"""select min(from_time), max(to_time) from `tabHealthcare Schedule Time Slot`
			where parent in %s and parenttype = 'Practitioner Schedule' and day = %s""",
			(schedules, day),
		)
	except Exception:
		return None
	if not row or not row[0][0]:
		return None
	start, end = hhmm(row[0][0]), hhmm(row[0][1])
	if not start or not end:
		return None
	return f"{start}–{end}"


def upsert_block(name, html, script, style):
	"""Tulis ulang blok; hapus dulu bila sudah ada supaya tidak ada HTML lama tertinggal."""
	if frappe.db.exists("Custom HTML Block", name):
		frappe.delete_doc("Custom HTML Block", name, force=1, ignore_permissions=True)
		frappe.db.commit()
	blk = frappe.new_doc("Custom HTML Block")
	blk.__newname = name
	blk.private = 0
	blk.html, blk.script, blk.style = html, script, style
	blk.insert(ignore_permissions=True)
	frappe.clear_document_cache("Custom HTML Block", name)
	try:
		frappe.cache().delete_keys("custom_html_block*")
	except Exception:
		pass


def inject_top(workspace, block_name, block_id):
	"""Idempoten: pasang blok sebagai item pertama konten workspace."""
	ws = frappe.get_doc("Workspace", workspace)
	if not any(cb.custom_block_name == block_name for cb in ws.custom_blocks):
		ws.append("custom_blocks", {"custom_block_name": block_name, "label": block_name})
	content = json.loads(ws.content)
	if not any(
		b.get("type") == "custom_block" and b["data"].get("custom_block_name") == block_name
		for b in content
	):
		content.insert(
			0, {"id": block_id, "type": "custom_block", "data": {"custom_block_name": block_name, "col": 12}}
		)
		ws.content = json.dumps(content)
	ws.save()
	frappe.clear_document_cache("Workspace", workspace)


def slim_to_block(workspace, block_name, block_id):
	"""Hanya tampilkan Custom HTML Block — hilangkan shortcut/header berwarna Frappe."""
	ws = frappe.get_doc("Workspace", workspace)
	if not any(cb.custom_block_name == block_name for cb in ws.custom_blocks):
		ws.append("custom_blocks", {"custom_block_name": block_name, "label": block_name})
	ws.content = json.dumps(
		[
			{
				"id": block_id,
				"type": "custom_block",
				"data": {"custom_block_name": block_name, "col": 12},
			}
		]
	)
	ws.save()
	frappe.clear_document_cache("Workspace", workspace)


def rupiah(value):
	try:
		return "Rp " + f"{float(value):,.0f}".replace(",", ".")
	except Exception:
		return "Rp 0"
