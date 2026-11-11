"""Blok "Laporan Saya" — workspace Pelaporan.

Menampilkan SELURUH register laporan sebagai kartu (bukan antrean tersembunyi).
Kartu yang menuntut aksi dari user login diberi penanda merah di pojok kiri
atas ("Perlu diisi" / "Perlu validasi" / dst.) sesuai peran pelaporan user.

Endpoint digerbangi System User; query permission-aware — TANPA
ignore_permissions. Instalasi via ws_common.upsert_block/inject_top:

    bench --site mantra.localhost execute sentra_mantra_indonesia.pelaporan_desk.setup
"""

from __future__ import annotations

import frappe
from frappe.utils import today

BLOCK_NAME = "Laporan Saya"
WORKSPACE = "Pelaporan"

# role -> (label aksi di kartu, status siklus yang menunggu role itu)
_ROLE_QUEUES = (
	("Pelaporan Penyusun", "Perlu diisi", ("Dibuka", "Draf", "Dikembalikan", "Perlu Koreksi")),
	("Pelaporan Validator", "Perlu validasi", ("Diajukan untuk Validasi",)),
	("Pelaporan Penyetuju", "Perlu persetujuan", ("Tervalidasi", "Diterima")),
	("Pelaporan Pengirim", "Perlu dikirim", ("Disetujui", "Dikirim Eksternal")),
)

_FINAL_STATUSES = ("Ditutup",)


def _open_cycles_by_card():
	"""Siklus belum-final per report_card (tenggat terdekat menang)."""
	rows = frappe.get_list(  # permission-aware
		"Sentra Report Cycle",
		filters={"status": ("not in", list(_FINAL_STATUSES))},
		fields=["name", "report_card", "periode_label", "status", "tenggat_internal"],
		order_by="tenggat_internal asc",
		limit_page_length=0,
	)
	by_card = {}
	for r in rows:
		by_card.setdefault(r.report_card, r)
	return by_card


@frappe.whitelist()
def my_reports():
	"""Seluruh kartu register + penanda aksi untuk user login. Tanpa PHI."""
	user_type = frappe.db.get_value("User", frappe.session.user, "user_type")
	if user_type != "System User":
		frappe.throw(
			frappe._("Hanya pengguna desk yang boleh melihat tugas pelaporan."),
			frappe.PermissionError,
		)
	user_roles = set(frappe.get_roles())
	my_queues = [q for q in _ROLE_QUEUES if q[0] in user_roles]
	if not my_queues:
		# tanpa role pelaporan tidak ada hak baca register — fail-closed, tanpa query
		return {"title": "Laporan Saya", "roles": [], "cards": []}

	cycles = _open_cycles_by_card()
	cards = []
	for c in frappe.get_list(
		"Sentra Report Card",
		fields=["name", "report_name", "frekuensi", "divisi", "status"],
		order_by="name",
		limit_page_length=0,
	):
		cyc = cycles.get(c.name)
		needs_label = None
		if cyc:
			for _role, label, statuses in my_queues:
				if cyc.status in statuses:
					needs_label = label
					break
		tenggat = str(cyc.tenggat_internal or "") if cyc else ""
		cards.append(
			{
				"code": c.name,
				"report_name": c.report_name,
				"frekuensi": c.frekuensi,
				"divisi": c.divisi,
				"status": c.status,
				"cycle": (
					{
						"name": cyc.name,
						"periode": cyc.periode_label,
						"status": cyc.status,
						"tenggat_internal": tenggat,
						"href": f"/app/sentra-report-cycle/{cyc.name}",
					}
					if cyc
					else None
				),
				"needs_me": bool(needs_label),
				"needs_label": needs_label,
				"overdue": bool(cyc and tenggat and tenggat < today()),
			}
		)
	# urutan: butuh aksi saya -> aktif bersiklus -> aktif -> perlu verifikasi
	rank = {"Aktif": 1, "Perlu Verifikasi": 2, "Retired": 3}
	cards.sort(
		key=lambda x: (
			not x["needs_me"],
			rank.get(x["status"], 9),
			x["cycle"] is None,
			x["code"],
		)
	)
	return {
		"title": "Laporan Saya",
		"roles": sorted(r for r, _l, _s in _ROLE_QUEUES if r in user_roles),
		"cards": cards,
	}


