"""Setup Pusat Pelaporan RSIA — roles, permissions, workflow, seed register.

Idempoten; dijalankan eksplisit (pola app ini):

    bench --site mantra.localhost execute sentra_mantra_indonesia.pelaporan_setup.setup
"""

from __future__ import annotations

import frappe
from frappe.permissions import add_permission, update_permission_property

ROLES = (
	"Pelaporan Penyusun",
	"Pelaporan Validator",
	"Pelaporan Penyetuju",
	"Pelaporan Pengirim",
)

WORKFLOW_NAME = "Sentra Pelaporan Cycle"

# (state, role_yang_boleh_edit)
WF_STATES = (
	("Dibuka", "Pelaporan Penyusun"),
	("Draf", "Pelaporan Penyusun"),
	("Diajukan untuk Validasi", "Pelaporan Validator"),
	("Dikembalikan", "Pelaporan Penyusun"),
	("Tervalidasi", "Pelaporan Penyetuju"),
	("Disetujui", "Pelaporan Pengirim"),
	("Dikirim Eksternal", "Pelaporan Pengirim"),
	("Diterima", "Pelaporan Penyetuju"),
	("Perlu Koreksi", "Pelaporan Penyusun"),
	("Ditutup", "Pelaporan Penyetuju"),
)

# (state, action, next_state, allowed_role)
WF_TRANSITIONS = (
	("Dibuka", "Mulai Penyusunan", "Draf", "Pelaporan Penyusun"),
	("Draf", "Ajukan Validasi", "Diajukan untuk Validasi", "Pelaporan Penyusun"),
	("Diajukan untuk Validasi", "Kembalikan", "Dikembalikan", "Pelaporan Validator"),
	("Diajukan untuk Validasi", "Validasi", "Tervalidasi", "Pelaporan Validator"),
	("Dikembalikan", "Revisi", "Draf", "Pelaporan Penyusun"),
	("Tervalidasi", "Setujui", "Disetujui", "Pelaporan Penyetuju"),
	("Tervalidasi", "Kembalikan", "Dikembalikan", "Pelaporan Penyetuju"),
	("Disetujui", "Kirim Eksternal", "Dikirim Eksternal", "Pelaporan Pengirim"),
	("Dikirim Eksternal", "Konfirmasi Diterima", "Diterima", "Pelaporan Pengirim"),
	("Dikirim Eksternal", "Tandai Perlu Koreksi", "Perlu Koreksi", "Pelaporan Pengirim"),
	("Perlu Koreksi", "Revisi", "Draf", "Pelaporan Penyusun"),
	("Diterima", "Tutup Siklus", "Ditutup", "Pelaporan Penyetuju"),
)


def ensure_roles() -> list[str]:
	"""Create the 4 pelaporan roles; return the ones newly created."""
	created = []
	for role in ROLES:
		if frappe.db.exists("Role", role):
			continue
		frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(
			ignore_permissions=True
		)
		created.append(role)
	return created


def ensure_permissions() -> None:
	"""Grant read (+write on cycles) to pelaporan roles via Custom DocPerm."""
	for doctype in ("Sentra Report Card", "Sentra Report Cycle"):
		for role in ROLES:
			if not frappe.db.exists(
				"Custom DocPerm", {"parent": doctype, "role": role, "permlevel": 0}
			):
				add_permission(doctype, role, permlevel=0)
			if doctype == "Sentra Report Cycle":
				update_permission_property(doctype, role, 0, "write", 1)
	# Opening a cycle off-schedule (backfill, Event-based family) is the
	# Penyusun's job only; the downstream roles move existing cycles through
	# the workflow and must never be able to mint one.
	update_permission_property("Sentra Report Cycle", "Pelaporan Penyusun", 0, "create", 1)


def _ensure_masters():
	for state, _role in WF_STATES:
		if not frappe.db.exists("Workflow State", state):
			frappe.get_doc({"doctype": "Workflow State", "workflow_state_name": state}).insert(
				ignore_permissions=True
			)
	for _s, action, _n, _r in WF_TRANSITIONS:
		if not frappe.db.exists("Workflow Action Master", action):
			frappe.get_doc(
				{"doctype": "Workflow Action Master", "workflow_action_name": action}
			).insert(ignore_permissions=True)


def ensure_workflow() -> str:
	_ensure_masters()
	if frappe.db.exists("Workflow", WORKFLOW_NAME):
		return WORKFLOW_NAME
	wf = frappe.new_doc("Workflow")
	wf.workflow_name = WORKFLOW_NAME
	wf.document_type = "Sentra Report Cycle"
	wf.workflow_state_field = "status"
	wf.is_active = 1
	wf.send_email_alert = 0
	for state, edit_role in WF_STATES:
		wf.append("states", {"state": state, "doc_status": "0", "allow_edit": edit_role})
	for state, action, next_state, role in WF_TRANSITIONS:
		wf.append(
			"transitions",
			{"state": state, "action": action, "next_state": next_state, "allowed": role},
		)
	wf.insert(ignore_permissions=True)
	return WORKFLOW_NAME


# Portofolio MVP dari RSIAM-PP-02 §4. SEMUA berstatus Perlu Verifikasi:
# form/kode/periode WAJIB diverifikasi ke portal resmi (SIRS/RS Online/Mutu
# Fasyankes) dan instruksi Dinkes sebelum diaktifkan — catatan kendali paket.
_DEF = {
	"role_penyusun": "Pelaporan Penyusun",
	"role_validator": "Pelaporan Validator",
	"role_penyetuju": "Pelaporan Penyetuju",
	"role_pengirim": "Pelaporan Pengirim",
	"status": "Perlu Verifikasi",
	"jenis": "Eksternal",
	"kerahasiaan": "Biasa",
}

