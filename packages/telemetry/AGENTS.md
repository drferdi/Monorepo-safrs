# AGENTS.md — packages/telemetry (@safrs/telemetry)

Read the root [AGENTS.md](../../AGENTS.md), [SAFRS_SPEC.md](../../SAFRS_SPEC.md),
and [SECURITY.md](../../SECURITY.md) first. They are canonical.

## Scope

Own `packages/telemetry/**`: the shared OpenTelemetry instrumentor for the
`Next.js → Hono → Prisma → PostgreSQL` chain. It initializes the Node SDK with
an OTLP trace exporter, HTTP instrumentation, and Prisma query tracing, and
exposes a Hono request middleware that creates a root span per request.

## Rules

- `initTelemetry` must be called before the app imports database/HTTP
  instrumented paths (top of the Next.js `instrumentation.ts`).
- Traces must never carry credentials, raw SQL parameter values, or PII.
  Span attributes are limited to operation names and safe metadata.
- The exporter is disabled unless `OTEL_SDK_DISABLED` is unset; do not route
  production traffic to a collector without an approved R2 change.
- New shared-package, dependency, or instrumentation-control changes are R2.
- Do not import browser code here; this package is server-only.

## Commands

From repository root: `pnpm --filter @safrs/telemetry test`,
`pnpm --filter @safrs/telemetry typecheck`, `pnpm --filter @safrs/telemetry lint`.
Start the local collector with `docker compose -f compose.telemetry.yaml up -d jaeger`.