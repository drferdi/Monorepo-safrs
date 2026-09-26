"""Jobdesk jabatan untuk konteks RSIA (rumah sakit ibu & anak).

Prefix-match seperti badge pangkat — jabatan "WADIR Keuangan" memakai entri WADIR.
Konten bersifat ringkas operasional (bukan SK formal HR); dapat diganti lewat
Custom DocType nanti tanpa mengubah kontrak API.
"""

from __future__ import annotations

import frappe
from frappe import _

# Urutan penting: prefix lebih spesifik dulu.
_JOBDESKS: tuple[tuple[str, dict], ...] = (
	(
		"Direktur Utama",
		{
			"title": "Direktur Utama",
			"summary": (
				"Pemimpin tertinggi RSIA yang bertanggung jawab atas arah strategis, "
				"mutu layanan ibu–anak, keberlanjutan operasional, dan tata kelola rumah sakit."
			),
			"duties": [
				"Menetapkan visi, misi, dan rencana strategis RSIA (layanan obstetri, neonatus, anak, dan penunjang).",
				"Memastikan kepatuhan perizinan, akreditasi, dan regulasi Kemenkes serta standar keselamatan pasien maternal–neonatal.",
				"Mengawasi kinerja klinis dan nonklinis: VK, NICU/PICU, poli kandungan/anak, farmasi, dan penunjang.",
				"Memimpin rapat direksi, mengambil keputusan strategis, dan mewakili RSIA kepada pemilik, regulator, serta mitra (BPJS, SATUSEHAT, asuransi).",
				"Menjamin ketersediaan SDM nakes (dokter SpOG/SpA, bidan, perawat) dan kelengkapan STR/SIP praktisi.",
				"Mengawasi kesehatan keuangan, investasi, dan efisiensi tanpa mengorbankan mutu klinis.",
				"Membangun budaya keselamatan pasien, pelaporan insidensi, dan perbaikan berkelanjutan.",
			],
			"scope": "Seluruh unit RSIA — klinis, penunjang, SDM, keuangan, dan kemitraan eksternal.",
		},
	),
	(
		"Direktur RS",
		{
			"title": "Direktur Rumah Sakit",
			"summary": (
				"Mengelola operasional harian RSIA agar layanan ibu dan anak aman, "
				"tepat waktu, dan sesuai standar mutu."
			),
			"duties": [
				"Mengorkestrasi alur pasien dari pendaftaran, poli, rawat inap, VK, hingga pulang.",
				"Memantau indikator mutu maternal–neonatal (sectio, rujukan, infeksi nosokomial, kepuasan).",
				"Mengkoordinasikan unit klinis dengan penunjang (lab, radiologi, farmasi, CSSD).",
				"Menindaklanjuti temuan akreditasi, audit internal, dan komite mutu/keselamatan pasien.",
				"Memastikan kesiapan fasilitas emergensi obstetri dan neonatus.",
			],
			"scope": "Operasional klinis dan penunjang RSIA sehari-hari.",
		},
	),
	(
		"WADIR",
		{
			"title": "Wakil Direktur",
			"summary": (
				"Mendampingi Direktur pada portofolio tertentu (keuangan, pengembangan, "
				"SDM, atau pelayanan) di lingkungan RSIA."
			),
			"duties": [
				"Menjabarkan kebijakan direksi ke program kerja unit di bawah portofolionya.",
				"Memantau KPI bidang (mis. keuangan, pengembangan layanan ibu–anak, atau SDM nakes).",
				"Mengkoordinasikan lintas unit agar layanan obstetri/anak tidak terhambat administrasi.",
				"Menyiapkan bahan keputusan untuk Direktur Utama dan melaporkan risiko operasional.",
				"Mewakili Direktur pada forum internal/eksternal sesuai penugasan.",
			],
			"scope": "Portofolio bidang sesuai penunjukan (Keuangan / Pengembangan / Pelayanan / SDM).",
		},
	),
	(
		"Wakil Direktur",
		{
			"title": "Wakil Direktur",
			"summary": (
				"Mendampingi Direktur pada portofolio tertentu di lingkungan RSIA ibu dan anak."
			),
			"duties": [
				"Menjabarkan kebijakan direksi ke program kerja unit di bawah portofolionya.",
				"Memantau KPI bidang dan risiko layanan maternal–neonatal terkait portofolio.",
				"Mengkoordinasikan lintas unit dan menyiapkan bahan keputusan direksi.",
			],
			"scope": "Portofolio bidang sesuai penunjukan.",
		},
	),
	(
		"Komisaris",
		{
			"title": "Komisaris",
			"summary": (
				"Pengawas tata kelola dan arah strategis RSIA atas nama pemilik, "
				"tanpa ikut operasional harian klinis."
			),
			"duties": [
				"Mengawasi kebijakan direksi agar selaras dengan tujuan pemilik dan regulasi.",
				"Menilai kinerja keuangan dan risiko strategis rumah sakit ibu–anak.",
				"Memberi arahan pada rencana investasi, ekspansi layanan, dan kemitraan besar.",
				"Memastikan prinsip good corporate governance dan akuntabilitas pelaporan.",
			],
			"scope": "Pengawasan strategis; bukan operasional klinis sehari-hari.",
		},
	),
	(
		"Kepala Ruang",
		{
			"title": "Kepala Ruang",
			"summary": (
				"Pemimpin asuhan keperawatan/kebidanan di ruang perawatan RSIA "
				"(mis. VK, nifas, anak, NICU) agar aman dan terstandar."
			),
			"duties": [
				"Mengatur jadwal dinas, beban kerja, dan handover shift di ruangannya.",
				"Memastikan protokol asuhan maternal/neonatal/anak dijalankan (termasuk infeksi & jatuh).",
				"Memantau kelengkapan rekam medis, informed consent, dan edukasi pasien/keluarga.",
				"Mengelola logistik ruang (obat, APD, linen) dan melaporkan kerusakan alat.",
				"Membimbing staf baru dan menindaklanjuti kejadian tidak diharapkan.",
			],
			"scope": "Satu ruang perawatan / unit asuhan di RSIA.",
		},
	),
	(
		"Dokter Spesialis Obstetri",
		{
			"title": "Dokter Spesialis Obstetri & Ginekologi",
			"summary": "Memberikan pelayanan obstetri–ginekologi sesuai kompetensi dan kewenangan klinis di RSIA.",
			"duties": [
				"Melakukan asesmen, diagnosis, dan penatalaksanaan kehamilan, persalinan, dan gangguan reproduksi.",
				"Memimpin penanganan emergensi obstetri sesuai protokol rumah sakit.",
				"Mendokumentasikan asuhan di EMR dan memastikan kelengkapan STR/SIP aktif.",
				"Berkolaborasi dengan bidan, anestesi, neonatus, dan penunjang.",
			],
			"scope": "Pelayanan obstetri–ginekologi di poli, VK, dan rawat inap.",
		},
	),
	(
		"Dokter Spesialis Anak",
		{
			"title": "Dokter Spesialis Anak",
			"summary": "Memberikan pelayanan pediatri dan neonatus sesuai kompetensi di RSIA.",
			"duties": [
				"Melakukan asesmen dan penatalaksanaan bayi baru lahir serta anak sakit.",
				"Berkolaborasi dengan SpOG, bidan, dan perawat NICU/ruang anak.",
				"Memantau tumbuh kembang dan imunisasi sesuai indikasi klinis.",
				"Mendokumentasikan asuhan dan menjaga kelengkapan kredensial.",
			],
			"scope": "Pelayanan neonatus dan pediatri di poli, rawat inap, NICU/PICU.",
		},
	),
	(
		"Bidan",
		{
			"title": "Bidan",
			"summary": "Memberikan asuhan kebidanan mandiri dan kolaboratif untuk ibu dan bayi di RSIA.",
			"duties": [
				"Melakukan asuhan antenatal, persalinan normal, nifas, dan bayi baru lahir sesuai kewenangan.",
				"Mengenali tanda bahaya dan melakukan rujukan/kolaborasi tepat waktu.",
				"Melaksanakan protokol RSIA (partograf, IMD, ASI, pencegahan infeksi).",
				"Mendidik ibu dan keluarga serta mendokumentasikan asuhan dengan lengkap.",
			],
			"scope": "Poli KIA, VK, nifas, dan layanan kebidanan terkait.",
		},
	),
	(
		"Perawat",
		{
			"title": "Perawat",
			"summary": "Memberikan asuhan keperawatan aman untuk ibu, bayi, dan anak di unit penempatan RSIA.",
			"duties": [
				"Melaksanakan proses keperawatan (kajian, intervensi, evaluasi) sesuai standar ruang.",
				"Memantau tanda vital, pemberian obat, dan keselamatan pasien.",
				"Berkolaborasi dengan dokter dan bidan; melaporkan perubahan kondisi segera.",
				"Menjaga kebersihan, sterilisasi alat, dan dokumentasi EMR.",
			],
			"scope": "Unit penempatan (rawat inap, IGD, NICU, poli, dll.).",
		},
	),
)


