# Capsule sovereignty

**Canonical:** `docs/governance/CAPSULE_SOVEREIGNTY.md`, ADR 0006.

A capsule is sovereign only if its normal software lifecycle succeeds **without access to the Monorepo root**.

## Required local ownership

Dependency manifest and lockfile, toolchain versions, compiler/lint/test/build config, environment contract, first-party packages, database schema/migrations when applicable, containers, deployment definition, smoke tests, lifecycle commands.

## Forbidden root coupling

Parent-path escapes, `workspace:*` resolving to root packages, root-only catalogs or lockfiles, root build wrappers as the only build path, root `.env`, root database package, root Docker build context, root-only generated source, direct imports from another capsule.

A root convenience wrapper is acceptable only when the project exposes an equivalent local command.

## Shared first-party code classes

| Class | Where it belongs |
| --- | --- |
| A. Project-specific | Inside the owning capsule |
| B. Generic reusable | Versioned/pinned dependency, not a live root source link |
| C. SAFRS control-plane | Stays at root; must not be a project runtime dep |
| D. Generated snapshot | Root may sync; capsule must work when sync is unavailable |

## Proof

1. Structural: `tools/safrs/check_project_independence.py`
2. Empirical: `pnpm project:verify <domain/capsule>` copies the capsule out and runs declared commands

`STANDALONE = TRUE` only if both halves pass.

## Related

- [Projects](../projects/index.md)
- [Standalone verification](../verification/standalone.md)
