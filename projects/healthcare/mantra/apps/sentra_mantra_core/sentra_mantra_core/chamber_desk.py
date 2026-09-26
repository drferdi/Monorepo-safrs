"""Blok "Chamber" — kotak masuk keputusan Chief pada workspace Home.

Pola blok mengikuti "Laporan Saya" (`sentra_mantra_indonesia.pelaporan_desk`):
Custom HTML Block yang dipasang di atas konten workspace, isinya diambil dari
satu endpoint whitelisted yang permission-aware — TANPA `ignore_permissions`.
Helper pemasangan blok disalin ke sini alih-alih diimpor, karena ADR-0001
melarang `sentra_mantra_core` bergantung pada app kustom mana pun.

    bench --site mantra.localhost execute sentra_mantra_core.agents.setup.setup
"""

from __future__ import annotations

import json
from urllib.parse import urlencode

import frappe
from frappe import _
from frappe.utils import add_days, today

from sentra_mantra_core.agents import contract

BLOCK_NAME = "Chamber"
BLOCK_ID = "chamberKeputusan"
WORKSPACE = "Home"

CARD_DOCTYPE = "Sentra Decision Card"

EXPIRED_WINDOW_DAYS = 7

# Urutan tampil: yang paling menuntut keputusan lebih dulu.
_SEVERITY_RANK = {"Mendesak": 0, "Perlu Keputusan": 1, "Perlu Tinjauan": 2, "Informasi": 3}


@frappe.whitelist()
def my_chamber():
	"""Kartu terbuka yang berhak dilihat user login. Tanpa PHI, tanpa nama individu."""
	user_type = frappe.db.get_value("User", frappe.session.user, "user_type")
	if user_type != "System User":
		frappe.throw(
			_("Hanya pengguna desk yang boleh membuka Chamber."), frappe.PermissionError
		)
	if not frappe.has_permission(CARD_DOCTYPE):
		# Tanpa hak baca kartu tidak ada yang bisa ditampilkan — fail-closed,
		# tanpa kueri, dan tanpa pesan error yang membingungkan di blok.
		return {
			"title": "Chamber",
			"cards": [],
			"queued": 0,
			"expired_recent": {"count": 0, "days": EXPIRED_WINDOW_DAYS, "href": None},
		}

	rows = frappe.get_list(  # permission-aware; disaring audience_role oleh hooks
		CARD_DOCTYPE,
		filters={"status": contract.STATUS_OPEN, "queued_for_summary": 0},
		fields=[
			"name",
			"title",
			"severity",
			"narrative",
			"agent",
			"rule_code",
			"due_by",
			"trigger_explanation",
		],
		limit_page_length=0,
	)
	cards = []
	for row in rows:
		due = str(row.due_by or "")
		cards.append(
			{
				"code": row.name,
				"title": row.title,
				"severity": row.severity,
				"narrative": row.narrative,
				"agent": row.agent,
				"rule_code": row.rule_code,
				"due_by": due,
				"trigger_explanation": row.trigger_explanation,
				"overdue": bool(due and due < today()),
				"options": frappe.get_all(
					"Sentra Decision Option",
					filters={"parent": row.name, "parenttype": CARD_DOCTYPE},
					fields=["label", "is_primary", "requires_note", "is_destructive"],
					order_by="idx asc",
				),
				"href": f"/app/sentra-decision-card/{row.name}",
			}
		)
	cards.sort(key=lambda c: (_SEVERITY_RANK.get(c["severity"], 9), c["due_by"] or "9999", c["code"]))
	return {
		"title": "Chamber",
		"cards": cards,
		# Kedua hitungan ini lewat get_list, bukan db.count: db.count melewati
		# permission_query_conditions, sehingga angkanya akan memberi tahu user
		# berapa banyak kartu milik peran lain yang ada — kebocoran kecil, tapi
		# kebocoran.
		"queued": len(
			frappe.get_list(
				CARD_DOCTYPE,
				filters={"status": contract.STATUS_OPEN, "queued_for_summary": 1},
				pluck="name",
				limit_page_length=0,
			)
		),
		"expired_recent": _expired_recent(),
	}


