# RS Management Desk Wave 1 — Copy & Zones

**Status:** Copy SSOT (+ Wave 1.5 polish)  
**Tanggal:** 2026-07-23  
**Sumber rencana:** [`docs/superpowers/plans/2026-07-23-rs-management-desk-wave1.md`](../superpowers/plans/2026-07-23-rs-management-desk-wave1.md)

Dokumen ini mengunci string copy Desk agar permukaan manajemen RS terbaca jelas (bukan RME). Implementasi mengacu string di bawah apa adanya.

**Product:** MANTRA = manajemen RS, bukan RME.

## Zones on Pasien & Klinik

| Block | Zone tag | Meaning |
| --- | --- | --- |
| Manajemen RSIA | Pelaporan · via RME | Agregat FHIR + check-in staf; menunggu RME sync |

**Layout:** Hanya **Manajemen RSIA** di konten. Blok `Klinik Hari Ini RSIA` + extract RME dikeluarkan dari konten (`clinic_workspace.apply`) — kode blok tetap ada, tidak dihapus dari Custom HTML Block.

## Klinik — Operasi lokal

- **Status konten:** disembunyikan dari workspace Pasien & Klinik (arahan Chief 2026-07-23).

## Manajemen — Pelaporan

- **Note:** Zona pelaporan (via RME → SATUSEHAT) — bukan antrean real-time lantai klinik.
- **Kartu check-in (lokal):** `On Duty Staff` / `Late Staff` (Employee Checkin; late = first IN setelah start shift + grace, fallback 08:00).
- **Kartu volume SATUSEHAT:** dilepas (tren tetap di chart Volume).
- **Snapshot:** `Pasien Tercatat` / `Encounter Tercatat` + subtitle `Snapshot SATUSEHAT`.
- **ALOS:** label `ALOS (hari)`; tidak pernah menampilkan Pasien Inap Aktif.
- **Chart groups:** Volume · Pola · Produktivitas (judul chart pendek + caption).

## Chief Home signals (max 6)

Order (skip if count 0 or no permission):

1. Persetujuan menunggu (existing)
2. Tagihan overdue (existing)
3. Cuti menunggu
4. Kehadiran belum lengkap (active employees − attendance today, floor 0)
5. Tiket Helpdesk terbuka (DocType `HD Ticket` if installed + permitted)
6. Kelengkapan SATUSEHAT `%` (via get_attr reporting_quality; omit if None)

## Shortcut order Pasien & Klinik

Pelayanan: Appointment → Pasien → (Encounter last in row)  
Tenaga: Unit Pelayanan → Jadwal → Tenaga Kesehatan
