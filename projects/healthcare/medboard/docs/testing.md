# Testing

All commands run from this capsule root with the pinned pnpm wrapper
(`node scripts/pnpm.mjs …`), as declared in `project.contract.json`.

## Capsule gate

| Purpose | Command |
| --- | --- |
| Full capsule test gate | `node scripts/pnpm.mjs run test:capsule` |
| Typecheck (the `lint` script runs `tsc --noEmit`) | `node scripts/pnpm.mjs run lint` |
| Production build | `node scripts/pnpm.mjs run build` |
| Deploy dry run (no side effects) | `node scripts/pnpm.mjs run deploy:dry-run` |

`test:capsule` runs, in order:

1. `test` — `scripts/test-suite.ts`, which runs the unit and route tests it lists.
2. `test:cdss:engine` — CDSS engine checks.
3. `test:news2` — NEWS2 early-warning scoring.
4. `test:symphony:safety-gates` — clinical safety gates.

## Focused suites

- `test:auth-hardening` — authentication hardening.
- `test:cdss` / `test:cdss:protected` — CDSS behaviour.
- `test:screening-audit` — screening audit service (`node --test`).
- `security:baseline` — auth hardening plus protected CDSS tests.
- `security:audit`, `security:secret-scan`, `security:catch-scan`, `security:semgrep` — security checks.

## Conventions

- Tests are offline and deterministic; use synthetic clinical data only.
- New behaviour gets a co-located `*.test.ts`, registered in `scripts/test-suite.ts`.
- Logic that decides clinical outcomes (CDSS, NEWS2, safety gates) is R3 under the healthcare
  domain rules: its focused suite must pass before review.
