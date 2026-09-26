# Jadwal Shift VK+RA & Piket OK — Juli 2026 (foto dari Chief, 17 Jul)

Sumber: dua foto lembar cetak (jadwal 31 hari). **BUKAN transkripsi
sel-per-sel** — lembar VK+RA memuat koreksi tulisan tangan (tinta merah)
yang tidak bisa dibaca pasti dari foto; entry ke sistem menunggu FILE
SUMBER (xlsx) dari Chief. Dokumen ini merekam struktur, legenda, dan
keputusan yang dibutuhkan.

## Lembar 1 — RUANG VK+RA (15 petugas, per inisial)

| No | Inisial | Rank |
|---|---|---|
| 1 | LAI | Senior A |
| 2 | NOV | Senior A |
| 3 | CEN | Senior B |
| 4 | LUF | Senior B |
| 5 | IIN | Senior B |
| 6 | ROS | Senior B |
| 7 | NUN | Madya |
| 8 | DEI | Madya |
| 9 | RIZ | Junior |
| 10 | SEL | Junior |
| 11 | OSI | Junior |
| 12 | ANO | Junior |
| 13 | LIN | Junior |
| 14 | DIN | Junior |
| 15 | SITI | Magang |

**Legenda:** P=Pagi, S=Siang, M=Malam, L=Libur, X=Belum aktif.
**Kuota libur / 28 hari:** Senior Chief=13, Senior=12, Madya=11,
Junior=9–10, Siti (magang)=6.
**Aturan posisi:** sel KUNING = Jaga Belakang (rank 1–13); sel POLOS =
Jaga Depan (VK), rank 12–15 WAJIB tandem dengan rank 1–11.

## Lembar 2 — Piket Ruang OK (Juli 2026)

Petugas: **ANGGI, JIHAN, NOVI.** Kode terlihat: `24`, `L`,
`S/O`, `S/24`, `P/24`, `P` — pola rotasi ±4 harian; NOVI dominan `24`
dengan blok `L` berkala. (Tabel kedua di lembar yang sama kosong.)

## Blocker sebelum entry ke sistem (butuh Chief)

1. **File sumber xlsx** kedua jadwal — foto tidak cukup akurat untuk
   entry (koreksi tangan merah di banyak sel VK+RA).
2. **Mapping inisial → Employee** (LAI, NOV, CEN, … dan ANGGI/JIHAN/NOVI
   → NIK/nama lengkap). SITI (magang) — apakah sudah ada record Employee?
3. ~~Definisi jam shift P/S/M~~ ✅ Chief 17 Jul: P 07:00–14:00 → lanjut
   shift 2 dan 3 bersambung. Sudah sesuai Shift Type existing (hr_setup.py):
   Shift Pagi 07–14, Shift Sore 14–21 (=S/Siang), Shift Malam 21–07.
   MASIH TERBUKA: arti kode piket OK (`24` = jaga 24 jam?, `S/O` =
   standby/on-call?, `P/24`, `S/24`) — belum ada Shift Type padanannya.
4. **Keputusan metode absensi** (sudah di daftar tunggu) — menentukan
   apakah jadwal ini masuk sebagai Shift Assignment HRMS per hari.

## Rencana implementasi (setelah blocker terjawab)

- Shift Type HRMS: Pagi/Siang/Malam (+ tipe piket OK) dengan jam resmi.
- Import idempoten (gelombang Cursor): baris = Employee × tanggal × shift,
  dry-run dulu, tanpa menyalin data ke log.
- Panel "Praktisi Bertugas" (klinik) tetap membaca Practitioner Schedule
  DOKTER — jadwal bidan/OK ini surface-nya SDM (shift), bukan panel itu.
  ✅ Jadwal dokter MASUK 17 Jul (flyer resmi): dr. Dibya (OBGYN
  Sen/Kam/Jum 18:30–20:00 + Minggu private 09:00–16:00) dan dr. Hidayati
  Utami Dewi, Sp.A (Rab/Jum 18:00–20:00; record praktisi BARU dibuat dari
  flyer — STR/Employee/user belum tertaut, lengkapi menyusul). Source of
  truth: sentra_mantra_indonesia/praktik_dokter.py. Durasi appointment
  default 15 menit — konfirmasi Chief bila beda.
