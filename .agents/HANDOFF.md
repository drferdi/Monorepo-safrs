Last updated: 2026-09-14 (Smartboard home surfaces: Dashboard/Pengajar/Tutorial)

## Current state

- **Sub-fase 2–4 `apps/web`:** COMPLETED.
- **Orphan home surfaces:** COMPLETED — `/dashboard` (home setelah login),
  `/pengajar` (MasterCrud tutors), `/tutorial` (teks; tanpa aset gambar arsip).
  Kayyisa chat = stub jujur; penuh di sub-fase 5.
- **Verifikasi:** unit **90 PASS**, typecheck PASS, build PASS,
  `test:build` **32 PASS**.
- **Masih terbuka:** sub-fase 5 (admin + Kayyisa chat), `apps/api`, `apps/demo`.
- **Jangan push** tanpa filtered publish + capsule gate.

## Next action

1. Chief: E2E Smartboard home (`/dashboard`) vs backend arsip per role.
2. Plan **sub-fase 5** (admin platform + Kayyisa penuh).
3. Jangan `git push origin main` tanpa BOUNDARIES filtered publish.
