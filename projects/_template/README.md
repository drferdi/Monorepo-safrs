# `<project-name>`

Status: TEMPLATE — not an active product.

## Objective

`<Describe the real user or business outcome.>`

## Boundaries

- In scope: `<owned capabilities and paths>`
- Out of scope: `<explicit non-goals>`
- Human owner: `<accountable owner>`

## Interfaces

- Consumes: `<declared capsule-local packages or external services, or none>`
- Exposes: `<declared APIs/events/artifacts or none>`

## Standalone contract

This capsule owns its portable runtime. The repository root may orchestrate discovery and
verification, but is never required at runtime, for configuration, paths, tooling, or
infrastructure.

- Allowed: capsule-local workspaces, lockfiles, packages, scripts, generated assets, build/deploy
  configuration, and declared external APIs/databases/services or pinned images.
- Forbidden: root workspace/catalog/lockfile/configuration/scripts/tools/packages, parent-escaping
  paths, cross-capsule imports or links, and monorepo-owned runtime infrastructure.
- Lifecycle commands must work independently from the capsule root. Standalone proof requires both
  structural checks and empirical extraction of only this capsule into a fresh directory, with
  lifecycle and smoke commands run from inside the extracted capsule.

## Local verification

Document only commands that exist and have been run from the capsule root. Include install, build,
test, run, and deploy (plus applicable lint and type-check) evidence. Root verification remains
mandatory for repository governance, but it is not a capsule runtime requirement.
