# Desain ulang MedBoard mengikuti Glass Health

Tanggal: 2026-10-06 · Status: menunggu review Chief · Risiko: R2 (tampilan); logika klinis R3 tidak disentuh

## 1. Tujuan

MedBoard (dashboard web medboard.sentrahai.com) memakai bahasa visual Glass Health: bersih, lapang,
jarak yang baik, satu tema putih. Warna aksen milik Sentra: Biru Oxford dan Merah-oranye.
Asisten Medis (ekstensi) tidak termasuk.

Berhasil bila: semua 23 halaman tampil putih, sederhana, dengan huruf IBM Plex Sans dan skala 2026 di §3, kerangka aplikasi
memakai rel ikon kiri dan header tipis, setiap halaman mengikuti salah satu dari enam pola di §5,
dan tidak ada perilaku klinis atau alur data yang berubah.

## 2. Keputusan Chief (sesi 2026-10-06)

| Topik | Keputusan |
|---|---|
| Cakupan | MedBoard saja |
| Kedalaman | Kulit dan tata letak sekaligus, semua halaman |
| Warna | Latar putih; aksen utama Biru Oxford, aksen kedua Merah-oranye |
| Teks, jarak, dll. | Ikuti Glass Health |
| Mode gelap | Dihapus; satu tema putih |
| Merah-oranye vs kritis | Merah-oranye = aksen kedua; kritis tetap merah tua + kata status |
| Pendekatan | Token → komponen dasar → kerangka → halaman satu per satu |
| Font | ~~Inter~~ → **IBM Plex Sans** (`@fontsource-variable/ibm-plex-sans`, paket lama yang dipulihkan), keputusan Chief 2026-10-06 sore |
| Kesan | "Simplified": tiap halaman dipelajari satu per satu, hiasan dibuang, isi dan alur tetap (Chief 2026-10-06 sore) |
| Ukuran teks dan jarak | Ukuran mengikuti praktik aplikasi web 2026 (dasar 14 px, minimum 12 px); jarak lega (Chief 2026-10-06 sore) |

Sumber pengamatan: salinan aplikasi Glass Health di `D:\DEV\gafferverse\prototype\Glass\glass.health`
(CSS `index-W48QqGoJ.css` dan 8 video tutorial). Yang ditiru hanya bahasa visual (warna, jarak,
bentuk, tata letak); kode, logo, gambar dan teks Glass tidak disalin.

## 3. Fondasi visual (token di `src/app/globals.css`)

### Warna

| Token baru | Nilai | Peran |
|---|---|---|
| `--surface` | `#FFFFFF` | latar halaman, kartu, dialog |
| `--surface-subtle` | `#F8FAFC` | rel navigasi, kepala panel, hover baris |
| `--border` | `#E2E8F0` | tepi kartu, pemisah, input |
| `--text` | `#0F172A` | judul dan isi |
| `--text-secondary` | `#64748B` | label, waktu, keterangan |
| `--primary` / `--primary-hover` / `--primary-tint` | `#002147` / `#0B3266` / `#E8EDF5` | tombol utama, chip/tab aktif, fokus, tautan |
| `--accent` / `--accent-tint` | `#E8461E` / `#FDECE7` | badge, aksi khusus, angka sorotan |
| `--critical` / `--critical-tint` | `#B42318` / `#FEF3F2` | peringatan klinis bahaya |
| `--warning` / `--warning-tint` | `#B54708` / `#FFFAEB` | waspada |
| `--success` / `--success-tint` | `#067647` / `#ECFDF3` | aman / siap |

`#E8461E` dengan teks putih berkontras sekitar 4,6:1 (WCAG AA). Status selalu disertai kata
(KRITIS, WASPADA, AMAN), tidak pernah warna saja.

### Huruf

- IBM Plex Sans Variable untuk semua teks; tidak ada monospace (keputusan 2026-03-06 tetap). Angka klinis
  memakai `font-variant-numeric: tabular-nums`.
- Skala aplikasi web 2026: `--text-xs` 12, `--text-sm` 14, `--text-base` 16, `--text-lg` 18,
  `--text-xl` 20, `--text-2xl` 24, `--text-3xl` 30 px. Isi aplikasi 14 px, teks baca panjang 16 px,
  tidak ada teks di bawah 12 px. Tinggi baris: isi 1,6; judul 1,3. Tebal 400 / 500 / 600.
  Judul halaman 24 px/600; judul kartu 16 px/600; label 12–14 px/500, huruf biasa (bukan kapital),
  tanpa jarak huruf lebar.

### Jarak, bentuk, bayangan

- Jarak kelipatan 4 px memakai token yang sudah ada: `--gap-xs` 4, `--gap-sm` 8, `--gap-md` 12,
  `--gap-lg` 16, `--gap-xl` 24, `--gap-2xl` 32. Jarak lega: area isi 32 px (16 px di bawah 768 px),
  isi kartu 24 px, jarak antar kartu 24 px, jarak antar bagian halaman 32 px.
