"""Kartu Profil Akun ringkas di beranda — tile dinamis per persona
(docs/design/2026-07-16-beranda-persona-design.md).

    bench --site mantra.localhost execute sentra_mantra_indonesia.home_profile.setup
"""

import frappe
from frappe.utils import today

from sentra_mantra_indonesia.ws_common import persona, schedule_hours_text, weekday_name

BLOCK_NAME = "Profil Akun RSIA"

HTML = """
<div class="rsia-profile">
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / Profil Akun</span>
		<span class="rsia-bar-tag"><i></i>Beranda</span>
	</div>
	<div class="rsia-inner">
	<div class="rsia-head">
		<img class="rsia-ava" alt="" />
		<div class="rsia-id">
			<div class="rsia-id-top">
				<div class="rsia-name">
					<span data-f="name_main">&nbsp;</span>
					<small data-f="name_suffix"></small>
				</div>
				<img class="rsia-rank" alt="" hidden />
			</div>
			<div class="rsia-sub" data-f="subtitle"></div>
			<span class="rsia-badge">RSIA Melinda</span>
		</div>
	</div>
	<div class="rsia-grid" data-sec="tiles"></div>
	<a class="rsia-more" href="/me">Lihat Profil Lengkap &rsaquo;</a>
	</div>
</div>
"""

SCRIPT = """
frappe.call("sentra_mantra_indonesia.home_profile.my_profile").then((r) => {
	const d = r.message || {};
	const esc = frappe.utils.escape_html;
	d.subtitle = d.jabatan;
	root_element.querySelectorAll("[data-f]").forEach((el) => {
		const v = d[el.dataset.f];
		if (v || v === 0) el.textContent = v;
	});
	const ava = root_element.querySelector(".rsia-ava");
	if (d.image) ava.src = d.image;
	else ava.remove();

	// badge pangkat (emblem jabatan struktural) — hanya bila jabatan punya badge
	const rank = root_element.querySelector(".rsia-rank");
	if (d.rank_badge) {
		rank.src = d.rank_badge;
		rank.alt = d.jabatan || "";
		rank.hidden = false;
	} else {
		rank.remove();
	}

	const grid = root_element.querySelector('[data-sec="tiles"]');
	grid.innerHTML = "";
	(d.tiles || []).forEach((t) => {
		const cell = document.createElement("div");
		const label = document.createElement("label");
		label.textContent = t.label || "";
		if (t.editable) {
			const btn = document.createElement("button");
			btn.className = "rsia-edit";
			btn.dataset.k = t.key;
			btn.dataset.l = t.label;
			btn.title = "Isi/ubah " + (t.label || "");
			btn.innerHTML = "&#9998;";
			label.appendChild(btn);
		}
		cell.appendChild(label);
		if (t.route && t.key === "notifikasi") {
			const span = document.createElement("span");
			const a = document.createElement("a");
			a.href = t.route;
			a.textContent = t.value || "Atur Notifikasi";
			span.appendChild(a);
			cell.appendChild(span);
		} else {
			const span = document.createElement("span");
			span.dataset.f = t.key;
			span.textContent = t.value != null && t.value !== "" ? t.value : "—";
			cell.appendChild(span);
		}
		if (t.key === "sisa_cuti" && (d.cuti_pct || d.cuti_pct === 0)) {
			const m = document.createElement("i");
			m.className = "rsia-meter";
			const b = document.createElement("b");
			b.style.width = d.cuti_pct + "%";
			m.appendChild(b);
			cell.appendChild(m);
		}
		if (t.sub) {
			const small = document.createElement("small");
			small.textContent = t.sub;
			cell.appendChild(small);
		}
		grid.appendChild(cell);
	});

	root_element.querySelectorAll(".rsia-edit").forEach((btn) => {
		btn.addEventListener("click", () => {
			const key = btn.dataset.k, label = btn.dataset.l;
			const curEl = root_element.querySelector(`[data-f="${key}"]`);
			const cur = curEl ? curEl.textContent : "";
			frappe.prompt(
				{ fieldname: "value", label: label, fieldtype: "Data", default: cur === "—" ? "" : cur, reqd: 1 },
				(v) => {
					frappe.call("sentra_mantra_indonesia.home_profile.update_my_str_sip", { [key]: v.value }).then((r) => {
						if (curEl) curEl.textContent = r.message[key] || "—";
						frappe.show_alert({ message: `${label} tersimpan`, indicator: "green" });
					});
				},
				label,
				"Simpan"
			);
		});
	});
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Ringkasan belum dapat dimuat. Buka daftar lengkap untuk melihat data.</div>';
});
"""

