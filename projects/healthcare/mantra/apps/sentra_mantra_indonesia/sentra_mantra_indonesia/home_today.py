"""Blok "Hari Ini" di Beranda (Chief, 2026-07-15): beranda harus menjawab
"apa yang perlu saya kerjakan sekarang", bukan daftar modul.

Empat seksi dalam satu blok: Tugas Hari Ini (hanya indikator bernilai > 0;
tanpa tugas tampil status "Semua terkendali"), Aksi Cepat (maks 4 shortcut
mengikuti peran), Terakhir Dibuka (maks 5 dokumen dari Route History,
disembunyikan bila kosong), dan Profil Publik (link milik user sendiri dari
User.sentra_profil_links — diisi via My Settings, disembunyikan bila kosong).
setup() juga menulis ulang konten workspace Home menjadi hanya kartu profil
(~30%) + blok ini (~70%).

    bench --site mantra.localhost execute sentra_mantra_indonesia.home_today.setup
"""

import json

import frappe
from frappe.utils import today

from sentra_mantra_indonesia.home_profile import BLOCK_NAME as PROFILE_BLOCK
from sentra_mantra_indonesia.insights import BLOCK_NAME as INSIGHTS_BLOCK
from sentra_mantra_indonesia.ws_common import can, gated_count, persona as resolve_persona

BLOCK_NAME = "Hari Ini RSIA"

HTML = """
<div class="rsia-today">
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / Hari Ini</span>
		<span class="rsia-bar-tag"><i></i>Operasional</span>
	</div>
	<div class="rsia-inner">
	<div class="rsia-checkin" data-sec="checkin">
		<div class="rsia-checkin-copy">
			<div class="rsia-today-kicker">Absensi</div>
			<div class="rsia-checkin-status" data-f="checkin_status">Memuat…</div>
		</div>
		<button type="button" class="rsia-checkin-btn" data-f="checkin_btn" disabled>Check-in</button>
	</div>
	<div class="rsia-today-grid">
		<div class="rsia-today-col" data-sec="tasks">
			<div class="rsia-today-kicker">Tugas Hari Ini</div>
			<div class="rsia-today-list"></div>
		</div>
		<div class="rsia-today-col" data-sec="actions">
			<div class="rsia-today-kicker">Aksi Cepat</div>
			<div class="rsia-today-list rsia-today-actions"></div>
		</div>
		<div class="rsia-today-col" data-sec="recent" hidden>
			<div class="rsia-today-kicker">Terakhir Dibuka</div>
			<div class="rsia-today-list"></div>
			<a class="rsia-all" href="/app/activity">Lihat Semua Aktivitas &rsaquo;</a>
		</div>
	</div>
	<div class="rsia-presence" data-sec="presence" hidden>
		<div class="rsia-today-kicker">Profil Publik</div>
		<nav class="rsia-presence-row" aria-label="Profil publik"></nav>
	</div>
	</div>
</div>
"""

