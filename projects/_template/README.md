# `<project-name>`

Status: TEMPLATE — not an active product.

## Objective

`<Describe the real user or business outcome.>`

## Boundaries

- In scope: `<owned capabilities and paths>`
- Out of scope: `<explicit non-goals>`
- Human owner: `<accountable owner>`

## Interfaces

- Consumes: `<declared packages/services or none>`
- Exposes: `<declared APIs/events/artifacts or none>`

## Standalone contract

This capsule owns its portable runtime. The repository root may orchestrate discovery and
verification, but is never required at runtime, for configuration, paths, tooling, or
infrastructure.

- Allowed: capsule-local workspaces, lockfiles, packages, scripts, generated assets, build/deploy
  configuration, and declared external APIs/databases/services or pinned images.
- Forbidden: enclosing-workspace/catalog/lockfile/configuration/scripts/tools/packages,
  parent-escaping paths, cross-capsule imports or links, and monorepo-owned runtime infrastructure.
- Every active capsule must provide executable argv commands for install, build, test, run, and
  deploy dry-run (`deployDryRun`). The five required stages cannot be N/A. Only lint and typecheck
  may be N/A, each with a non-empty reason. Lifecycle commands must work independently from the
  capsule root; never document shell strings.
- Shared code must remain capsule-local or be consumed from an independently distributable, pinned
  package with provenance and local checks. An enclosing repository's package is not a standalone
  dependency.
- Root-owned shared packages and the Sentra token source are transition-only inputs for legacy
  root-integrated applications. The legacy `projects/internal/golden-path` is pending planned
  capsule migration and is not a template or standalone example. Extraction must not resolve a
  root package or checker.

## Command slots

Replace each placeholder with an executable argv command owned by this capsule and run it from the
capsule root. Required stages must have a non-empty `program` and may not be marked N/A:

- `install`: `program: REPLACE_WITH_CAPSULE_INSTALL_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_INSTALL_ARGUMENTS]`
- `build`: `program: REPLACE_WITH_CAPSULE_BUILD_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_BUILD_ARGUMENTS]`
- `lint`: `program: REPLACE_WITH_CAPSULE_LINT_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_LINT_ARGUMENTS]` — or N/A with a non-empty reason
- `typecheck`: `program: REPLACE_WITH_CAPSULE_TYPECHECK_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_TYPECHECK_ARGUMENTS]` — or N/A with a non-empty reason
- `test`: `program: REPLACE_WITH_CAPSULE_TEST_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_TEST_ARGUMENTS]`
- `run`: `program: REPLACE_WITH_CAPSULE_RUN_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_RUN_ARGUMENTS]`
- `deployDryRun`: `program: REPLACE_WITH_CAPSULE_DEPLOY_DRY_RUN_PROGRAM`; `args: [REPLACE_WITH_CAPSULE_DEPLOY_DRY_RUN_ARGUMENTS]`

## Local verification

Replace the placeholders with commands that exist and have been run from the capsule root:

- Structural independence verification: REPLACE_WITH_CAPSULE_STRUCTURAL_VERIFIER, run from this capsule root
- Empirical extraction verification: REPLACE_WITH_CAPSULE_EMPIRICAL_VERIFIER, run from this capsule root or against CAPSULE_DIRECTORY

Both checks must use only the capsule and declared external dependencies; neither may invoke parent
paths, root registries, or the root verifier. When nested in a governed repository, contribution
governance may run separately; it is not required for the capsule lifecycle or standalone proof.
