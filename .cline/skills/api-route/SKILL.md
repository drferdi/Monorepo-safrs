---
name: api-route
description: Add a new typed Hono RPC route in the SAFRS golden-path pattern — Zod schema in @safrs/schemas, inline Hono handler with @hono/zod-validator in packages/api/src/app.ts, typed client export, and contract test.
---

# API Route

Add a new typed API endpoint following the reusable `@safrs/api` pattern.

## Golden-path pattern (from `packages/api`)

1. **Schema** — define the input/output contract in a domain file under `packages/schemas/src/` (e.g. `demo.ts`) and re-export it from `packages/schemas/src/index.ts` (Zod).
2. **Route** — add an inline handler in the chained `createRoutes()` builder in `packages/api/src/app.ts`, using `zValidator("json", MySchema, ...)` and the shared `validationError`/`internalError` helpers from `./error.ts`.
3. **Client** — the typed RPC client is exported from `packages/api/src/client.ts` via `hc<AppType>()`; no per-route work needed there.
4. **Test** — add a unit test covering happy path + validation error + error envelope (see `packages/api/src/app.test.ts`).

## Workflow

1. Confirm the boundary: server-only logic stays in `packages/api`; never import `@safrs/database` or `@safrs/env/server` into browser components.
2. Extend a domain schema file under `packages/schemas/src/` and re-export from `index.ts`.
3. Add the route inline in `createRoutes()` in `app.ts`.
4. Write the test covering valid + invalid input and the error envelope.
5. Verify: `pnpm --filter @safrs/api test && pnpm --filter @safrs/api typecheck && pnpm lint`.

## Guardrails

- Preserve the existing error envelope (`error.ts`) — do not invent a new error shape.
- Keep schemas the single source of truth; the client type must be inferred (`hc<AppType>()`), never hand-written.
- R2 boundary: changes to `packages/api` or `packages/schemas` require Chief review.

Use `scripts/scaffold-route.sh <route_name>` as a starting sketch (adapt it into the `createRoutes()` chain).