def _expired_recent() -> dict:
	"""Kartu kedaluwarsa tujuh hari terakhir — keputusan yang terlewat.

	Kartu kedaluwarsa hilang dari Chamber, dan hilang begitu saja berarti Boss
	tidak pernah tahu apa yang ia lewatkan maupun apakah ambangnya terlalu
	longgar. Angka ini mengubahnya menjadi umpan balik.

	Jendela diukur dari `modified` karena kedaluwarsa menyetel kolom itu, dan
	kartu kedaluwarsa tidak bisa lagi disunting lewat jalur keputusan.
	"""
	since = add_days(today(), -EXPIRED_WINDOW_DAYS)
	names = frappe.get_list(
		CARD_DOCTYPE,
		filters=[
			["status", "=", contract.STATUS_EXPIRED],
			["modified", ">=", since],
		],
		pluck="name",
		limit_page_length=0,
	)
	query = urlencode(
		{"status": contract.STATUS_EXPIRED, "modified": json.dumps([">=", since])}
	)
	return {
		"count": len(names),
		"days": EXPIRED_WINDOW_DAYS,
		"href": f"/app/sentra-decision-card?{query}",
	}


@frappe.whitelist()
def decide(card: str, option: str, note: str | None = None):
	"""Jalankan handler opsi dengan izin manusia yang menekan tombol.

	Tidak ada `ignore_permissions` di jalur ini dan tidak ada AgentContext yang
	terlibat: agen tidak pernah punya jalur eksekusi (spesifikasi §3).
	"""
	doc = frappe.get_doc(CARD_DOCTYPE, card)
	if not frappe.has_permission(CARD_DOCTYPE, "write", doc=doc):
		frappe.throw(
			_("Anda tidak berhak memutuskan kartu ini."), frappe.PermissionError
		)
	if doc.status != contract.STATUS_OPEN:
		# Klik ganda, tab kedua, atau kartu yang sudah kedaluwarsa. Keputusan
		# kedua tidak boleh menimpa keputusan pertama beserta jejak auditnya.
		frappe.throw(
			_("Kartu ini sudah berstatus {0} dan tidak bisa diputuskan lagi.").format(doc.status)
		)
	chosen = next((o for o in doc.options if o.label == option), None)
	if not chosen:
		frappe.throw(_("Opsi {0} tidak ada pada kartu ini.").format(option))
	if chosen.requires_note and not (note or "").strip():
		frappe.throw(_("Opsi {0} mewajibkan catatan tertulis.").format(option))
	handler = contract.DECISION_HANDLERS.get(chosen.handler)
	if not handler:
		frappe.throw(_("Handler {0} tidak terdaftar.").format(chosen.handler))
	return handler(doc, note=note)


HTML = """
<div class="rsia-pelaporan rsia-chamber">
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / Chamber</span>
		<span class="rsia-bar-tag"><i></i>RSIA</span>
	</div>
	<div class="rsia-inner">
		<div class="rsia-head">
			<div class="rsia-id">
				<div class="rsia-name">Chamber</div>
				<div class="rsia-sub">Keputusan yang menunggu Anda — penanda merah berarti mendesak</div>
				<span class="rsia-badge" data-f="badge">RSIA Melinda</span>
				<span class="rsia-expired" data-f="expired"></span>
			</div>
		</div>
		<div class="rsia-error" data-sec="error" hidden></div>
		<div data-sec="cards"></div>
	</div>
</div>
"""

