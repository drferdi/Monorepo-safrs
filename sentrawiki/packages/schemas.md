# Schemas (`@safrs/schemas`)

## Purpose

The shared Zod contract package. `@safrs/schemas` is the single source of truth for data shapes across the typed `Database → API → Web` flow. Because the OpenAPI document, the Hono validation, and the typed client are all derived from (or validated against) these schemas, a shape change lands here once and propagates everywhere.

The package deliberately exports only the schemas and their inferred types; validation logic lives in consumers (notably `@safrs/api` and `@safrs/env`).

## Key source files

| File | Purpose |
| --- | --- |
| `packages/schemas/src/index.ts` | Public barrel; re-exports the demo and error schemas |
| `packages/schemas/src/demo.ts` | The three current Zod contracts |
| `packages/schemas/package.json` | Package metadata; depends only on `zod` |

## The contracts

`packages/schemas/src/demo.ts` defines three schemas:

- **`createDemoInputSchema`** — `{ name: string }` where the name is trimmed, length 1–80. The request body for `POST /api/demos`.
- **`demoSchema`** — the serialized `Demo` record: `{ id: uuid, name: string, createdAt: datetime }`. The response shape for demo read/write endpoints.
- **`apiErrorSchema`** — the standard error envelope: `{ code, message, correlationId, fieldErrors? }`. Produced and consumed by the API error module.

Consumers reference these via barrel imports:

```ts
import { apiErrorSchema, createDemoInputSchema, demoSchema } from "@safrs/schemas";
```

## Integration points

- **`@safrs/api`** uses `createDemoInputSchema` in `@hono/zod-validator` for request validation and `demoSchema` for serializing responses (`packages/api/src/app.ts`), plus `apiErrorSchema` for the error envelope (`packages/api/src/error.ts`).
- **`@safrs/api`** derives the OpenAPI components from these schemas with Zod 4's native `z.toJSONSchema(...)` (`packages/api/src/openapi.ts`), so the documentation cannot drift from the validation contracts.
- **`tools/codegen`** imports the schema entry module at runtime and introspects each exported Zod value to generate an OpenAPI document, mock factories, and a typed client wrapper (`tools/codegen/src/schemas.mjs`).

## Verification

```bash
pnpm --filter @safrs/schemas lint
pnpm --filter @safrs/schemas typecheck
pnpm --filter @safrs/schemas test
```

The package uses TypeScript strict, Biome, and Vitest, matching every other package.

## Related pages

- [API](api.md) — Hono routes and OpenAPI derived from these schemas
- [Codegen tool](../tools/codegen.md) — schema-driven generation
- [Shared packages](index.md)