SCRIPT = """
// Ikon brand per platform (ORCID/Substack/Hugging Face dari simple-icons;
// sisanya dipertahankan dari implementasi awal yang sudah sesuai brand).
// Platform tanpa ikon (Lainnya) memakai globe Website.
const RSIA_ICONS = {
	"Website": "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3.17a15.4 15.4 0 0 0-1.35-5.2A8.03 8.03 0 0 1 19.93 11zM12 4c.9 0 2.3 1.9 3.05 5H8.95C9.7 5.9 11.1 4 12 4zM4.07 13h3.17a15.4 15.4 0 0 0 1.35 5.2A8.03 8.03 0 0 1 4.07 13zm3.17-2H4.07a8.03 8.03 0 0 1 4.52-5.2A15.4 15.4 0 0 0 7.24 11zM12 20c-.9 0-2.3-1.9-3.05-5h6.1C14.3 18.1 12.9 20 12 20zm1.48-2.8a15.4 15.4 0 0 0 1.35-5.2h3.17a8.03 8.03 0 0 1-4.52 5.2zM9.7 13a13.3 13.3 0 0 1 1.15 4.4c.38.07.77.1 1.15.1s.77-.03 1.15-.1A13.3 13.3 0 0 1 14.3 13H9.7zm4.6-2a13.3 13.3 0 0 1-1.15-4.4A7 7 0 0 0 12 6.5c-.4 0-.78.05-1.15.1A13.3 13.3 0 0 1 9.7 11h4.6z",
	"Medium": "M4.07 6.54a.7.7 0 0 0-.23-.58L2.1 4.13V3.8h6.2l4.79 10.5L17.3 3.8H23v.33l-1.5 1.44a.42.42 0 0 0-.16.4v10.2a.42.42 0 0 0 .16.4l1.46 1.43v.33h-7.36v-.33l1.51-1.47c.15-.15.15-.19.15-.4V8.3l-4.2 10.66h-.57L6.24 8.3v7.14c-.04.3.06.61.28.83l2.03 2.46v.33H2v-.33l2.03-2.46a.97.97 0 0 0 .26-.83V6.54z",
	"ORCID": "M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z",
	"X": "M18.24 3H21l-6.52 7.45L22 21h-5.9l-4.62-6.04L6.3 21H3.53l6.97-7.97L2 3h6.05l4.17 5.52L18.24 3zm-1.04 16.2h1.64L7.05 4.7H5.3l11.9 14.5z",
	"Substack": "M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z",
	"Kaggle": "M17.8 18.8l-4.6-5.5-1.4 1.5v4H9.1V5.2h2.7v6.4l5.7-6.4h3.3l-5.4 5.9 5.9 7.7h-3.5z",
	"Reddit": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.2 10.6c.02.17.03.34.03.52 0 2.68-3.13 4.86-7 4.86s-7-2.18-7-4.86c0-.18.01-.35.03-.52a1.7 1.7 0 0 1 1.02-3.1c.47 0 .9.19 1.21.5 1.22-.82 2.9-1.34 4.74-1.4l.9-4.2a.45.45 0 0 1 .54-.34l3.02.64a1.35 1.35 0 1 1 .27 1.07l-2.7-.57-.8 3.76c1.8.08 3.44.6 4.64 1.4.3-.3.72-.48 1.18-.48a1.7 1.7 0 0 1 1.02 3.1zM8.7 13.1a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zm6.7 2.55c-.85.85-2.47 1-3.4 1s-2.55-.15-3.4-1a.45.45 0 0 1 .64-.64c.55.55 1.8.74 2.76.74s2.21-.19 2.76-.74a.45.45 0 1 1 .64.64zm-.3-2.55a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z",
	"LinkedIn": "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0z",
	"Hugging Face": "M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454m.836 10.354c.824-1.19.766-2.082-.365-3.194-1.13-1.112-1.789-2.738-1.789-2.738s-.246-.945-.806-.858-.97 1.499.202 2.362c1.173.864-.233 1.45-.685.64-.45-.812-1.683-2.896-2.322-3.295s-1.089-.175-.938.647 2.822 2.813 2.562 3.244-1.176-.506-1.176-.506-2.866-2.567-3.49-1.898.473 1.23 2.037 2.16c1.564.932 1.686 1.178 1.464 1.53s-3.675-2.511-4-1.297c-.323 1.214 3.524 1.567 3.287 2.405-.238.839-2.71-1.587-3.216-.642-.506.946 3.49 2.056 3.522 2.064 1.29.33 4.568 1.028 5.713-.624m5.349 0c-.824-1.19-.766-2.082.365-3.194 1.13-1.112 1.789-2.738 1.789-2.738s.246-.945.806-.858.97 1.499-.202 2.362c-1.173.864.233 1.45.685.64.451-.812 1.683-2.896 2.322-3.295s1.089-.175.938.647-2.822 2.813-2.562 3.244 1.176-.506 1.176-.506 2.866-2.567 3.49-1.898-.473 1.23-2.037 2.16c-1.564.932-1.686 1.178-1.464 1.53s3.675-2.511 4-1.297c.323 1.214-3.524 1.567-3.287 2.405.238.839 2.71-1.587 3.216-.642.506.946-3.49 2.056-3.522 2.064-1.29.33-4.568 1.028-5.713-.624",
	"Instagram": "M12 7.2A4.8 4.8 0 1 0 16.8 12 4.8 4.8 0 0 0 12 7.2zm0 7.9A3.1 3.1 0 1 1 15.1 12 3.1 3.1 0 0 1 12 15.1zm6.1-8.1a1.12 1.12 0 1 1-1.12-1.12 1.12 1.12 0 0 1 1.12 1.12zM12 4.4c2.7 0 3.02.01 4.08.06a3.7 3.7 0 0 1 3.46 3.46c.05 1.06.06 1.38.06 4.08s-.01 3.02-.06 4.08a3.7 3.7 0 0 1-3.46 3.46c-1.06.05-1.38.06-4.08.06s-3.02-.01-4.08-.06a3.7 3.7 0 0 1-3.46-3.46C4.41 15.02 4.4 14.7 4.4 12s.01-3.02.06-4.08A3.7 3.7 0 0 1 7.92 4.46C8.98 4.41 9.3 4.4 12 4.4zm0-1.9c-2.75 0-3.1.01-4.18.06A5.6 5.6 0 0 0 2.56 7.82C2.51 8.9 2.5 9.25 2.5 12s.01 3.1.06 4.18a5.6 5.6 0 0 0 5.26 5.26c1.08.05 1.43.06 4.18.06s3.1-.01 4.18-.06a5.6 5.6 0 0 0 5.26-5.26c.05-1.08.06-1.43.06-4.18s-.01-3.1-.06-4.18a5.6 5.6 0 0 0-5.26-5.26C15.1 2.51 14.75 2.5 12 2.5z"
};

frappe.call("sentra_mantra_indonesia.home_today.my_today").then((r) => {
	const d = r.message || {};
	const sec = (name) => root_element.querySelector(`[data-sec="${name}"] .rsia-today-list`);
	const esc = frappe.utils.escape_html;

	// Absensi satu tombol: login → Check-in/out → timestamp
	const ck = d.checkin || {};
	const ckStatus = root_element.querySelector('[data-f="checkin_status"]');
	const ckBtn = root_element.querySelector('[data-f="checkin_btn"]');
	function paintCheckin(c) {
		if (!ckStatus || !ckBtn) return;
		if (!c || !c.ok) {
			ckStatus.textContent = (c && c.message) || "Absensi belum tersedia untuk akun ini.";
			ckBtn.disabled = true;
			ckBtn.textContent = "Check-in";
			return;
		}
		ckStatus.textContent = c.last_time
			? ("Terakhir " + (c.last_type || "") + " · " + c.last_time)
			: "Belum ada check-in. Ketuk untuk mulai.";
		ckBtn.disabled = false;
		ckBtn.textContent = c.button_label || (c.next_type === "OUT" ? "Check-out" : "Check-in");
		ckBtn.dataset.next = c.next_type || "IN";
	}
	paintCheckin(ck);
	if (ckBtn) {
		ckBtn.addEventListener("click", () => {
			ckBtn.disabled = true;
			frappe.call("sentra_mantra_indonesia.checkin_easy.punch").then((res) => {
				const out = res.message || {};
				frappe.show_alert({
					message: (out.log_type === "OUT" ? "Check-out" : "Check-in") + " · " + (out.time || ""),
					indicator: "green",
				});
				paintCheckin({
					ok: true,
					last_type: out.log_type,
					last_time: out.time,
					next_type: out.next_type,
					button_label: out.button_label,
				});
			}).catch(() => {
				ckBtn.disabled = false;
			});
		});
	}


	// adaptif (spec §1B): banner 3 kondisi + hanya baris bernilai > 0 —
	// bukan empat baris angka nol
	const tasks = sec("tasks");
	const aktif = (d.tasks || []).filter((t) => t.count > 0);
	const BANNER = {
		success: ["\\u2713", "Semua terkendali", "Tidak ada persetujuan atau tindak lanjut yang menunggu saat ini."],
		attention: ["!", "Beberapa hal membutuhkan perhatian", "Ada pekerjaan yang menunggu tindak lanjut Anda."],
		critical: ["!", "Tindakan segera diperlukan", "Ada item kritis yang harus ditangani hari ini."],
	};
	const lv = d.level && BANNER[d.level] ? d.level : (aktif.length ? "attention" : "success");
	const [ic, judul, ket] = BANNER[lv];
	tasks.innerHTML = `<div class="rsia-calm rsia-lv-${lv}">
		<b>${ic}</b>
		<div><strong>${judul}</strong><small>${ket}</small></div>
	</div>`;
	aktif.forEach((t) => {
		const a = document.createElement("a");
		a.className = "rsia-task rsia-task-hot";
		a.href = t.route;
		a.innerHTML = `<b>${t.count}</b><span>${esc(t.label)}</span>`;
		tasks.appendChild(a);
	});

	const actions = sec("actions");
	(d.actions || []).forEach((q) => {
		const a = document.createElement("a");
		a.className = "rsia-quick";
		a.href = q.route;
		a.innerHTML = `<b>${esc(q.label)}</b><small>${esc(q.desc || "")}</small>`;
		actions.appendChild(a);
	});

	// seksi hanya dirender kalau memang ada riwayat — jangan tampilkan
	// kontainer hanya untuk menjelaskan bahwa ia kosong (Chief)
	if ((d.recent || []).length > 0) {
		const col = root_element.querySelector('[data-sec="recent"]');
		col.hidden = false;
		const recent = col.querySelector(".rsia-today-list");
		d.recent.forEach((it) => {
			const a = document.createElement("a");
			a.className = "rsia-recent";
			a.href = it.route;
			a.innerHTML = `<span class="rsia-recent-txt"><b>${esc(it.title)}</b><small>${esc(it.doctype)}</small></span>` +
				(it.when ? `<span class="rsia-recent-when">${esc(it.when)}</span>` : "");
			recent.appendChild(a);
		});
	}

	// Profil Publik: link milik user sendiri (User.sentra_profil_links via
	// payload per-user) — sembunyi bila kosong; hanya href http(s)
	const presence = (d.presence || []).filter((p) => /^https?:\\/\\//i.test(p.url || ""));
	if (presence.length > 0) {
		const wrap = root_element.querySelector('[data-sec="presence"]');
		wrap.hidden = false;
		const row = wrap.querySelector(".rsia-presence-row");
		presence.forEach((p) => {
			const a = document.createElement("a");
			a.className = "rsia-presence-link";
			a.href = p.url;
			a.target = "_blank";
			a.rel = "noopener noreferrer";
			const path = RSIA_ICONS[p.platform] || RSIA_ICONS["Website"];
			a.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>` +
				`<b>${esc(p.platform || "")}</b>` +
				(p.label ? `<small>${esc(p.label)}</small>` : "");
			row.appendChild(a);
		});
	}
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Ringkasan belum dapat dimuat. Buka daftar lengkap untuk melihat data.</div>';
});
"""