SCRIPT = """
const esc = frappe.utils.escape_html;
const host = root_element.querySelector('[data-sec="cards"]');
const badge = root_element.querySelector('[data-f="badge"]');
const expired = root_element.querySelector('[data-f="expired"]');
const errorBar = root_element.querySelector('[data-sec="error"]');
let busy = false;

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

function showError(text) {
	errorBar.textContent = text;
	errorBar.hidden = false;
}

function clearError() {
	errorBar.hidden = true;
	errorBar.textContent = "";
}

// Pesan asli dari server, bukan terjemahan bebas di sisi klien.
function serverError(err) {
	try {
		const msgs = JSON.parse(frappe._server_messages || "[]").map((m) => JSON.parse(m).message);
		if (msgs.length) return msgs.join(" ");
	} catch (e) {
		/* jatuh ke pesan bawaan di bawah */
	}
	return (err && err.message) || "Keputusan gagal dijalankan. Kartu tidak berubah.";
}

function setBusy(state) {
	busy = state;
	root_element.querySelectorAll("button.rsia-opt").forEach((b) => {
		b.disabled = state;
	});
}

function submit(card, label, note) {
	setBusy(true);
	clearError();
	frappe
		.xcall("sentra_mantra_core.chamber_desk.decide", { card: card, option: label, note: note || null })
		.then(() => {
			busy = false;
			render();
		})
		.catch((err) => {
			setBusy(false);
			showError(serverError(err));
		});
}

function start(card, option) {
	if (busy) return;
	const go = () => {
		if (option.requires_note) {
			frappe.prompt(
				{ fieldname: "note", fieldtype: "Small Text", label: "Catatan", reqd: 1 },
				(values) => submit(card, option.label, values.note),
				`Keputusan "${option.label}" wajib disertai catatan tertulis`,
				"Kirim"
			);
		} else {
			submit(card, option.label, null);
		}
	};
	if (option.is_destructive) {
		frappe.confirm(
			`Konfirmasi sekali lagi: <b>${esc(option.label)}</b>. Tindakan ini tidak bisa dibatalkan.`,
			go
		);
	} else {
		go();
	}
}

function buildCard(c, index) {
	const u = urgensi(c.due_by);
	const mendesak = c.severity === "Mendesak" || c.overdue;
	const el = document.createElement("div");
	el.className = "rsia-card" + (mendesak ? " rsia-card-action" : "");

	const flag = mendesak
		? `<span class="rsia-flag">● ${esc(c.overdue ? "Terlambat · " + c.severity : c.severity)}</span>`
		: "";

	el.innerHTML =
		flag +
		`<span class="rsia-num">${String(index + 1).padStart(2, "0")}</span>` +
		`<a class="rsia-card-title" href="${encodeURI(c.href)}">${esc(c.title)}</a>` +
		`<div class="rsia-card-narrative">${esc(c.narrative || "")}</div>` +
		`<div class="rsia-card-tags">` +
		`<span class="rsia-chip">${esc(c.severity)}</span>` +
		`<span class="rsia-chip rsia-chip-soft">${esc(c.rule_code)}</span>` +
		`</div>` +
		`<div class="rsia-card-actions"></div>` +
		`<div class="rsia-card-meta"><span>` +
		(u ? `<span class="${u.late ? "is-late" : ""}">${esc(u.label)}</span>` : "Tanpa tenggat") +
		`</span><a class="rsia-card-cta" href="${encodeURI(c.href)}">Lihat bukti →</a></div>`;

	const actions = el.querySelector(".rsia-card-actions");
	(c.options || []).forEach((o) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className =
			"rsia-opt" +
			(o.is_primary ? " rsia-opt-primary" : "") +
			(o.is_destructive ? " rsia-opt-danger" : "");
		button.textContent = o.label;
		button.addEventListener("click", () => start(c.code, o));
		actions.appendChild(button);
	});
	return el;
}

function render() {
	return frappe
		.xcall("sentra_mantra_core.chamber_desk.my_chamber")
		.then((d) => {
			d = d || {};
			const cards = d.cards || [];
			if (badge) {
				badge.textContent = d.queued
					? `${cards.length} kartu terbuka · ${d.queued} di ringkasan`
					: `${cards.length} kartu terbuka`;
			}
			if (expired) {
				// Nol pun tetap ditampilkan: "tidak ada yang terlewat" adalah
				// kabar, bukan ketiadaan kabar.
				const ex = d.expired_recent || { count: 0, days: 7 };
				const label = `${ex.count} kartu kedaluwarsa ${ex.days} hari terakhir`;
				expired.innerHTML =
					ex.count && ex.href
						? `<a class="rsia-expired-link" href="${esc(ex.href)}">${esc(label)} →</a>`
						: `<span class="rsia-expired-zero">${esc(label)}</span>`;
			}
			host.innerHTML = "";
			if (!cards.length) {
				host.innerHTML =
					'<div class="rsia-empty">Tidak ada keputusan yang menunggu. ' +
					'Kartu muncul di sini saat agen menemukan kondisi yang perlu Anda putuskan.</div>';
				return;
			}
			const grid = document.createElement("div");
			grid.className = "rsia-cards";
			cards.forEach((c, i) => grid.appendChild(buildCard(c, i)));
			host.appendChild(grid);
		})
		.catch(() => {
			host.innerHTML = '<div class="rsia-empty">Chamber belum dapat dimuat.</div>';
		});
}

render();
"""

# Shell senada blok Laporan Saya; penanda merah = kartu mendesak/terlambat.
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
.rsia-cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
/* Kartu bukan lagi satu tautan besar: di dalamnya ada tombol keputusan, jadi
   hover hanya menegaskan batas, bukan mengangkat seluruh kartu. */
