Last updated: 2026-09-14 (Smartboard web sub-fase 4 ops CLOSED)

## Current state

- **Sub-fase 2–4 `apps/web`:** COMPLETED (migrasi dari arsip).
  - Plan S2: `docs/plans/completed/2026-08-22-smartboard-web-subphase2-akademik.md`
  - Plan S3: `docs/plans/completed/2026-09-14-smartboard-web-subphase3-payroll.md`
  - Plan S4: `docs/plans/completed/2026-09-14-smartboard-web-subphase4-ops.md`
- **Routes baru S4:** `/pengumuman`, `/komunikasi`, `/tasks`, `/laporan`,
  `/aktivasi-tutor|owner`, `/master/{tim,orang-tua,sekolah,mata-pelajaran,jenjang,tahun-ajaran}`,
  jurnal kolaboratif di perkembangan detail.
- **Verifikasi capsule (S4):** unit **84 PASS**, typecheck PASS, build PASS,
  `test:build` **29 PASS**.
- **Smartboard produk tetap BELUM complete:** sub-fase 5 web (admin + Kayyisa),
  `apps/api`, `apps/demo`, orphan Dashboard/Pengajar/Tutorial.
- **Jangan push** tanpa filtered publish + capsule gate.

## Next action

1. Chief: E2E manual vs backend arsip (aktivasi hash → master CRUD →
   pengumuman/komunikasi/tasks/laporan → jurnal di perkembangan).
2. Tulis/eksekusi plan **sub-fase 5** (admin platform + Kayyisa).
3. Jangan `git push origin main` tanpa BOUNDARIES filtered publish.
