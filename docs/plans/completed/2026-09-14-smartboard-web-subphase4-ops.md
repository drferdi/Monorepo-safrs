# Smartboard `apps/web` Sub-fase 4: Komunikasi + Operasional + Master sisa

- **Status:** COMPLETED — 2026-09-14 (migrasi dari arsip; verifikasi capsule hijau).
- **Owner:** Chief
- **Roadmap:** `docs/plans/active/2026-08-21-smartboard-web-roadmap.md` (baris 4/5)
- **Sumber:** arsip `frontend/src/pages/` — aktivasi, pengumuman, komunikasi, tasks, laporan, master CRUD, jurnal di PerkembanganMurid

## Scope (migrasi, bukan invent)

| Route / permukaan target | Arsip |
| --- | --- |
| `/aktivasi-tutor`, `/aktivasi-owner` | TutorActivation, OwnerActivation (token di URL hash) |
| `/pengumuman` | Pengumuman |
| `/komunikasi` | Komunikasi |
| `/tasks` | Tasks |
| `/laporan` | Laporan |
| `/master/{tim,orang-tua,sekolah,mata-pelajaran,jenjang,tahun-ajaran}` | Master sisa (+ MasterCrud shared) |
| Perkembangan › Jurnal Kolaboratif | JournalEntry di dalam PerkembanganMurid |

**Carve-out:** board TIM penuh / framer-motion parity — tabel + CRUD dulu; polish visual bukan blocker S4. Kayyisa tetap sub-fase 5.

## Verifikasi (2026-09-14)

- unit + typecheck PASS; build PASS; `test:build` mencakup rute S4
- Nav: Utama, Master Data diperluas, Operasional (+ Percakapan), Pengajar (+ Task), Laporan
- Backend tetap FastAPI arsip via `NEXT_PUBLIC_BACKEND_URL`
