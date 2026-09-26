# Referralink (MEDLINK) — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: Referralink, published as MEDLINK (package `medlink`, domain: `healthcare`)
- Objective: Public sandbox dashboard for differential-diagnosis exploration, ICD-10 mapping,
  and referral considerations on synthetic data only.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2`. The diagnosis flow (`api/diagnosis.ts`, `api/_services/diagnosis*`) is
  clinical-support logic; treat changes to it as R3 and ask Chief first.

## Standalone contract

This capsule owns its runtime: its own pnpm workspace, lockfile, scripts, and build
configuration. It never depends on an enclosing workspace, catalog, lockfile, configuration,
script, tool, package, or another capsule. External services are declared in
`project.contract.json` by environment-variable name only.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`
5. `docs/ENVIRONMENT_VARIABLES.md`

## Commands

All commands run from this capsule root as argv; see `project.contract.json`.

- `install`: `node scripts/pnpm.mjs install --frozen-lockfile`
- `lint`: N/A (the `lint` script is the TypeScript check)
- `typecheck`: `node scripts/pnpm.mjs run lint` (`tsc --noEmit`)
- `test`: `node scripts/pnpm.mjs run test` (node:test through tsx, `scripts/run-tests.mjs`)
- `build`: `node scripts/pnpm.mjs run build`
- `run`: `node scripts/pnpm.mjs run start` (Vite preview on 127.0.0.1:4342)
- `deployDryRun`: `node scripts/pnpm.mjs run deploy:dry-run`
- Browser acceptance (needs Playwright browsers): `node scripts/pnpm.mjs run test:browser`

## Scope rules

- Do not add clinical, patient, EMR, or PHI flows into the public sandbox.
- Prefer the smallest reversible change.
- Protected auth surface, which requires Chief's explicit approval before any change:
  the `App.tsx` session gate (`sessionState`, `getSandboxSession`), `vite-pages/Login.tsx`,
  `src/login.scss`, and `tests/browser/medlink.acceptance.spec.ts`. "Dead code" removal does
  not apply to these files even if the gate calling them looks unreachable; that
  unreachability is itself the incident to report, not to fix by deletion.
- Never expose auth, Redis, email, or model-provider secrets through `VITE_*` variables.

## Prohibited actions

- Do not use production credentials or production data.
- Do not modify other capsules or shared packages without recording scope expansion.
