# Golden Path Capsule

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

Read the repository [AGENTS.md](../../../AGENTS.md), [SAFRS_SPEC.md](../../SAFRS_SPEC.md), and [SECURITY.md](../../SECURITY.md) first; they remain canonical.

## Objective and owner

- Objective: prove the SAFRS typed Database → API → Web flow with one safe demo record.
- Human owner: Gaffer.
- Default risk: R1; dependency, shared-package, API, database, or architecture changes are R2 under root policy.

## Boundaries and non-goals

- Owned boundary: `projects/internal/golden-path/**`. The former root packages (`@safrs/api`, `config`, `database`, `env`, `schemas`, `telemetry`, `ui`, and `@sentra/token`) are capsule-local snapshots under `packages/`; never resolve root `packages/`.
- Non-goals: product branding, production deployment, credentials, real customer data, authentication, payment, email, AI, or capability-pack integration.
- Do not modify other projects or shared packages unless the task explicitly grants that scope.

## Exact commands

Run from this capsule root; `project.contract.json` is the source of truth.

- Install: `node scripts/pnpm.mjs install --frozen-lockfile`
- Lint: `node scripts/pnpm.mjs run lint`
- Type check: `node scripts/pnpm.mjs run typecheck`
- Test: `node scripts/pnpm.mjs run test`
- Build: `node scripts/pnpm.mjs run build`
- Deploy dry-run: `node scripts/deploy-dry-run.mjs`
- Browser journey: `node scripts/pnpm.mjs --filter @safrs/web test:e2e` (needs a disposable `_test` database)

## Runtime, data, and sensitive surfaces

- Runtime dependencies: Node.js, Next.js Node runtime, Hono adapter, and the capsule-local `@safrs/api`, `@safrs/env`, and `@safrs/ui` packages.
- Data dependency: local PostgreSQL through `@safrs/database`; use only the safe local values declared in this capsule's `.env.example` for local verification (`scripts/pnpm.mjs` fills missing variables from it).
- Sensitive surfaces: `DATABASE_URL`, database mutation routes, dependency lockfile, and shared API/UI interfaces. Never expose database URLs to the browser or add `NEXT_PUBLIC_*` secrets.

Read [architecture](docs/architecture.md), [data](docs/data.md), and [testing](docs/testing.md) before changing runtime behavior.
