"""Source of truth pohon Department RSIA Melinda — dari bagan struktur
organisasi 17 Jul 2026 (docs/architecture/2026-07-17-struktur-organisasi-
rsia-melinda.md). Edit TREE/REPARENT lalu sync:

    bench --site mantra.localhost execute sentra_mantra_core.org_departments.sync

Idempoten: membuat yang belum ada dan memindahkan parent yang berbeda;
TIDAK pernah menghapus/me-rename departemen yang sudah ada (Employee sudah
menunjuk ke sana). Komite/Panitia sengaja BUKAN Department — organ non-lini,
dicatat sebagai penugasan (keputusan Chief 17 Jul).

Catatan pemetaan nama lama → bagan: "Rekam Medis" = RMIK, "Ruang Operasi" =
Bedah Sentral, "Instalasi Gawat Darurat (IGD)" = Gawat Darurat. Seksi
"Pelayanan Medis" pada bagan tidak dibuat sebagai node sendiri (namanya sama
dengan bidang induknya) — unit-unitnya langsung di bawah bidang.
"Manajemen" dan "Executive" lama dibiarkan di tempatnya (dipakai Employee,
tidak ada padanan di bagan)."""

import frappe

COMPANY = "RSIA Melinda"

# (department_name, parent|None = root di bawah All Departments, is_group)
# Urutan penting: induk sebelum anak.
TREE = [
	("Administrasi Umum & Keuangan", None, 1),
	("Administrasi", "Administrasi Umum & Keuangan", 1),
	("SDM & Diklat", "Administrasi", 0),
	("Humas & Pemasaran", "Administrasi", 0),
	("TU & Sekretariat", "Administrasi", 0),
	("Keuangan", "Administrasi Umum & Keuangan", 1),
	("Kasir", "Keuangan", 0),
	("Akuntansi & Pajak", "Keuangan", 0),
	("Asuransi", "Keuangan", 0),
	("Umum", "Administrasi Umum & Keuangan", 1),
	("Rumah Tangga", "Umum", 1),
	("Logistik", "Rumah Tangga", 0),
	("UPSRS", "Rumah Tangga", 0),
	("Binroh", "Rumah Tangga", 0),
	("Satuan Keamanan", "Rumah Tangga", 0),
	("Sanitasi Lingkungan", "Umum", 1),
	("Laundry", "Sanitasi Lingkungan", 0),
	("Unit Kamar Steril", "Sanitasi Lingkungan", 0),
	("Pelayanan Medis", None, 1),
	("Penunjang Medis", "Pelayanan Medis", 1),
	("Gizi", "Penunjang Medis", 0),
	("Rawat Jalan", "Pelayanan Medis", 1),
	("Keperawatan", "Pelayanan Medis", 1),
	("VK", "Keperawatan", 0),
	("URNA Anak Isolasi", "Keperawatan", 0),
	("URNA Bayi", "Keperawatan", 0),
	("URNA Dewasa", "Keperawatan", 0),
]

# Departemen lama (flat di bawah All Departments) → posisi baru sesuai bagan.
REPARENT = {
	"Rekam Medis": "Penunjang Medis",
	"Laboratorium": "Penunjang Medis",
	"Farmasi": "Penunjang Medis",
	"Poli OBGYN": "Rawat Jalan",
	"Poli Anak": "Rawat Jalan",
	"Poli Umum": "Rawat Jalan",
	"Tumbuh Kembang": "Rawat Jalan",
	"Konseling Laktasi": "Rawat Jalan",
	"Instalasi Gawat Darurat (IGD)": "Pelayanan Medis",
	"Ruang Operasi": "Pelayanan Medis",
}


def _full(name):
	abbr = frappe.db.get_value("Company", COMPANY, "abbr")
	return f"{name} - {abbr}"


def sync():
	"""Idempoten: buat node pohon yang belum ada, luruskan parent yang beda."""
	created, moved, unchanged = [], [], []

	def ensure_parent(doc, parent_full):
		changed = False
		if doc.parent_department != parent_full:
			doc.parent_department = parent_full
			changed = True
		return changed

	for name, parent, is_group in TREE:
		parent_full = _full(parent) if parent else "All Departments"
		full = _full(name)
		if not frappe.db.exists("Department", full):
			frappe.get_doc(
				{
					"doctype": "Department",
					"department_name": name,
					"company": COMPANY,
					"parent_department": parent_full,
					"is_group": is_group,
				}
			).insert()
			created.append(full)
			continue
		doc = frappe.get_doc("Department", full)
		changed = ensure_parent(doc, parent_full)
		if int(doc.is_group or 0) != is_group:
			doc.is_group = is_group
			changed = True
		if changed:
			doc.save()
			moved.append(full)
		else:
			unchanged.append(full)

	for name, parent in REPARENT.items():
		full = _full(name)
		if not frappe.db.exists("Department", full):
			continue
		doc = frappe.get_doc("Department", full)
		if ensure_parent(doc, _full(parent)):
			doc.save()
			moved.append(full)
		else:
			unchanged.append(full)

	frappe.db.commit()
	return {
		"created": created,
		"moved": moved,
		"unchanged_count": len(unchanged),
		"total_active": frappe.db.count("Department", {"disabled": 0}),
	}
