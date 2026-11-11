"""Navigasi utama 5 workspace (Chief, 2026-07-15: "jangan menampilkan 33 item
sebagai menu yang setara").

Struktur: Beranda, Pasien & Klinik, SDM, Keuangan, Pengaturan (khusus System
Manager). Setiap workspace dibagi baris: operasional -> referensi -> laporan ->
konfigurasi. Semua workspace publik lain disembunyikan; fungsinya tetap bisa
dicari lewat awesomebar. Shortcut ber-tipe DocType otomatis tersaring
permission per user oleh Frappe, jadi visibility mengikuti role tanpa duplikasi
workspace.

    bench --site mantra.localhost execute sentra_mantra_core.workspace_nav.build
"""

import json

import frappe

# Lima wajah sistem. Selain ini disembunyikan (bukan dihapus).
KEEP = ["Home", "Pasien & Klinik", "SDM", "Keuangan", "Pengaturan"]

# rows: (judul baris, [shortcut]); shortcut default type DocType + doc_view List.
WORKSPACES = [
	{
		"title": "Pasien & Klinik",
		"icon": "healthcare",
		"sequence_id": 2,
		"roles": [],
		"rows": [
			("Pelayanan Pasien", [
				{"label": "Appointment", "link_to": "Patient Appointment"},
				{"label": "Pasien", "link_to": "Patient"},
				{"label": "Pemeriksaan Pasien", "link_to": "Patient Encounter"},
			]),
			("Tenaga & Jadwal Pelayanan", [
				{"label": "Unit Pelayanan", "link_to": "Healthcare Service Unit", "doc_view": "Tree"},
				{"label": "Jadwal Praktik", "link_to": "Practitioner Schedule"},
				{"label": "Tenaga Kesehatan", "link_to": "Healthcare Practitioner"},
			]),
			("Konfigurasi Pelayanan", [
				{"label": "Jenis Appointment", "link_to": "Appointment Type"},
			]),
		],
	},
	{
		"title": "SDM",
		"icon": "hr",
		"sequence_id": 3,
		"roles": [],
		"rows": [
			("Operasional Pegawai", [
				{"label": "Karyawan", "link_to": "Employee"},
				{"label": "Pengajuan Cuti", "link_to": "Leave Application"},
				{"label": "Reimbursement", "link_to": "Expense Claim"},
				{"label": "Kehadiran", "link_to": "Attendance"},
			]),
			("Jadwal & Hak Pegawai", [
				{"label": "Penugasan Shift", "link_to": "Shift Assignment"},
				{"label": "Saldo Cuti", "link_to": "Leave Allocation"},
			]),
			("Organisasi", [
				{"label": "Departemen", "link_to": "Department"},
				{"label": "Jabatan", "link_to": "Designation"},
				{"label": "Daftar Hari Libur", "link_to": "Holiday List"},
			]),
		],
	},
	{
		"title": "Keuangan",
		"icon": "accounting",
		"sequence_id": 4,
		"roles": [],
		"rows": [
			("Tagihan & Penerimaan", [
				{"label": "Tagihan", "link_to": "Sales Invoice"},
				{"label": "Penerimaan & Pembayaran", "link_to": "Payment Entry"},
				{"label": "Penjamin", "link_to": "Customer"},
			]),
			("Pengadaan", [
				{"label": "Permintaan Material", "link_to": "Material Request"},
				{"label": "Pesanan Pembelian", "link_to": "Purchase Order"},
				{"label": "Penerimaan Pembelian", "link_to": "Purchase Receipt"},
				{"label": "Tagihan Pembelian", "link_to": "Purchase Invoice"},
				{"label": "Pemasok", "link_to": "Supplier"},
			]),
			("Akuntansi", [
				{"label": "Jurnal Umum", "link_to": "Journal Entry"},
				{"label": "Buku Besar", "type": "Report", "link_to": "General Ledger"},
				{"label": "Bagan Akun", "link_to": "Account", "doc_view": "Tree"},
			]),
			("Konfigurasi Pembayaran", [
				{"label": "Metode Pembayaran", "link_to": "Mode of Payment"},
			]),
		],
	},
	{
		"title": "Pengaturan",
		"icon": "setting",
		"sequence_id": 5,
		"roles": ["System Manager"],
		"rows": [
			("Pengguna & Akses", [
				{"label": "Pengguna", "link_to": "User"},
				{"label": "Peran", "link_to": "Role"},
				{"label": "Hak Akses", "type": "Page", "link_to": "permission-manager"},
				{"label": "Pembatasan Pengguna", "link_to": "User Permission"},
			]),
			("Proses & Komunikasi", [
				{"label": "Alur Persetujuan", "link_to": "Workflow"},
				{"label": "Status Alur", "link_to": "Workflow State"},
				{"label": "Akun Email", "link_to": "Email Account"},
				{"label": "Notifikasi", "link_to": "Notification"},
			]),
			("Sistem & Dokumen", [
				{"label": "Pengaturan Sistem", "link_to": "System Settings"},
				{"label": "Terjemahan", "link_to": "Translation"},
				{"label": "Kop Surat", "link_to": "Letter Head"},
				{"label": "Format Cetak", "link_to": "Print Format"},
			]),
		],
	},
]


