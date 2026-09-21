# Environment (`@safrs/env`)

> **Scope.** Root env contract for golden-path and other root-workspace apps. Control Center explicitly does **not** import `@safrs/env/server`. Sovereign capsules validate env locally. Do not treat this package as the repo-wide env schema.

## Purpose

Runtime environment validation built on `@t3-oss/env-*` plus Zod. Split into server and client halves so browser bundles never see server-only variables (`DATABASE_URL`, Stripe secrets). Invalid values throw at process start.

## Key source files

| File | Purpose |
| --- | --- |
| `packages/env/src/server.ts` | Server-side schema and `serverEnv` singleton (`createServerEnv`) |
| `packages/env/src/client.ts` | Client-safe schema and `clientEnv` singleton (`createClientEnv`) |
| `packages/env/package.json` | Exports `./client` and `./server` subpaths; no workspace deps |

## What is validated

**Server** (`packages/env/src/server.ts`):

- `DATABASE_URL` — must be a URL (required).
- `NODE_ENV` — one of `development | test | production`.
- `APP_URL` — must be a URL.
- `STRIPE_SECRET_KEY` — optional, but when present must start with `sk_`.
- `STRIPE_WEBHOOK_SECRET` — optional, but when present must start with `whsec_`.

The Stripe keys are optional so the baseline builds without credentials; the prefix checks catch swapped or truncated values early. `onValidationError` fails fast with a sorted, comma-separated list of the offending variable names.

**Client** (`packages/env/src/client.ts`):

- `NEXT_PUBLIC_APP_URL` — optional URL.

Both use `emptyStringAsUndefined: true` so empty strings never masquerade as real values.

## Usage

```ts
import { serverEnv } from "@safrs/env/server";
import { clientEnv } from "@safrs/env/client";

const url = serverEnv.DATABASE_URL;
```

The `createServerEnv` / `createClientEnv` factories accept an explicit environment object, which makes the package trivially testable without mutating `process.env`.

## Integration points

- **`@safrs/database`** consumes `serverEnv.DATABASE_URL` to build its Prisma client (`packages/database/src/client.ts`).
- **`@safrs/web`** (golden-path) validates its own environment through the same factories.
- **`tools/doctor`** mirrors the server schema for its diagnostics: it reads `DATABASE_URL`, `APP_URL`, and `NODE_ENV` from `.env` and checks them against the disposable-database guard (`tools/doctor/src/checks.mjs`).

## Verification

```bash
pnpm --filter @safrs/env lint
pnpm --filter @safrs/env typecheck
pnpm --filter @safrs/env test
```

## Related pages

- [Database](database.md) — consumes `serverEnv.DATABASE_URL`
- [Doctor tool](../tools/doctor.md) — environment diagnostics
- [Shared packages](index.md)
