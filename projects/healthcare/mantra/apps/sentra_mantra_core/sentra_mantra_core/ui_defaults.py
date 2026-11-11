"""Sembunyikan modul ERPNext bergaya perusahaan dagang dari desk (Chief,
2026-07-15: "ini bukan buat medis, ini buat selling").

Mekanisme resmi User.block_modules — hanya menyembunyikan dari UI, bukan
mencabut permission, dan bisa dibuka lagi per user kapan pun (User > Allow
Modules). Jalankan ulang setelah menambah user baru.

    bench --site mantra.localhost execute sentra_mantra_core.ui_defaults.apply_blocked_modules
"""

import frappe

# Modul yang disembunyikan untuk semua user. Sengaja TIDAK diblok: Accounts,
# Buying (workflow PO), Stock (farmasi), Assets (alat medis), HR/Payroll,
# Healthcare. Catatan: POS farmasi kelak butuh "Selling" dibuka lagi untuk
# kasir apotek.
BLOCKED_MODULES = [
	"Selling",
	"CRM",
	"Manufacturing",
	"Quality Management",
	"Projects",
	"Support",
	"Maintenance",
	"Subcontracting",
	"Telephony",
]


LOGO = "/assets/sentra_mantra_core/images/logo-melinda.png"

# Login footer + Desk attribution (Chief 2026-07-17)
# HTML for Website Settings.footer_powered + Desk boot (links clickable).
ATTRIBUTION = (
	"Architected & Built by "
	'<a href="https://ferdiiskandar.com" target="_blank" rel="noopener noreferrer">'
	"dr Ferdi Iskandar</a> "
	'<a href="https://sentrahai.com" target="_blank" rel="noopener noreferrer">'
	"Sentra Artificial Intelligence</a>"
	" - Didukung oleh ERPNext"
)


def apply_branding():
	"""Logo Melinda (Chief 2026-07-15) di brand navbar desk, brand website/
	halaman login, dan favicon tab browser. Re-runnable.

	Juga memasang attribution ERPNext/Sentra di footer website + login
	(`footer_powered` + `show_footer_on_login`). Desk memakai copy yang sama
	via `extend_bootinfo` + `desk_attribution.js`.
	"""
	frappe.db.set_single_value("Navbar Settings", "app_logo", LOGO)
	frappe.db.set_single_value("Website Settings", "app_logo", LOGO)
	frappe.db.set_single_value("Website Settings", "favicon", LOGO)
	frappe.db.set_single_value("Website Settings", "splash_image", LOGO)
	# brand navbar halaman portal/website (mis. /me) memakai brand_html,
	# bukan app_logo
	frappe.db.set_single_value(
		"Website Settings",
		"brand_html",
		f'<img src="{LOGO}" style="height: 26px; vertical-align: middle;'
		' margin-right: 8px;" alt="RSIA Melinda">RSIA Melinda',
	)
	frappe.db.set_single_value("Website Settings", "footer_powered", ATTRIBUTION)
	frappe.db.set_single_value("Website Settings", "show_footer_on_login", 1)
	frappe.clear_cache(doctype="Navbar Settings")
	frappe.clear_cache(doctype="Website Settings")
	frappe.db.commit()
	return {
		"logo": LOGO,
		"attribution": ATTRIBUTION,
		"dipasang": [
			"Navbar Settings.app_logo",
			"Website Settings.app_logo",
			"favicon",
			"splash_image",
			"footer_powered",
			"show_footer_on_login",
		],
	}


def boot_session(bootinfo):
	"""Expose attribution string to Desk JS (desk_attribution.js)."""
	bootinfo["sentra_attribution"] = ATTRIBUTION


# Workspace yang kira-kira tak terpakai di RS (Chief 2026-07-15) — flag resmi
# Workspace.is_hidden, berlaku semua user, bisa dibuka lagi kapan pun.
# Payroll dibiarkan tampil (PPh21/THR akan dipakai); Salary Payout & Tax &
# Benefits di-unhide saat fase payroll dimulai.
HIDDEN_WORKSPACES = [
	"Website",
	"Build",
	"Tools",
	"Integrations",
	"ERPNext Integrations",
	"ERPNext Settings",
	"Welcome Workspace",
	"Recruitment",
	"Performance",
	"Salary Payout",
	"Tax & Benefits",
]


def apply_hidden_workspaces():
	out = {"disembunyikan": [], "sudah": [], "tidak_ada": []}
	for name in HIDDEN_WORKSPACES:
		if not frappe.db.exists("Workspace", name):
			out["tidak_ada"].append(name)
		elif frappe.db.get_value("Workspace", name, "is_hidden"):
			out["sudah"].append(name)
		else:
			frappe.db.set_value("Workspace", name, "is_hidden", 1)
			out["disembunyikan"].append(name)
	frappe.db.commit()
	return out


def apply_blocked_modules():
	existing_defs = set(frappe.get_all("Module Def", pluck="name"))
	to_block = [m for m in BLOCKED_MODULES if m in existing_defs]
	out = {"diblok": to_block, "tidak_ada_module_def": [m for m in BLOCKED_MODULES if m not in existing_defs], "users": {}}
	for user in frappe.get_all(
		"User", filters={"enabled": 1, "user_type": "System User", "name": ("not in", ("Administrator", "Guest"))}, pluck="name"
	):
		doc = frappe.get_doc("User", user)
		have = {d.module for d in doc.block_modules}
		added = [m for m in to_block if m not in have]
		for m in added:
			doc.append("block_modules", {"module": m})
		if added:
			doc.save(ignore_permissions=True)
		out["users"][user] = added or "sudah lengkap"
	frappe.db.commit()
	return out