def _slug(text):
	return "".join(c if c.isalnum() else "-" for c in text.lower()).strip("-")


def _build_one(spec):
	if frappe.db.exists("Workspace", spec["title"]):
		ws = frappe.get_doc("Workspace", spec["title"])
	else:
		ws = frappe.new_doc("Workspace")
		ws.__newname = spec["title"]
	# blok custom (mis. "... Hari Ini RSIA" dari sentra_mantra_indonesia)
	# dipasang modul lain — pertahankan saat rebuild supaya build() idempoten
	keep_blocks = [
		b for b in (json.loads(ws.content) if ws.content else [])
		if b.get("type") == "custom_block"
	]
	keep_block_rows = [
		{"custom_block_name": cb.custom_block_name, "label": cb.label}
		for cb in ws.get("custom_blocks", [])
	]
	ws.title = spec["title"]
	ws.label = spec["title"]
	ws.icon = spec["icon"]
	ws.public = 1
	ws.is_hidden = 0
	ws.for_user = ""
	ws.sequence_id = spec["sequence_id"]

	ws.set("roles", [])
	for role in spec["roles"]:
		ws.append("roles", {"role": role})

	ws.set("shortcuts", [])
	ws.set("links", [])
	ws.set("charts", [])
	ws.set("number_cards", [])
	ws.set("custom_blocks", [])
	for row in keep_block_rows:
		ws.append("custom_blocks", row)
	content = list(keep_blocks)
	for header, shortcuts in spec["rows"]:
		content.append({
			"id": f"hdr-{_slug(header)}",
			"type": "header",
			"data": {"text": f'<span class="h4"><b>{header}</b></span>', "col": 12},
		})
		for sc in shortcuts:
			ws.append("shortcuts", {
				"label": sc["label"],
				"type": sc.get("type", "DocType"),
				"link_to": sc["link_to"],
				"doc_view": sc.get("doc_view", ""),
			})
			content.append({
				"id": f"sc-{_slug(sc['label'])}",
				"type": "shortcut",
				"data": {"shortcut_name": sc["label"], "col": 3},
			})
		content.append({"id": f"sp-{_slug(header)}", "type": "spacer", "data": {"col": 12}})
	ws.content = json.dumps(content)
	ws.flags.ignore_links = True
	ws.save(ignore_permissions=True)
	return ws.name


def hide_others():
	"""Sembunyikan semua workspace publik di luar KEEP (is_hidden, reversibel)."""
	out = {"disembunyikan": [], "tetap": KEEP}
	for name in frappe.get_all(
		"Workspace", filters={"public": 1, "is_hidden": 0, "name": ("not in", KEEP)}, pluck="name"
	):
		frappe.db.set_value("Workspace", name, "is_hidden", 1)
		out["disembunyikan"].append(name)
	return out


def build():
	"""Idempoten: bangun/perbarui 5 workspace, urutkan sidebar, sembunyikan sisanya."""
	built = [_build_one(spec) for spec in WORKSPACES]
	frappe.db.set_value("Workspace", "Home", "sequence_id", 1)
	hidden = hide_others()
	for name in KEEP:
		if frappe.db.exists("Workspace", name):
			frappe.clear_document_cache("Workspace", name)
	frappe.db.commit()
	return {"dibangun": built, **hidden}
