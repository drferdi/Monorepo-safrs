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
| Background jobs | `packages/adapter-kit/src/background-jobs.ts`. Every job carries a `jobKey`, so redelivery replaces instead of duplicating. The reconciler re-enqueues queued runs, expired leases, near-due routines, and expired control leases. When a worker dies holding a job, the reconciler's keyed re-enqueue makes Graphile (0.17) mark the locked row permanently failed and insert a fresh one, so a new worker picks the work up within its poll interval; recovery never waits for Graphile's 4-hour stale-lock window (`packages/adapters/src/graphile-restart.postgres.test.ts`). |
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
by default, and only the deployment owner can enable it. On a host computer the `shell`,
`write_file`, `launch_app`, and `open_path` tools ask for approval unless an always-allow rule
matches. Containment on Windows relies on Win32 handles opened relative to a held parent handle
(`packages/adapters/src/desktop-sandbox-win32-path.ts`); Node's descriptors are not visible to the
C runtime, so the module verifies handle identity (volume serial + file index) instead of bridging
descriptors, and a directory whose pathname no longer resolves to the held inode fails closed. When
an identity mismatch is detected right after an exclusive create, the created object is deleted
through its own handle rather than by pathname, so nothing is left behind in the held parent. One
residual property remains: a child that is a reparse point (junction or symlink) is rejected
outright on Windows, which is stricter than the POSIX branch. The executable bit cannot be
persisted on Windows.

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
  the `outbox_events` table appeared to have no application writer (corrected 2026-09-03: the
  billing path writes it — see the 2026-09-03 decision below); the desktop runtime lease loop
  executes nothing.
- Decision: the relay stream is mounted only when `SENTRABOT_CONTROL_PLANE_RELAY=enabled`. Platform
  routes (device and runtime registry, key envelopes, sync objects, runtime leases) stay mounted
  because the desktop app calls them. Code and tables are kept; work resumes after the golden path
  in the convergence plan passes.
- Rejected: deleting the scaffolding (loses approved design work); continuing as the target now
  (two competing control planes during stabilization).
- Trade-off: `outbox_events` and the desktop lease remain unused debt until the hybrid work resumes.
- Migration consequence: none.

### 2026-09-02 — host-affecting tools ask on trusted host computers

- Problem: on a `desktop` computer the builtin tools `shell`, `write_file`, `launch_app`, and
  `open_path` were approval-exempt, exactly as inside an isolated sandbox, although they act on
  the operator's own machine.
- Decision: `applyHostExecutionPolicy` (`packages/core/src/action-approval.ts`) turns those four
  tools into ASK when the run's computer kind is `desktop`, unless an `always_allow` workspace rule
  matches the tool; `require_approval` rules still ask. Isolated sandboxes are unchanged.
- Rejected: keeping them exempt (the opt-in alone would be the whole authority boundary); a
  separate host capability grant (new schema for the same decision).
- Trade-off: more approval cards for shell-heavy work on This Mac until the user adds an
  `always_allow` rule for the tool.
- Migration consequence: none; rules are evaluated per call.

### 2026-09-02 — router decomposition starts with routines

- Problem: `apps/api/src/router.ts` held every oRPC handler group plus their helpers (3870 lines).
- Decision: handler groups move one at a time into `apps/api/src/routes/<domain>.ts` as
  `create<Domain>Routes(deps, authed, repos, …)` factories; the shared oRPC context and the
  `authed` middleware live in `apps/api/src/authed.ts`. `routines` moved first because its helpers
  were self-contained and the integration journeys already pin its behavior. Candidates next:
  `mcp` (integrations), `computer`, `phone`.
- Trade-off: `RouterDeps` still lives in `router.ts` and is imported as a type by the route modules.

### 2026-09-02 — structured run log

- Decision: `runLog(event, fields, level)` in `packages/core/src/run-log.ts` writes one JSON line
  per event to stdout. The executor emits `run.attempt.started`, `run.tool.gated`,
  `run.effect.recorded`, and `run.lease.lost` with workspace, bot, thread, run, worker, fence,
  tool name, gate decision and source, effect key, and computer kind. Fields are identifiers and
  enums only; never prompts, tool arguments, message text, or stack traces.