SEED_CARDS = (
	{**_DEF, "report_code": "RPT-RANAP-BED", "report_name": "Ketersediaan & Keterpakaian Tempat Tidur / Rawat Inap", "kategori": "A - Pelaporan nasional RS", "divisi": "01 - Rekam Medis (RM) & SIMRS", "frekuensi": "Bulanan", "sumber_data": "SIMRS admission & bed management", "portal_name": "RS Online / SIRS", "portal_url": "https://sirs.kemkes.go.id/fo/", "deskripsi": "Rekap bulanan; kebutuhan harian ditangani dashboard internal, bukan siklus."},
	{**_DEF, "report_code": "RPT-IGD", "report_name": "Kegiatan Instalasi Gawat Darurat", "kategori": "A - Pelaporan nasional RS", "divisi": "01 - Rekam Medis (RM) & SIMRS", "frekuensi": "Bulanan", "sumber_data": "Encounter IGD SIMRS", "portal_name": "SIRS Online", "portal_url": "https://sirs6.kemkes.go.id/"},
	{**_DEF, "report_code": "RPT-OBSTETRI", "report_name": "Kegiatan Kebidanan / Obstetri", "kategori": "C - Surveilans maternal-neonatal-anak", "divisi": "03 - Pelayanan Medis, Keperawatan, & Kebidanan", "frekuensi": "Bulanan", "sumber_data": "Register persalinan & RME/SIMRS"},
	{**_DEF, "report_code": "RPT-NEONATAL", "report_name": "Kegiatan Neonatal / Bayi", "kategori": "C - Surveilans maternal-neonatal-anak", "divisi": "03 - Pelayanan Medis, Keperawatan, & Kebidanan", "frekuensi": "Bulanan", "sumber_data": "Register neonatal & RME/SIMRS"},
	{**_DEF, "report_code": "RPT-MORBID-RANAP", "report_name": "Morbiditas & Mortalitas Rawat Inap", "kategori": "A - Pelaporan nasional RS", "divisi": "01 - Rekam Medis (RM) & SIMRS", "frekuensi": "Bulanan", "sumber_data": "Coding & data discharge"},
	{**_DEF, "report_code": "RPT-MORBID-RAJAL", "report_name": "Morbiditas / Kunjungan Rawat Jalan", "kategori": "A - Pelaporan nasional RS", "divisi": "01 - Rekam Medis (RM) & SIMRS", "frekuensi": "Bulanan", "sumber_data": "Encounter & coding rawat jalan"},
	{**_DEF, "report_code": "RPT-INM", "report_name": "Indikator Nasional Mutu (INM)", "kategori": "B - Mutu & keselamatan pasien", "divisi": "02 - Komite Mutu, PPI, & Keselamatan Pasien", "frekuensi": "Bulanan", "sumber_data": "Worksheet indikator / sistem sumber", "portal_name": "Mutu Fasyankes / SIMAR", "portal_url": "https://mutufasyankes.kemkes.go.id/simar/"},
	{**_DEF, "report_code": "RPT-HAIS", "report_name": "Surveilans HAIs", "kategori": "B - Mutu & keselamatan pasien", "divisi": "02 - Komite Mutu, PPI, & Keselamatan Pasien", "frekuensi": "Bulanan", "sumber_data": "Register surveilans PPI", "portal_name": "Mutu Fasyankes / SIMAR", "portal_url": "https://mutufasyankes.kemkes.go.id/simar/", "deskripsi": "Termasuk konfirmasi zero event."},
	{**_DEF, "report_code": "RPT-IKP", "report_name": "Insiden Keselamatan Pasien (IKP)", "kategori": "B - Mutu & keselamatan pasien", "divisi": "02 - Komite Mutu, PPI, & Keselamatan Pasien", "frekuensi": "Event-based", "sumber_data": "Sistem insiden internal", "kerahasiaan": "Terbatas", "deskripsi": "Akses terbatas; eskalasi sesuai SOP keselamatan pasien."},
	{**_DEF, "report_code": "RPT-AMPSR", "report_name": "Kematian Maternal/Perinatal & Audit (AMPSR)", "kategori": "C - Surveilans maternal-neonatal-anak", "divisi": "03 - Pelayanan Medis, Keperawatan, & Kebidanan", "frekuensi": "Event-based", "sumber_data": "Rekam klinis, notifikasi, file audit", "kerahasiaan": "Terbatas", "deskripsi": "Artefak notifikasi, kronologi, dan audit disimpan terpisah."},
	{**_DEF, "report_code": "RPT-KEU-AUDIT", "report_name": "Laporan Keuangan Audit", "kategori": "E - Keuangan/klaim/statutory", "divisi": "07 - Keuangan", "frekuensi": "Tahunan", "sumber_data": "Laporan keuangan audit"},
)


def seed_report_cards() -> list[str]:
	"""Insert missing seed cards; NEVER update existing ones (operator edits win)."""
	created = []
	for row in SEED_CARDS:
		if frappe.db.exists("Sentra Report Card", row["report_code"]):
			continue
		frappe.get_doc({"doctype": "Sentra Report Card", **row}).insert(
			ignore_permissions=True
		)
		created.append(row["report_code"])
	return created


def setup() -> None:
	"""bench --site mantra.localhost execute sentra_mantra_indonesia.pelaporan_setup.setup"""
	roles = ensure_roles()
	ensure_permissions()
	ensure_workflow()
	cards = seed_report_cards()
	frappe.db.commit()
	print(f"Pelaporan setup OK — roles baru: {roles or '-'}; cards baru: {cards or '-'}")
