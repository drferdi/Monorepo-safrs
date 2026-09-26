/* Profil Karyawan — directory view (others). Identity + STR/SIP + Profil Publik
   from details already saved; no cuti/NIK/account controls. */
frappe.pages["profil-karyawan"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Profil Karyawan"),
		single_column: true,
	});
	wrapper.page = page;
	wrapper.$body = $(`
		<div class="rsia-pk">
			<div class="rsia-bar">
				<div class="rsia-dots"><i></i><i></i><i></i></div>
				<span class="rsia-bar-title">Sentra / Profil Karyawan</span>
				<span class="rsia-bar-tag"><i></i>Direktori</span>
			</div>
			<div class="rsia-inner">
				<div class="rsia-empty">${__("Memuat profil…")}</div>
			</div>
		</div>
	`);
	page.main.empty().append(wrapper.$body);
	_inject_style();
};

frappe.pages["profil-karyawan"].on_page_show = function (wrapper) {
	const emp = frappe.utils.get_url_arg("emp") || (frappe.route_options || {}).emp;
	const $inner = $(wrapper).find(".rsia-inner");
	if (!emp) {
		$inner.html(
			`<div class="rsia-empty">${__("Tambahkan parameter")} <code>?emp=&lt;id&gt;</code>.</div>`
		);
		return;
	}
	$inner.html(`<div class="rsia-empty">${__("Memuat profil…")}</div>`);
	frappe.call({
		method: "sentra_mantra_indonesia.profil_karyawan.data",
		args: { employee: emp },
		callback(r) {
			_render($inner, r.message || {});
		},
		error() {
			$inner.html(
				`<div class="rsia-empty">${__("Profil tidak dapat dimuat. Periksa izin atau ID karyawan.")}</div>`
			);
		},
	});
};

