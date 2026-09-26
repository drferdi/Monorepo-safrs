# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-27 — Autocomplete tests send a clinician session

- The three "Autocomplete klinis" tests failed with 401, not with a wrong chain:
  `/api/cdss/autocomplete` requires a crew session (`isCrewAuthorizedRequest`) and the tests sent
  none. With a DOKTER session the route returns the chains the tests claim (Nyeri Pinggang with
  CVA Test; Nyeri Punggung), so only the request header changed, no assertion.
- Every failing test in `scripts/test-cdss.ts` now sets exit code 1 (27/27 pass).

## 2026-09-27 — CDSS diagnosis access comes from the clinical role only

- Decision (Chief, option A): `POST /api/cdss/diagnose` and
  `POST /api/clinical/differential/evaluate` admit a session only when its role is clinical
  (`DOKTER`, `DOKTER_GIGI`, `PERAWAT`, `BIDAN`, `APOTEKER`, `TRIAGE_OFFICER`). The profession no
  longer grants access.
- Rationale: every profession in `CREW_ACCESS_PROFESSIONS` is clinical and a missing profession
  defaults to `Bidan`, so the old "role or profession" rule let ADMIN, CEO, and ADMINISTRATOR
  sessions run diagnoses. The behaviour was inherited unchanged from legacy.
- Evidence: `scripts/test-cdss.ts` "Auth CDSS diagnose" tests (ADMIN/CEO/ADMINISTRATOR with a
  clinical profession get 403; DOKTER_GIGI and TRIAGE_OFFICER get 200) and the differential test
  in `src/app/api/clinical/anamnesis/extract/route.test.ts` failed before the change and pass
  after it. A failing `Auth ` test now sets exit code 1.

## 2026-09-27 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/medboard` was copied as it is
  to `projects/healthcare/medboard`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `CLAUDE.md`, `.env*` files other than `.env.example`,
  `node_modules/`, `.next/`, `runtime/consult-accepted.jsonl`.
- Toolchain: fresh pnpm 11.21.0 lockfile with `nodeLinker: hoisted`, Node 24. `next` raised to
  16.3.6; overrides `postcss >=8.5.23`, `sharp >=0.35.4`, `deepmerge-ts >=8.0.1`, and
  `effect >=3.20.0` clear the `pnpm audit` findings. `scripts/prisma-generate.mjs` replaces a
  `node -e` one-liner in `postinstall`.
- `test` is `test:capsule`: the main suite plus `test:cdss:engine`, `test:news2`, and
  `test:symphony:safety-gates`. `run` is `start:local` on 127.0.0.1:4344 without a database
  or migrations.
- `docs/TESTING.md` was renamed to `docs/testing.md` (the layout the repository checks).
- Known test gaps are left as they were in legacy on Chief's instruction (2026-09-27: "biarkan
  dulu, buat catatan"); see `docs/testing.md` "Known gaps" and `HANDOFF.md`.
