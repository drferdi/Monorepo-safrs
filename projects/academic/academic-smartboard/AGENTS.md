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

Replace these placeholders with commands that exist before activating the capsule:

- Lint (site): `pnpm --filter @sentra/smartboard-site lint`
- Typecheck (site): `pnpm --filter @sentra/smartboard-site typecheck`
- Test (site): `pnpm --filter @sentra/smartboard-site test`
- Build (site): `pnpm --filter @sentra/smartboard-site build` (static export ke `apps/site/out/`)
- Lint (web): `pnpm --filter @sentra/smartboard-web lint`
- Typecheck (web): `pnpm --filter @sentra/smartboard-web typecheck`
- Test (web): `pnpm --filter @sentra/smartboard-web test`
- Build (web): `pnpm --filter @sentra/smartboard-web build` (static export ke `apps/web/out/`)

## Prohibited actions

- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- Do not bypass root verification, risk classification, or human authorization requirements.