STYLE = """
.rsia-profile {
	position: relative;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
	color: #525252;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 15px;
	line-height: 24px;
	overflow: hidden;
}
:host-context([data-theme="dark"]) .rsia-profile { color: var(--text-color); }
.rsia-bar {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 16px; border-bottom: 1px solid var(--border-color);
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
.rsia-inner { position: relative; padding: 16px; }
.rsia-empty { color: var(--text-muted); padding: 6px 0; }
/* Header: foto kiri + identitas kanan, top-aligned (Chief 2026-07-17 —
   sebelumnya align-items:center membuat teks & badge pangkat tampak miring) */
.rsia-head {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	margin: 0 0 14px 0;
	padding-bottom: 14px;
	border-bottom: 1px solid var(--border-color);
}
.rsia-ava {
	flex: none;
	width: 150px;
	height: 150px;
	border-radius: 8px;
	object-fit: cover;
	object-position: center top;
	border: 1px solid var(--border-color);
	display: block;
}
.rsia-id {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
	padding-top: 2px; /* optical: serif cap-height vs foto top edge */
}
.rsia-id-top {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	width: 100%;
}
.rsia-name {
	flex: 1;
	min-width: 0;
	font-family: Georgia, "Times New Roman", serif;
	font-size: 24px;
	line-height: 30px;
	font-weight: 400;
	color: #171717;
}
:host-context([data-theme="dark"]) .rsia-name { color: var(--text-color); }
.rsia-name small {
	display: block;
	margin-top: 4px;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 13px;
	line-height: 20px;
	font-weight: 500;
	color: var(--text-muted);
	letter-spacing: .02em;
}
/* badge pangkat: sejajar baris nama (bukan pojok kanan seluruh header) */
.rsia-rank {
	flex: none;
	width: 64px;
	height: auto;
	max-height: 72px;
	object-fit: contain;
	object-position: top right;
	margin: 0;
}
.rsia-sub {
	margin: 0;
	color: #525252;
	font-size: 14px;
	line-height: 22px;
}
:host-context([data-theme="dark"]) .rsia-sub { color: var(--text-muted); }
.rsia-badge {
	display: inline-block;
	margin-top: 6px;
	padding: 5px 16px;
	border-radius: 999px;
	background: #ffffff;
	color: #525252;
	font-size: 10px;
	font-weight: 600;
	letter-spacing: .14em;
	text-transform: uppercase;
	box-shadow:
		4px 4px 9px rgba(23, 23, 23, .13),
		-4px -4px 9px rgba(255, 255, 255, .95),
		inset 1px 1px 1px rgba(255, 255, 255, .9);
}
:host-context([data-theme="dark"]) .rsia-badge {
	box-shadow:
		4px 4px 9px rgba(0, 0, 0, .5),
		-2px -2px 6px rgba(255, 255, 255, .06);
}
.rsia-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rsia-grid > div {
	min-width: 0; padding: 10px 12px;
	border: 1px solid var(--border-color); border-radius: 8px;
}
.rsia-grid label {
	display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
	color: var(--text-muted); margin-bottom: 2px;
}
.rsia-grid span { display: block; font-size: 14px; line-height: 22px; color: #171717; font-weight: 500; word-break: break-word; }
:host-context([data-theme="dark"]) .rsia-grid span { color: var(--text-color); }
.rsia-grid small { display: block; margin-top: 2px; font-size: 12px; line-height: 18px; color: var(--text-muted); }
.rsia-grid a { color: #171717; text-decoration: underline; text-underline-offset: 3px; }
:host-context([data-theme="dark"]) .rsia-grid a { color: var(--text-color); }
.rsia-grid a:hover { color: #FF4B26; }
.rsia-meter { display: block; height: 3px; margin-top: 8px; border-radius: 2px; background: var(--border-color); }
.rsia-meter b { display: block; height: 100%; width: 0; border-radius: 2px; background: #10b981; }
.rsia-edit {
	border: none; background: none; cursor: pointer; padding: 0 0 0 4px;
	font-size: 11px; color: var(--text-muted); vertical-align: 1px;
	letter-spacing: normal; text-transform: none;
}
.rsia-edit:hover { color: #FF4B26; }
.rsia-more {
	display: block; text-align: center; margin-top: 12px; padding: 7px 16px;
	border: 1px solid var(--border-color); border-radius: 8px;
	font-weight: 600; font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
	color: #171717; text-decoration: none;
	transition: border-color 120ms ease, color 120ms ease;
}
:host-context([data-theme="dark"]) .rsia-more { color: var(--text-color); }
.rsia-more:hover { border-color: #FF4B26; color: #FF4B26; text-decoration: none; }
"""