- Sudut: `--radius-sm` 6 px (input, tombol), `--radius-md` 8 px (kartu), `--radius-lg` 12 px
  (panel), `--radius-xl` 16 px (dialog), pil 9999 px (chip).
- Bayangan: kartu `0 1px 2px rgba(15,23,42,.05)`; dialog `0 8px 24px rgba(15,23,42,.08)`.
- Tinggi kontrol: 32 / 36 / 44 px.

### Token lama

Nama lama tetap ada sebagai alias ke token baru selama migrasi, supaya 2.509 gaya inline langsung
ikut berubah: `--bg-canvas`, `--bg-card`, `--bg-nav` → `--surface`/`--surface-subtle`;
`--text-main` → `--text`; `--text-muted` → `--text-secondary`; `--line-base` → `--border`;
`--c-asesmen`, `--c-cdss` → `--primary`; `--c-critical` → `--critical`; `--c-warning` → `--warning`;
`--c-ok` → `--success`; `--font-mono` → font sans. Halaman yang dibangun ulang memakai nama baru.
Alias yang tidak lagi dipakai dihapus di langkah terakhir.

Blok `[data-theme="dark"]`, `[data-theme="light"]`, `ThemeProvider` dan tombol tema dihapus;
`<html>` tidak lagi membawa `data-theme`.

### Peringatan klinis

Garis kiri 2 px warna status + kata status; latar boleh tint lembut (`--*-tint`), tidak pernah blok
warna penuh, gradasi, denyut atau emoji (aturan 2026-10-05 tetap).

## 4. Kerangka aplikasi

- **Rel kiri** (`AppNav`): bawaan 56 px ikon saja (`lucide-react`) dengan tooltip; bisa dilebarkan
  ke 240 px dengan label. Ctrl+B dan kunci `localStorage` `puskesmas:nav-collapsed` tetap. Menu aktif
  = kotak `--primary` dengan ikon putih. Kelompok dengan pemisah tipis:
  - Klinis: EMR Console, Telemedicine, Consult Audrey, Smart ICD-10, SenCall, Critical Mind
  - Tim: Sentra HUB, Sentra Network, Team Chat
  - Laporan: Report, Intelligence Monitor, Audit Log, Admin
  Hak tampil tiap menu mengikuti perilaku sekarang.
- **Header** 56 px: logo + "MedBoard" di tengah; kanan: tanggal hari ini dan avatar inisial yang
  membuka menu (nama, profesi, Profil User, Keluar + pesan error logout).
- **Footer** satu baris tengah, 12 px `--text-secondary`: Legal · Disclaimer AI · © tahun Sentra
  Healthcare Solutions.
- **Area isi**: padding 32 px (16 px di bawah 768 px). Kepala halaman = judul 24 px + keterangan
  14 px; tombol aksi halaman di kanan.

## 5. Komponen dasar dan pola halaman

Komponen di `src/components/ui/`: Button (primary, secondary, accent, ghost), Chip (aksi dan filter,
pil), Card, Tabs, Input/Search, Dialog, StatusBadge, List (baris bergaris tipis), EmptyState.
Tiap komponen satu file kecil, gaya dari token, tanpa logika domain.

| Pola | Bentuk | Halaman |
|---|---|---|
| Ruang kerja terbelah | kiri kolom kerja, kanan panel bertab | `/emr`, `/telemedicine/[id]` |
| Percakapan | kolom tengah ±760 px, input besar, chip aksi di bawah | `/voice`, `/chat`, `/critical-mind` |
| Daftar | kepala + pencarian + chip filter + daftar bergaris | `/acars`, `/hub`, `/admin`, `/audit/logbook`, `/report`, `/icdx`, `/calculator`, `/calculator/[slug]`, `/telemedicine`, `/pasien` |
| Detail | nama kiri atas, aksi kanan atas, isi dalam kartu | `/`, `/hub/[username]`, `/hub/lab/[username]`, `/acars/[username]`, `/audit/logbook/[eventId]`, `/dashboard/intelligence` |
| Formulir tengah | kartu dialog 16 px di tengah | `CrewAccessGate` (Masuk, Daftar Akses), `/join/[token]` |
| Dokumen | kolom baca | `/legal`, `/report/clinical` (ukuran cetak tetap, keputusan `e836d56e`) |

### Aturan "Simplified" untuk setiap halaman (Chief 2026-10-06 sore)

Tiap halaman dipelajari sendiri (di Browser pane dan di kode), lalu disederhanakan dengan aturan
yang sama:

1. **Satu kepala halaman**: judul 24 px/600, satu baris keterangan 14 px `--text-secondary`, aksi
   di kanan. Baris status/teknis (mis. status mesin) menjadi satu baris meta 12 px yang tenang.
2. **Bagian = kartu**: putih, tepi 1 px `--border`, sudut 12 px (panel) / 8 px (kartu), isi 24 px,
   jarak antar kartu 24 px, antar bagian 32 px. Judul kartu 16 px/600, huruf biasa.
