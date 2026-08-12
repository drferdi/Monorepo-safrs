# Patterns and conventions

## Coding style

- **TypeScript strict** across all packages. The shared tsconfig base lives in `packages/config/tsconfig/base.json`.
- **Biome** handles formatting and linting with the `recommended` preset. Double quotes, semicolons, trailing commas, 2-space indent.
- **Named exports** only. No default exports except for Next.js pages and React Email templates.
- Functions and components are small and single-purpose.
- Comments explain why, not what.

## Error handling

The API uses a correlation-ID error envelope defined in `packages/api/src/error.ts`. Every response (success or error) carries an `x-correlation-id` header. Errors follow the `apiErrorSchema` from `@safrs/schemas`:

```typescript
{
  code: string,
  message: string,
  correlationId: string,
  fieldErrors?: Record<string, string[]>
}
```

The Hono app generates a UUID per request in middleware, attaches it to the context, and returns it in both the response header and the error body. Validation errors use `VALIDATION_ERROR`; unexpected errors use `INTERNAL_ERROR`.

## Schema-first contracts

Zod schemas in `@safrs/schemas` are the single source of truth for API contracts. The Hono API uses `@hono/zod-validator` to validate requests, and the response serialization runs through `demoSchema.parse()`. The typed Hono RPC client (`hc<AppType>`) provides compile-time drift detection: if the API changes, the frontend type-check fails.

## Environment validation

Server and client environments are validated at startup using `@t3-oss/env-core` and `@t3-oss/env-nextjs` in `@safrs/env`. Missing or invalid variables fail fast with an explicit error naming the offending variable. `next.config.ts` imports `@safrs/env/server` to enforce build-time validation.

## Design token enforcement

Raw colour or radius values are forbidden outside `packages/token/src/tokens.css`. The governance gate at `scripts/check-tokens.mjs` scans all `.css`, `.ts`, `.tsx`, `.js`, `.jsx` files in `projects/`, `packages/`, and `tools/` for hex values and bare `border-radius` declarations. It also recomputes WCAG 2.2 AA contrast ratios from the token JSON. See [design tokens](../features/design-tokens.md).

## Testing patterns

- **Unit tests**: Vitest, co-located with source (e.g., `app.test.ts` next to `app.ts`).
- **Contract tests**: Cross-package contracts in `tests/contracts/` (Hono RPC, environment boundary, build-time env, Playwright env).
- **Integration tests**: Database integration in `tests/integration/database.test.ts`, gated by `DATABASE_INTEGRATION_TESTS=1`.
- **E2E tests**: Playwright browser smoke in `projects/golden-path/apps/web/e2e/`, with visual regression baselines via Git LFS.
- **Governance tests**: Python tests in `tests/architecture/` and `tests/governance/` enforcing topology and sensitive-path classification.
- **Property-based tests**: `fast-check` with deterministic seed in `@safrs/schemas` for schema invariants.

## Database safety

- The reset guard (`packages/database/src/reset-guard.ts`) rejects any database URL that is not `postgresql://` on `127.0.0.1:54329` with a name ending in `_local` or `_test`.
- `DATABASE_URL` is never exposed to the browser. The web app imports `@safrs/database` only in server contexts.
- Seed data is a single safe demo record with a fixed UUID.

## Language conventions

- All repository documentation is in English, kept as concise as possible.
- Agent chat diagnostics are in Bahasa Indonesia.
- Code, commands, and identifiers are in English.
- Error messages in the API are in Bahasa Indonesia (user-facing).

## Verification integrity

Changes to verification controls (`.safrs/**`, `AGENTS.md`, CI workflows, governance scripts, security tests) are minimum R2, even if the textual change appears small. Disallowed behavior includes deleting assertions, widening ignores, skipping tests, lowering thresholds, or disabling gates to make a task pass.
