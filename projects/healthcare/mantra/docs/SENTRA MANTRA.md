SENTRA MANTRA
Workspace Experience Specification v1
Sasaran

Mengubah Desk Frappe menjadi operational command center rumah sakit, bukan kumpulan tautan ERP.

Setiap workspace harus menjawab tiga pertanyaan:

Bagaimana kondisi saat ini?
Apa yang perlu dikerjakan?
Ke mana pengguna harus masuk?
Struktur navigasi
Beranda
Pasien & Klinik
SDM
Keuangan
Pengaturan

Workspace bawaan lain disembunyikan dari navigasi, tetapi seluruh fungsi tetap dapat diakses melalui awesomebar dan permission standar.

1. BERANDA
Tujuan

Memberikan orientasi personal, pekerjaan prioritas, akses cepat, dan kontinuitas aktivitas.

Desain persona v1 (2026-07-16): satu shell adaptif untuk CEO / Staff / Karyawan
(bukan dual page) — lihat `docs/design/2026-07-16-beranda-persona-design.md`.
Implementasi: `home_profile` (tiles dinamis) + `insights` (Pandangan Direktur).

Blueprint
┌──────────────────────────────────────────────────────────────────────┐
│ BERANDA                                                              │
├──────────────────────────┬───────────────────────────────────────────┤
│                          │ STATUS OPERASIONAL HARI INI               │
│      │ ┌───────────────────────────────────────┐ │
│                          │ │ Semua terkendali / Perlu perhatian    │ │
│   FOTO 	Nama            │ └───────────────────────────────────────┘ │
│  		 	Jabatan         │                                           │
│   		Unit kerja      │ AKSI CEPAT                                │
│   		Status akun     │ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────┐ │
│                          │ │Approval│ │Laporan │ │Keuangan│ │ SDM │ │
│ ┌────────┐ ┌───────────┐ │ └────────┘ └────────┘ └────────┘ └─────┘ │
│ │ Cuti   │ │ Notifikasi│ │                                           │
│ ├────────┼───────────┬─┤ │ AKTIVITAS TERAKHIR                       │
│ │ STR    │ SIP       │ │ │ • Tagihan INV-000328        10 menit     │
│ ├────────┼───────────┤ │ │ • Cuti LEAVE-000067         1 jam        │
│ │ Unit   │ NIK       │ │ │ • PO-000154                 3 jam        │
│ └────────┴───────────┘ │                                           │
│ [ LIHAT PROFIL LENGKAP ]│ [ LIHAT SEMUA AKTIVITAS ]                  │
└──────────────────────────┴───────────────────────────────────────────┘
Komponen
A. Profil utama
Elemen	Sumber
Foto besar	User / Employee image
Nama	Employee name
Gelar	Custom employee field
Jabatan	Designation
Unit kerja	Department
Status akun	User enabled
NIK karyawan	Employee custom field
Sisa cuti	Leave Allocation
STR	Custom credential field
SIP	Custom credential field
Notifikasi	Notification settings
Tambahan dua fitur profil

Dua fitur yang tepat untuk melengkapi profil adalah:

Unit Kerja
Menjelaskan posisi operasional pengguna.
NIK Karyawan
Memberikan identitas administratif yang mudah ditemukan.

Dalam tahap lanjutan, keduanya dapat diganti secara dinamis berdasarkan role, misalnya dokter melihat jadwal praktik dan unit layanan.

B. Status hari ini

Status memiliki tiga kondisi:

Kondisi	Tampilan
Tidak ada pekerjaan	Semua terkendali
Ada pekerjaan biasa	Beberapa hal membutuhkan perhatian
Ada pekerjaan kritis	Tindakan segera diperlukan

Jangan menampilkan empat baris angka nol. Hanya tampilkan item yang bernilai lebih dari nol.

Contoh ketika ada tugas:

