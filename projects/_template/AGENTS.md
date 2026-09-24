# Project Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: `<replace-with-project-name>` (domain: `<replace-with-domain>`)
- Objective: `<replace-with-one-sentence-objective>`
- Human owner: `<replace-with-accountable-owner>`
- Default risk: `R1`; record any higher-risk local action in the capsule's applicable governance.

## Standalone contract

This capsule is an independently portable project. An enclosing repository may provide optional
AI automation and governance, but is never a capsule runtime, configuration, path, tooling, or
infrastructure dependency.

- Define executable argv commands for install, build, test, run, and deploy dry-run
  (`deployDryRun`) that work from this capsule root. Those five required stages cannot be N/A;
  only `lint` and `typecheck` may be N/A, each with a non-empty reason. Do not use shell command
  strings.
- Keep workspaces, lockfiles, packages, scripts, generated assets, and build/deploy configuration
  inside this capsule. Declare external APIs, databases, services, and pinned images here without
  embedding credentials.
- Do not depend on an enclosing workspace, catalog, lockfile, configuration, paths, scripts, tools,
  packages, monorepo-owned runtime infrastructure, or another capsule. Do not use parent-escaping
  paths or cross-capsule imports/links.
- Root-owned shared packages and the Sentra token source are transition-only inputs for legacy
  root-integrated applications. The legacy `projects/internal/golden-path` is pending planned
  capsule migration and is not a template or standalone example. New capsules must carry required
  shared code in a capsule-local package or use an independently distributable, pinned package with
  provenance and local checks; extraction must not resolve a root package or checker.
- Prove portability with both structural and empirical verification. The command slots below must
  be runnable from this capsule root or accept this capsule directory as their only input; neither
  may require an enclosing repository's files, registry, configuration, or checker.

## Owned scope

- This capsule directory and all descendants.
- Declared external dependencies and capsule-local packages only; no parent or enclosing-workspace packages.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`

## Commands

Replace these placeholders with commands that exist before activating the capsule:

- All commands are executable argv (`program` plus `args`) and run from the capsule root; do not
  document shell strings.
- `install`: `program: REPLACE_WITH_CAPSULE_INSTALL_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_INSTALL_ARGUMENTS]`
- `build`: `program: REPLACE_WITH_CAPSULE_BUILD_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_BUILD_ARGUMENTS]`
- `lint`: `program: REPLACE_WITH_CAPSULE_LINT_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_LINT_ARGUMENTS]` — or N/A with a non-empty reason
- `typecheck`: `program: REPLACE_WITH_CAPSULE_TYPECHECK_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_TYPECHECK_ARGUMENTS]` — or N/A with a non-empty reason
- `test`: `program: REPLACE_WITH_CAPSULE_TEST_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_TEST_ARGUMENTS]`
- `run`: `program: REPLACE_WITH_CAPSULE_RUN_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_RUN_ARGUMENTS]`
- `deployDryRun`: `program: REPLACE_WITH_CAPSULE_DEPLOY_DRY_RUN_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_DEPLOY_DRY_RUN_ARGUMENTS]`
- Structural independence verification: `program: REPLACE_WITH_CAPSULE_STRUCTURAL_VERIFIER`; `args: [REPLACE_WITH_CAPSULE_STRUCTURAL_VERIFIER_ARGUMENTS]`
- Empirical extraction verification: `program: REPLACE_WITH_CAPSULE_EMPIRICAL_VERIFIER`; `args: [CAPSULE_DIRECTORY, REPLACE_WITH_CAPSULE_EMPIRICAL_VERIFIER_ARGUMENTS]`

## Prohibited actions

- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- When nested in a governed repository, follow its contribution review and authorization rules;
  never make this capsule's lifecycle or standalone proof depend on those repository controls.