STYLE = """
/* Bahasa desain "Sentra" (Chief 2026-07-15): struktur bar + dot mac + kicker
   + nomor urut + bracket sudut; warna netral mengikuti tema desk (koreksi
   Chief), aksen #FF4B26 hanya nomor urut, badge aktif & hover. */
.rsia-today {
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
:host-context([data-theme="dark"]) .rsia-today { color: var(--text-color); }
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
.rsia-inner { position: relative; padding: 16px 20px 18px 20px; }
.rsia-checkin {
	display: flex; align-items: center; justify-content: space-between; gap: 14px;
	margin: 0 0 16px; padding: 12px 14px;
	border: 1px solid var(--border-color); border-radius: 8px;
	background: var(--card-bg);
}
.rsia-checkin .rsia-today-kicker { margin-bottom: 4px; padding-bottom: 0; border-bottom: 0; }
.rsia-checkin-status { font-size: 14px; line-height: 20px; color: #525252; }
:host-context([data-theme="dark"]) .rsia-checkin-status { color: var(--text-muted); }
.rsia-checkin-btn {
	flex: none; min-width: 128px; padding: 12px 18px;
	border: 0; border-radius: 8px; cursor: pointer;
	background: #171717; color: #fff;
	font-size: 14px; font-weight: 600; letter-spacing: .02em;
}
.rsia-checkin-btn:hover:not(:disabled) { background: #FF4B26; }
.rsia-checkin-btn:disabled { opacity: .45; cursor: not-allowed; }
.rsia-today-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 20px;
}
.rsia-today-col { min-width: 0; }
.rsia-today-kicker {
	font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
	color: var(--text-muted); margin-bottom: 10px;
	padding-bottom: 6px; border-bottom: 1px solid var(--border-color);
}
.rsia-today-list { display: flex; flex-direction: column; gap: 6px; }
/* status tenang saat tidak ada tugas (Chief): banner selebar kolom,
   sistem yang menjaga — bukan daftar nol */
.rsia-calm {
	display: flex; align-items: center; gap: 14px; padding: 14px 16px;
	border: 1px solid rgba(16, 185, 129, .35); border-radius: 8px;
	background: rgba(16, 185, 129, .07);
}
.rsia-calm b {
	flex: none; width: 28px; height: 28px; line-height: 26px; text-align: center;
	border: 1px solid #10b981; border-radius: 50%; color: #10b981;
	font-size: 13px; font-weight: 600;
}
.rsia-calm strong { display: block; font-weight: 600; color: #171717; }
:host-context([data-theme="dark"]) .rsia-calm strong { color: var(--text-color); }
.rsia-calm small { color: var(--text-muted); }
/* 3 kondisi status (spec §1B) — warna + ikon + teks, bukan warna saja */
.rsia-lv-attention { border-color: rgba(217, 119, 6, .4); background: rgba(217, 119, 6, .07); margin-bottom: 8px; }
.rsia-lv-attention b { border-color: #d97706; color: #d97706; }
.rsia-lv-critical { border-color: rgba(220, 38, 38, .45); background: rgba(220, 38, 38, .07); margin-bottom: 8px; }
.rsia-lv-critical b { border-color: #dc2626; color: #dc2626; }
.rsia-task {
	display: flex; align-items: center; gap: 10px;
	color: #525252; text-decoration: none; padding: 3px 0;
}
:host-context([data-theme="dark"]) .rsia-task { color: var(--text-color); }
.rsia-task b {
	min-width: 28px; text-align: center; font-weight: 600;
	border: 1px solid var(--border-color); border-radius: 5px;
	font-size: 12px; line-height: 20px; color: var(--text-muted);
}
.rsia-task-hot b { color: #FF4B26; border-color: #FF4B26; background: rgba(255, 75, 38, .08); }
.rsia-task:hover span { color: #FF4B26; text-decoration: underline; text-underline-offset: 3px; }
/* aksi cepat: baris tile berbingkai dua baris (judul + keterangan) —
   tiru susunan referensi Chief, tanpa warna per tombol */
.rsia-today-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.rsia-quick {
	display: block; padding: 12px 14px;
	border: 1px solid var(--border-color); border-radius: 8px;
	text-decoration: none;
	transition: border-color 120ms ease;
}
.rsia-quick b { display: block; font-size: 13.5px; font-weight: 600; color: #171717; }
:host-context([data-theme="dark"]) .rsia-quick b { color: var(--text-color); }
.rsia-quick small { display: block; margin-top: 2px; font-size: 12px; line-height: 18px; color: var(--text-muted); }
.rsia-quick:hover { border-color: #FF4B26; text-decoration: none; }
.rsia-quick:hover b { color: #FF4B26; }
/* terakhir dibuka: baris dua tingkat (judul + jenis), waktu di kanan */
.rsia-recent {
	display: flex; align-items: center; gap: 10px; min-width: 0;
	color: #525252; text-decoration: none; padding: 7px 0;
	border-bottom: 1px solid var(--border-color);
}
.rsia-recent:last-of-type { border-bottom: none; }
:host-context([data-theme="dark"]) .rsia-recent { color: var(--text-color); }
.rsia-recent-txt { min-width: 0; }
.rsia-recent-txt b {
	display: block; font-size: 13.5px; font-weight: 600; color: #171717;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
:host-context([data-theme="dark"]) .rsia-recent-txt b { color: var(--text-color); }
.rsia-recent-txt small { display: block; font-size: 12px; line-height: 18px; color: var(--text-muted); }
.rsia-recent:hover .rsia-recent-txt b { color: #FF4B26; text-decoration: underline; text-underline-offset: 3px; }
.rsia-recent-when { flex: none; margin-left: auto; font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.rsia-all {
	display: block; width: max-content; margin: 12px auto 0 auto; padding: 6px 18px;
	border: 1px solid var(--border-color); border-radius: 999px;
	font-weight: 600; font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
	color: #171717; text-decoration: none;
	transition: border-color 120ms ease, color 120ms ease;
}
:host-context([data-theme="dark"]) .rsia-all { color: var(--text-color); }
.rsia-all:hover { border-color: #FF4B26; color: #FF4B26; text-decoration: none; }
.rsia-empty { color: var(--text-muted); padding: 6px 0; }
/* Profil Publik: sama bahasa visual Aksi Cepat (kicker + kartu berbingkai),
   ikon besar + judul + keterangan. Grid auto-fit (konvensi rsia-today-actions)
   supaya menyesuaikan lebar kontainer col-8 tanpa media query. */
.rsia-presence { margin-top: 20px; }
.rsia-presence-row {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 10px;
}
.rsia-presence-link {
	display: flex; flex-direction: column; align-items: center; text-align: center;
	min-width: 0; padding: 14px 10px 12px;
	border: 1px solid var(--border-color); border-radius: 8px;
	color: #171717; text-decoration: none;
	transition: border-color 120ms ease;
}
:host-context([data-theme="dark"]) .rsia-presence-link { color: var(--text-color); }
.rsia-presence-link svg { width: 28px; height: 28px; flex: none; margin-bottom: 8px; }
.rsia-presence-link b {
	display: block; font-size: 13.5px; font-weight: 600;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.rsia-presence-link small {
	display: block; margin-top: 2px; font-size: 11px; line-height: 16px; color: var(--text-muted);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.rsia-presence-link:hover { border-color: #FF4B26; text-decoration: none; }
.rsia-presence-link:hover b { color: #FF4B26; }
"""