5 Persetujuan menunggu
2 Tagihan lewat jatuh tempo
1 Dokumen tenaga kesehatan segera berakhir
C. Aksi cepat

Maksimal empat kartu dan mengikuti peran pengguna.

Chief

Persetujuan
Laporan Manajemen
Keuangan
Karyawan

Dokter/Bidan

Pasien Hari Ini
Appointment
Mulai Pemeriksaan
Jadwal Praktik

SDM

Data Karyawan
Pengajuan Cuti
Kehadiran
Penugasan Shift

Keuangan

Buat Tagihan
Catat Pembayaran
Pengadaan
Buku Besar
D. Aktivitas terakhir

Tampilkan maksimal lima aktivitas:

ikon jenis dokumen,
nama dan nomor dokumen,
label Indonesia,
waktu relatif,
klik membuka dokumen.

Saat belum ada aktivitas, bagian ini disembunyikan, bukan menampilkan ruang kosong.

Acceptance criteria Beranda
Foto tampil besar dan proporsional.
Tidak ada informasi akun sensitif yang tidak diperlukan.
Action card mengikuti role.
Status kosong tidak menghasilkan daftar angka nol.
Aktivitas terakhir berasal dari data nyata.
Tidak ada error untuk pengguna non-System Manager.
Tampilan tetap baik pada lebar laptop 1366 px.
2. PASIEN & KLINIK
Tujuan

Menjadi pusat pekerjaan pendaftaran dan pelayanan klinis.

Blueprint
┌──────────────────────────────────────────────────────────────────┐
│ PASIEN & KLINIK                                                  │
├──────────────────────────────────────────────────────────────────┤
│ [12 Appointment] [4 Menunggu] [6 Encounter] [8 Praktisi Bertugas]│
├──────────────────────────────────────────────────────────────────┤
│ AKSI PELAYANAN                                                   │
│ [Daftarkan Pasien] [Buat Appointment] [Mulai Pemeriksaan]        │
│ [Cari Pasien]                                                    │
├───────────────────────────────────┬──────────────────────────────┤
│ PASIEN & APPOINTMENT HARI INI     │ JADWAL PRAKTIK              │
│ • 08:00 — Pasien A — Obgyn        │ • dr. A — 08:00–12:00       │
│ • 08:30 — Pasien B — Anak         │ • dr. B — 12:00–16:00       │
├───────────────────────────────────┴──────────────────────────────┤
│ REFERENSI PELAYANAN                                              │
│ [Tenaga Kesehatan] [Unit Pelayanan] [Jadwal Praktik]             │
└──────────────────────────────────────────────────────────────────┘
Number cards
Appointment hari ini
Pasien menunggu
Encounter aktif atau belum selesai
Praktisi bertugas
Aksi utama
Label	Target
Daftarkan Pasien	New Patient
Buat Appointment	New Patient Appointment
Mulai Pemeriksaan	New Patient Encounter
Cari Pasien	Patient List
Panel operasional
Appointment hari ini
Pasien menunggu
Encounter belum selesai
Jadwal praktisi hari ini
Referensi pelayanan
Tenaga Kesehatan
Jadwal Praktik
Unit Pelayanan
Jenis Appointment — hanya admin klinis
Role visibility
Role	Tampilan
Pendaftaran	Pasien, Appointment, pencarian
Dokter/Bidan	Jadwal dan Encounter
Kepala Pelayanan	Seluruh monitoring klinis
Admin klinis	Master dan konfigurasi
3. SDM
Tujuan

Menjadi pusat administrasi pegawai, kehadiran, cuti, dan jadwal kerja.

