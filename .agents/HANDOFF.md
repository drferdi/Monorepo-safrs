Last updated: 2026-09-14 (Smartboard web sub-fase 3 payroll CLOSED)

## Current state

- **Sub-fase 2–3 `apps/web`:** COMPLETED (migrasi dari arsip).
  - Plan S2: `docs/plans/completed/2026-08-22-smartboard-web-subphase2-akademik.md`
  - Plan S3: `docs/plans/completed/2026-09-14-smartboard-web-subphase3-payroll.md`
- **Routes baru:** `/keuangan/honor|payroll|pembayaran|tarif`, `/lembur`
- **Verifikasi capsule:** unit **71 PASS**, typecheck PASS, build PASS,
  `test:build` **17 PASS**.
- **Smartboard produk tetap BELUM complete:** sub-fase 4–5 web, `apps/api`,
  `apps/demo`, orphan Dashboard/Pengajar/Tutorial.
- **Jangan push** tanpa filtered publish + capsule gate.

## Next action

1. Chief: E2E manual vs backend arsip (honor → payroll generate/lock →
   pembayaran → tarif → lembur approve).
2. Tulis/eksekusi plan **sub-fase 4** (komunikasi + operasional + sisa master).
3. Jangan `git push origin main` tanpa BOUNDARIES filtered publish.
