# Project Capsule Router

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows project-local context and never weakens root SAFRS or security controls.

## Objective and ownership

- Project: `<replace-with-project-name>` (domain: `<replace-with-domain>`)
- Objective: `<replace-with-one-sentence-objective>`
- Human owner: `<replace-with-accountable-owner>`
- Default risk: `R1`; use root policy and sensitive-path registry for escalation.

## Standalone contract

This capsule is an independently portable project. The repository root is an optional AI
automation/control plane, never a capsule runtime, configuration, path, tooling, or
infrastructure dependency.

- Define install, build, lint, type-check, test, run, and deploy commands that work from this
  capsule root. Mark a genuinely inapplicable stage with a reason.
- Keep workspaces, lockfiles, packages, scripts, generated assets, and build/deploy configuration
  inside this capsule. Declare external APIs, databases, services, and pinned images here without
  embedding credentials.
- Do not depend on the root workspace, catalog, lockfile, configuration, paths, scripts, tools,
  packages, monorepo-owned runtime infrastructure, or another capsule. Do not use parent-escaping
  paths or cross-capsule imports/links.
- Prove portability with both structural checks and empirical extraction. Copy only this capsule to
  a fresh directory, then run applicable lifecycle and smoke commands from inside the extracted
  capsule; root orchestration is not proof.

## Owned scope

- `projects/<replace-with-domain>/<replace-with-project-name>/**`
- Declared external dependencies and capsule-local packages only; no root workspace packages.

## Required context

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`

## Commands

Replace these placeholders with commands that exist before activating the capsule:

- Install: `<command-or-not-applicable-with-reason>`
- Build: `<command-or-not-applicable-with-reason>`
- Lint: `<command-or-not-applicable-with-reason>`
- Type check: `<command-or-not-applicable-with-reason>`
- Test: `<command-or-not-applicable-with-reason>`
- Run: `<command-or-not-applicable-with-reason>`
- Deploy: `<command-or-not-applicable-with-reason>`

## Prohibited actions

- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- Do not bypass root verification, risk classification, or human authorization requirements.
