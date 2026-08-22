# Golden Path Capsule

Read the repository [AGENTS.md](../../../AGENTS.md), [SAFRS_SPEC.md](../../SAFRS_SPEC.md), and [SECURITY.md](../../SECURITY.md) first; they remain canonical.

## Objective and owner

- Objective: prove the SAFRS typed Database → API → Web flow with one safe demo record.
- Human owner: Chief.
- Default risk: R1; dependency, shared-package, API, database, or architecture changes are R2 under root policy.

## Boundaries and non-goals

- Owned boundary: `projects/internal/golden-path/**`; this capsule may consume declared shared packages.
- Non-goals: product branding, production deployment, credentials, real customer data, authentication, payment, email, AI, or capability-pack integration.
- Do not modify other projects or shared packages unless the task explicitly grants that scope.

## Exact commands

- First-run diagnosis: `pnpm run doctor`
- Lint: `pnpm --filter @safrs/web lint`
- Type check: `pnpm --filter @safrs/web typecheck`
- Test: `pnpm --filter @safrs/web test`
- Build: `pnpm --filter @safrs/web build`
- Browser journey: `pnpm test:e2e`

## Runtime, data, and sensitive surfaces

- Runtime dependencies: Node.js, Next.js Node runtime, Hono adapter, and shared `@safrs/api`, `@safrs/env`, and `@safrs/ui` packages.
- Data dependency: local PostgreSQL through `@safrs/database`; use only the safe local values declared in root `.env.example` for local verification.
- Sensitive surfaces: `DATABASE_URL`, database mutation routes, dependency lockfile, and shared API/UI interfaces. Never expose database URLs to the browser or add `NEXT_PUBLIC_*` secrets.

Read [architecture](docs/architecture.md), [data](docs/data.md), and [testing](docs/testing.md) before changing runtime behavior.
