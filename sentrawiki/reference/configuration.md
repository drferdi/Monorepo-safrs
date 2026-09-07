# Configuration reference

> **Scope.** Root control-plane and golden-path configuration. Excluded capsules have their own lockfiles, biome, tsconfig, and compose files.

This page documents the repository's **root** normalized configuration. Values come from the files named in each section.

## Environment variables

Validated server environment is declared in `packages/env/src/server.ts` (via `@t3-oss/env-core` and Zod), with a client slice in `packages/env/src/client.ts`. Telemetry variables are read in `packages/telemetry/src/config.ts`.

| Variable | Validation | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Zod `z.url()` | PostgreSQL connection URL; server-only, never exposed to the browser |
| `APP_URL` | Zod `z.url()` | Canonical application URL |
| `NODE_ENV` | `development` / `test` / `production` | Runtime mode |
| `STRIPE_SECRET_KEY` | starts with `sk_`, optional | Stripe capability pack, optional so baseline builds without keys |
| `STRIPE_WEBHOOK_SECRET` | starts with `whsec_`, optional | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Zod `z.url()`, optional | Client-side public app URL |
| `OTEL_SERVICE_NAME` | — | Service name for tracing (default `safrs-app`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP HTTP endpoint (default `http://localhost:4318/v1/traces`) |
| `OTEL_SDK_DISABLED` | `1` / `true` disables | Local short-circuit for the telemetry SDK |

Turbo injects `DATABASE_URL`, `APP_URL`, and `NODE_ENV` into `build`, `test:e2e`, and `dev` tasks (see below). Configure the canonical local values via the root `.env` file (the template is `.env.example`); agent hooks block agents from reading `.env` directly.

## tsconfig hierarchy

The root `tsconfig.json` sets strict, ES2024, NodeNext module resolution, `noEmit`, and `skipLibCheck`. Shared presets live in `packages/config/tsconfig/`:

- **`base.json`** — strict, ES2024, NodeNext, `noEmit`, `skipLibCheck`, `verbatimModuleSyntax`. The default for packages and tools.
- **`nextjs.json`** — extends `base.json`, adds DOM libs (`DOM`, `DOM.Iterable`, `ES2024`), `jsx: "preserve"`, and the Next plugin. Used by frontend applications.

## biome.jsonc

The root `biome.jsonc` configures Biome 2.5.7:

- **Files**: includes everything except generated/secret dirs (`.safrs`, `.turbo`, `.next`, `next-env.d.ts`, `playwright-report`, `test-results`, generated Prisma output).
- **Formatter**: enabled, `indentStyle: space`, `indentWidth: 2`.
- **Linter**: enabled, `rules.preset: "recommended"`.
- **JS formatter**: double quotes, always semicolons, trailing commas `all`.

Root scripts map to `biome check` (`pnpm lint`) and `biome check --write` (`pnpm fix`).

## turbo.json — task pipeline

`turbo.json` defines the task pipeline:

| Task | `dependsOn` | `env` | `outputs` |
| --- | --- | --- | --- |
| `build` | `^build` | `DATABASE_URL`, `APP_URL`, `NODE_ENV` | `.next/**`, `dist/**`, `build/**` (not cache) |
| `lint` | — | — | none |
| `typecheck` | `^typecheck` | — | none |
| `test` | `^build` | — | `coverage/**` |
| `test:e2e` | — | `DATABASE_URL`, `APP_URL`, `NODE_ENV` | `playwright-report/**`, `test-results/**` |
| `dev` | — | `DATABASE_URL`, `APP_URL`, `NODE_ENV` | none |

`test:e2e` and `dev` disable caching; `dev` is `persistent`. The root `package.json` scripts drive these with `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm check`, and a `pnpm check:tokens` token scan plus `pnpm check:security` supply-chain scan.

## vitest.workspace.ts

`vitest.workspace.ts` defines a single Vitest workspace named `repository-contracts` that includes `tests/contracts/**/*.test.ts` and `tests/integration/**/*.test.ts`. The root `pnpm test:contracts` script types the tests then runs `vitest run --config vitest.workspace.ts`.

## pnpm-workspace.yaml — catalog

`pnpm-workspace.yaml` declares the **root** workspace packages:

- `projects/*/*/apps/*` — apps two levels under `projects/` (ADR 0005).
- Negations: `!projects/academic/academic-smartboard/**`, `!projects/product/kediri-history/**`, `!projects/product/sentrabot/**`.
- `packages/*` — root shared packages.
- `tools/*` — developer tooling.

The `catalog:` block is the version pin for **root workspace members only**. Excluded capsules pin versions in their own lockfiles. `allowBuilds` is a small trusted set. `minimumReleaseAge` is 1440 minutes; `resend@6.19.0` and `stripe@22.5.0` are exempt. Package manager `pnpm@11.21.0`, Node `>=24.18.0 <25`.

## Docker Compose

- **`compose.yaml`** — local PostgreSQL 17 (`postgres:17-alpine`) named `safrs_local`, user/password `safrs`, exposed on `127.0.0.1:54329:5432`, with a `pg_isready` healthcheck and a `postgres_data` volume. Started via `pnpm db:start`. **Golden-path only.**
- **`compose.telemetry.yaml`** — optional local Jaeger collector for golden-path traces. UI `127.0.0.1:16686`, OTLP `4317`/`4318`.
- Capsule compose files (Kediri `infra/docker-compose.yml`, SentraBot `infra/compose/`) are not this file.

## Related pages

- [Reference overview](index.md)
- [Dependencies](dependencies.md)
- [Security](../security.md)
- [How to monitor](../how-to-monitor/index.md)
