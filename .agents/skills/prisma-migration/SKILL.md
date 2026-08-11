---
name: prisma-migration
description: Create or review a safe Prisma migration in packages/database using repository wrappers, local reset guards, SQL validation, and R2 review.
---

# Safe Prisma migration

Read root `AGENTS.md`, `SECURITY.md`, and `packages/database/AGENTS.md`. Database schema
and migration changes are R2 and require designated review.

## Conventions

- PostgreSQL only.
- IDs: `String @id @default(uuid()) @db.Uuid`.
- Map tables/columns to snake_case with `@@map` and `@map`.
- Timestamps: `@default(now()) @db.Timestamptz(3)`.
- Child relations use `onDelete: Cascade` and indexed foreign keys.

## Workflow

1. State intent, affected data, rollback posture, and R2 classification.
2. Edit `packages/database/prisma/schema.prisma`.
3. Run `pnpm db:generate`.
4. Run `pnpm db:migrate -- --name add_demo_records` only against the disposable local DB, replacing `add_demo_records` with the requested snake_case migration name.
5. Run `node .agents/skills/prisma-migration/scripts/validate-migration.mjs packages/database/prisma/migrations/20260811000000_add_demo_records`, replacing the example path with the newly generated migration directory.
6. Add or update a database integration test and seed data only when required.
7. Run `pnpm --filter @safrs/database test` and `pnpm --filter @safrs/database typecheck`.

Never print `DATABASE_URL`, bypass `run-local-prisma.mjs`, weaken the reset guard, run a
production migration, or hand-edit generated SQL without documenting the reason.
