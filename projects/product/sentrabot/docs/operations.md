# Operations runbook

This is SRE-style documentation for **intended** self-host operations.
CURRENT: Compose is a reviewed contract on disk. Images have not been built
or started as a release claim. Backup/restore are **gates**, not complete
tools.

Topology narrative: [self-host.md](self-host.md).
Health semantics: [api.md](api.md). Incidents involving secrets:
[../SECURITY.md](../SECURITY.md).

```mermaid
flowchart TB
  subgraph Host["Operator host — TARGET"]
    Web["web :3000"]
    subgraph Internal["networks.backend internal: true"]
      Pg["postgres 5432"]
      W["worker 8787 expose"]
      S["supervisor 8788 expose"]
    end
  end
  User["User browser"] --> Web
  Web --> Pg
  Web --> W
  W --> S
```

## Process environments (no values)

Do not copy `.env` from the source repository. Compose requires:

- `POSTGRES_PASSWORD` — required (`:?` interpolation).
- `WORKER_CONTROL_TOKEN` — required.
- `SUPERVISOR_TOKEN` — required.
- `BETTER_AUTH_URL` — required.
- `BETTER_AUTH_SECRET` — required.
- `APP_URL` — optional, default `http://localhost:3000`.
- `DATABASE_URL` — composed inside the web service as
  `postgresql://sentrabot:${POSTGRES_PASSWORD}@postgres:5432/sentrabot`.

Worker/supervisor HTTP servers also read `PORT` (defaults 8787 / 8788) when
run outside Compose.

## Health vs ready

| Component | Liveness | Readiness |
| --- | --- | --- |
| API | `GET /api/sentrabot/health` → `service: sentrabot-api` | Same file; no separate ready |
| Canonical API | `GET /api/health` → `{ status: "ok" }` (Golden Path envelope) | Sentra Bot web mounts the same Hono app at `/api` |
| Worker | `GET /health` → `service: worker` | Compose healthcheck wget to that URL |
| Supervisor | `GET /health` always 200 | `GET /ready` 200 or 503; Compose **has no supervisor healthcheck** (CURRENT) |
| Postgres | `pg_isready` | Compose `condition: service_healthy` for web |

Do not send computer operations to the supervisor until `/ready` is 200.
CURRENT HTTP server sets `ready: true` immediately and still disables Docker.

## Compose facts from `infra/compose/docker-compose.yml`

- Postgres `postgres:17.6-alpine`, volume `sentrabot-postgres`.
- Web depends on healthy postgres **and** healthy worker.
- Supervisor: `read_only: true`, `cap_drop: ALL`, `security_opt: no-new-privileges`.
- No `docker.sock`.
- Build context is the **repository root** (`../../../../` from the compose
  file) with Dockerfiles `Dockerfile.web|worker|supervisor`.
- Web Dockerfile runs `pnpm --filter @sentra/sentrabot-web build`.

CURRENT gap: `backend` is `internal: true` while web publishes `3000:3000`.
Whether published ports remain reachable on the operator host depends on
Docker Engine behavior and has **not** been verified here. Treat live
networking as Unknown — blocked by “Compose images have not been started as
a release claim”.

## Backup / restore (GATE — not implemented as complete)

TARGET evidence for beta:

1. Documented `pg_dump` / restore against the Compose volume.
2. Destructive local reset only through root Prisma guards.
3. A restore test that never uses production data.
4. Scripts live under [../scripts/README.md](../scripts/README.md) using the
   root toolchain.

CURRENT: `scripts/inventory-source.mjs` is the fail-closed pin inventory.
`scripts/backup-restore-disposable.mjs` is a guarded evidence command for
`127.0.0.1:54329` `*_test` databases only — not a Compose-volume restore.
`scripts/fake-provider-journey.mjs` checks Compose YAML plus fake execution.
Do not claim operator-host restore works.

## Incident notes

- Token leak: rotate `WORKER_CONTROL_TOKEN` / `SUPERVISOR_TOKEN` / Postgres
  password locally; never commit replacements.
- Unexpected public bind of 8787/8788: stop the stack; those ports must not
  be published.
- Signup suddenly open: `/deployment` is hardcoded closed in API CURRENT;
  if a later slice reads Prisma, inspect `signup_mode` and revert to `closed`.
- Docker executor “works” only in tests: production-shaped boot is `503`
  without an injected executor — that is fail-closed, not an outage of a
  claimed sandbox.

## Graceful shutdown

Not implemented as documented process management beyond Node HTTP
`listen`. TARGET: drain worker leases before SIGTERM. CURRENT: Unknown —
blocked by missing runtime port of the source worker.
