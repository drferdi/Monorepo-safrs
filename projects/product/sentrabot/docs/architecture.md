# Sentra Bot runtime architecture

This document describes what the repository does today, verified against the code on
2026-09-02. It is the single source of truth for the runtime topology; other documents link here
instead of restating it. The assessment behind it lives in
`docs/superpowers/plans/2026-09-02-convergence-directive.md`.

## Topology

```text
Web (Vite 127.0.0.1:5173, proxies /api and /rpc)   Mobile (Expo)   Desktop (Electron shell → server URL)
        │  HTTP: Better Auth /api/auth/*, oRPC /rpc/* (commands)
        │  SSE : /rpc/threads/subscribe (event iterator, durable seq cursor)
        ▼
apps/api  — Hono on API_HOST:API_PORT (default 127.0.0.1:3100)   ← the harness / public runtime boundary
   ├─ auth/session (Better Auth), workspace actor (requireMembership)
   ├─ router.ts (oRPC): bots, threads, runs, routines, computers, integrations, deployment
   ├─ platform, billing, managed-AI, and webhook Hono routes
   ├─ composition root: executor + sandbox + connectors + memory + thread events
   │    (job handlers are built here but only started when WAKEUP_DRIVER=memory)
   └─ PostgresRealtimeFanout (LISTEN sentrabot_events; wakes readers, carries no data)
        ▼
PostgreSQL (Prisma) ── graphile_worker ──▶ apps/worker
   runs · attempts · external_effects        ├─ same composition as the API
   events(threadId, seq) · routines          ├─ Graphile host: run.continue, routine.wakeup,
   computers · deployment_settings · secrets │   phone.deliver, computer.*, skill.*, history.compact
                                             └─ reconciler (Postgres advisory-lock leader)
        ▼
SandboxProvider ── docker ──▶ infra/sandboxes/supervisor (127.0.0.1:7091) ──▶ Docker computer containers
                ── e2b | daytona | box (remote)  ── fake | none (verification / no computers)
                ── desktop ("This Mac"): trusted host execution on the API/worker host
DATA_DIR: agent homes, artifacts, push tokens
```

## Process ownership

| Concern | Owner |
|---|---|
| Public runtime boundary, auth/session, HTTP commands | `apps/api` (`apps/api/src/app.ts`, `router.ts`) |
| Client activity stream | `threads.subscribe` over the oRPC event iterator, backed by the `events` table (`threadId`, `seq`). Clients resume from their last `seq`; durable rows are the truth and SSE only propagates them. |
| Agent execution | `createRunExecutor` (`packages/adapters/src/executor.ts`), driven by Graphile Worker jobs in `apps/worker` (`WAKEUP_DRIVER=graphile`, every Compose file) or in-process in the API (`WAKEUP_DRIVER=memory`, tests only) |
| Permission broker | the executor tool gate: `toolRequiresApproval` → workspace `action_approval_rules` → optional auto-review judge → ALLOW or ASK. ASK records an `external_effects` row as `intended`, posts an `ask` block, and parks the run in `waiting_input`; the answer (`allow`, `always`, `deny`) is stored on the effect and the run resumes through `run.continue`. DENY is enforced structurally: workspace membership on every RPC, thread/bot ownership resolution, sandbox path containment, and provider gating. |
| Sandbox lifecycle | `SandboxProvider` adapters (`packages/adapters/src/sandbox-factory.ts`); Docker computers through `infra/sandboxes/supervisor` (bearer token, loopback by default). Computer state and control/execution leases live in `computers` and `computer_execution_leases`. |
| Background jobs | `packages/adapter-kit/src/background-jobs.ts`. Every job carries a `jobKey`, so redelivery replaces instead of duplicating. The reconciler re-enqueues queued runs, expired leases, near-due routines, and expired control leases. |
| Durable state | PostgreSQL via Prisma (`packages/db/prisma/schema.prisma`); files under `DATA_DIR`; secrets encrypted with `ENCRYPTION_KEY` in the `secrets` table |

## Run lifecycle

`queued → leased → running → (waiting_input | waiting_takeover | completed | failed | cancelled)`,
enforced by `packages/core/src/run-state.ts`. Leases are fenced (`leaseFence`) and renewed every
60 s; an expired lease is reclaimed by the next worker with a higher fence, and every durable write
is conditioned on the fence, so a stale worker cannot commit. Consequential tool calls are recorded
in `external_effects` with a unique `idempotencyKey` before execution; an interrupted call is left
`ambiguous` and never replayed blindly. There is no separate timed-out status: a stalled run is
bounded by lease expiry plus `SANDBOX_COMMAND_TIMEOUT_MS`.

