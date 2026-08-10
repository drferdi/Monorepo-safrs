# Typed API boundary

Read the root [AGENTS.md](../../AGENTS.md), [SAFRS_SPEC.md](../../SAFRS_SPEC.md), and [SECURITY.md](../../SECURITY.md) first. They are canonical.

## Scope

Own `packages/api/**`: Hono routes, typed client exports, validation/error envelopes, and API tests. Zod schemas belong in `@safrs/schemas`; database access belongs in `@safrs/database`.

## Rules and commands

Do not expose stacks, database URLs, or server secrets. Preserve the correlation-ID error envelope and inferred client contract. Shared API, schema, dependency, migration, or verification-control changes are R2; authentication, payment, healthcare-critical, or production-execution work is R3.

Run `pnpm --filter @safrs/api test` and `pnpm --filter @safrs/api typecheck` from the repository root.
