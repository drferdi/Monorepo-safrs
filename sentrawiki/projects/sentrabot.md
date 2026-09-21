# SentraBot

**Path:** `projects/product/sentrabot/`
**Canonical runtime:** `projects/product/sentrabot/docs/architecture.md` (verified against code 2026-09-02)
**Posture:** sovereign capsule — own `pnpm-workspace.yaml` and lockfile; excluded from the root workspace (decision 2026-09-03).

Public multi-surface agent product: web, Electron desktop, Expo mobile, Hono API, Graphile worker, Docker computers.

## Topology

```text
Web (Vite :5173, proxies /api and /rpc)   Mobile (Expo)   Desktop (Electron → server URL)
        │  HTTP: Better Auth /api/auth/* , oRPC /rpc/*
        │  SSE : /rpc/threads/subscribe (durable seq cursor)
        ▼
apps/api  — Hono on API_HOST:API_PORT (default 127.0.0.1:3100)
   ├─ auth/session, workspace membership
   ├─ oRPC: bots, threads, runs, routines, computers, integrations, deployment
   ├─ platform, billing, managed-AI, webhooks
   └─ composition: executor + sandbox + connectors + memory
        ▼
PostgreSQL (Prisma, packages/db) ── graphile_worker ──▶ apps/worker
        ▼
SandboxProvider ── docker supervisor :7091 ── Docker computer containers
                ── e2b | daytona | box | fake | none | desktop host
```

## Process ownership

| Concern | Owner |
| --- | --- |
| Public HTTP boundary | `apps/api` (`app.ts`, `router.ts`) |
| Client activity stream | `events(threadId, seq)` is truth; SSE fans out |
| Agent execution | `packages/adapters/src/executor.ts` via Graphile jobs (`WAKEUP_DRIVER=graphile`) |
| Permission broker | tool gate → workspace `action_approval_rules` → ALLOW or ASK |
| Durable state | Postgres via Prisma; files under `DATA_DIR`; secrets encrypted with `ENCRYPTION_KEY` |

Run lifecycle: `queued → leased → running → (waiting_input | waiting_takeover | completed | failed | cancelled)` in `packages/core/src/run-state.ts`. Leases are fenced.

No hosted vendor is required for the core product. Model providers, E2B/Daytona, Composio, Xendit, PostHog are optional.

## Local packages (inside the capsule, not root `packages/`)

`adapter-kit`, `adapters`, `auth`, `bot-templates`, `chat-ui`, `contracts`, `core`, `db`, `memory`, `testkit`, `ui-tokens`, `ui-web`.

## User-intent routing

`packages/contracts/src/user-intent.ts` defines a Zod-typed `UserIntent` enum (`answer`, `act`, `routine`, `connect`, `other`) with trigger detection and probability normalization. `packages/adapters/src/intent-router.ts` implements the router: it classifies a queued user-triggered run through the TypeSafe SystemOne API (`jev-latest` model) when a `TYPESAFE_API_KEY` is set, then decides `skip`, `continue`, or `clarify` against a 0.7 confidence threshold. No API key means the router skips classification; any fetch or parse failure also degrades to `skip`.

The router is wired through `composeAgentRuntime` in `packages/adapters/src/agent-runtime-composition.ts`, which hands the executor a single composition of runtime, sandbox, MCP, memory, artifacts, and connectors shared by both the API process and the worker process.

## Security notes (from capsule AGENTS.md)

Public repository: never commit secrets, `.env`, private URLs, or real production data. Auth, secret handling, sandbox boundaries, and host commands are security-sensitive. `SANDBOX_PROVIDER=desktop` is trusted host execution, experimental, off by default.

## Related

- ADR 0004 — `docs/adrs/0004-sentrabot-public-release.md`
- Capsule `AGENTS.md`
- [Projects index](index.md)
