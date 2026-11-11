"""Source of truth posisi/Designation RSIA Melinda — edit file ini, lalu sync.

Cara pakai (dari bench root, dalam container):

    # terapkan isi file ini ke site (buat yang belum ada, aktifkan kembali
    # yang ter-disable, laporkan yang ada di site tapi tidak ada di file)
    bench --site mantra.localhost execute sentra_mantra_core.org_positions.sync

    # ganti nama posisi (semua referensi ikut ter-update oleh frappe.rename_doc)
    bench --site mantra.localhost execute sentra_mantra_core.org_positions.rename_position \
        --args "['Nama Lama', 'Nama Baru']"

    # nonaktifkan posisi yang tidak dipakai (JANGAN delete)
    bench --site mantra.localhost execute sentra_mantra_core.org_positions.disable_position \
        --args "['Nama Posisi']"

Alur input/replace untuk Chief: edit daftar POSITIONS di bawah (tambah/hapus/
ubah nama), jalankan sync. Posisi yang dihapus dari daftar TIDAK ikut terhapus
di site — sync hanya melaporkannya, keputusan disable/rename tetap manual.
31 Designation generik bawaan ERPNext yang sudah disabled tidak pernah
disentuh oleh sync.
"""

import frappe

# status: "confirmed" = sudah dikonfirmasi Chief; "draft" = usulan standar RSIA,
# menunggu konfirmasi/penggantian nama oleh Chief.
POSITIONS = {
	# ---- Pimpinan (CONFIRMED 2026-07-15; "CEO" di-rename "Direktur Utama"
	# atas permintaan Chief 2026-07-15 malam) ----
	"Direktur Utama": "confirmed",
	"WADIR Keuangan": "confirmed",
	"Kepala Bagian Keuangan": "confirmed",
	"WADIR Pengembangan": "confirmed",
	# ---- Klinis (DRAFT — ganti sesuai istilah resmi RSIA Melinda) ----
	"Dokter Spesialis Obgyn": "draft",
	"Dokter Spesialis Anak": "draft",
	"Dokter Umum": "draft",
	"Dokter Spesialis Anestesi": "draft",
	"Bidan": "draft",
	"Perawat": "draft",
	"Penata Anestesi": "draft",
	"Apoteker": "draft",
	"Tenaga Teknis Kefarmasian": "draft",
	"Analis Laboratorium": "draft",
	"Terapis Tumbuh Kembang": "draft",
	"Konselor Laktasi": "draft",
	"Perekam Medis": "draft",
	# ---- Dari Daftar Pegawai xlsx Chief (2026-07-15) ----
	"Perawat OK": "draft",
	"Ketua Komite Medik": "draft",
	# ---- Operasional (DRAFT) ----
	"Staff Administrasi": "draft",
	"Kasir": "draft",
	"Front Office": "draft",
	# ---- Struktural per bagan organisasi 17 Jul 2026 (CONFIRMED Chief:
	# gelar level generik; unit spesifik dibedakan lewat Department, bukan
	# nama designation. Rangkap jabatan: designation = jabatan struktural
	# tertinggi. Lihat docs/architecture/2026-07-17-struktur-organisasi-
	# rsia-melinda.md) ----
	"Kepala Bagian": "confirmed",
	"Kepala Bidang": "confirmed",
	"Kepala Sub Bagian": "confirmed",
	"Kepala Seksi": "confirmed",
	"Kepala Unit": "confirmed",
	"Kepala Ruang": "confirmed",
	"Case Manager": "confirmed",
	# ---- Tambahan Chief 17 Jul (di luar bagan) ----
	"Manager Operasional": "confirmed",
	"Asisten Direktur / Sekretaris": "confirmed",
}


def sync():
	"""Idempoten: buat yang belum ada, re-enable yang ter-disable, laporkan sisanya."""
	created, reenabled, unchanged = [], [], []
	for name in POSITIONS:
		if not frappe.db.exists("Designation", name):
			frappe.get_doc({"doctype": "Designation", "designation_name": name}).insert()
			created.append(name)
		elif frappe.db.get_value("Designation", name, "disabled"):
			frappe.db.set_value("Designation", name, "disabled", 0)
			reenabled.append(name)
		else:
			unchanged.append(name)
	# aktif di site tapi tidak ada di file — kandidat rename/disable, tidak diotak-atik
	extras = [
		d
		for d in frappe.get_all("Designation", filters={"disabled": 0}, pluck="name")
		if d not in POSITIONS
	]
	frappe.db.commit()
	return {
		"created": created,
		"reenabled": reenabled,
		"unchanged_count": len(unchanged),
		"active_not_in_file": extras,
		"total_active": frappe.db.count("Designation", {"disabled": 0}),
	}


def rename_position(old, new):
	frappe.rename_doc("Designation", old, new)
	frappe.db.commit()
	return {"renamed": [old, new]}


def disable_position(name):
	frappe.db.set_value("Designation", name, "disabled", 1)
	frappe.db.commit()
	return {"disabled": name}
