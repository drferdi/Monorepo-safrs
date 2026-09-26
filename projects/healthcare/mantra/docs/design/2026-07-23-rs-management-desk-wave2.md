# RS Management Desk Wave 2 — SDM / Keuangan / Pengaturan / Profil

**Status:** Wired on site via `ws_*.setup`  
**Tanggal:** 2026-07-23  
**Product:** MANTRA = manajemen RS, bukan RME. Gate GL Tahap 2 tetap tertutup.

## Surfaces

| Workspace / page | Block / endpoint | Enhance |
| --- | --- | --- |
| SDM | `SDM Hari Ini RSIA` | Layout hero rasio+meter, chip absen/cuti, panel zona (alert/board/people); data: rasio, shift/unit, cuti overlap, STR/SIP+IHS, direktori |
| Keuangan | `Keuangan Hari Ini RSIA` | Pipeline PO→PE→JE + umur hari, AR aging buckets (0–30/31–60/61–90/>90), aging penjamin, net cash 7h, draft menumpuk; **tanpa GL** |
| Manajemen | `Manajemen RSIA` | BOR % + terisi/kosong dari HSU lokal; panel BOR per unit; check-in On Duty/Late; SATUSEHAT pelaporan |
| Pengaturan | `Cockpit Admin RSIA` | mute_emails, gate GL, SATUSEHAT cfg, Insights view, HD per queue, persona map, Wiki SOP links |
| `/app/profil-karyawan` | `profil_karyawan.data` + `search_directory` | shift, sisa cuti, jobdesk, jadwal praktik, cari per unit |
| `/me` | `www/me.py` | pintasan persona hr/finance/chief/clinical |
| Pasien & Klinik | `Manajemen RSIA` | roster dokter = semua praktisi Active (cache IHS dibersihkan di setup) |

## Setup

```bash
bench --site mantra.localhost execute sentra_mantra_indonesia.ws_sdm.setup
bench --site mantra.localhost execute sentra_mantra_indonesia.ws_keuangan.setup
bench --site mantra.localhost execute sentra_mantra_indonesia.ws_pengaturan.setup
bench --site mantra.localhost execute sentra_mantra_indonesia.ws_manajemen.setup
bench --site mantra.localhost execute sentra_mantra_indonesia.praktik_dokter.sync
```

## Out of scope (butuh GO / data Chief)

- Buka gate GL / kartu saldo
- Wiki page content authoring (hanya tautan)
- Insights SQL view baru non-PHI (pakai `v_mantra_wave1_ops_agg` health check)
- NIK dokter untuk binding IHS sisa