# state workflow yang BUKAN "menunggu keputusan" — sisanya dihitung pending
FINAL_STATES = ("Draft", "Approved", "Rejected", "Cancelled")
APPROVAL_DOCTYPES = (
	("Material Request", "Permintaan kebutuhan menunggu persetujuan"),
	("Expense Claim", "Reimbursement menunggu persetujuan"),
	("Purchase Invoice", "Tagihan pembelian menunggu persetujuan"),
	("Purchase Order", "Pesanan Pembelian menunggu persetujuan"),
	("Payment Entry", "Penerimaan & Pembayaran menunggu persetujuan"),
	("Journal Entry", "Jurnal menunggu persetujuan"),
)


def _route(doctype, filters=None):
	"""Bare list route only — query-string filters are not applied by Desk."""
	_ = filters
	slug = frappe.scrub(doctype).replace("_", "-")
	return f"/app/{slug}"


def _tasks_chief():
	tasks = []
	for doctype, label in APPROVAL_DOCTYPES:
		n = gated_count(doctype, {"docstatus": 0, "workflow_state": ("not in", FINAL_STATES)})
		tasks.append({"label": label, "count": n, "route": _route(doctype)})
	n = gated_count("Sales Invoice", {"docstatus": 1, "status": "Overdue"})
	tasks.append({
		"label": "Tagihan lewat jatuh tempo",
		"count": n,
		"route": _route("Sales Invoice"),
		"critical": True,  # spec §1B: kondisi kritis -> "Tindakan segera diperlukan"
	})
	return tasks


