---
name: prisma-migration
description: Create a safe Prisma schema change and migration for the SAFRS monorepo, following the @safrs/database conventions (UUID PKs, @@map, @db.Timestamptz(3), cascade deletes) and never weakening the reset-guard.
disable-model-invocation: true
---

# Prisma Migration

Add or change Prisma models in `packages/database/prisma/schema.prisma` and produce a reviewed, tested migration.

## Conventions (from `@safrs/database`)

- Primary keys: `String @id @default(uuid()) @db.Uuid`
- Table names snake_case via `@@map("...")`; column names via `@map("...")`
- Timestamps: `@default(now()) @map("created_at") @db.Timestamptz(3)`
- Child relations use `onDelete: Cascade`; index child FKs with `@@index([fk])`
- Treat `strategy`: only `postgresql`; never change provider

## Workflow

1. Document the intent and risk tier (R1 by default; schema change = R2, requires Chief review).
2. Edit `packages/database/prisma/schema.prisma`.
3. Generate the client: `pnpm db:generate`.
4. Create the migration: `pnpm db:migrate -- --name <migration_name>` (throws if the reset-guard rejects a non-disposable DB).
5. Validate the diff with the skill-local checker (see below).
6. Add or update an integration test in `packages/database/src/*.integration.test.ts` covering the new model.
7. Seed data if a demo record is expected (`packages/database/src/seed.ts`).
8. Verify: `pnpm --filter @safrs/database test && pnpm --filter @safrs/database typecheck`.

## Guardrails

- Never weaken `reset-guard` (`packages/database/src/reset-guard.ts`) or make a reset target anything but `_local`/`_test` on 127.0.0.1:54329.
- Never run `pnpm db:reset` against anything but a disposable local DB.
- Do not hand-edit generated migration SQL unless you also explain why in the PR.

Run `node .cline/skills/prisma-migration/scripts/validate-migration.mjs <migration_dir>` to check the produced SQL against these conventions.