3. **Hiasan dibuang**: garis timeline dan titik-titiknya, label "Row n /" dan nomor urut "01.",
   garis pemisah dekoratif, gradasi, glow, bayangan neumorfik, grid latar, animasi orbit/denyut,
   blok hitam. Penanda yang bermakna (status, wajib isi, peringatan) tetap.
4. **Isian bergaris bawah** (Chief 2026-10-06, menggantikan "isian kotak"): input, select dan
   textarea memakai `.ui-input` atau blok isian bersama di `globals.css` — tanpa kotak, garis bawah
   tipis `--border`; saat fokus garis Oxford 2 px memanjang mulus dari kiri (220 ms ease-out, mati
   bila reduced motion). Tinggi 36–40 px, teks 14 px; tidak ada placeholder raksasa. Label di atas
   isian 13–14 px/500.
9. **Focus mode** (progressive disclosure) pada formulir panjang: kartu yang sedang diisi tetap
   terang, kartu di bawahnya meredup ke 40 % dan menerang saat di-hover; sorotan pindah mengikuti
   kartu yang diisi (`src/app/emr/focus-spotlight.ts`). Dipakai di EMR; formulir panjang lain boleh
   memakainya.
5. **Tombol dan chip**: utama = isi Oxford; kedua = putih bertepi; pilihan (mis. Laki-laki /
   Perempuan) = chip pil; tidak ada tombol hitam.
6. **Status**: tint lembut + kata status + garis kiri 2 px untuk peringatan; tidak ada blok warna
   penuh.
7. **Yang tidak berubah**: handler, state, kondisi tampil, urutan isian, perhitungan, panggilan
   API, data, dan teks isi (kecuali nomor/label hiasan pada butir 3). `src/lib/**` tidak disentuh.
8. Setiap halaman ditunjukkan ke Chief di Browser pane; EMR disetujui Chief sebelum di-commit.

### EMR Console

- Bar konteks pasien menjadi baris tipis di atas (gaya "Jane Doe · Encounter 1").
- Kiri: tab peran yang ada → kartu bertumpuk (keluhan, tanda vital, pemeriksaan, diagnosis,
  tatalaksana).
- Kanan: panel bertab — MIRA DDx, Ringkasan klinis, Riwayat.
- Banner Emergency Override tetap paling menonjol (garis kiri `--critical`, kata KRITIS).
- Isi, urutan isian, perhitungan, handler dan panggilan API tidak berubah. File tidak dipecah atau
  di-refactor di luar keperluan tata letak.

## 6. Urutan pengerjaan

1. Token, font Inter, hapus tema gelap.
2. Komponen dasar `src/components/ui/`.
3. Kerangka: rel, header, footer.
4. Formulir tengah: login dan Daftar Akses, `/join/[token]`.
5. EMR Console (Chief menyetujui di Browser pane sebelum commit).
6. ACARS, lalu HUB.
7. Telemedicine (daftar dan ruang).
8. Halaman lainnya per pola.
9. Hapus alias token yang tidak terpakai; catat di DECISIONS.

Setiap langkah = satu atau beberapa commit R2 yang bisa dicek sendiri.

## 7. Verifikasi

- Tiap langkah: `pnpm run lint` (tsc), `pnpm run test:capsule`, `pnpm run build`,
  `pnpm run deploy:dry-run` hijau.
- Browser pane (server demo lokal): halaman yang diubah dibuka, console tanpa error, hasil
  ditunjukkan ke Chief.
- Test baru, merah dulu:
  - satu tema: tidak ada `data-theme` di `globals.css` maupun `layout.tsx`, tidak ada `ThemeProvider`;
  - warna lama (`#E67E22`, `#121214`, `#F0E8DC`) dan "IBM Plex" tidak ada di `src/app/**` dan
    `src/components/**` (tanpa `src/lib/report/**` dan template email);
  - komponen peringatan kritis selalu merender kata statusnya.

## 8. Batas dan di luar cakupan

- Tidak disentuh: `src/lib/cdss/**` (R3), `src/lib/emr/**`, rute API, Prisma, auth, presence,
  Socket.IO, isi laporan PDF.
- Asisten Medis, email template, dan halaman cetak di luar ukurannya tidak termasuk.
- Deploy ke produksi menunggu persetujuan Chief (R3), memakai runbook §2.
- Keputusan 2026-10-05 "IBM Plex Sans pada skala Carbon" digantikan; dicatat di DECISIONS saat
  langkah 1 di-commit.

## 9. Risiko

- `/emr/page.tsx` 9.607 baris: perubahan tata letak bisa mengganggu alur isian. Mitigasi: hanya
  ubah wadah dan gaya, cek di Browser pane per tab peran, Chief menyetujui sebelum commit.
- Ukuran 11 px di bawah batas 12 px sebelumnya: hanya untuk keterangan sekunder, tidak untuk angka
  klinis atau label status.
- Pengguna yang memilih mode gelap akan melihat tema putih setelah rilis.