def _tasks_clinical(practitioner):
	extra = {"practitioner": practitioner} if practitioner else {}
	return [
		{
			"label": "Appointment hari ini",
			"count": gated_count(
				"Patient Appointment",
				{"appointment_date": today(), "status": ("!=", "Cancelled"), **extra},
			),
			"route": _route("Patient Appointment"),
		},
		{
			"label": "Pasien menunggu (check-in)",
			"count": gated_count(
				"Patient Appointment",
				{"appointment_date": today(), "status": "Checked In", **extra},
			),
			"route": _route("Patient Appointment"),
		},
		{
			"label": "Encounter belum ditutup",
			"count": gated_count("Patient Encounter", {"docstatus": 0, **extra}),
			"route": _route("Patient Encounter"),
		},
	]


def _tasks_hr():
	if can("Employee") and can("Attendance"):
		missing = max(
			gated_count("Employee", {"status": "Active"})
			- gated_count(
				"Attendance",
				{
					"attendance_date": today(),
					"docstatus": ("<", 2),
					"status": ("in", ("Present", "Half Day", "Work From Home")),
				},
			),
			0,
		)
	else:
		missing = 0
	return [
		{
			"label": "Pengajuan cuti menunggu",
			"count": gated_count("Leave Application", {"status": "Open", "docstatus": 0}),
			"route": _route("Leave Application"),
		},
		{
			"label": "Kehadiran hari ini belum tercatat",
			"count": missing,
			"route": _route("Attendance"),
		},
		{
			"label": "Permintaan ganti shift",
			"count": gated_count("Shift Request", {"status": "Draft", "docstatus": 0}),
			"route": _route("Shift Request"),
		},
	]


