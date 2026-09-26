# Pelaporan RSIA — RACI divisi (desk)

**Status:** Wired — workspace `/app/pelaporan`  
**Tanggal:** 2026-07-23  
**App:** `sentra_mantra_indonesia` (`ws_pelaporan.py`)

**Layout:** sama bahasa visual Profil (`/me` · Profil Akun) — header serif,
kicker, grid label/nilai netral, daftar referensi. **Tanpa kartu berwarna.**

## Purpose

Peta tanggung jawab laporan eksternal RSIA. Bukan form input klinis / RME.
Pengerjaan dibagi per divisi; pengesahan akhir = Direktur Utama.

## Divisions

| # | Unit | Fokus laporan | PJ |
|---|---|---|---|
| 01 | RM & SIMRS | SIRS RL 1–5, morbiditas/mortalitas, 10 besar, bridging | Kepala RM & Tim IT/SIMRS |
| 02 | Mutu / PPI / KP | INM, IKP, infeksi | Ketua Komite Mutu & PPI |
| 03 | Medis / Kep / Keb | AMPSR, NICU, bedah, SHK, KBPP | Spesialis, Bidan Koord., Kasi |
| 04 | Farmasi | SIPNAP, rantai dingin vaksin | Apoteker PJ |
| 05 | Sanitasi / K3RS | Limbah B3, SIMPEL KLHK | Sanitarian / Tim K3RS |
| 06 | SDM / HRD | Ketenagaan RL 2 | Kabag HRD |

**PJ akhir:** Direktur Utama RSIA → Kemenkes, Dinkes, BKKBN, DLH, BPJS.

## Setup

```bash
bench --site mantra.localhost execute sentra_mantra_indonesia.ws_pelaporan.setup
```

## Update 2026-07-26

Register di atas sekarang **hidup** sebagai DocType `Sentra Report Card`
(satu row per keluarga laporan, dengan aturan satu-versi-aktif per grup) dan
workflow `Sentra Report Cycle` ("Sentra Pelaporan Cycle", 10 state). Terpasang
di `/app/pelaporan` lewat blok desk **"Laporan Saya"** (queue role-scoped untuk
4 role Pelaporan Penyusun/Validator/Penyetuju/Pengirim), berdampingan dengan
RACI di atas. Seed awal 11 keluarga laporan, semua status `Perlu Verifikasi`
(fail-closed — belum ada yang `Aktif` sampai diverifikasi manual terhadap
portal resmi/Dinkes). Detail verifikasi:
`docs/progress/2026-07-26-pusat-pelaporan-mvp.md`.