def _sisa_cuti(employee):
	"""(sisa, keterangan total, persen sisa) untuk tile cuti + meter kecil."""
	try:
		from hrms.hr.doctype.leave_application.leave_application import get_leave_balance_on

		bal = get_leave_balance_on(employee, "Cuti Tahunan", today())
		total = frappe.db.get_value(
			"Leave Allocation",
			{
				"employee": employee,
				"leave_type": "Cuti Tahunan",
				"docstatus": 1,
				"from_date": ("<=", today()),
				"to_date": (">=", today()),
			},
			"total_leaves_allocated",
		)
		if total:
			return f"{bal:g} hari", f"Dari {total:g} hari", max(0, min(100, round(bal / total * 100)))
		return f"{bal:g} hari", None, None
	except Exception:
		return None, None, None


def _jadwal_praktik_hari_ini(practitioner):
	"""Teks jam praktik hari ini dari Practitioner Schedule, atau fallback."""
	if not practitioner:
		return "Tidak ada jadwal"
	try:
		schedules = frappe.get_all(
			"Practitioner Service Unit Schedule",
			filters={"parent": practitioner, "parenttype": "Healthcare Practitioner"},
			pluck="schedule",
		)
		return schedule_hours_text(schedules, weekday_name()) or "Tidak ada jadwal"
	except Exception:
		return "Tidak ada jadwal"


# Badge pangkat (Chief 17 Jul): emblem per jabatan struktural puncak di kartu
# profil. Asset di sentra_mantra_core (branding); prefix match supaya varian
# ("WADIR Keuangan"/"WADIR Pengembangan") ikut. Jabatan lain tanpa badge.
RANK_BADGES = (
	("Direktur Utama", "dirut"),
	("Direktur RS", "dirut"),
	("WADIR", "wadir"),
	("Wakil Direktur", "wadir"),
	("Komisaris", "komisaris"),
	("Kepala Ruang", "karu"),
)


def _badge_for(designation):
	if not designation:
		return None
	for prefix, slug in RANK_BADGES:
		if designation.startswith(prefix):
			return f"/assets/sentra_mantra_core/images/rank/{slug}.png"
	return None


def _cred_sub(expiry):
	"""Teks status masa berlaku STR/SIP untuk sub tile: kedaluwarsa /
	<=90 hari lagi (peringatan) / masih lama. None bila tanggal belum diisi."""
	if not expiry:
		return None
	from frappe.utils import date_diff, formatdate, getdate, today

	sisa = date_diff(getdate(expiry), today())
	tanggal = formatdate(expiry, "dd-MM-yyyy")
	if sisa < 0:
		return f"Kedaluwarsa sejak {tanggal}"
	if sisa <= 90:
		return f"Berlaku s.d. {tanggal} — {sisa} hari lagi"
	return f"Berlaku s.d. {tanggal}"