def get_jobdesk(designation: str | None) -> dict | None:
	"""Kembalikan jobdesk untuk jabatan; None bila belum ada entri."""
	if not designation:
		return None
	name = designation.strip()
	for prefix, data in _JOBDESKS:
		if name == prefix or name.startswith(prefix):
			out = dict(data)
			out["designation"] = name
			return out
	return {
		"designation": name,
		"title": name,
		"summary": (
			f"Jobdesk spesifik untuk «{name}» di RSIA belum terpetakan. "
			"Umumnya mencakup pelaksanaan tugas sesuai uraian jabatan HR, "
			"kepatuhan protokol layanan ibu–anak, dan kolaborasi lintas unit."
		),
		"duties": [
			"Melaksanakan tugas sesuai SK/uraian jabatan dan alur kerja unit.",
			"Menjaga mutu dan keselamatan pasien ibu, bayi, dan anak.",
			"Melengkapi dokumentasi dan melapor ke atasan sesuai jalur komando.",
		],
		"scope": "Sesuai unit kerja penempatan di RSIA.",
		"generic": True,
	}


@frappe.whitelist()
def for_designation(designation: str | None = None):
	"""API untuk modal jobdesk (portal / desk)."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login diperlukan."), frappe.PermissionError)
	data = get_jobdesk(designation)
	if not data:
		frappe.throw(_("Jabatan tidak ditemukan."))
	return data