HTML = """
<div class="rsia-pelaporan rsia-laporan-saya">
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / Laporan Saya</span>
		<a class="rsia-bar-link" href="/app/panduan-pelaporan">Panduan</a>
		<span class="rsia-bar-tag"><i></i>RSIA</span>
	</div>
	<div class="rsia-inner">
		<div class="rsia-head">
			<div class="rsia-id">
				<div class="rsia-name">Laporan Saya</div>
				<div class="rsia-sub">Seluruh register pelaporan — penanda merah berarti giliran Anda</div>
				<span class="rsia-badge" data-f="badge">RSIA Melinda</span>
			</div>
		</div>
		<div data-sec="cards"></div>
	</div>
</div>
"""

SCRIPT = """
frappe.call("sentra_mantra_indonesia.pelaporan_desk.my_reports").then((r) => {
	const d = r.message || {};
	const esc = frappe.utils.escape_html;
	const host = root_element.querySelector('[data-sec="cards"]');
	const badge = root_element.querySelector('[data-f="badge"]');
	if (badge && (d.roles || []).length) {
		badge.textContent = `${d.roles.length} peran pelaporan`;
	}
	host.innerHTML = "";
	if (!(d.cards || []).length) {
		host.innerHTML =
			'<div class="rsia-empty">Akun ini belum memiliki peran pelaporan. ' +
			'Minta admin memberikan peran bila Anda bagian dari alur laporan.</div>';
		return;
	}

	const urgensi = (tgl) => {
		if (!tgl) return null;
		const t = new Date(`${tgl}T00:00:00`);
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const hari = Math.round((t - now) / 86400000);
		if (hari < 0) return { label: `Terlambat ${-hari} hari`, late: true };
		if (hari === 0) return { label: "Jatuh tempo hari ini", late: true };
		return { label: `${hari} hari lagi`, late: false };
	};

	const grid = document.createElement("div");
	grid.className = "rsia-cards";
	d.cards.forEach((c, i) => {
		const cyc = c.cycle;
		const u = cyc ? urgensi(cyc.tenggat_internal) : null;
		const el = document.createElement("a");
		el.className =
			"rsia-card" +
			(c.needs_me ? " rsia-card-action" : "") +
			(c.status === "Perlu Verifikasi" ? " rsia-card-dorman" : "");
		el.href = cyc ? cyc.href : `/app/sentra-report-card/${encodeURIComponent(c.code)}`;

		let flag = "";
		if (c.needs_me) {
			flag =
				`<span class="rsia-flag">` +
				`● ${esc((c.overdue ? "Terlambat · " : "") + c.needs_label)}` +
				`</span>`;
		}

		let statusLine;
		if (cyc) {
			statusLine =
				`${esc(cyc.periode)} · ${esc(cyc.status)}` +
				(u ? ` · <span class="${u.late ? "is-late" : ""}">${esc(u.label)}</span>` : "");
		} else if (c.status === "Aktif") {
			statusLine = "Aktif · menunggu periode berikutnya";
		} else if (c.status === "Perlu Verifikasi") {
			statusLine = "Belum diverifikasi — belum menghasilkan tugas";
		} else {
			statusLine = esc(c.status);
		}

		el.innerHTML =
			flag +
			`<span class="rsia-num">${String(i + 1).padStart(2, "0")}</span>` +
			`<div class="rsia-card-title">${esc(c.report_name)}</div>` +
			`<div class="rsia-card-tags">` +
			`<span class="rsia-chip">${esc(c.frekuensi)}</span>` +
			`<span class="rsia-chip rsia-chip-soft">${esc((c.divisi || "").split(" - ").pop())}</span>` +
			`</div>` +
			`<div class="rsia-card-meta"><span>${statusLine}</span>` +
			`<span class="rsia-card-cta">Buka →</span></div>`;
		grid.appendChild(el);
	});
	host.appendChild(grid);
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Register pelaporan belum dapat dimuat.</div>';
});
"""

