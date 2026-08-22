# ADR 0004 — Sentra Bot Public Release Capsule and Port Strategy

- Status: Proposed pending designated R2 review
- Date: 2026-08-21
- Deciders: Chief
- Plan: `.kilo/plans/1787244628478-sentrabot-public-release-migration.md`

## Context

Sentra Bot must become an official Monorepo project without changing Monorepo topology, workspace patterns, shared package principles, or governance controls. The requested source snapshot is a separate repository commit and must be imported as a verified whitelist rather than by grafting history or copying runtime state.

## Decision

1. Place the product in one capsule at `projects/product/sentrabot/` with web, worker, sandbox supervisor, and desktop app boundaries.
2. Re-express source contracts and infrastructure through existing Monorepo boundaries; do not create nested packages, lockfiles, workspaces, Turbo, or Biome configuration.
3. Keep the worker control plane private and authenticated; public web requests use typed contracts.
4. Release public source and a closed-signup self-hosted beta before any signed desktop or hosted production release.
5. Use per-user BYOK/OAuth by default. Hosted deployment-level credentials and public signup are not enabled by this migration.
6. Preserve Rakazo attribution only in legal/provenance records and reject live legacy identifiers elsewhere.

## Consequences

The migration is staged and reviewable. Database, auth, dependency, sandbox, release, and shared-boundary changes require designated review. The pinned source object must be restored before completeness or parity can be claimed.

## Rejected alternatives

- Lift-and-shift source repository structure: rejected because it would duplicate the Monorepo toolchain and bypass existing controls.
- Silent substitution of source `HEAD` for `d17a138`: rejected because it invalidates the completeness gate.
- Hosted production during this migration: rejected because it is an R3 action requiring a separate authorization gate.