Blueprint
┌──────────────────────────────────────────────────────────────────┐
│ SDM                                                              │
├──────────────────────────────────────────────────────────────────┤
│ [56 Karyawan] [3 Cuti Menunggu] [48 Hadir] [8 Shift Aktif]       │
├──────────────────────────────────────────────────────────────────┤
│ AKSI CEPAT                                                       │
│ [Karyawan] [Ajukan Cuti] [Kehadiran] [Penugasan Shift]           │
├────────────────────────────────┬─────────────────────────────────┤
│ PERLU PERHATIAN                │ JADWAL HARI INI                 │
│ • 3 cuti menunggu              │ • Shift Pagi: 24 pegawai       │
│ • 2 absensi belum lengkap      │ • Shift Sore: 18 pegawai       │
│ • 1 kontrak segera berakhir    │ • Shift Malam: 14 pegawai      │
├────────────────────────────────┴─────────────────────────────────┤
│ ORGANISASI                                                       │
│ [Departemen] [Jabatan] [Hari Libur] [Penggajian]                 │
└──────────────────────────────────────────────────────────────────┘
Number cards
Total karyawan aktif
Cuti menunggu persetujuan
Kehadiran hari ini
Penugasan shift aktif
Aksi utama
Data Karyawan
Pengajuan Cuti
Kehadiran
Penugasan Shift
Monitoring
Pengajuan cuti terbaru
Pegawai tanpa attendance
Perubahan shift
Kontrak atau credential segera berakhir
Master dan konfigurasi
Departemen
Jabatan
Daftar Hari Libur
Penggajian
Shift Type — admin
Leave Type — admin
Catatan payroll

Pada fase awal cukup satu kartu Penggajian dengan status:

Dalam persiapan
Konfigurasi payroll belum diaktifkan.

Kartu tidak boleh mengarah ke alur yang belum aman digunakan.

4. KEUANGAN
Tujuan

Menampilkan aliran tagihan, pembayaran, pengadaan, dan pencatatan keuangan secara mudah dibaca.

Blueprint
┌──────────────────────────────────────────────────────────────────┐
│ KEUANGAN                                                         │
├──────────────────────────────────────────────────────────────────┤
│ [Tagihan Belum Lunas] [Penerimaan Hari Ini] [PO Menunggu]        │
│ [Jurnal Belum Diposting]                                         │
├──────────────────────────────────────────────────────────────────┤
│ AKSI CEPAT                                                       │
│ [Buat Tagihan] [Catat Pembayaran] [Buat Pengadaan] [Jurnal]      │
├─────────────────────────────────┬────────────────────────────────┤
│ TRANSAKSI TERBARU               │ PERSETUJUAN                   │
│ • INV-000328 Rp...              │ • PO-000154                  │
│ • PAY-000217 Rp...              │ • Payment Entry             │
├─────────────────────────────────┴────────────────────────────────┤
│ REFERENSI KEUANGAN                                               │
│ [Penjamin] [Pemasok] [Buku Besar] [Bagan Akun]                  │
└──────────────────────────────────────────────────────────────────┘
Number cards
Total tagihan belum lunas
Penerimaan hari ini
Purchase Order menunggu persetujuan
Journal Entry draft atau menunggu persetujuan
Aksi utama
Label	Target
Buat Tagihan	New Sales Invoice
Catat Pembayaran	New Payment Entry
Buat Pengadaan	New Purchase Order
Buat Jurnal	New Journal Entry
Referensi
Penjamin
Pemasok
Buku Besar
Bagan Akun
Metode Pembayaran — admin keuangan
Permission

Informasi nilai finansial hanya tampil untuk role yang memang mempunyai read permission terhadap dokumen sumber.

Jangan menghitung data dengan ignore_permissions=True untuk widget pengguna biasa.

5. PENGATURAN
Tujuan

Memberikan konfigurasi sistem yang terkelompok dan tidak memenuhi workspace operasional.

