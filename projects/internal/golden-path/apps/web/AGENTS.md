# Web application boundary

Read the root [AGENTS.md](../../../../../AGENTS.md), [SAFRS_SPEC.md](../../../../SAFRS_SPEC.md), and [SECURITY.md](../../../../SECURITY.md) first. They are canonical; do not duplicate or weaken their policy here.

## Scope

Own `projects/internal/golden-path/apps/web/**`: the Next.js App Router interface and the Node-runtime adapter that mounts the typed Hono API. Keep browser code dependent only on the public typed client; Prisma and `DATABASE_URL` are server-only.

## Working rules

- Preserve the server-first page and smallest-possible client form boundary.
- Do not add authentication, payment, email, AI, production deployment, or new optional capability runtime dependencies without an approved capability task.
- API, dependency, environment, database, architecture, test-control, and CI changes are R2. Production or safety-critical execution is R3 and requires explicit human authorization.

## Commands

From repository root: `pnpm --filter @safrs/web lint`, `pnpm --filter @safrs/web typecheck`, `pnpm --filter @safrs/web test`, `pnpm --filter @safrs/web build`, and `pnpm test:e2e` when the browser journey changes.