def _tasks_finance():
	return [
		{
			"label": "Permintaan kebutuhan untuk review Finance",
			"count": gated_count(
				"Material Request",
				{"docstatus": 0, "workflow_state": "Finance Review"},
			),
			"route": _route("Material Request"),
		},
		{
			"label": "Penerimaan pembelian masih draft",
			"count": gated_count("Purchase Receipt", {"docstatus": 0}),
			"route": _route("Purchase Receipt"),
		},
		{
			"label": "Tagihan pembelian untuk review Finance",
			"count": gated_count(
				"Purchase Invoice",
				{"docstatus": 0, "workflow_state": "Finance Review"},
			),
			"route": _route("Purchase Invoice"),
		},
		{
			"label": "Reimbursement untuk review Finance",
			"count": gated_count(
				"Expense Claim",
				{"docstatus": 0, "workflow_state": "Finance Review"},
			),
			"route": _route("Expense Claim"),
		},
	]


def _tasks_pharmacy():
	return [
		{
			"label": "Permintaan obat aktif",
			"count": gated_count(
				"Material Request",
				{
					"docstatus": 0,
					"mantra_request_category": "Medicine",
					"workflow_state": ("!=", "Rejected"),
				},
			),
			"route": _route("Material Request"),
		},
		{
			"label": "Pesanan obat menunggu penerimaan",
			"count": gated_count(
				"Purchase Order",
				{"docstatus": 1, "per_received": ("<", 100)},
			),
			"route": _route("Purchase Order"),
		},
		{
			"label": "Penerimaan obat masih draft",
			"count": gated_count("Purchase Receipt", {"docstatus": 0}),
			"route": _route("Purchase Receipt"),
		},
	]