Blueprint
┌─────────────────────────────────────────────────────────────┐
│ PENGATURAN                                                  │
├───────────────────┬───────────────────┬─────────────────────┤
│ AKSES & KEAMANAN  │ PROSES            │ SISTEM              │
│ Pengguna          │ Alur Persetujuan  │ Pengaturan Sistem   │
│ Peran             │ Notifikasi        │ Terjemahan          │
│ Hak Akses         │ Akun Email        │ Format Cetak        │
│ Batasan Pengguna  │ Status Workflow   │ Kop Surat           │
└───────────────────┴───────────────────┴─────────────────────┘

Workspace hanya terlihat untuk:

Chief
System Manager
Administrator yang secara eksplisit diberi akses

Fitur berisiko tinggi seperti Role Permission Manager harus tetap mengikuti permission Frappe; menyembunyikan kartu bukan pengganti kontrol akses.

Sistem komponen visual

Agar konsisten, kita gunakan enam komponen utama.

1. SentraStatusBanner

Untuk status umum workspace.

Properti konseptual:

title
description
status: success | attention | critical | neutral
icon
action
2. SentraNumberCard

Untuk indikator numerik.

label
value
supporting_text
trend
route
permission
3. SentraActionCard

Untuk pintu tugas utama.

label
description
icon
route
role_visibility
badge_count
4. SentraActivityList

Untuk aktivitas atau dokumen terakhir.

doctype
document_name
label
timestamp
icon
route
5. SentraProfileTile

Untuk detail personal:

cuti,
notifikasi,
STR,
SIP,
unit kerja,
NIK.
6. SentraSection

Container konsisten untuk:

judul,
deskripsi,
data,
empty state,
action.
Aturan visual
Desktop
Grid utama: 12 kolom.
Profil Beranda: 4 kolom.
Operasional: 8 kolom.
Number cards: maksimal empat per baris.
Action cards: maksimal empat per baris.
Aktivitas: satu list penuh.
Tablet
Profil dan operasional menjadi satu kolom.
Number cards dua per baris.
Action cards dua per baris.
Mobile
Semua satu kolom.
Foto tetap besar tetapi tinggi dibatasi.
Tidak ada horizontal scrolling.
Label panjang dapat membungkus maksimal dua baris.
Tipografi
Judul halaman: kuat tetapi tidak besar berlebihan.
Label section: uppercase kecil.
Angka number card menjadi fokus utama.
Deskripsi maksimal dua baris.
Hindari terlalu banyak font dekoratif.
Warna
Dark neutral sebagai permukaan utama.
Gold/amber sebagai identitas dan aksi.
Green hanya untuk kondisi aman.
Orange untuk perhatian.
Red hanya untuk kondisi kritis.
Warna tidak boleh menjadi satu-satunya penanda status; selalu sertakan ikon dan teks.
Arsitektur implementasi
File yang disarankan
sentra_mantra_core/
├── ui_defaults.py
├── workspace_definitions.py
├── dashboard/
│   ├── home.py
│   ├── clinical.py
│   ├── hr.py
│   ├── finance.py
│   └── permissions.py
├── public/
│   ├── js/
│   │   ├── sentra_workspace.js
│   │   └── sentra_components.js
│   └── css/
│       └── sentra_workspace.css
└── translations/
    └── id.csv

Nama final mengikuti struktur repository aktual; jangan membuat folder baru bila pola existing app sudah menyediakan lokasi yang lebih tepat.

Konstanta workspace
CURATED_WORKSPACES = {
    "Beranda": {...},
    "Pasien & Klinik": {...},
    "SDM": {...},
    "Keuangan": {...},
    "Pengaturan": {...},
}

Setiap definisi minimal menyimpan:

label
icon
sequence
roles
shortcuts
number_cards
custom_blocks

Dengan struktur ini, fase berikutnya dapat menambahkan number card dan custom block tanpa mengubah arsitektur curation.

Tahapan pengerjaan
Sprint 1 — Navigation Foundation

Scope

apply_workspace_curation()
lima workspace
hidden workspace
label Indonesia
permission visibility
idempotency

Definition of done

