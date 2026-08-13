# Getting started

## Prerequisites

- **Node.js** >= 24.18 < 25 (active LTS)
- **pnpm** 11.21.0 (run `corepack enable` if missing)
- **Docker Desktop** (for local PostgreSQL)
- **Python 3** (for SAFRS governance verification scripts)
- **Git LFS** (for Playwright visual regression baselines)

## Setup

```bash
pnpm install
pnpm run setup
```

`pnpm run setup` runs `scripts/setup.mjs`, which validates the local environment, checks Node version, verifies Docker availability, starts PostgreSQL, generates the Prisma client, runs migrations, and seeds the database with one safe demo record.

## Daily workflow

```bash
pnpm dev        # Start Next.js dev server (auto-starts Postgres if needed)
pnpm doctor     # Diagnose environment readiness
pnpm status     # Show task registry and lease state
pnpm test       # Run contract + unit tests
pnpm test:e2e   # Run Playwright browser smoke
pnpm check      # Full gate: governance + tokens + lint + typecheck + test + build
```

## Task management

```bash
pnpm task claim --id TASK-20260813-001 --title "Fix bug" --owner-id agent --owner-label "Claude" --risk R1 --scope src/bug.ts
pnpm task state --id TASK-20260813-001 --to EXECUTING
pnpm task list --active
pnpm task close --id TASK-20260813-001
```

## Automation control plane

```bash
pnpm saf contract compile task.json --write .safrs/contracts/task.json
pnpm saf lease verify events.ndjson
pnpm saf gate --all
pnpm saf evidence verify manifest.json
pnpm saf publish evaluate pr.json evidence.json
```

## Database commands

```bash
pnpm db:start    # Start PostgreSQL via Docker Compose
pnpm db:stop     # Stop PostgreSQL
pnpm db:generate # Generate Prisma client
pnpm db:migrate  # Run Prisma migrations
pnpm db:seed     # Seed one safe demo record
pnpm db:studio   # Open Prisma Studio
pnpm db:reset    # Reset local database (requires disposable guard)
```

## Governance commands

```bash
pnpm governance      # Run SAFRS local verification (16 checkers)
pnpm check:tokens    # Enforce design token rules (no raw colours outside packages/token)
pnpm check:security  # Supply-chain scan (npm audit + optional osv-scanner)
```

## Telemetry (optional)

```bash
docker compose -f compose.telemetry.yaml up -d jaeger   # Start local Jaeger
# Jaeger UI at http://localhost:16686
# OTLP endpoint at http://localhost:4318/v1/traces
```

## Project scaffolding

```bash
pnpm project:new         # Interactive project wizard
pnpm capability:add      # Add an optional capability pack (Stripe, email, Electron, etc.)
pnpm deps:graph          # Render the monorepo dependency graph
pnpm codegen             # Generate OpenAPI, mocks, and typed client from Zod schemas
```

## Environment variables

The `.env` file is gitignored and never read by agents. Required variables:

| Variable | Purpose | Required |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `APP_URL` | Application base URL | Yes |
| `NODE_ENV` | Environment mode | Yes |
| `STRIPE_SECRET_KEY` | Stripe sandbox key (capability pack) | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (capability pack) | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Jaeger OTLP endpoint | No |
| `OTEL_SERVICE_NAME` | Service name for traces | No |