## Trusted host execution

`SANDBOX_PROVIDER=desktop`, or the deployment-owner setting `computerHost = "this-mac"` on a Docker
deployment, runs commands on the API/worker host with the bot home and the user's home directory
as allowed roots. This is trusted host execution, not sandbox isolation. It is experimental, off
by default, only the deployment owner can enable it, and it is unsupported on Windows until
`packages/adapters/src/desktop-sandbox-*.test.ts` pass there.

## Optional remote providers and what they receive

| Provider (environment) | Enabled by | Receives |
|---|---|---|
| Model providers (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, user BYOK credentials) | key present | prompts, tool results, and memory context for the run |
| Managed AI (`OPENAI_API_KEY` + `SENTRABOT_MANAGED_AI_FREE_BUDGET_MICROS`) | both present | the same as model providers, through the deployment's OpenAI key |
| E2B / Daytona / Box (`E2B_API_KEY`, `DAYTONA_API_KEY`, `BOX_API_KEY`) | key present | the computer workspace, files, screenshots, and commands |
| Composio / Pipedream | keys present | integration OAuth, tool arguments, and tool results |
| Supermemory (`SUPERMEMORY_API_KEY`) | key present | memory documents |
| SendBlue / WhatsApp Cloud API | all keys present | phone numbers, message bodies, media |
| Xendit | `XENDIT_API_KEY` | billing references and amounts |
| PostHog (`PUBLIC_POSTHOG_*`) | key present | anonymous product metadata only |

None of these is required to run the product. Transcripts, memory, files, audit events, approval
rules, and locally managed credentials stay in the self-hosted PostgreSQL and `DATA_DIR`.

## Decision log

### 2026-09-02 — `apps/api` is the harness

- Problem: the convergence directive assumes a separate harness process on `127.0.0.1:8799`.
- Evidence: no such process exists; `apps/api` already owns commands, SSE, permissions, and sandbox
  orchestration; port 3100 is embedded in `.env.example` and in mobile and desktop tests.
- Decision: Model A. The harness is `apps/api`; the worker is its execution lane. The port stays 3100.
- Rejected: a new harness process (a second control plane); renaming or re-porting (cosmetic churn).
- Trade-off: `apps/api/src/app.ts` and `apps/worker/src/index.ts` each compose the runtime until a
  shared helper is extracted.
- Migration consequence: none.

### 2026-09-02 — package namespaces

`@rakazo/*` and `@safrs/*` do not exist in this capsule; `@sentrabot/*` is canonical. No migration
boundary is needed.

### 2026-09-02 — hybrid Control Plane / Desktop Runtime is frozen as experimental

- Problem: the hybrid design (`docs/superpowers/specs/2026-09-01-sentrabot-hybrid-platform-design.md`)
  and the server-owned runtime coexisted, with the relay SSE stream (`/v1/events`,
  `/v1/relay/events`) mounted by default although no client consumes it.
- Evidence: 4 of 32 plan steps done; no consumer of the relay stream in web, desktop, or mobile;
  the `outbox_events` table has no application writer; the desktop runtime lease loop executes nothing.
- Decision: the relay stream is mounted only when `SENTRABOT_CONTROL_PLANE_RELAY=enabled`. Platform
  routes (device and runtime registry, key envelopes, sync objects, runtime leases) stay mounted
  because the desktop app calls them. Code and tables are kept; work resumes after the golden path
  in the convergence plan passes.
- Rejected: deleting the scaffolding (loses approved design work); continuing as the target now
  (two competing control planes during stabilization).
- Trade-off: `outbox_events` and the desktop lease remain unused debt until the hybrid work resumes.
- Migration consequence: none.

### 2026-09-02 — tool policy on trusted host computers is unchanged

- Problem: on a `desktop` computer the builtin tools `shell`, `write_file`, `launch_app`, and
  `open_path` are approval-exempt, exactly as inside an isolated sandbox.
- Decision: keep the current behavior; host execution is opt-in by the deployment owner and is
  labeled as trusted host execution. Making these tools ASK by default on host computers is a
  possible follow-up, not part of the convergence phase.
- Trade-off: the human authority boundary on the host is the opt-in itself, not per-action review.