def _tiles(persona_name, dept, emp, prac, sisa_cuti, cuti_total, employment_type):
	"""Maks 6 tile mengikuti matriks desain persona v1."""
	tiles = [
		{
			"key": "sisa_cuti",
			"label": "Sisa Cuti Tahunan",
			"value": sisa_cuti or "—",
			"sub": cuti_total,
		},
		{
			"key": "notifikasi",
			"label": "Notifikasi",
			"value": "Atur Notifikasi",
			"sub": "Preferensi & kanal",
			"route": "/app/notification-settings",
		},
	]
	if persona_name == "clinical":
		tiles.append({
			"key": "department",
			"label": "Unit Layanan",
			"value": dept or "—",
		})
		tiles.append({
			"key": "jadwal_praktik",
			"label": "Jadwal Praktik Hari Ini",
			"value": _jadwal_praktik_hari_ini(prac.name if prac else None),
		})
	else:
		tiles.append({
			"key": "department",
			"label": "Unit Kerja",
			"value": dept or "—",
		})
		tiles.append({
			"key": "employee_id",
			"label": "NIK Karyawan",
			"value": emp.name or "—",
			"sub": frappe._(employment_type) if employment_type else None,
		})

	# STR/SIP: clinical always if practitioner; others only if has_practitioner;
	# umum never
	show_cred = bool(prac and prac.name) and persona_name != "umum"
	if show_cred:
		tiles.append({
			"key": "str_no",
			"label": "STR",
			"value": prac.str_no or "—",
			"sub": _cred_sub(prac.get("str_expiry")),
			"editable": True,
		})
		tiles.append({
			"key": "sip_no",
			"label": "SIP",
			"value": prac.sip_no or "—",
			"sub": _cred_sub(prac.get("sip_expiry")),
			"editable": True,
		})
	return tiles[:6]


@frappe.whitelist()
def my_profile():
	"""Data profil + tiles dinamis untuk kartu beranda."""
	user = frappe.session.user
	persona_name, _prac_name = persona()
	udoc = frappe.db.get_value(
		"User", user, ["full_name", "enabled", "user_image"], as_dict=True
	) or frappe._dict()
	emp = frappe.db.get_value(
		"Employee",
		{"user_id": user},
		["name", "designation", "branch", "department", "employment_type"],
		as_dict=True,
	) or frappe._dict()
	prac = frappe.db.get_value(
		"Healthcare Practitioner",
		{"user_id": user},
		["name", "str_no", "sip_no", "str_expiry", "sip_expiry"],
		as_dict=True,
	) or frappe._dict()
	branches = frappe.get_all("Branch", pluck="name", limit=1)
	dept = (emp.department or "").removesuffix(" - MEL") or None
	sisa_cuti, cuti_total, cuti_pct = _sisa_cuti(emp.name) if emp.name else (None, None, None)
	name_parts = (udoc.full_name or "").split(",", 1)
	tiles = _tiles(
		persona_name, dept, emp, prac, sisa_cuti, cuti_total, emp.employment_type
	)
	return {
		"persona": persona_name,
		"full_name": udoc.full_name,
		"name_main": name_parts[0].strip(),
		"name_suffix": name_parts[1].strip() if len(name_parts) > 1 else None,
		"email": user if "@" in user else None,
		"image": udoc.user_image,
		"jabatan": emp.designation,
		"rank_badge": _badge_for(emp.designation),
		"department": dept,
		"employee_id": emp.name,
		"employment_type": frappe._(emp.employment_type) if emp.employment_type else None,
		"status_akun": "Aktif" if udoc.enabled else "Nonaktif",
		"sisa_cuti": sisa_cuti,
		"cuti_total": cuti_total,
		"cuti_pct": cuti_pct,
		"str_no": prac.str_no,
		"sip_no": prac.sip_no,
		"has_practitioner": bool(prac.name),
		"facility": emp.branch or (branches[0] if branches else None),
		"tiles": tiles,
	}


@frappe.whitelist()
def update_my_str_sip(str_no=None, sip_no=None):
	"""Isi/ubah Nomor STR & SIP — hanya practitioner tertaut akun login."""
	prac = frappe.db.get_value("Healthcare Practitioner", {"user_id": frappe.session.user})
	if not prac:
		frappe.throw(
			"Akun Anda belum tertaut ke data Tenaga Medis. Hubungi admin untuk penautan."
		)
	updates = {}
	for field, value in (("str_no", str_no), ("sip_no", sip_no)):
		if value is not None:
			updates[field] = str(value).strip()[:40] or None
	if updates:
		frappe.db.set_value("Healthcare Practitioner", prac, updates)
	return frappe.db.get_value(
		"Healthcare Practitioner", prac, ["str_no", "sip_no"], as_dict=True
	)


def setup():
	"""Idempoten: upsert Custom HTML Block (layout Home di home_today.setup)."""
	from sentra_mantra_indonesia.ws_common import upsert_block

	upsert_block(BLOCK_NAME, HTML, SCRIPT, STYLE)
	frappe.db.commit()
	return {"block": BLOCK_NAME}
