"""Workspace "Pelaporan" — peta tanggung jawab laporan eksternal RSIA.

Gaya visual mengikuti halaman Profil (/me · Profil Akun): header + kicker +
grid label/nilai netral. Bukan kartu berwarna.

    bench --site mantra.localhost execute sentra_mantra_indonesia.ws_pelaporan.setup
"""

from __future__ import annotations

import frappe

BLOCK_NAME = "Pelaporan RSIA"
WORKSPACE = "Pelaporan"

# RACI operasional pelaporan eksternal — SSOT teks dari Chief (2026-07-23).
DIVISIONS = (
	{
		"n": "01",
		"title": "Rekam Medis (RM) & SIMRS",
		"tugas": (
			"Menyusun laporan SIRS (RL 1–5), rekapitulasi morbiditas/mortalitas, "
			"10 besar penyakit, dan integrasi/bridging data (display tempat tidur, BPJS)."
		),
		"pj": "Kepala Unit Rekam Medis & Tim IT / SIMRS",
	},
	{
		"n": "02",
		"title": "Komite Mutu, PPI, & Keselamatan Pasien",
		"tugas": (
			"Menginput Indikator Nasional Mutu (INM), mengelola Laporan Insiden "
			"Keselamatan Pasien (IKP), dan laporan pencegahan/pengendalian infeksi."
		),
		"pj": "Ketua Komite Mutu & Komite PPI",
	},
	{
		"n": "03",
		"title": "Pelayanan Medis, Keperawatan, & Kebidanan",
		"tugas": (
			"Menyusun laporan AMPSR (Audit Maternal Perinatal) bila terjadi kematian "
			"ibu/bayi, data pelayanan NICU, pembedahan, Skrining Hipotiroid Kongenital "
			"(SHK), dan pelayanan KBPP."
		),
		"pj": "Dokter Spesialis (Obgyn/Anak), Bidan Koordinator, dan Kasi Pelayanan Medis/Keperawatan",
	},
	{
		"n": "04",
		"title": "Instalasi Farmasi",
		"tugas": (
			"Menginput laporan penggunaan obat-obatan terlarang/terkontrol via SIPNAP "
			"serta pengelolaan rantai dingin vaksin."
		),
		"pj": "Apoteker Penanggung Jawab (Apotek RS)",
	},
	{
		"n": "05",
		"title": "Sanitasi / K3RS",
		"tugas": (
			"Mengelola neraca limbah medis/B3 dan penginputan ke sistem lingkungan "
			"hidup (SIMPEL KLHK)."
		),
		"pj": "Petugas Sanitasi / Sanitarian / Tim K3RS",
	},
	{
		"n": "06",
		"title": "Bagian SDM / Kepegawaian (HRD)",
		"tugas": (
			"Menyediakan dan memperbarui data ketenagaan medis dan non-medis untuk RL 2."
		),
		"pj": "Kepala Bagian HRD / Kepegawaian",
	},
)

FINAL_NOTE = {
	"title": "Penanggung Jawab Akhir — Direktur Utama RSIA",
	"desc": (
		"Seluruh laporan disahkan dan ditandatangani oleh Direktur Utama RSIA "
		"sebelum dikirim ke pihak eksternal (Kemenkes, Dinas Kesehatan, BKKBN, "
		"DLH, BPJS)."
	),
}

REFS = (
	{"label": "Manajemen RSIA", "hint": "Metrik pelaporan via RME", "href": "/app/pasien-klinik"},
	{"label": "Workspace SDM", "hint": "Ketenagaan · RL 2", "href": "/app/sdm"},
	{"label": "Keuangan", "hint": "Pipeline & piutang", "href": "/app/keuangan"},
	{"label": "Profil Saya", "hint": "Akun & jobdesk", "href": "/me"},
)


@frappe.whitelist()
def data():
	"""Peta divisi pelaporan — teks statis, tanpa PHI.

	Digerbangi user_type System User: peta tanggung jawab internal organisasi
	tidak untuk login non-desk (mis. portal pasien di masa depan) (C3-F7).
	"""
	user_type = frappe.db.get_value("User", frappe.session.user, "user_type")
	if user_type != "System User":
		frappe.throw(
			frappe._("Hanya pengguna desk yang boleh melihat peta pelaporan."),
			frappe.PermissionError,
		)
	return {
		"title": "Pelaporan Eksternal RSIA",
		"subtitle": "Pembagian tanggung jawab per divisi / unit kerja",
		"badge": "RSIA Melinda",
		"intro": (
			"Pengerjaan dan penanggung jawab laporan wajib dibagi berdasarkan "
			"divisi terkait. Halaman ini adalah peta operasional — bukan tempat "
			"input data klinis."
		),
		"divisions": [
			{"n": d["n"], "title": d["title"], "tugas": d["tugas"], "pj": d["pj"]}
			for d in DIVISIONS
		],
		"final": FINAL_NOTE,
		"refs": [{"label": r["label"], "hint": r["hint"], "href": r["href"]} for r in REFS],
	}


HTML = """
<div class="rsia-pelaporan">
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / Pelaporan</span>
		<span class="rsia-bar-tag"><i></i>RSIA</span>
	</div>
	<div class="rsia-inner">
		<div class="rsia-head">
			<div class="rsia-id">
				<div class="rsia-name" data-f="title">&nbsp;</div>
				<div class="rsia-sub" data-f="subtitle"></div>
				<span class="rsia-badge" data-f="badge">RSIA Melinda</span>
			</div>
		</div>
		<p class="rsia-intro" data-f="intro"></p>
		<div data-sec="divisions"></div>
		<div class="rsia-ws-kicker">Penanggung jawab akhir</div>
		<div class="rsia-grid rsia-grid-final" data-sec="final"></div>
		<div class="rsia-ws-kicker">Referensi</div>
		<ul class="rsia-ref-list" data-sec="refs"></ul>
	</div>
</div>
"""

