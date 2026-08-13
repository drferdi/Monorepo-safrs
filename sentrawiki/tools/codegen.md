# Codegen

## Purpose

`pnpm codegen` (implemented in `tools/codegen/src/cli.mjs`) is a schema-driven generation tool. It imports the Zod schemas from `@safrs/schemas` at runtime — treating them as the single source of truth — and produces:

- an **OpenAPI 3.1 document** (`--openapi`),
- **mock data factories** (`--mock`),
- a **typed fetch wrapper** over the Hono client (`--client`).

Output is deterministic: same schema in, same bytes out. Generated files are declared in the consuming project's `AGENTS.md`/`.gitignore` as needed and are not forced into the golden-path build (`tools/codegen/AGENTS.md`).

## Key source files

| File | Purpose |
| --- | --- |
| `tools/codegen/src/cli.mjs` | CLI entrypoint and flag parsing |
| `tools/codegen/src/schemas.mjs` | Schema import, introspection (`isZodSchema`), type-name inference, mock walker |
| `tools/codegen/src/openapi.mjs` | `buildOpenApiDocument` via Zod 4 `z.toJSONSchema` (draft 2020-12) |
| `tools/codegen/src/mock.mjs` | Deterministic mock factories (`renderMockModule`, `generateMock`) using `@faker-js/faker` |
| `tools/codegen/src/client.mjs` | Typed fetch-wrapper module (`renderClientModule`) |
| `tools/codegen/package.json` | `@safrs/codegen`; depends on `zod` + `@faker-js/faker` |

## How it works

### OpenAPI

`buildOpenApiDocument(schemas, meta)` iterates every exported Zod schema, converts it with `z.toJSONSchema(...)`, and drops the non-OpenAPI `$schema` key. Each schema becomes a `#/components/schemas/<name>` component; `refFor(name)` produces `$ref`s. `paths` start empty — the API package's own `openapi.ts` is the runtime counterpart that also defines the golden-path paths.

### Mocks

`tools/codegen/src/schemas.mjs` provides `mockForSchema`, a deterministic faker walker over the Zod `_def` shape (strings, numbers, booleans, dates, enums, literals, objects, arrays, optionals/nullables, unions, records — guarded at depth 6). `renderMockModule` emits a standalone `mock.js` that re-imports the live schemas and exports one factory per schema (`mock<Name>(overrides)`), so the generated file stays correct as schemas evolve.

### Typed client

`renderClientModule` emits `client.ts` that wraps `createApiClient` from `@safrs/api/client` with an `AbortController` timeout (default 10s), a single retry-on-network-error, and a normalized `ApiResult<T>` envelope — static request/response types still come from the Hono RPC client.

## CLI usage

```bash
pnpm codegen --schema packages/schemas/src/index.ts --out codegen
pnpm codegen --openapi                      # openapi.json only
pnpm codegen --mock                         # mock.js only
pnpm codegen --client                       # client.ts only
pnpm codegen --title "My API" --version 1.0.0 --out build/codegen
pnpm codegen --help
```

Default entry is `packages/schemas/src/index.ts`; without any artifact flag, all three artifacts are written. Exit code is non-zero if no Zod schemas are exported.

## Integration points

- **`@safrs/schemas`** is the schema entry module — the tool imports it at runtime and never maintains a second copy.
- **`@safrs/api/client`** is the import target of the generated typed client.
- **`packages/api/src/openapi.ts`** mirrors the same `z.toJSONSchema` approach for the served `/api/openapi.json`.

## Verification

```bash
node --test tools/codegen/test/*.test.mjs
```

Tool, dependency, and generated-output changes are R2 and need review.

## Related pages

- [Schemas](../packages/schemas.md) — the source of truth for generation
- [API](../packages/api.md) — the typed client and runtime OpenAPI endpoint
- [Tools overview](index.md)
