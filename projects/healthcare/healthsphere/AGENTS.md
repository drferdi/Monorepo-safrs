# HealthSphere — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: HealthSphere (domain: `healthcare`), formerly Primary Healthcare
- Objective: Public website of UPTD Puskesmas PONED Balowerti Kediri (`website/`) plus the
  master reference datasets for primary care (`database/`).
- Human owner: Gaffer (dr. Ferdi Iskandar)
- Default risk: `R1`. Destructive changes to `database/` datasets are R2 and need Gaffer's
  approval, because other tools consume their diagnosis codes.

## Standalone contract

This capsule owns its runtime: the website's own pnpm workspace and lockfile in `website/`,
the wrapper `scripts/pnpm.mjs`, and its build configuration. It never depends on an enclosing
workspace, catalog, lockfile, configuration, script, tool, package, or another capsule.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md` and `database/PROJECT_CONTEXT.md`
4. `docs/testing.md`
5. `website/AGENTS.md` for website-only work

## Commands

All commands run from this capsule root as argv; see `project.contract.json`.

- `install`: `node scripts/pnpm.mjs --dir website install --frozen-lockfile`
- `lint`: `node scripts/pnpm.mjs --dir website run lint`
- `typecheck`: `node scripts/pnpm.mjs --dir website run typecheck`
- `test`: `node scripts/pnpm.mjs --dir website run test --run`
- `build`: `node scripts/pnpm.mjs --dir website run build`
- `run`: `node scripts/pnpm.mjs --dir website run start` (127.0.0.1:4343)
- `deployDryRun`: `node scripts/deploy-dry-run.mjs`

## Rules

- No patient data or secrets in content or commits.
- Do not delete or change established ICD-10 codes without a sound medical basis; warn Gaffer
  when changing an established diagnosis code.
- Keep the dataset JSON valid; `icd10.json` is the primary reference when sources conflict.
- The website is a public information site, not a clinical engine.

## Prohibited actions

- Do not use production credentials or production data.
- Do not modify other capsules or shared packages without recording scope expansion.
