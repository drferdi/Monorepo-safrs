# Project Capsule Router

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows project-local context and never weakens root SAFRS or security controls.

## Objective and ownership

- Project: `Academic Smartboard`
- Objective: `Platform bimbingan belajar multi\-tenant: penjadwalan sesi, kurikulum, evaluasi, payroll tutor, dan agen AI Kayyisa untuk Kurikulum Merdeka\.`
- Human owner: `Chief`
- Default risk: `R1`; use root policy and sensitive-path registry for escalation.

## Owned scope

- `projects/academic/academic-smartboard/**`
- Explicitly approved shared packages only.

## Required context

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`

## Commands

Capsule standalone — semua komando dijalankan dari capsule root
(`projects/academic/academic-smartboard/`), bukan dari root Monorepo.
Kontrak lifecycle lengkap: `project.contract.json`.

- Install: `pnpm install`
- Lint: `pnpm run lint` (apps + token package)
- Typecheck: `pnpm run typecheck`
- Test: `pnpm run test` (termasuk token gate `scripts/check-tokens.mjs`)
- Build: `pnpm run build` (static export ke `apps/site/out/` dan `apps/web/out/`)
- Run: `node scripts/serve.mjs` (site 127.0.0.1:4310, web 127.0.0.1:4311)
- Deploy dry-run: `node scripts/deploy-dry-run.mjs`
- Verifikasi standalone resmi (dari root Monorepo, tree capsule harus bersih
  dari `node_modules`): `node tools/project-standalone/src/cli.mjs verify academic/academic-smartboard`

Token: source + gate di `packages/token`; apps mengonsumsi tarball ter-pin
`vendor/sentra-token-1.0.0.tgz`. Setelah mengubah token, jalankan
`pnpm run token:pack` lalu `pnpm install`. Target satu app:
`pnpm --filter @sentra/smartboard-site <cmd>` — tetap dari capsule root.
Konteks migrasi: `docs/standalone-migration.md`.

## Prohibited actions

- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- Do not bypass root verification, risk classification, or human authorization requirements.