// Same brand paths as Beranda Profil Publik (home_today).
const RSIA_ICONS = {
	Website:
		"M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3.17a15.4 15.4 0 0 0-1.35-5.2A8.03 8.03 0 0 1 19.93 11zM12 4c.9 0 2.3 1.9 3.05 5H8.95C9.7 5.9 11.1 4 12 4zM4.07 13h3.17a15.4 15.4 0 0 0 1.35 5.2A8.03 8.03 0 0 1 4.07 13zm3.17-2H4.07a8.03 8.03 0 0 1 4.52-5.2A15.4 15.4 0 0 0 7.24 11zM12 20c-.9 0-2.3-1.9-3.05-5h6.1C14.3 18.1 12.9 20 12 20zm1.48-2.8a15.4 15.4 0 0 0 1.35-5.2h3.17a8.03 8.03 0 0 1-4.52 5.2zM9.7 13a13.3 13.3 0 0 1 1.15 4.4c.38.07.77.1 1.15.1s.77-.03 1.15-.1A13.3 13.3 0 0 1 14.3 13H9.7zm4.6-2a13.3 13.3 0 0 1-1.15-4.4A7 7 0 0 0 12 6.5c-.4 0-.78.05-1.15.1A13.3 13.3 0 0 1 9.7 11h4.6z",
	Medium:
		"M4.07 6.54a.7.7 0 0 0-.23-.58L2.1 4.13V3.8h6.2l4.79 10.5L17.3 3.8H23v.33l-1.5 1.44a.42.42 0 0 0-.16.4v10.2a.42.42 0 0 0 .16.4l1.46 1.43v.33h-7.36v-.33l1.51-1.47c.15-.15.15-.19.15-.4V8.3l-4.2 10.66h-.57L6.24 8.3v7.14c-.04.3.06.61.28.83l2.03 2.46v.33H2v-.33l2.03-2.46a.97.97 0 0 0 .26-.83V6.54z",
	ORCID:
		"M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z",
	X: "M18.24 3H21l-6.52 7.45L22 21h-5.9l-4.62-6.04L6.3 21H3.53l6.97-7.97L2 3h6.05l4.17 5.52L18.24 3zm-1.04 16.2h1.64L7.05 4.7H5.3l11.9 14.5z",
	Substack:
		"M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z",
	Kaggle:
		"M17.8 18.8l-4.6-5.5-1.4 1.5v4H9.1V5.2h2.7v6.4l5.7-6.4h3.3l-5.4 5.9 5.9 7.7h-3.5z",
	Reddit:
		"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.2 10.6c.02.17.03.34.03.52 0 2.68-3.13 4.86-7 4.86s-7-2.18-7-4.86c0-.18.01-.35.03-.52a1.7 1.7 0 0 1 1.02-3.1c.47 0 .9.19 1.21.5 1.22-.82 2.9-1.34 4.74-1.4l.9-4.2a.45.45 0 0 1 .54-.34l3.02.64a1.35 1.35 0 1 1 .27 1.07l-2.7-.57-.8 3.76c1.8.08 3.44.6 4.64 1.4.3-.3.72-.48 1.18-.48a1.7 1.7 0 0 1 1.02 3.1zM8.7 13.1a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zm6.7 2.55c-.85.85-2.47 1-3.4 1s-2.55-.15-3.4-1a.45.45 0 0 1 .64-.64c.55.55 1.8.74 2.76.74s2.21-.19 2.76-.74a.45.45 0 1 1 .64.64zm-.3-2.55a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z",
	LinkedIn:
		"M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0z",
	"Hugging Face":
		"M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454m.836 10.354c.824-1.19.766-2.082-.365-3.194-1.13-1.112-1.789-2.738-1.789-2.738s-.246-.945-.806-.858-.97 1.499.202 2.362c1.173.864-.233 1.45-.685.64-.45-.812-1.683-2.896-2.322-3.295s-1.089-.175-.938.647 2.822 2.813 2.562 3.244-1.176-.506-1.176-.506-2.866-2.567-3.49-1.898.473 1.23 2.037 2.16c1.564.932 1.686 1.178 1.464 1.53s-3.675-2.511-4-1.297c.323 1.214 3.524 1.567 3.287 2.405-.238.839-2.71-1.587-3.216-.642-.506.946 3.49 2.056 3.522 2.064 1.29.33 4.568 1.028 5.713-.624m5.349 0c-.824-1.19-.766-2.082.365-3.194 1.13-1.112 1.789-2.738 1.789-2.738s.246-.945.806-.858.97 1.499-.202 2.362c-1.173.864.233 1.45.685.64.451-.812 1.683-2.896 2.322-3.295s1.089-.175.938.647-2.822 2.813-2.562 3.244 1.176-.506 1.176-.506 2.866-2.567 3.49-1.898-.473 1.23-2.037 2.16c-1.564.932-1.686 1.178-1.464 1.53s3.675-2.511 4-1.297c.323 1.214-3.524 1.567-3.287 2.405.238.839 2.71-1.587 3.216-.642.506.946-3.49 2.056-3.522 2.064-1.29.33-4.568 1.028-5.713-.624",
	Instagram:
		"M12 7.2A4.8 4.8 0 1 0 16.8 12 4.8 4.8 0 0 0 12 7.2zm0 7.9A3.1 3.1 0 1 1 15.1 12 3.1 3.1 0 0 1 12 15.1zm6.1-8.1a1.12 1.12 0 1 1-1.12-1.12 1.12 1.12 0 0 1 1.12 1.12zM12 4.4c2.7 0 3.02.01 4.08.06a3.7 3.7 0 0 1 3.46 3.46c.05 1.06.06 1.38.06 4.08s-.01 3.02-.06 4.08a3.7 3.7 0 0 1-3.46 3.46c-1.06.05-1.38.06-4.08.06s-3.02-.01-4.08-.06a3.7 3.7 0 0 1-3.46-3.46C4.41 15.02 4.4 14.7 4.4 12s.01-3.02.06-4.08A3.7 3.7 0 0 1 7.92 4.46C8.98 4.41 9.3 4.4 12 4.4zm0-1.9c-2.75 0-3.1.01-4.18.06A5.6 5.6 0 0 0 2.56 7.82C2.51 8.9 2.5 9.25 2.5 12s.01 3.1.06 4.18a5.6 5.6 0 0 0 5.26 5.26c1.08.05 1.43.06 4.18.06s3.1-.01 4.18-.06a5.6 5.6 0 0 0 5.26-5.26c.05-1.08.06-1.43.06-4.18s-.01-3.1-.06-4.18a5.6 5.6 0 0 0-5.26-5.26C15.1 2.51 14.75 2.5 12 2.5z",
};