ACTIONS = {
	# urutan prioritas Direktur Utama (Chief): persetujuan > manajemen > keuangan > SDM
	"chief": [
		{"label": "Persetujuan", "desc": "Lihat permintaan persetujuan", "route": "/app/material-request", "doctype": "Material Request"},
		{"label": "Pelaporan RSIA", "desc": "RACI laporan eksternal", "route": "/app/pelaporan", "doctype": "Sentra Report Cycle"},
		{"label": "Manajemen RSIA", "desc": "Metrik pelaporan via RME", "route": "/app/pasien-klinik", "doctype": "Patient"},
		{"label": "Keuangan", "desc": "Pantau transaksi keuangan", "route": "/app/keuangan", "doctype": "GL Entry"},
	],
	"clinical": [
		{"label": "Daftarkan Pasien", "desc": "Pasien baru", "route": "/app/patient/new", "doctype": "Patient", "ptype": "create"},
		{"label": "Buat Appointment", "desc": "Jadwalkan kunjungan", "route": "/app/patient-appointment/new", "doctype": "Patient Appointment", "ptype": "create"},
		{"label": "Mulai Pemeriksaan", "desc": "Pemeriksaan baru", "route": "/app/patient-encounter/new", "doctype": "Patient Encounter", "ptype": "create"},
		{"label": "Cari Pasien", "desc": "Daftar pasien", "route": "/app/patient", "doctype": "Patient"},
	],
	"hr": [
		{"label": "Data Karyawan", "desc": "Kelola data karyawan", "route": "/app/employee", "doctype": "Employee"},
		{"label": "Ajukan Cuti", "desc": "Pengajuan baru", "route": "/app/leave-application/new", "doctype": "Leave Application", "ptype": "create"},
		{"label": "Kehadiran", "desc": "Rekap hari ini", "route": "/app/attendance", "doctype": "Attendance"},
		{"label": "Penugasan Shift", "desc": "Atur jadwal shift", "route": "/app/shift-assignment", "doctype": "Shift Assignment"},
	],
	"finance": [
		{"label": "Review Kebutuhan", "desc": "Permintaan material", "route": "/app/material-request", "doctype": "Material Request"},
		{"label": "Review Reimbursement", "desc": "Expense claim", "route": "/app/expense-claim", "doctype": "Expense Claim"},
		{"label": "Review Tagihan", "desc": "Purchase invoice", "route": "/app/purchase-invoice", "doctype": "Purchase Invoice"},
		{"label": "Catat Pembayaran", "desc": "Penerimaan & pembayaran", "route": "/app/payment-entry/new", "doctype": "Payment Entry", "ptype": "create"},
	],
	"umum": [
		{"label": "Ajukan Kebutuhan", "desc": "Material request baru", "route": "/app/material-request/new", "doctype": "Material Request", "ptype": "create"},
		{"label": "Ajukan Reimbursement", "desc": "Expense claim baru", "route": "/app/expense-claim/new", "doctype": "Expense Claim", "ptype": "create"},
		{"label": "Ajukan Cuti", "desc": "Pengajuan baru", "route": "/app/leave-application/new", "doctype": "Leave Application", "ptype": "create"},
		{"label": "Profil Saya", "desc": "Akun & data diri", "route": "/me"},
	],
	"pharmacy": [
		{"label": "Ajukan Kebutuhan", "desc": "Material request baru", "route": "/app/material-request/new", "doctype": "Material Request", "ptype": "create"},
		{"label": "Permintaan Obat", "desc": "Daftar material request", "route": "/app/material-request", "doctype": "Material Request"},
		{"label": "Terima Obat", "desc": "Purchase receipt", "route": "/app/purchase-receipt", "doctype": "Purchase Receipt"},
		{"label": "Ajukan Reimbursement", "desc": "Expense claim baru", "route": "/app/expense-claim/new", "doctype": "Expense Claim", "ptype": "create"},
	],
}


def _actions_for(persona):
	"""Return only actions the current user can actually open or create."""
	if frappe.session.user == "Guest":
		return []
	out = []
	for action in ACTIONS[persona]:
		doctype = action.get("doctype")
		ptype = action.get("ptype", "read")
		if doctype:
			try:
				if not frappe.has_permission(doctype, ptype=ptype):
					continue
			except Exception:
				continue
		out.append(
			{
				key: value
				for key, value in action.items()
				if key not in {"doctype", "ptype"}
			}
		)
	return out[:4]


