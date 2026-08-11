---
name: create-migration
description: Creates or applies a Prisma migration safely under the @safrs/database boundary with SAFRS R2 review and reset-guard rules. Use when adding schema fields, writing migrations, or running local database migrate/seed/reset workflows.
disable-model-invocation: true
---

# Create / apply Prisma migration (user-only)

Migrations and database schema changes are **R2**. Destructive reset is local-only and
may require explicit Chief authorization. Never bypass the reset guard. Never print
or commit `DATABASE_URL`.

## Before changing schema

1. Read `packages/database/AGENTS.md`, root `AGENTS.md`, and `SECURITY.md`.
2. Confirm scope is `packages/database/**` (or explicitly granted).
3. Confirm the target DB is the local/isolated test database from `.env.example` patterns — not production.
4. Prefer Plan Mode; classify as R2 before mutating.

## Safe sequence (local)

```bash
pnpm db:generate
# Edit packages/database Prisma schema as needed
pnpm db:migrate
pnpm db:seed
pnpm --filter @safrs/database test
```

## Reset (blocked by default for agents)

```bash
pnpm db:reset
```

Only after Chief explicitly authorizes. Reset remains local-only; the repository reset
guard must reject remote URLs.

## Prohibited

- `prisma migrate reset` improvisation outside documented scripts
- Printing connection strings or committing `.env`
- Mixing migration/control changes with unrelated feature code without noting integrity review
- Weakening tests or guards to force green

## Afterward

Run governance/verify for the change set and update `.agents/HANDOFF.md`.
