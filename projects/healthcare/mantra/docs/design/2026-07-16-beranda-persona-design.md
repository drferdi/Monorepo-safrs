# Beranda Adaptive Design — Persona v1

**Status:** Diimplementasi (2026-07-16 Chief GO) — `home_profile` tiles + `insights` Pandangan Direktur  
**Tanggal:** 2026-07-16  
**Sumber induk:** [`docs/SENTRA MANTRA.md`](../SENTRA%20MANTRA.md) §1 BERANDA  
**Runtime saat ini:** `sentra_mantra_indonesia.home_profile` + `home_today` (Custom HTML Block di Workspace Home)

Dokumen ini adalah SSOT desain untuk Beranda adaptif. Engineer tanpa konteks percakapan harus bisa mengimplementasi dari file ini saja.

---

## 1. Prinsip

1. **Satu shell, N persona** — bukan dua halaman “Beranda CEO” vs “Beranda Staff”. Layout HTML sama; isi (tile, tugas, aksi, blok ekstra) mengikuti persona.
2. **Urutan prioritas viewport:** identitas → status hari ini → aksi cepat → kontinuitas (terakhir dibuka) → (CEO only) sinyal operasional.
3. **Zero wallpaper dilarang** — jangan tampilkan baris/kartu dengan angka 0. Seksi tanpa item disembunyikan.
4. **Permission wajib** — setiap angka memakai `ws_common.can` / `gated_count` (hardening 2026-07-16). Tidak ada `ignore_permissions` di jalur widget.
5. **Bahasa desain Sentra** — netral mengikuti tema Desk; aksen `#FF4B26` untuk hover/nomor/aktif. Bukan gold / dark-neutral spekulatif.
6. **Beranda = pekerjaan saya hari ini** — bukan dashboard analitik rumah sakit. Chart revenue/occupancy/out of scope.

---

## 2. Mapping peran (terkunci)

| Label produk | Persona kode (`home_today._persona`) | Deteksi role Frappe (prioritas atas → bawah) |
|---|---|---|
| **CEO** | `chief` | `System Manager` |
| **Staff** (klinis) | `clinical` | `Healthcare Practitioner` tertaut user, atau role `Physician` / `Nursing User` |
| **Staff** (SDM) | `hr` | `HR Manager` / `HR User` |
| **Staff** (keuangan) | `finance` | `Accounts Manager` / `Accounts User` |
| **Karyawan** | `umum` | fallback — tidak cocok aturan di atas |

Catatan: satu user hanya mendapat **satu** persona (first match). CEO yang juga dokter tetap `chief` selama punya `System Manager`.

---

## 3. Shell bersama (wireframe)

Proporsi existing dipertahankan: profil ~30% (col 4) + Hari Ini ~70% (col 8). Blok ketiga full-width hanya untuk CEO.

