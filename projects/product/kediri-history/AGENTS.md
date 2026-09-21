# Project Capsule Router — Kediri History

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows project-local context and never weakens root SAFRS or security controls.

## Objective and ownership

- Project: `kediri-history`
- Objective: Kediri — A Living Civilization; cinematic web history experience for Pemerintah Kota Kediri.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2`; production publish and credential use are R3.

## Owned scope

- `projects/product/kediri-history/**`
- Application code lives under `apps/` (not the placeholder `src/` path).

## Required context

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`
5. `project.contract.json`

## Commands

Run from this capsule root. Lifecycle argv is declared in `project.contract.json`.

- Install / lint / typecheck / test / build / run / deploy dry-run: see `project.contract.json`
- Standalone verify (from Monorepo root, clean of `node_modules`):  
  `node tools/project-standalone/src/cli.mjs verify product/kediri-history`

## Prohibited actions

- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- Do not bypass root verification, risk classification, or human authorization requirements.
