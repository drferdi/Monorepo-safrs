# Database (`@safrs/database`)

## Purpose

The single database boundary: Prisma 7 + PostgreSQL with a generated client, a hardened **reset guard**, and a deterministic local seed. It is the only place `DATABASE_URL` is turned into a live client, and it is the only package allowed to touch the Prisma schema and migrations.

Because the database is a shared boundary, migrations and schema changes are R2; production data and destructive production operations are R3 and may only be *prepared* until the Chief explicitly authorizes execution (`packages/database/AGENTS.md`).

## Key source files

| File | Purpose |
| --- | --- |
| `packages/database/prisma/schema.prisma` | Data model (`Demo`, `TransactionSample`) |
| `packages/database/prisma.config.ts` | Prisma config: schema path, migrations dir, seed command |
| `packages/database/src/client.ts` | Prisma client singleton over `@prisma/adapter-pg`, connection pool from `serverEnv.DATABASE_URL` |
| `packages/database/src/index.ts` | Barrel: `database` + `assertDisposableDatabase` |
| `packages/database/src/reset-guard.ts` | Destructive-operation guard (see below) |
| `packages/database/src/local-tooling.ts` | Resolves a local disposable `DATABASE_URL` for local tooling, falling back to `.env` / `.env.example` |
| `packages/database/src/seed.ts` | Idempotent seed of one demo + one transaction sample |
| `packages/database/scripts/run-local-prisma.mjs` | Runs Prisma CLI with local-tooling URL resolution |

## Data model

`packages/database/prisma/schema.prisma` uses the `prisma-client` generator (`engineType = "client"`, ESM output into `src/generated/prisma`) and a PostgreSQL datasource:

- **`Demo`** — `id` (uuid PK), `name`, `createdAt` (timestamptz, default now). Maps to table `demos`.
- **`TransactionSample`** — `id` (BigInt identity), `demoId` (uuid FK to `Demo`, `onDelete: Cascade`), `amount` (`Decimal(14,2)`), `currency` (`Char(3)`), `occurredAt`, `createdAt`. Indexed on `demoId`. Maps to table `transaction_samples`.

## The reset guard

`packages/database/src/reset-guard.ts` is the enforcement point for destructive operations. `assertDisposableDatabase(connectionUrl)` rejects a connection unless **every** condition holds:

- protocol is `postgresql:`
- a password is present
- host is `127.0.0.1` or `localhost`
- port is `54329`
- exactly one path segment, ending in `_local` or `_test`
- no query string

`assertDisposableTestDatabase` additionally requires the `_test` suffix. `pnpm db:reset` refuses anything else, so a production or remote `DATABASE_URL` can never be reset by mistake. The guard is shared with `tools/doctor` and `packages/database/src/local-tooling.ts`.

## Seed

`packages/database/src/seed.ts` runs idempotent upserts for one demo (`Sentra Demo`) and one `TransactionSample` (125000.00 IDR), then resynchronizes the `transaction_samples` sequence. It requires `DATABASE_URL` and is wired into `prisma.config.ts` (`node --experimental-strip-types src/seed.ts`).

## Integration points

- **`@safrs/api`** defaults its `DemoStore` to the live `database` client (`packages/api/src/app.ts`).
- **`@safrs/web`** consumes `@safrs/database` on the server; Prisma and `DATABASE_URL` never reach the browser.
- **`tools/doctor`** runs the same `assertDisposableDatabase` check against the local `.env` to report environment safety.
- **Local PostgreSQL** runs in Docker Compose on `localhost:54329`; see `compose.yaml` and `pnpm db:start`.

## Commands

From repository root:

```bash
pnpm db:generate      # generate Prisma client
pnpm db:migrate       # apply migrations
pnpm db:seed          # seed local data
pnpm db:studio        # Prisma Studio
pnpm db:reset         # local reset (guard enforced; requires explicit reset authorization)
pnpm --filter @safrs/database test
```

## Related pages

- [API](api.md) — the consumer of the demo store
- [Environment](env.md) — validated `DATABASE_URL`
- [Doctor tool](../tools/doctor.md) — local database diagnostics
- [Shared packages](index.md)