### 2026-09-02 — shared agent-runtime composition

- Problem: `apps/api/src/app.ts` and `apps/worker/src/index.ts` each hand-built the executor,
  sandbox, connectors, and job handlers, and drifted (the worker lacked WhatsApp messaging).
- Decision: `composeAgentRuntime` (`packages/adapters/src/agent-runtime-composition.ts`) is the one
  place that builds them; both processes call it with their resolved configuration.
- Trade-off: the worker now warms the Composio and Pipedream directories at startup like the API.

### 2026-09-03 — dead relay alias `/v1/events` removed

- Problem: the experimental relay registered two GET routes for the same event stream
  (`/v1/events` and `/v1/relay/events`); the alias predates the canonical path name and nothing
  calls it.
- Evidence: a repo-wide grep for `v1/events` across `apps/*`, `packages/*`, and `infra/*` found
  only the registration and one relay test; web, mobile, desktop, and the contracts package have
  no reference. The older implementation spec
  (`docs/superpowers/specs/2026-09-01-sentrabot-implementation-spec-v1.md`) named `/v1/events`,
  but the relay itself is frozen as experimental and off by default.
- Decision: remove the alias; the untrusted-runtime test now pins `/v1/relay/events`.
- Rejected: keeping the alias for spec compatibility (no consumer exists, and the relay is off by
  default).
- Trade-off: anything still following the older spec path gets a 404 while the relay is disabled.
- Migration consequence: none (the route was never mounted unless
  `SENTRABOT_CONTROL_PLANE_RELAY=enabled`).

### 2026-09-03 — `outbox_events` is a write-only outbox (recorded debt)

- Problem: the table was recorded as having "no application writer", but billing writes it; the
  real gap is that nothing drains it.
- Evidence: `applyVerifiedPaymentEvent`/`applyEntitlementEvent` (`packages/db/src/platform.ts`)
  create `entitlement.changed` rows inside the live Xendit webhook transaction; no read path
  exists anywhere, so `sentAt` is never set.
- Decision: document it as permanent debt tied to the frozen hybrid control-plane work. No
  drain/deliverer is added and the writer is not removed without Chief's approval.
- Rejected: wiring `drainOutbox` now (the hybrid work is frozen); dropping the table (never
  without an approved migration).
- Trade-off: rows accumulate locally with `sentAt` null; harmless in the self-hosted database,
  revisited when the hybrid work resumes.
- Migration consequence: none.

### 2026-09-03 — sentrabot is a standalone workspace, not a Monorepo member

- Problem: the Monorepo root glob `projects/*/*/apps/*` absorbed sentrabot's apps into the root
  workspace, so a root `pnpm install` resolved sentrabot's dependencies (electron,
  electron-builder, @vitejs/plugin-react, fast-check, @orpc/contract, @types/d3-dsv) under the
  root's pinned pnpm, whose registry metadata fetch fails on this Node with `ERR_INVALID_THIS`.
- Fact: sentrabot already carries its own `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`,
  biome, turbo, tsconfig, and CI workflows; no `catalog:` references and no `@safrs/*` imports
  in code — only its git root sits inside the Monorepo repository.
- Decision: sentrabot stays a self-contained workspace that must install, test, and build with
  `pnpm@9.15.0` from its own root, independent of the Monorepo. The Monorepo root
  `pnpm-workspace.yaml` now excludes `projects/product/sentrabot/**` (same standalone-capsule
  contract as kediri-history and academic-smartboard).
- Evidence: `pnpm install` in sentrabot resolves 21 workspace projects from its own lockfile;
  `pnpm test` 2060 passed / 0 failed; `pnpm --filter cora build` succeeds; Monorepo root
  install regenerates cleanly with 0 sentrabot importers in its lockfile.
- Consequence: dependency changes in sentrabot must never be validated by installing at the
  Monorepo root, and vice versa; the Monorepo lockfile no longer pins anything for sentrabot.