def _when(ts):
	"""Selisih waktu singkat berbahasa Indonesia ("5 mnt lalu", "kemarin")."""
	from frappe.utils import get_datetime, now_datetime

	mins = int((now_datetime() - get_datetime(ts)).total_seconds() // 60)
	if mins < 1:
		return "baru saja"
	if mins < 60:
		return f"{mins} mnt lalu"
	if mins < 60 * 24:
		return f"{mins // 60} jam lalu"
	days = mins // (60 * 24)
	return "kemarin" if days == 1 else f"{days} hari lalu"


def _recent(limit=5):
	out, seen = [], set()
	for row in frappe.get_all(
		"Route History",
		filters={"user": frappe.session.user},
		fields=["route", "modified"],
		order_by="modified desc",
		limit=60,
	):
		route = row.route or ""
		parts = [p for p in route.strip("/").split("/") if p]
		# hanya dokumen tunggal: /app/<doctype-slug>/<nama>, bukan list/laporan
		if len(parts) != 3 or parts[0] != "app" or parts[2] in ("view", "new"):
			continue
		if route in seen:
			continue
		seen.add(route)
		doctype = frappe.unscrub(parts[1].replace("-", "_"))
		title = parts[2]
		try:
			meta = frappe.get_meta(doctype)
			if meta.title_field:
				title = frappe.db.get_value(doctype, parts[2], meta.title_field) or title
		except Exception:
			pass
		out.append({"doctype": frappe._(doctype), "title": title, "route": route, "when": _when(row.modified)})
		if len(out) >= limit:
			break
	return out


def _presence():
	"""Link profil publik milik user yang sedang login (child table
	User.sentra_profil_links, dipasang sentra_mantra_core.profil_links).
	Hanya http(s) yang diteruskan — skema lain (javascript: dst.) dibuang
	meski lolos ke tabel lewat jalur selain form."""
	user = frappe.get_cached_doc("User", frappe.session.user)
	out = []
	for row in user.get("sentra_profil_links") or []:
		url = (row.url or "").strip()
		if url.lower().startswith(("https://", "http://")):
			out.append({"platform": row.platform, "label": row.label, "url": url})
	return out


@frappe.whitelist()
def my_today():
	"""Tugas hari ini + aksi cepat + terakhir dibuka + profil publik, mengikuti peran user."""
	persona, practitioner = resolve_persona()
	is_pharmacy = persona != "chief" and "MANTRA Pharmacy" in frappe.get_roles()
	if is_pharmacy:
		tasks = _tasks_pharmacy()[:4]
		action_persona = "pharmacy"
	else:
		tasks = {
			"chief": _tasks_chief,
			"clinical": lambda: _tasks_clinical(practitioner),
			"hr": _tasks_hr,
			"finance": _tasks_finance,
			"umum": lambda: [],
		}[persona]()[:4]
		action_persona = persona
	# spec §1B: 3 kondisi — success / attention / critical
	active = [t for t in tasks if t.get("count")]
	if any(t.get("critical") for t in active):
		level = "critical"
	elif active:
		level = "attention"
	else:
		level = "success"
	from sentra_mantra_indonesia.checkin_easy import status_payload
	from sentra_mantra_indonesia.insights import director_inbox

	return {
		"persona": persona,
		"level": level,
		"tasks": tasks,
		"actions": _actions_for(action_persona),
		"recent": _recent(),
		"presence": _presence(),
		"checkin": status_payload(),
		"decision_inbox": director_inbox() if persona == "chief" else {"items": []},
	}


def setup():
	"""Idempoten: upsert blok + Home = profil + hari ini + Pandangan Direktur."""
	from sentra_mantra_indonesia import home_profile, insights

	home_profile.setup()
	insights.setup()

	if frappe.db.exists("Custom HTML Block", BLOCK_NAME):
		blk = frappe.get_doc("Custom HTML Block", BLOCK_NAME)
	else:
		blk = frappe.new_doc("Custom HTML Block")
		blk.__newname = BLOCK_NAME
	blk.private = 0
	blk.html, blk.script, blk.style = HTML, SCRIPT, STYLE
	blk.save()

	ws = frappe.get_doc("Workspace", "Home")
	ws.set("shortcuts", [])
	ws.set("links", [])
	ws.set("charts", [])
	ws.set("number_cards", [])
	ws.set("custom_blocks", [])
	for name in (PROFILE_BLOCK, BLOCK_NAME, INSIGHTS_BLOCK):
		ws.append("custom_blocks", {"custom_block_name": name, "label": name})
	# proporsi ~30:70 + baris penuh Pandangan Direktur (client hide jika kosong)
	ws.content = json.dumps([
		{"id": "rsiaProfilAkun", "type": "custom_block", "data": {"custom_block_name": PROFILE_BLOCK, "col": 4}},
		{"id": "rsiaHariIni", "type": "custom_block", "data": {"custom_block_name": BLOCK_NAME, "col": 8}},
		{"id": "rsiaPandanganDirektur", "type": "custom_block", "data": {"custom_block_name": INSIGHTS_BLOCK, "col": 12}},
	])
	ws.save()
	frappe.clear_document_cache("Workspace", "Home")
	frappe.db.commit()
	return {"block": BLOCK_NAME, "home_blocks": [b["type"] for b in json.loads(ws.content)]}
