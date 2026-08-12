# Debugging

**Purpose**: This page covers the most common failures when working in the SAFRS Monorepo and how to resolve them. The primary tool is `pnpm run doctor`, which diagnoses environment readiness in one step, followed by targeted fixes for PostgreSQL, Prisma, environment variables, and governance/token gates.

## Start with `pnpm run doctor`

`pnpm run doctor` runs `tools/doctor/src/cli.mjs`, which checks the environment: Node version, Docker availability, PostgreSQL readiness, `.env` presence, and workspace integrity. It prints a human-readable report and a non-zero exit code when something is not ready. Use `--technical` for details:

```bash
pnpm run doctor
pnpm run doctor --technical
```

Run `doctor` first before investigating anything else — it frequently isolates the root cause.

## Common errors and fixes

### PostgreSQL not ready

**Symptom**: `pnpm dev`, `pnpm db:*` commands, or integration tests fail to connect; doctor reports Postgres unready.

**Fix**:

```bash
pnpm db:start   # docker compose up -d --wait postgres
pnpm run doctor # re-check
```

The database runs on host port `54329` (mapped to 5432 inside Docker). Ensure Docker Desktop is running. Wait for the container to be healthy before proceeding.

### Prisma client not generated

**Symptom**: Imports of `@safrs/database` fail, or typecheck reports the generated Prisma client missing. The generated client lives under `packages/database/src/generated/prisma` and is gitignored.

**Fix**:

```bash
pnpm db:generate   # generate the Prisma client
pnpm db:migrate    # apply migrations
pnpm db:seed       # seed one safe demo record
```

`pnpm run setup` does all of this in one pass.

### Missing or invalid `.env`

**Symptom**: `@safrs/env` fails fast at startup naming the offending variable; next.config build fails.

**Fix**: Copy `.env.example` to `.env` and fill the required variables (`DATABASE_URL`, `APP_URL`, `NODE_ENV`). `@t3-oss/env` validation is strict and fails fast, so the error message names exactly which variable is missing or malformed. `.env` is gitignored and never read by agents.

### Governance / token gate failures

**Symptom**: `pnpm check` fails at the `governance` or `check:tokens` stage.

**Fix**: Run the failing stage directly to see the detail:

```bash
pnpm governance       # policy, docs, routing, topology, sensitive changes, handoff
pnpm check:tokens     # raw colour/radius scan + WCAG contrast
pnpm lint             # Biome
```

Common causes:
- A non-trivial change set did not touch `.agents/HANDOFF.md` (governance fails).
- Raw colour/radius values were added outside `packages/token/src/tokens.css` (token gate fails). Move them into design tokens.
- A sensitive or verification-control path changed without the elevated risk classification.

### CI-specific failures

CI runs the same gates in `.github/workflows/ci.yml` and `.github/workflows/safrs-governance.yml`. If CI fails but local `pnpm check` passes, check:
- GitHub Action pinning (all actions must be pinned to immutable SHAs).
- Playwright artifacts are uploaded on failure under `playwright-report/` and `test-results/`.

## Troubleshooting checklist

1. `pnpm run doctor` — environment readiness.
2. `pnpm test` — narrow contract/unit failures with stack traces.
3. `pnpm governance` — SAFRS policy and handoff issues.
4. Inspect the raw output of the exact failing command (don't rely on filtered summaries).

## Related pages

- [Getting started](../overview/getting-started.md) — setup and database commands
- [Development workflow](development-workflow.md) — the full gate chain
- [Testing](testing.md) — how to run and interpret tests
- [Tooling](tooling.md) — build system and linters behind the gate
