# SideLab — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: Sentra SideLab (domain: `healthcare`)
- Objective: research-prototype clinical decision support for FKTP physicians: a Python engine
  (`sidelab-engine/`), a web dashboard and API (`artifacts/`), shared libraries (`lib/`), and a
  desktop shell (`electron-app/`). The physician stays the final clinical authority.
- Human owner: Gaffer (dr. Ferdi Iskandar)
- Default risk: `R2`. Clinical reasoning in `sidelab-engine/sidelab/` and its safety tests in
  `sidelab-engine/tests/clinical/` are R3: get Gaffer's approval before changing them.
- Language: Bahasa Indonesia for Gaffer-facing notes; English for code.

## Standalone contract

This capsule owns its runtime: its own pnpm workspace (`pnpm-workspace.yaml`), lockfile, and
scripts, plus a Python virtual environment in `sidelab-engine/.venv` created by `install`. It
never depends on an enclosing workspace, catalog, lockfile, configuration, script, tool,
package, or another capsule. External services are declared in `project.contract.json` by name
only.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`
5. `sidelab-engine/README.md` before touching the engine

## Commands

All commands run from this capsule root as argv; see `project.contract.json`.

- `install`: `node scripts/install.mjs` (pnpm frozen install, then the engine venv)
- `typecheck`: `node scripts/pnpm.mjs run typecheck`
- `test`: `node scripts/pnpm.mjs run test` (full engine pytest suite with its coverage gate)
- `build`: `node scripts/with-local-env.mjs run build`
- `run`: `node scripts/with-local-env.mjs run start:local` (dashboard preview on 127.0.0.1:4345)
- `deployDryRun`: `node scripts/pnpm.mjs run deploy:dry-run`
- Fast clinical safety check: `sidelab-engine/.venv/Scripts/python.exe run_safety_tests.py`
  from `sidelab-engine/` (use `.venv/bin/python` outside Windows).

## Prohibited actions

- Never put patient data or secrets into fixtures, tests, sessions, or commits.
- Do not use production credentials or production data; `live` and `performance` tests need
  real model credentials and are never run by the lifecycle.
- Do not modify other capsules or shared packages without recording scope expansion.
