# Local database boundary

Read the root [AGENTS.md](../../AGENTS.md), [SAFRS_SPEC.md](../../SAFRS_SPEC.md), and [SECURITY.md](../../SECURITY.md) first. They are canonical.

## Scope

Own `packages/database/**`: Prisma schema, migrations, generated-client configuration, local seed data, and destructive-operation guards. Only the declared local or isolated test databases are allowed for development verification.

## Safety and commands

Migrations and database changes are R2. Production data, destructive production operations, and safety-critical data flows are R3: prepare evidence only until Chief explicitly authorizes execution. Never print or commit `DATABASE_URL`; never bypass the reset guard.

From repository root run `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, and `pnpm --filter @safrs/database test`. `pnpm db:reset` requires the repository's explicit reset authorization and remains local-only.