# Kartu register Laporan Saya — shell senada RACI, penanda merah = giliran user.
STYLE = """
.rsia-pelaporan {
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
:host-context([data-theme="dark"]) .rsia-pelaporan { color: var(--text-color); }
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
.rsia-bar-link {
	margin-left: auto;
	font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
	font-weight: 600; color: var(--text-muted); text-decoration: none;
	border-bottom: 1px solid var(--border-color); padding-bottom: 1px;
}
.rsia-bar-link:hover { color: #171717; border-color: #171717; text-decoration: none; }
:host-context([data-theme="dark"]) .rsia-bar-link:hover { color: var(--text-color); }
.rsia-bar-tag { color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-weight: 500; }
.rsia-bar-tag i { display: block; width: 34px; height: 1px; background: var(--border-color); }
.rsia-inner { padding: 16px; }
.rsia-empty { color: var(--text-muted); padding: 6px 0; }
.rsia-head {
	display: flex; align-items: flex-start; gap: 16px;
	margin: 0 0 14px; padding-bottom: 14px;
	border-bottom: 1px solid var(--border-color);
}
.rsia-id { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.rsia-name {
	font-family: Georgia, "Times New Roman", serif;
	font-size: 25px; line-height: 31px; font-weight: 400; color: #0a0a0a;
}
:host-context([data-theme="dark"]) .rsia-name { color: var(--text-color); }
.rsia-sub { margin: 0; color: #525252; font-size: 14px; line-height: 22px; }
:host-context([data-theme="dark"]) .rsia-sub { color: var(--text-muted); }
.rsia-badge {
	display: inline-block; margin-top: 6px; padding: 5px 16px;
	border-radius: 999px; background: var(--card-bg); color: #525252;
	font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase;
	border: 1px solid var(--border-color);
}

/* ---- grid kartu register ---- */
.rsia-cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	gap: 12px;
	padding: 4px 0 8px;
}
.rsia-card {
	position: relative;
	display: flex; flex-direction: column; gap: 8px; min-width: 0;
	padding: 30px 14px 12px;
	border: 1px solid var(--border-color); border-radius: 10px;
	background: var(--card-bg);
	text-decoration: none; color: inherit;
	transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}
.rsia-card:hover {
	border-color: #171717; text-decoration: none;
	transform: translateY(-1px);
	box-shadow: 0 6px 18px rgba(0, 0, 0, .06);
}
:host-context([data-theme="dark"]) .rsia-card:hover { border-color: var(--text-color); }

/* penanda merah pojok kiri atas — giliran user */
.rsia-flag {
	position: absolute; top: 10px; left: 14px;
	font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
	color: #b91c1c; white-space: nowrap;
}
.rsia-card-action { border-color: #b91c1c33; }
.rsia-card-action:hover { border-color: #b91c1c; }

/* nomor urut pojok kanan atas */
.rsia-num {
	position: absolute; top: 8px; right: 12px;
	font-size: 10px; letter-spacing: .1em;
	color: var(--text-muted); font-variant-numeric: tabular-nums;
}

/* kartu register yang belum diverifikasi */
.rsia-card-dorman { border-style: dashed; }
.rsia-card-dorman .rsia-card-title { color: #737373; }
:host-context([data-theme="dark"]) .rsia-card-dorman .rsia-card-title { color: var(--text-muted); }

.rsia-card-title {
	font-family: Georgia, "Times New Roman", serif;
	font-size: 16.5px; line-height: 22px; color: #0a0a0a;
	overflow-wrap: break-word;
}
:host-context([data-theme="dark"]) .rsia-card-title { color: var(--text-color); }
.rsia-card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.rsia-chip {
	font-size: 9.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
	padding: 3px 10px; border-radius: 999px;
	border: 1px solid var(--border-color); color: #525252;
	white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
}
:host-context([data-theme="dark"]) .rsia-chip { color: var(--text-muted); }
.rsia-chip-soft { border-style: dashed; color: var(--text-muted); }
.rsia-card-meta {
	display: flex; align-items: center; justify-content: space-between; gap: 8px;
	margin-top: auto; padding-top: 8px;
	border-top: 1px solid var(--border-color);
	font-size: 11.5px; color: var(--text-muted); line-height: 17px;
}
.rsia-card-meta .is-late { color: #b91c1c; font-weight: 600; }
.rsia-card-cta { white-space: nowrap; color: #171717; font-weight: 500; }
:host-context([data-theme="dark"]) .rsia-card-cta { color: var(--text-color); }
"""


def setup():
	"""Pasang blok Laporan Saya ke workspace Pelaporan (di atas blok RACI existing)."""
	from sentra_mantra_indonesia import ws_common
	from sentra_mantra_indonesia.ws_pelaporan import ensure_workspace

	ensure_workspace()
	ws_common.upsert_block(BLOCK_NAME, HTML, SCRIPT, STYLE)
	ws_common.inject_top(WORKSPACE, BLOCK_NAME, "laporanSaya")
	frappe.db.commit()
	print("Blok Laporan Saya terpasang di workspace Pelaporan.")
