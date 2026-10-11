# MedBoard — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: MedBoard, formerly IntelligenceBoard (package `@the-abyss/medboard`, domain:
  `healthcare`)
- Objective: Next.js clinical intelligence dashboard: CDSS, trajectory and momentum engine,
  NEWS2 early warning, and clinical safety gates.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2`. Clinical logic in `src/lib/cdss/**` is R3: get Chief's approval before
  changing it. Auth, database schema, and migrations always need approval.
- Language: Bahasa Indonesia for Chief-facing notes; English for code.

## Standalone contract

This capsule owns its runtime: its own pnpm workspace, lockfile, scripts, Prisma schema, and
Next.js configuration. It never depends on an enclosing workspace, catalog, lockfile,
configuration, script, tool, package, or another capsule. External services are declared in
`project.contract.json` by name only.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md` (routes to `ARCHITECTURE.md`)
3. `docs/data.md`
4. `docs/testing.md`
5. `docs/CLINICAL_LOGIC.md` and `docs/AI_GOVERNANCE.md` before touching clinical logic

## Commands

All commands run from this capsule root as argv; see `project.contract.json`.

- `install`: `node scripts/pnpm.mjs install --frozen-lockfile`
- `typecheck`: `node scripts/pnpm.mjs run lint` (the `lint` script is `tsc --noEmit`)
- `test`: `node scripts/pnpm.mjs run test:capsule` (main suite plus the CDSS engine, NEWS2, and
  Symphony safety-gate suites)
- `build`: `node scripts/pnpm.mjs run build`
- `run`: `node scripts/pnpm.mjs run start:local` (port 4344 on 127.0.0.1; no database, no
  migrations)
- `deployDryRun`: `node scripts/pnpm.mjs run deploy:dry-run`

## Domain rules

- CDSS output must be deterministic, auditable, and traceable to clinical criteria; the
  physician stays the final clinical authority.
- Never run Prisma migrations against a real database from this capsule's lifecycle.
- Trajectory and CDSS types are consumed by other healthcare capsules; coordinate breaking
  changes.

## Prohibited actions

- Never put patient data or secrets into fixtures, tests, or commits.
- Do not use production credentials or production data.
- Do not modify other capsules or shared packages without recording scope expansion.