.rsia-card:hover { border-color: #171717; }
:host-context([data-theme="dark"]) .rsia-card:hover { border-color: var(--text-color); }
.rsia-expired {
	display: block; margin-top: 6px;
	font-size: 11.5px; line-height: 18px;
}
.rsia-expired-zero { color: var(--text-muted); }
.rsia-expired-link {
	color: #b91c1c; font-weight: 600; text-decoration: none;
	border-bottom: 1px solid #b91c1c55; padding-bottom: 1px;
}
.rsia-expired-link:hover { color: #b91c1c; border-color: #b91c1c; text-decoration: none; }
.rsia-error {
	margin-bottom: 12px; padding: 10px 12px;
	border: 1px solid #b91c1c55; border-radius: 8px;
	color: #b91c1c; font-size: 13px; line-height: 20px;
}
.rsia-flag {
	position: absolute; top: 10px; left: 14px;
	font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
	color: #b91c1c; white-space: nowrap;
}
.rsia-card-action { border-color: #b91c1c33; }
.rsia-card-action:hover { border-color: #b91c1c; }
.rsia-num {
	position: absolute; top: 8px; right: 12px;
	font-size: 10px; letter-spacing: .1em;
	color: var(--text-muted); font-variant-numeric: tabular-nums;
}
.rsia-card-title {
	display: block;
	font-family: Georgia, "Times New Roman", serif;
	font-size: 16.5px; line-height: 22px; color: #0a0a0a;
	overflow-wrap: break-word; text-decoration: none;
}
.rsia-card-title:hover { color: #0a0a0a; text-decoration: underline; text-underline-offset: 3px; }
:host-context([data-theme="dark"]) .rsia-card-title { color: var(--text-color); }

/* ---- tombol keputusan di dalam kartu ---- */
.rsia-card-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 2px; }
.rsia-opt {
	font-family: inherit;
	font-size: 12.5px; font-weight: 500; line-height: 18px;
	padding: 7px 14px; border-radius: 6px;
	border: 1px solid var(--border-color); background: var(--card-bg); color: #171717;
	cursor: pointer; white-space: nowrap;
	transition: border-color .15s ease, background .15s ease, color .15s ease;
}
:host-context([data-theme="dark"]) .rsia-opt { color: var(--text-color); }
.rsia-opt:hover:not(:disabled) { border-color: #171717; }
.rsia-opt:focus-visible { outline: 2px solid #171717; outline-offset: 2px; }
.rsia-opt:disabled { opacity: .45; cursor: progress; }
.rsia-opt-primary { border-color: #171717; background: #171717; color: #ffffff; font-weight: 600; }
.rsia-opt-primary:hover:not(:disabled) { background: #0a0a0a; border-color: #0a0a0a; }
:host-context([data-theme="dark"]) .rsia-opt-primary { color: #ffffff; }
.rsia-opt-danger { border-color: #b91c1c; color: #b91c1c; }
.rsia-opt-danger:hover:not(:disabled) { background: #b91c1c; color: #ffffff; }
.rsia-card-narrative { font-size: 13px; line-height: 20px; color: #525252; overflow-wrap: break-word; }
:host-context([data-theme="dark"]) .rsia-card-narrative { color: var(--text-muted); }
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


def _upsert_block() -> None:
	"""Tulis ulang blok; hapus dulu supaya tidak ada HTML lama tertinggal."""
	if frappe.db.exists("Custom HTML Block", BLOCK_NAME):
		frappe.delete_doc("Custom HTML Block", BLOCK_NAME, force=1, ignore_permissions=True)
	block = frappe.new_doc("Custom HTML Block")
	block.__newname = BLOCK_NAME
	block.private = 0
	block.html, block.script, block.style = HTML, SCRIPT, STYLE
	block.insert(ignore_permissions=True)
	frappe.clear_document_cache("Custom HTML Block", BLOCK_NAME)


def _is_chamber_block(block) -> bool:
	return (
		block.get("type") == "custom_block"
		and (block.get("data") or {}).get("custom_block_name") == BLOCK_NAME
	)


def _append_bottom() -> None:
	"""Idempoten: blok Chamber selalu menjadi item terakhir konten workspace.

	Chief membaca blok yang sudah ada dulu, Chamber terakhir. Entri Chamber lama
	dibuang sebelum ditambahkan kembali, sehingga menjalankan setup dua kali
	tidak menggandakan blok maupun menggeser posisinya. Blok milik app lain
	tidak disentuh — urutan relatifnya dipertahankan apa adanya.
	"""
	ws = frappe.get_doc("Workspace", WORKSPACE)
	if not any(cb.custom_block_name == BLOCK_NAME for cb in ws.custom_blocks):
		ws.append("custom_blocks", {"custom_block_name": BLOCK_NAME, "label": BLOCK_NAME})
	content = [
		block for block in (json.loads(ws.content) if ws.content else []) if not _is_chamber_block(block)
	]
	content.append(
		{
			"id": BLOCK_ID,
			"type": "custom_block",
			"data": {"custom_block_name": BLOCK_NAME, "col": 12},
		}
	)
	ws.content = json.dumps(content)
	ws.save(ignore_permissions=True)
	frappe.clear_document_cache("Workspace", WORKSPACE)


def install_block() -> None:
	_upsert_block()
	_append_bottom()
