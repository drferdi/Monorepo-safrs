# Data boundary

## Objective

The readiness desk reads only dependency health and creates one schema-validated demo record.

## Dependencies and boundary

Server status uses `@safrs/database`; the browser reaches Hono only through an absolute, same-origin `/api` URL at runtime. `DATABASE_URL` remains server-only and is never copied to a `NEXT_PUBLIC_*` variable.

## Non-goals and sensitive surfaces

No production data, credentials, direct browser database access, destructive reset, or data export belongs here. Database mutations and `DATABASE_URL` are sensitive under root [SECURITY.md](../../../SECURITY.md) and the SAFRS risk policy.

## Local command

Use `pnpm setup` to prepare local data services, then `pnpm --filter @safrs/web test` to verify this application without printing environment values.
