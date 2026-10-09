# UNICOM Capsule Router

## Objective and ownership

- Project: UNICOM (domain: internal)
- Objective: provide the legacy multi-agent communication room as a standalone Next.js capsule.
- Human owner: Gaffer
- Default risk: R1. Provider credentials, production platform adapters, and persistent-state changes require separate authorization.

## Standalone contract

All lifecycle commands execute from this directory and never require parent repository paths, root workspaces, or another capsule. The capsule owns its manifest, lockfile, build configuration, source, tests, and verification scripts.

| Stage | Program | Arguments |
| --- | --- | --- |
| install | `pnpm` | `install --frozen-lockfile` |
| lint | `pnpm` | `run lint` |
| typecheck | `pnpm` | `run typecheck` |
| test | `pnpm` | `run test` |
| build | `pnpm` | `run build` |
| run | `pnpm` | `run start` |
| deployDryRun | `pnpm` | `run deploy:dry-run` |

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`

## Boundaries

- Keep provider credentials outside the repository. The migrated source does not read environment variables itself.
- Do not add parent-path imports, `workspace:*` dependencies, or cross-capsule links.
- Do not alter the legacy product scope by adding platform adapters, persistent storage, or provider-specific behavior during this migration.
- `scripts/verify-structure.mjs` and `scripts/verify-extraction.mjs` are part of the capsule proof and must remain local.