Run pertama mengubah workspace.
Run kedua menghasilkan nol perubahan.
Cache hanya dibersihkan per workspace.
Awesomebar tetap dapat membuka fungsi yang disembunyikan.
Pengguna non-admin tidak mengalami permission error.
Sprint 2 — Beranda Visual

Scope

profil besar,
enam profile tile,
status hari ini,
empat action card,
aktivitas terakhir,
empty state.

Definition of done

Data profile berasal dari Employee/User aktif.
Kartu mengikuti role.
STR/SIP kosong tidak merusak layout.
Informasi sensitif mengikuti permission.
Tidak ada mock data dalam production path.
Sprint 3 — Pasien & Klinik

Scope

empat number cards,
empat action cards,
appointment hari ini,
jadwal praktik,
referensi klinis.

Definition of done

Data dibatasi oleh role dan unit jika diperlukan.
Tidak ada pengambilan data klinis berlebihan.
Klik membuka DocType atau dokumen yang benar.
Tidak ada diagnosis atau informasi klinis sensitif di kartu umum.
Sprint 4 — SDM

Scope

number cards,
cuti,
attendance,
shift,
struktur organisasi.

Definition of done

Employee biasa tidak melihat data pegawai lain tanpa izin.
Approval hanya muncul untuk approver.
Informasi payroll tidak terlihat bagi role yang tidak berwenang.
Sprint 5 — Keuangan

Scope

tagihan,
pembayaran,
purchase order,
jurnal,
daftar transaksi terbaru.

Definition of done

Nilai finansial mengikuti permission.
Status workflow akurat.
Dokumen draft dan submitted dibedakan.
Tidak ada angka agregat dari dokumen yang tidak dapat dibaca pengguna.
Sprint 6 — Polish dan Hardening

Scope

responsive layout,
dark/light compatibility bila dibutuhkan,
loading state,
error state,
empty state,
performance,
accessibility,
Playwright verification.
Loading, empty, dan error states

Setiap visual block wajib memiliki empat keadaan:

Loading
Skeleton ringan, bukan spinner penuh halaman.
Loaded
Data aktual.
Empty
Pesan positif dan singkat.
Error
Blok lain tetap dapat digunakan; jangan menggagalkan seluruh workspace.

Contoh:

Data aktivitas belum tersedia.
Dokumen yang Anda buka akan muncul di sini.

Error:

Ringkasan belum dapat dimuat.
Buka daftar lengkap untuk melihat data.

Jangan tampilkan traceback atau pesan internal Frappe kepada pengguna.

Verifikasi
Automated
unit test untuk workspace definitions,
test idempotency,
permission tests,
empty-state tests,
route tests,
serialization/API tests bila menggunakan endpoint khusus.
Visual

Gunakan user uji sesuai role:

Chief/System Manager
Dokter
Pendaftaran
SDM
Keuangan
Pegawai biasa

Verifikasi dengan Playwright:

navigasi workspace,
kartu tampil sesuai role,
kartu tersembunyi bila tidak berwenang,
target route benar,
responsive desktop/tablet,
tidak ada console error.

Setelah verifikasi, user uji dihapus.

Prioritas final

Urutan implementasi yang paling aman:

Workspace curation
Beranda visual
Pasien & Klinik
SDM
Keuangan
Pengaturan
Smart notification dan executive insights

Jangan membangun dashboard analitik besar sebelum data transaksi benar-benar aktif dan konsisten. Fase pertama harus mengutamakan navigasi, pekerjaan harian, approval, dan data operasional nyata.

Keputusan desain

Konsep final MANTRA:

Foto dan identitas memberi rasa personal. Status memberi ketenangan. Action card memberi arah. Number card memberi kesadaran. Aktivitas terakhir memberi kontinuitas.

Dengan blueprint ini, kita bukan hanya mempercantik workspace. Kita mengubah cara pengguna memahami dan menjalankan rumah sakit melalui MANTRA.