```
┌─ Profil Akun RSIA (~30%) ───┬─ Hari Ini RSIA (~70%) ─────────────────────┐
│ [bar Sentra / Profil Akun]  │ [bar Sentra / Hari Ini]                    │
│ foto | nama + gelar         │ banner 3 kondisi                           │
│      | jabatan              │   terkendali / perhatian / kritis          │
│ tile dinamis (maks 6)       │ tugas (hanya count > 0, maks 4)            │
│                             │ aksi cepat (persis 4 per persona)          │
│ [ Lihat Profil Lengkap ]    │ terakhir dibuka (hide jika kosong, maks 5) │
└─────────────────────────────┴────────────────────────────────────────────┘
┌─ Pandangan Direktur (hanya CEO; seluruh blok hide jika semua sinyal 0) ─┐
│ max 3 sinyal operasional (label + count + route), permission-gated       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Banner status (semua persona)

| Level | Judul | Kapan |
|---|---|---|
| `success` | Semua terkendali | Tidak ada tugas dengan `count > 0` |
| `attention` | Beberapa hal membutuhkan perhatian | Ada tugas non-critical |
| `critical` | Tindakan segera diperlukan | Ada tugas bertanda `critical: true` (saat ini: tagihan overdue, persona CEO) |

Warna status selalu disertai ikon + teks (bukan warna saja).

---

## 4. Matriks konten per persona

### 4.1 CEO (`chief`)

**Profil tiles (urut):**

| # | Tile | Sumber | Catatan |
|---|---|---|---|
| 1 | Sisa Cuti Tahunan | Leave Allocation | tetap |
| 2 | Notifikasi | link Notification Settings | tetap |
| 3 | Unit Kerja | Employee.department | tetap |
| 4 | NIK Karyawan | Employee.name | tetap |
| 5–6 | STR / SIP | Healthcare Practitioner | **hanya** jika `has_practitioner` |

**Tugas Hari Ini:**

| Label | DocType / filter | Critical |
|---|---|---|
| Pesanan Pembelian menunggu persetujuan | Purchase Order, workflow pending | tidak |
| Penerimaan & Pembayaran menunggu persetujuan | Payment Entry, workflow pending | tidak |
| Jurnal menunggu persetujuan | Journal Entry, workflow pending | tidak |
| Tagihan lewat jatuh tempo | Sales Invoice status Overdue | **ya** |

**Aksi cepat (4):** Persetujuan → Laporan Manajemen → Keuangan → Karyawan  
(route existing di `home_today.ACTIONS["chief"]`)

**Pandangan Direktur** (blok baru saat implementasi; max 3, hide jika kosong):

| Sinyal | Sumber | Syarat tampil |
|---|---|---|
| Persetujuan menunggu | jumlah PO+PE+JE pending (gated) | count > 0 |
| Tagihan overdue | Sales Invoice Overdue (gated) | count > 0 |
| STR/SIP kosong | Practitioner tanpa `str_no` atau `sip_no` (gated Healthcare Practitioner) | count > 0 |

Bukan chart. Bukan tren. Hanya sinyal operasional dengan route ke list terkait.

---

### 4.2 Staff — clinical (`clinical`)

**Profil tiles:**

| # | Tile | Sumber |
|---|---|---|
| 1 | Sisa Cuti Tahunan | Leave Allocation |
| 2 | Notifikasi | Notification Settings |
| 3 | Unit Layanan | Employee.department (label “Unit Layanan”, bukan “Unit Kerja”) |
| 4 | Jadwal Praktik Hari Ini | slot Practitioner Schedule hari ini → teks `HH:MM–HH:MM` atau “Tidak ada jadwal” |
| 5–6 | STR / SIP | Practitioner (wajib untuk persona ini bila record ada) |

**Tugas:** Appointment hari ini; Pasien menunggu (Checked In); Pemeriksaan belum selesai (Encounter draft). Filter `practitioner` jika user tertaut.

**Aksi cepat (4):** Daftarkan Pasien → Buat Appointment → Mulai Pemeriksaan → Cari Pasien

**Pandangan Direktur:** tidak ada.

---

### 4.3 Staff — HR (`hr`)

**Profil tiles:** Cuti, Notifikasi, Unit Kerja, NIK (+ STR/SIP hanya jika practitioner).

**Tugas:** Pengajuan cuti menunggu; Kehadiran hari ini belum tercatat (hanya jika `can` Employee **dan** Attendance); Permintaan ganti shift.

**Aksi cepat (4):** Data Karyawan → Ajukan Cuti → Kehadiran → Penugasan Shift

**Pandangan Direktur:** tidak ada.

---

### 4.4 Staff — finance (`finance`)

**Profil tiles:** Cuti, Notifikasi, Unit Kerja, NIK (+ STR/SIP hanya jika practitioner).

**Tugas:** Tagihan belum lunas; Pembayaran masih draft; Pesanan pembelian menunggu.

**Aksi cepat (4):** Buat Tagihan → Catat Pembayaran → Buat Pengadaan → Buku Besar

**Pandangan Direktur:** tidak ada.

---

### 4.5 Karyawan (`umum`)

**Profil tiles:** Cuti, Notifikasi, Unit Kerja, NIK. **Tanpa** STR/SIP.

**Tugas (v1):** daftar kosong → banner “Semua terkendali”.  
Tidak menambah “cuti saya menunggu” di v1 desain ini (boleh fase berikutnya).

**Aksi cepat (4):** Ajukan Cuti → Kehadiran Saya → Cari Pasien → Profil Saya

**Pandangan Direktur:** tidak ada.

---

## 5. States (semua blok Beranda)

| State | Perilaku |
|---|---|
| Loading | Skeleton ringan di dalam blok; bukan spinner full-page |
| Loaded | Data aktual dari API whitelisted |
| Empty (tugas) | Banner success; jangan empat baris nol |
| Empty (terakhir dibuka) | Seluruh kolom disembunyikan |
| Empty (Pandangan Direktur) | Seluruh blok disembunyikan |
| Error | Ganti isi `.rsia-inner` dengan copy: **Ringkasan belum dapat dimuat. Buka daftar lengkap untuk melihat data.** Tanpa traceback |

---

## 6. Kontrak API (target implementasi)

Tidak diimplementasi di fase desain ini. Target saat GO coding:

### `home_profile.my_profile` (perluas)

Tambah field:

```json
{
  "tiles": [
    {"key": "sisa_cuti", "label": "Sisa Cuti Tahunan", "value": "12 hari", "sub": "Dari 12 hari", "route": null},
    {"key": "str_no", "label": "STR", "value": "…", "editable": true}
  ]
}
```

Renderer JS membangun grid dari `tiles` (maks 6). Tombol edit hanya untuk `key` `str_no` / `sip_no`.

### `home_today.my_today` (tetap bentuknya)

```json
{
  "persona": "chief",
  "level": "attention",
  "tasks": [{"label": "…", "count": 2, "route": "/app/…", "critical": false}],
  "actions": [{"label": "…", "desc": "…", "route": "/app/…"}],
  "recent": [{"title": "…", "doctype": "…", "route": "/app/…", "when": "5 mnt lalu"}]
}
```

### `insights.my_insights` atau setara (baru, CEO)

```json
{
  "signals": [
    {"label": "Persetujuan menunggu", "count": 3, "route": "/app/purchase-order"}
  ]
}
```

Hanya di-inject ke Home jika `persona == chief` **dan** `signals` non-kosong (atau blok selalu di-setup, client hide jika kosong — pilih yang kedua agar `setup()` idempoten sederhana).

---

## 7. Out of scope (v1)

| Item | Alasan |
|---|---|
| Dual page / toggle “CEO view” | Bertentangan prinsip satu shell |
| Analytics chart, revenue, occupancy | Spec: tunda sampai transaksi aktif |
| Praktisi Bertugas dari roster | Domain Klinik, bukan Beranda |
| STR/SIP expiry date | Field belum ada |
| Playwright suite | Fase verifikasi terpisah |
| Payroll di Beranda | Modul belum siap |

---

## 8. Acceptance criteria (ketika diimplementasi)

Verifikasi sebelum menandai implementasi selesai:

1. User `System Manager` melihat persona chief: aksi CEO, tugas approval/overdue, dan blok Pandangan Direktur hanya jika ada sinyal > 0.
2. User Physician (tanpa System Manager) melihat tile Unit Layanan + Jadwal Praktik; tidak melihat Pandangan Direktur.
3. User HR User melihat tugas cuti/absensi; tile Unit Kerja + NIK (bukan Jadwal Praktik).
4. User Accounts User melihat tugas keuangan; tidak melihat agregat HR tanpa permission.
5. User Employee biasa (`umum`): 4 aksi karyawan; tugas kosong → “Semua terkendali”; tanpa STR/SIP; tanpa Pandangan Direktur.
6. Guest / tanpa permission doctype: semua `count` tugas = 0, tidak ada traceback (regresi `test_ws_permissions`).
7. Visual: proporsi 30/70 dipertahankan; dark/light tetap memakai CSS variable Desk; error copy tidak berubah.
8. `home_today.setup` / `home_profile.setup` (dan setup blok Direktur) idempoten; `workspace_nav.build` tidak menghapus custom block Home.

---

## 9. Jejak keputusan

| Tanggal | Keputusan |
|---|---|
| 2026-07-15 | Spec Beranda visual + persona aksi di `SENTRA MANTRA.md` |
| 2026-07-16 | Hardening permission Beranda (`gated_count`) |
| 2026-07-16 | Chief: satu shell + lapisan CEO; mapping CEO / Staff / Karyawan dikunci; desain dulu, kode belakangan |
