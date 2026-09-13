Last updated: 2026-09-13 (Smartboard web sub-fase 2 CLOSED)

## Current state

- **Sub-fase 2 `apps/web`:** COMPLETED (port + Task 16 docs/verify). Plan di
  `docs/plans/completed/2026-08-22-smartboard-web-subphase2-akademik.md`.
  Roadmap baris 2 COMPLETED.
- **Commits lokal (belum push):** `fa5dcdb`, `d1f4c97`, `791f02d`, `cedf8a1`.
- **Verifikasi capsule:** unit **59 PASS**, typecheck PASS, build PASS,
  `test:build` **12 PASS**. Grep keamanan: bersih; `process.env` hanya
  `NEXT_PUBLIC_BACKEND_URL` + `NEXT_PUBLIC_DEV_TENANT_SLUG`.
- **Smartboard produk tetap BELUM complete:** sub-fase 3–5 web, `apps/api`,
  `apps/demo`, orphan Dashboard/Pengajar/Tutorial.
- Local `main` vs `origin/main` unrelated setelah rewrite; **jangan push**
  tanpa filtered publish + capsule gate.
- Working tree bisa kotor di path **luar** smartboard — jangan campur commit.

## Next action

1. Chief: E2E manual vs backend FastAPI arsip (login → jadwal → sesi → eval →
   perkembangan → trio kurikulum); uji negatif role `murid_ortu`.
2. Tulis/eksekusi plan **sub-fase 3** (payroll + finance), atau isolation
   install ulang di `%TEMP%` bila ingin bukti install-from-copy.
3. Jangan `git push origin main` tanpa BOUNDARIES filtered publish.
