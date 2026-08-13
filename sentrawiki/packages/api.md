# API (`@safrs/api`)

## Purpose

The single typed HTTP boundary of the monorepo. `@safrs/api` owns the Hono application mounted by the golden-path web app under `/api`, the typed RPC client (`hc` from `hono/client`), the error envelope, and a schema-driven OpenAPI endpoint. It imports validation contracts from `@safrs/schemas` and database access from `@safrs/database` — never the other way around.

## Key source files

| File | Purpose |
| --- | --- |
| `packages/api/src/app.ts` | Hono app: routes, correlation-ID middleware, telemetry middleware, store injection |
| `packages/api/src/client.ts` | Typed RPC client factory (`createApiClient`) over `AppType` |
| `packages/api/src/error.ts` | `ApiError` envelope builders (`internalError`, `validationError`) |
| `packages/api/src/openapi.ts` | `buildOpenApiDocument` + embedded Swagger UI HTML |
| `packages/api/src/index.ts` | Public barrel |
| `packages/api/package.json` | Depends on `@safrs/database`, `@safrs/schemas`, `@safrs/telemetry`, `hono`, `zod` |

## How it works

`packages/api/src/app.ts` builds the app from `createRoutes`:

- base path `/api`
- per request: `crypto.randomUUID()` correlation ID stored in Hono `Variables` and returned as the `x-correlation-id` header
- `telemetryMiddleware()` from `@safrs/telemetry` starts an OpenTelemetry span per request and attaches the correlation ID to it
- `GET /api/health` → `{ status: "ok" }`
- `GET /api/openapi.json` → the generated OpenAPI 3.1 document
- `GET /api/docs` → Swagger UI (CDN assets) pointing at the local document
- `GET /api/demos` → all demo records, serialized through `demoSchema`
- `POST /api/demos` → validated with `zValidator("json", createDemoInputSchema, ...)`; on success creates a record via the injected `DemoStore` and returns `201`
- `.onError` → a `500` with the correlation-ID-bearing `internalError` envelope

The `DemoStore` interface (`{ demo: { create, findMany } }`) is injected, so tests can pass a fake store; `createApp()` defaults to the live `@safrs/database` client.

## Error envelope

`packages/api/src/error.ts` implements `apiErrorSchema`:

- `INTERNAL_ERROR` — generic 500 ("Terjadi kesalahan internal."), carries only the correlation ID.
- `VALIDATION_ERROR` — 400 with `fieldErrors` derived from `z.flattenError`, message "Permintaan tidak valid.".

No stacks, no database URLs, no server secrets are ever exposed.

## Typed client

`packages/api/src/client.ts` wraps `hc<AppType>(...)` so every consumer gets fully typed request/response contracts:

```ts
import { createApiClient } from "@safrs/api/client";

const client = createApiClient("http://localhost:3000");
const res = await client.api.demos.$post({ json: { name: "Example" } });
```

`GlobalErrorResponses` adds the `500` envelope to the inferred `AppType`.

## OpenAPI

`packages/api/src/openapi.ts` builds an OpenAPI 3.1 document whose components are derived from the Zod schemas via Zod 4's `z.toJSONSchema(...)` (draft 2020-12), stripping the non-OpenAPI `$schema` key. Paths cover health, demos listing, and demo creation with proper `$ref`s to `ApiError`, `Demo`, and `CreateDemoInput`.

## Integration points

- **`@safrs/web`** mounts the app on the Node runtime and rides the typed client (see [the web app](../apps/golden-path-web.md)).
- **`@safrs/schemas`** supplies all validation contracts; drift is structurally impossible.
- **`tools/codegen`** generates an OpenAPI document and a typed fetch wrapper (`createTypedClient`) layered over `@safrs/api/client` with timeout and retry-on-network-error (`tools/codegen/src/client.mjs`).
- **`@safrs/telemetry`** provides the request middleware used by the app.

## Verification

```bash
pnpm --filter @safrs/api test
pnpm --filter @safrs/api typecheck
pnpm --filter @safrs/api lint
```

## Related pages

- [Schemas](schemas.md) — the contracts this API validates against
- [Database](database.md) — default demo store
- [Telemetry](telemetry.md) — request instrumentation
- [Codegen tool](../tools/codegen.md) — generated OpenAPI/client artifacts
- [Shared packages](index.md)
