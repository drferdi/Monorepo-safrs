# Project Capsule Router — Kediri History

## Operator & Jev

- Address the human owner as **Gaffer** (or **Doc**); chat in Bahasa Indonesia mixed with English (~70:30).
- Inside the Sentra monorepo, the root `AGENTS.md` also applies and wins on conflict.
- Jev: if the `jev_route` tool is available, call it before the first web search, spawning a subagent, retrying a failed approach, any approval-needing action, or choosing between materially different routes, and state `Jev: <action> (<reason>)`. If it is not available, continue normally. Jev is never a build, test, or runtime dependency.

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows project-local context and never weakens root SAFRS or security controls.

## Objective and ownership

- Project: `kediri-history`
- Objective: Kediri — A Living Civilization; cinematic web history experience for Pemerintah Kota Kediri.
- Human owner: Gaffer (dr. Ferdi Iskandar)
- Default risk: `R2`; production publish and credential use are R3.

## Owned scope

- `projects/product/kediri-history/**`
- Application code lives under `apps/` (not the placeholder `src/` path).

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

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
