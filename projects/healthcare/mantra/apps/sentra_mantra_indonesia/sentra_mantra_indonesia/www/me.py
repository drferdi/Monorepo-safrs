"""Override halaman portal /me (Akun Saya / Profil Lengkap).

Menampilkan data yang sama dengan kartu beranda + Profil Publik dari
User.sentra_profil_links, plus tautan referensi di kiri (institusi, regulasi,
pintasan operasional untuk nakes/dokter).
"""

from __future__ import annotations

import frappe
from frappe.www.me import get_context as frappe_get_context
from frappe.www.me import no_cache  # noqa: F401

from sentra_mantra_indonesia.home_profile import my_profile
from sentra_mantra_indonesia.home_today import _presence
from sentra_mantra_indonesia.jobdesk import get_jobdesk
from sentra_mantra_indonesia.presence_icons import icon_for

# Institusi + portal — selalu tampil.
_REF_CORE = (
	{
		"label": "RSIA Melinda DHAI",
		"href": "https://melinda.co.id/",
		"external": True,
		"hint": "Situs rumah sakit",
	},
	{
		"label": "Sentra Healthcare Artificial Intelligence",
		"href": "https://www.sentrahai.com/",
		"external": True,
		"hint": "Produk & tata kelola AI",
	},
	{
		"label": "Satu Sehat Indonesia",
		"href": "https://satusehat.kemkes.go.id/",
		"external": True,
		"hint": "Platform kesehatan nasional",
	},
)

# Pintasan penting untuk nakes/dokter (dan praktisi tertaut).
_REF_CLINICAL = (
	{
		"label": "Appointment Hari Ini",
		"href": "/app/patient-appointment",
		"external": False,
		"hint": "Jadwal kunjungan",
	},
	{
		"label": "Direktori Karyawan",
		"href": "/app/profil-karyawan",
		"external": False,
		"hint": "Profil & jobdesk",
	},
	{
		"label": "Konsil Kedokteran Indonesia",
		"href": "https://kki.go.id/",
		"external": True,
		"hint": "STR & registrasi dokter",
	},
	{
		"label": "BPJS Kesehatan",
		"href": "https://www.bpjs-kesehatan.go.id/",
		"external": True,
		"hint": "Kepesertaan & klaim",
	},
)

_REF_HR = (
	{
		"label": "Workspace SDM",
		"href": "/app/sdm",
		"external": False,
		"hint": "Hadir, shift, cuti",
	},
	{
		"label": "Direktori Karyawan",
		"href": "/app/profil-karyawan",
		"external": False,
		"hint": "Cari per unit",
	},
	{
		"label": "Kehadiran",
		"href": "/app/attendance",
		"external": False,
		"hint": "Rekap hari ini",
	},
)

_REF_FINANCE = (
	{
		"label": "Workspace Keuangan",
		"href": "/app/keuangan",
		"external": False,
		"hint": "Pipeline & piutang",
	},
	{
		"label": "Tagihan Outstanding",
		"href": "/app/sales-invoice",
		"external": False,
		"hint": "Aging penjamin",
	},
)

_REF_REPORTING = (
	{
		"label": "Pelaporan RSIA",
		"href": "/app/pelaporan",
		"external": False,
		"hint": "RACI laporan eksternal",
	},
)


def _edit_profil_publik_link():
	user = frappe.session.user
	href = f"/app/user/{user}" if user and "@" in user else "/app/user"
	return {
		"label": "Edit Profil Publik",
		"href": href,
		"external": False,
		"hint": "Link Website, ORCID, dll.",
	}


def _ref_links(persona_name: str | None, has_practitioner: bool):
	"""Tautan kiri: inti institusi + pintasan sesuai persona (ringan)."""
	links = [dict(row) for row in _REF_CORE]
	if persona_name == "clinical" or has_practitioner:
		links.extend(dict(row) for row in _REF_CLINICAL)
	elif persona_name == "hr":
		links.extend(dict(row) for row in _REF_HR)
	elif persona_name == "finance":
		links.extend(dict(row) for row in _REF_FINANCE)
	elif persona_name == "chief":
		links.extend(dict(row) for row in _REF_REPORTING)
		links.extend(dict(row) for row in _REF_HR[:2])
		links.extend(dict(row) for row in _REF_FINANCE[:1])
	links.append(_edit_profil_publik_link())
	return links


def get_context(context):
	frappe_get_context(context)
	# Sembunyikan sidebar website agar tidak dobel dengan Referensi dalam kartu.
	context.show_sidebar = False
	profile = my_profile()
	# Sumber sama dengan blok Hari Ini di Beranda + path ikon brand.
	profile["presence"] = [
		{**row, "icon": icon_for(row.get("platform"))} for row in _presence()
	]
	context.rsia_profile = profile
	context.rsia_jobdesk = get_jobdesk(profile.get("jabatan"))
	context.rsia_refs = _ref_links(
		profile.get("persona"), bool(profile.get("has_practitioner"))
	)