SCRIPT = """
frappe.call("sentra_mantra_indonesia.ws_pelaporan.data").then((r) => {
	const d = r.message || {};
	const esc = frappe.utils.escape_html;
	const sec = (n) => root_element.querySelector(`[data-sec="${n}"]`);

	root_element.querySelectorAll("[data-f]").forEach((el) => {
		const v = d[el.dataset.f];
		if (v || v === 0) el.textContent = v;
	});

	const host = sec("divisions");
	host.innerHTML = "";
	(d.divisions || []).forEach((div) => {
		const block = document.createElement("section");
		block.className = "rsia-div";
		block.innerHTML =
			`<div class="rsia-ws-kicker">${esc(div.n)} · ${esc(div.title)}</div>` +
			`<div class="rsia-grid">` +
			`<div><label>Tugas</label><span>${esc(div.tugas)}</span></div>` +
			`<div><label>Penanggung Jawab</label><span>${esc(div.pj)}</span></div>` +
			`</div>`;
		host.appendChild(block);
	});

	const fin = sec("final");
	fin.innerHTML = "";
	if (d.final) {
		fin.innerHTML =
			`<div><label>${esc(d.final.title)}</label><span>${esc(d.final.desc)}</span></div>`;
	}

	const refs = sec("refs");
	refs.innerHTML = "";
	(d.refs || []).forEach((link) => {
		const li = document.createElement("li");
		const a = document.createElement("a");
		a.href = link.href;
		a.innerHTML = `<b>${esc(link.label)}</b>` +
			(link.hint ? `<small>${esc(link.hint)}</small>` : "");
		li.appendChild(a);
		refs.appendChild(li);
	});
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Peta pelaporan belum dapat dimuat.</div>';
});
"""

# Netral seperti Profil Akun /me — tanpa aksen warna per kartu.
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
.rsia-bar-tag { margin-left: auto; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-weight: 500; }
.rsia-bar-tag i { display: block; width: 34px; height: 1px; background: var(--border-color); }
.rsia-inner { padding: 16px; display: flex; flex-direction: column; gap: 0; }
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
.rsia-intro {
	margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #525252;
}
:host-context([data-theme="dark"]) .rsia-intro { color: var(--text-muted); }
.rsia-ws-kicker {
	font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
	color: var(--text-muted); padding-bottom: 6px; margin-top: 8px;
	border-bottom: 1px solid var(--border-color);
}
.rsia-div { margin-bottom: 8px; }
.rsia-div .rsia-ws-kicker { margin-top: 12px; }
.rsia-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
	width: 100%;
	padding: 10px 0 4px;
}
@media (max-width: 720px) {
	.rsia-grid { grid-template-columns: 1fr; }
}
.rsia-grid-final { grid-template-columns: 1fr; }
.rsia-grid > div {
	min-width: 0; padding: 10px 12px;
	border: 1px solid var(--border-color); border-radius: 8px;
}
.rsia-grid label {
	display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
	color: var(--text-muted); margin-bottom: 2px;
}
.rsia-grid span {
	font-size: 14px; line-height: 22px; color: #525252;
	word-break: break-word;
}
:host-context([data-theme="dark"]) .rsia-grid span { color: var(--text-color); }
.rsia-ref-list { list-style: none; margin: 10px 0 0; padding: 0; }
.rsia-ref-list li { margin: 0 0 6px; }
.rsia-ref-list a {
	display: block; padding: 9px 10px;
	border: 1px solid var(--border-color); border-radius: 8px;
	background: var(--card-bg); color: #171717; text-decoration: none;
}
:host-context([data-theme="dark"]) .rsia-ref-list a { color: var(--text-color); }
.rsia-ref-list a:hover { border-color: #171717; text-decoration: none; }
.rsia-ref-list b { display: block; font-size: 12.5px; font-weight: 600; line-height: 18px; }
.rsia-ref-list small {
	display: block; margin-top: 2px; font-size: 10.5px; line-height: 15px;
	color: var(--text-muted); font-weight: 400;
}
"""


def ensure_workspace():
	"""Buat Workspace publik Pelaporan bila belum ada."""
	if frappe.db.exists("Workspace", WORKSPACE):
		return WORKSPACE
	ws = frappe.new_doc("Workspace")
	ws.name = WORKSPACE
	ws.title = WORKSPACE
	ws.label = WORKSPACE
	ws.public = 1
	ws.for_user = ""
	ws.module = "Sentra MANTRA Indonesia"
	ws.icon = "file"
	ws.content = "[]"
	ws.sequence_id = 12
	ws.insert(ignore_permissions=True)
	frappe.clear_document_cache("Workspace", WORKSPACE)
	return WORKSPACE


def setup():
	from sentra_mantra_indonesia import ws_common

	ensure_workspace()
	ws_common.upsert_block(BLOCK_NAME, HTML, SCRIPT, STYLE)
	ws_common.inject_top(WORKSPACE, BLOCK_NAME, "rsiaPelaporan")
	try:
		frappe.db.set_value("Workspace", WORKSPACE, "is_hidden", 0)
	except Exception:
		pass
	frappe.db.commit()
	return {"block": BLOCK_NAME, "workspace": WORKSPACE, "route": "/app/pelaporan"}
