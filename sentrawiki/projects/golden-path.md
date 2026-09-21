# Golden Path (legacy demonstrator)

**Path:** `projects/internal/golden-path/`
**App:** `apps/web` (`@safrs/web`)
**Posture:** **root-coupled**. Named in ADR 0006 and root `AGENTS.md` as the current legacy demonstrator pending capsule migration. **Not a template for new capsules.**

Objective (capsule `AGENTS.md`): prove the typed Database → API → Web flow with one safe demo record.

## Wiring

- Next.js App Router, Node runtime
- Catch-all `src/app/api/[[...route]]/route.ts` mounts `app` from `@safrs/api` via `hono/vercel`
- Prisma through `@safrs/database` against root `compose.yaml` Postgres `safrs_local` on `127.0.0.1:54329`
- UI: `@safrs/ui` + `@sentra/token`
- Env: `@safrs/env`
- Telemetry: `@safrs/telemetry`

Commands are root filters (`pnpm --filter @safrs/web …`, `pnpm run doctor`, `pnpm test:e2e`). There is no capsule `project.contract.json`.

## Stated non-goals vs leftover code

Capsule AGENTS non-goals include authentication, payment, email, AI. The app tree still contains a Stripe webhook route and a Resend welcome email template from capability packs. Treat those as capability leftovers, not as the capsule's product scope.

## Related

- [Golden-path web (app page)](../apps/golden-path-web.md)
- [API](../api/index.md)
- [Packages](../packages/index.md)
- ADR 0001
