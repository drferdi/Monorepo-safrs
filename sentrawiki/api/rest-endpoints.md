# REST endpoints

**Purpose**: This page documents every HTTP endpoint in the golden-path API, including request and response shapes, Zod validation rules, and the error envelope. The endpoints are defined in `packages/api/src/app.ts` and validated with schemas from `@safrs/schemas` (`packages/schemas/src/demo.ts`).

## Base path

The Hono app uses `.basePath("/api")`, so all routes below are served under `/api`. In the Next.js golden-path app, the Hono app is mounted via the catch-all route at `projects/golden-path/apps/web/src/app/api/[[...route]]/route.ts`.

## Endpoint summary

| Method | Path | Success | Failure |
| --- | --- | :---: | :---: |
| GET | `/api/health` | 200 | 500 |
| GET | `/api/demos` | 200 | 500 |
| POST | `/api/demos` | 201 | 400, 500 |
| GET | `/api/openapi.json` | 200 | 500 |
| GET | `/api/docs` | 200 (HTML) | 500 |

## Common response conventions

- Every response carries an `x-correlation-id` header generated per request in middleware.
- On error, the body is the `ApiError` envelope (see below) and the `x-correlation-id` matches the `correlationId` in the body for correlation.

## Error envelope

All errors follow `apiErrorSchema` from `@safrs/schemas` (`packages/schemas/src/demo.ts`), built by `packages/api/src/error.ts`:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Permintaan tidak valid.",
  "correlationId": "8b8f6c3a-...",
  "fieldErrors": { "name": ["String must contain at least 1 character(s)"] }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `code` | string | `VALIDATION_ERROR` or `INTERNAL_ERROR` |
| `message` | string | User-facing (Bahasa Indonesia) message |
| `correlationId` | string | UUID matching the `x-correlation-id` header |
| `fieldErrors` | object (optional) | Field → messages map, present on validation errors |

Unexpected errors are redacted: the `onError` handler always returns `INTERNAL_ERROR` with no stack trace or internal detail, so database URLs and stacks never leak to clients.

## GET /api/health

- **Purpose**: Readiness check for the service.
- **Implementation**: `packages/api/src/app.ts` — `.get("/health", ...)`.
- **Success 200**:

```json
{ "status": "ok" }
```

## GET /api/demos

- **Purpose**: List all demo records.
- **Implementation**: calls `store.demo.findMany()` and serializes each record through `demoSchema.parse()`.
- **Success 200** — array of `Demo` records:

```json
[
  {
    "id": "5c2d5001-3f71-4c61-bef8-e8f55cc20cea",
    "name": "Atlas",
    "createdAt": "2026-08-10T00:00:00.000Z"
  }
]
```

The `Demo` shape (`demoSchema`) is:

| Field | Type | Constraint |
| --- | --- | --- |
| `id` | string | UUID |
| `name` | string | any |
| `createdAt` | string | ISO-8601 datetime |

## POST /api/demos

- **Purpose**: Create a new demo record.
- **Implementation**: validates the JSON body with `zValidator("json", createDemoInputSchema, ...)` before invoking `store.demo.create`.
- **Request body** — `CreateDemoInput` (`createDemoInputSchema`):

```json
{ "name": "Atlas" }
```

| Field | Type | Constraint |
| --- | --- | --- |
| `name` | string | trimmed, min 1, max 80 characters |

- **Created 201** — a `Demo` record:

```json
{
  "id": "5c2d5001-3f71-4c61-bef8-e8f55cc20cea",
  "name": "Atlas",
  "createdAt": "2026-08-10T00:00:00.000Z"
}
```

- **Bad request 400** — `VALIDATION_ERROR` envelope with `fieldErrors` naming each invalid field. Example: `{ "name": "" }` returns `name` errors.
- **Internal error 500** — `INTERNAL_ERROR` envelope (redacted).

## GET /api/openapi.json

- **Purpose**: Serve the OpenAPI 3.1 description of the API.
- **Implementation**: `packages/api/src/openapi.ts` — `buildOpenApiDocument()` builds the document directly from the Zod schemas with `z.toJSONSchema(...)`.
- **Success 200** — an OpenAPI 3.1 document with `components.schemas` for `ApiError`, `Demo`, and `CreateDemoInput`, and `paths` for `/api/health` and `/api/demos`.

## GET /api/docs

- **Purpose**: Serve an interactive Swagger UI for exploring the API.
- **Implementation**: `openApiDocsHtml()` in `packages/api/src/openapi.ts` returns an HTML page that loads Swagger UI from a CDN and points it at `/api/openapi.json`.
- **Success 200** — `text/html` Swagger UI page. Safe for local development.

## Validation approach

Zod schemas in `@safrs/schemas` are the single source of truth for the API contract. `@hono/zod-validator` validates requests, `demoSchema.parse()` validates serialized responses, and the typed RPC client (`hc<AppType>`) provides compile-time drift detection. See [API overview](index.md) and [Schemas package](../packages/schemas.md).

## Related pages

- [API overview](index.md) — architecture, mount point, RPC client
- [API package](../packages/api.md) — the `@safrs/api` package
- [Schemas package](../packages/schemas.md) — the Zod contracts
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) — error handling