function _render($inner, d) {
	const esc = frappe.utils.escape_html;
	const tiles = [];
	const push = (label, value, sub) => {
		if (value == null || value === "") return;
		tiles.push(
			`<div><label>${esc(label)}</label><span>${esc(String(value))}</span>` +
				(sub ? `<small>${esc(String(sub))}</small>` : "") +
				`</div>`
		);
	};
	push(__("Jabatan"), d.designation);
	push(__("Unit Kerja"), d.department);
	push(__("Cabang"), d.branch);
	push(__("Status"), d.status);
	if (d.is_clinical) {
		push("STR", d.str_no || "—", d.str_status);
		push("SIP", d.sip_no || "—", d.sip_status);
	}

	const img = d.image
		? `<img class="rsia-ava" src="${esc(d.image)}" alt="" />`
		: `<div class="rsia-ava rsia-ava-empty" aria-hidden="true"></div>`;
	const rank = d.rank_badge
		? `<img class="rsia-rank" src="${esc(d.rank_badge)}" alt="${esc(d.designation || "")}" />`
		: "";
	const suffix = d.name_suffix ? `<small>${esc(d.name_suffix)}</small>` : "";

	const presence = (d.presence || []).filter((p) => /^https?:\/\//i.test(p.url || ""));
	let presenceHtml = "";
	if (presence.length) {
		const cards = presence
			.map((p) => {
				const path = RSIA_ICONS[p.platform] || RSIA_ICONS.Website;
				return (
					`<a class="rsia-presence-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">` +
					`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>` +
					`<b>${esc(p.platform || "")}</b>` +
					(p.label ? `<small>${esc(p.label)}</small>` : "") +
					`</a>`
				);
			})
			.join("");
		presenceHtml =
			`<div class="rsia-presence">` +
			`<div class="rsia-kicker">${__("Profil Publik")}</div>` +
			`<nav class="rsia-presence-row" aria-label="${esc(__("Profil publik"))}">${cards}</nav>` +
			`</div>`;
	}

	$inner.html(`
		<div class="rsia-head">
			${img}
			<div class="rsia-id">
				<div class="rsia-name">${esc(d.name_main || d.employee || "")}${suffix}</div>
				<div class="rsia-sub">${esc(d.designation || "")}</div>
				<span class="rsia-badge">RSIA Melinda</span>
			</div>
			${rank}
		</div>
		<div class="rsia-grid">${tiles.join("")}</div>
		${presenceHtml}
	`);
}

function _inject_style() {
	if (document.getElementById("rsia-pk-style")) return;
	const css = document.createElement("style");
	css.id = "rsia-pk-style";
	css.textContent = `
.rsia-pk {
	position: relative; max-width: 720px; margin: 8px auto;
	border: 1px solid var(--border-color); border-radius: 8px;
	background: var(--card-bg); color: #525252;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 15px; line-height: 24px; overflow: hidden;
}
[data-theme="dark"] .rsia-pk { color: var(--text-color); }
.rsia-pk .rsia-bar {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 16px; border-bottom: 1px solid var(--border-color);
}
.rsia-pk .rsia-dots { display: flex; gap: 6px; padding-right: 12px; border-right: 1px solid var(--border-color); }
.rsia-pk .rsia-dots i { width: 9px; height: 9px; border-radius: 50%; }
.rsia-pk .rsia-dots i:nth-child(1) { background: #FF5F57; }
.rsia-pk .rsia-dots i:nth-child(2) { background: #FEBC2E; }
.rsia-pk .rsia-dots i:nth-child(3) { background: #28C840; }
.rsia-pk .rsia-bar-title, .rsia-pk .rsia-bar-tag {
	font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
	color: #171717; font-weight: 600;
}
[data-theme="dark"] .rsia-pk .rsia-bar-title { color: var(--text-color); }
.rsia-pk .rsia-bar-tag { margin-left: auto; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-weight: 500; }
.rsia-pk .rsia-bar-tag i { display: block; width: 34px; height: 1px; background: var(--border-color); }
.rsia-pk .rsia-inner { padding: 16px; }
.rsia-pk .rsia-empty { color: var(--text-muted); padding: 6px 0; }
.rsia-pk .rsia-head {
	display: flex; align-items: center; gap: 14px;
	margin: 0 0 14px 0; padding-bottom: 14px; border-bottom: 1px solid var(--border-color);
}
.rsia-pk .rsia-rank { flex: none; margin-left: auto; align-self: flex-start; width: 72px; height: auto; }
.rsia-pk .rsia-ava { width: 120px; height: 120px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-color); }
.rsia-pk .rsia-ava-empty { background: var(--bg-color); }
.rsia-pk .rsia-name {
	font-family: Georgia, "Times New Roman", serif;
	font-size: 24px; line-height: 30px; font-weight: 400; color: #171717;
}
[data-theme="dark"] .rsia-pk .rsia-name { color: var(--text-color); }
.rsia-pk .rsia-name small {
	display: block; margin-top: 2px;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted);
}
.rsia-pk .rsia-sub { margin-top: 2px; color: #525252; }
[data-theme="dark"] .rsia-pk .rsia-sub { color: var(--text-muted); }
.rsia-pk .rsia-badge {
	display: inline-block; margin-top: 10px; padding: 5px 16px;
	border-radius: 999px; background: #ffffff; color: #525252;
	font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase;
	box-shadow: 4px 4px 9px rgba(23, 23, 23, .13), -4px -4px 9px rgba(255, 255, 255, .95);
}
[data-theme="dark"] .rsia-pk .rsia-badge {
	background: var(--card-bg);
	box-shadow: 4px 4px 9px rgba(0, 0, 0, .5), -2px -2px 6px rgba(255, 255, 255, .06);
}
.rsia-pk .rsia-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rsia-pk .rsia-grid > div {
	min-width: 0; padding: 10px 12px;
	border: 1px solid var(--border-color); border-radius: 8px;
}
.rsia-pk .rsia-grid label {
	display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
	color: var(--text-muted); margin-bottom: 2px;
}
.rsia-pk .rsia-grid span { display: block; font-size: 14px; line-height: 22px; color: #171717; font-weight: 500; word-break: break-word; }
[data-theme="dark"] .rsia-pk .rsia-grid span { color: var(--text-color); }
.rsia-pk .rsia-grid small { display: block; margin-top: 2px; font-size: 12px; line-height: 18px; color: var(--text-muted); }
.rsia-pk .rsia-grid > div:hover { border-color: #FF4B26; }
.rsia-pk .rsia-kicker {
	margin: 20px 0 10px; font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
	color: var(--text-muted); font-weight: 600;
}
.rsia-pk .rsia-presence-row {
	display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;
}
.rsia-pk .rsia-presence-link {
	display: flex; flex-direction: column; align-items: center; text-align: center;
	min-width: 0; padding: 14px 10px 12px;
	border: 1px solid var(--border-color); border-radius: 8px;
	color: #171717; text-decoration: none;
}
[data-theme="dark"] .rsia-pk .rsia-presence-link { color: var(--text-color); }
.rsia-pk .rsia-presence-link svg { width: 28px; height: 28px; margin-bottom: 8px; }
.rsia-pk .rsia-presence-link b {
	display: block; font-size: 13.5px; font-weight: 600;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.rsia-pk .rsia-presence-link small {
	display: block; margin-top: 2px; font-size: 11px; line-height: 16px; color: var(--text-muted);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.rsia-pk .rsia-presence-link:hover { border-color: #FF4B26; text-decoration: none; }
.rsia-pk .rsia-presence-link:hover b { color: #FF4B26; }
@media (max-width: 640px) {
	.rsia-pk .rsia-grid { grid-template-columns: 1fr; }
	.rsia-pk .rsia-head { flex-wrap: wrap; }
}
`;
	document.head.appendChild(css);
}
