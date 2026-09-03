# SentraBot Convergence Directive — Assessment and P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the SentraBot repository into alignment with one verified runtime architecture (ONE ARCHITECTURE → ONE GOLDEN PATH → ONE PROVEN RUNTIME) through evidence-based, minimal, tested fixes.

**Architecture:** `apps/api` (Hono + oRPC on `API_HOST:API_PORT`, default `127.0.0.1:3100`) is the public runtime boundary. `apps/worker` (Graphile Worker) is the execution lane that shares the same composition. PostgreSQL via Prisma is the only system of record; the thread event table (`events.threadId + seq`) feeds the single client SSE stream (`threads.subscribe`). Sandbox execution goes through `SandboxProvider` adapters (Docker via the supervisor, E2B, Daytona, Box, fake, none) with trusted host execution (`desktop` / "This Mac") as a separate, opt-in class.

**Tech Stack:** TypeScript strict, Hono, oRPC, Better Auth, Prisma/PostgreSQL, Graphile Worker, Vitest, Playwright, testcontainers (integration harness).

**Governing document:** `docs/plans/CLAUDE CODE — SENTRABOT CONVERGENCE DIRECTIVE.md`

## Global Constraints

- Do not redesign the product, add features, rename packages, replace Hono/oRPC/Prisma/Graphile/React, or introduce Redis/Kafka/Kubernetes/event sourcing (Directive §20).
- No mass refactors; split files only at a proven responsibility boundary (Directive §13).
- Preserve the `@sentrabot/*` namespace; `@rakazo/*` and `@safrs/*` do not exist in this capsule (verified by grep; also recorded in `docs/superpowers/plans/2026-09-01-hybrid-platform-public-launch.md` Global Constraints).
- Every code change follows FACT → DEVIATION → MINIMUM FIX → TEST → VERIFY; write the failing test first (Directive §21, §18).
- Do not commit, deploy, or mutate production data without Chief's explicit request.
- Stop and report on: incompatible persistent data models, data-loss migrations, unknown credential ownership, security behavior contradicting documented user authority, unresolvable production semantics (Directive §26).
- Documentation in this repository is written in English.

---

## Part A — Factual Runtime Map (verified from code, 2026-09-02)

### A.1 Facts with evidence

| Question | Verified answer | Evidence |
|---|---|---|
| What starts the product? | `pnpm dev` runs turbo for `@sentrabot/api`, `@sentrabot/worker`, `@sentrabot/web`, `@sentrabot/sandbox-supervisor`. Compose stacks run `postgres`, `supervisor`, `api` (runs `prisma migrate deploy` first), `worker`, `web`. | `package.json` `scripts.dev`; `infra/compose/docker-compose.yml` lines 3–117 |
| Which ports? | API `API_HOST:API_PORT` default `127.0.0.1:3100`; web Vite `127.0.0.1:5173` proxying `/api` and `/rpc` to the API; supervisor `SUPERVISOR_HOST` default `127.0.0.1:7091`; Postgres `5433` (dev). **No process listens on 8799; "harness" appears only in the directive and in `docs/plans/whatsapp-mvp-spec.md`.** | `apps/api/src/env.ts:144`; `apps/api/src/index.ts`; `apps/web/vite.config.ts:159-166`; `infra/sandboxes/supervisor/src/index.ts:593`; grep of `8799` |
| Who owns HTTP commands? | `apps/api/src/app.ts` `createApp()`: Better Auth at `/api/auth/*`, oRPC `RPCHandler` at `/rpc/*` (contract in `packages/contracts/src/rpc.ts`, handlers in `apps/api/src/router.ts`, 3870 lines), plus Hono routes: relay (`/v1/relay/commands`, `/v1/events`, `/v1/relay/events`), platform (`/v1/devices*`, `/v1/runtimes*`, `/v1/runtime-leases/*`, `/v1/key-envelopes`, `/v1/sync/objects*`, `/v1/control-plane/identity`), managed AI, billing, Xendit/voice/webhook/phone/WhatsApp webhooks, `/health`. | `apps/api/src/app.ts:380-660`; `apps/api/src/platform-routes.ts:94-270`; `apps/api/src/relay-routes.ts:27-73` |
| Who owns SSE / realtime? | Canonical stream: `threads.subscribe` (oRPC `eventIterator(ProductEventSchema)`) → `followThreadEvents()` reads `events` rows after a `seq` cursor, batches of `EVENT_BATCH_SIZE`, wakes on Postgres `LISTEN sentrabot_events` (`PostgresRealtimeFanout`) with a poll fallback. Durable rows are the truth; NOTIFY only carries `{cursor}`. **A second SSE stream exists**: relay `/v1/events` uses `streamSSE` over the transient fanout topic `relay:<runtimeId>` with no persistence, no replay, and **zero consumers** in web, desktop, or mobile. | `apps/api/src/router.ts:984-992`; `packages/db/src/events.ts:869-905`; `packages/adapters/src/realtime.ts`; `apps/api/src/relay-routes.ts:50-73`; grep of `/v1/events` across `apps/*` → no consumers |
| Who owns agent execution? | `createRunExecutor()` (`packages/adapters/src/executor.ts`, 3404 lines). It is composed **twice**: in `apps/api/src/app.ts` and in `apps/worker/src/index.ts`. With `WAKEUP_DRIVER=graphile` (all Compose files) only the worker runs job handlers; the API's `createBackgroundJobHandlers` result is never started. With `WAKEUP_DRIVER=memory` (integration harness) the API runs an in-process queue and reconciler. | `apps/api/src/app.ts:296-340`; `apps/worker/src/index.ts`; `packages/testkit/src/cli/harness.ts:55` |
| Background jobs | Graphile tasks: `run.continue`, `phone.deliver`, `routine.wakeup`, `computer.sleep`, `computer.control-expire`, `skill.teaching-expire`, `history.compact`. Every job carries a `jobKey` (`run:<id>`, `routine:<id>`, …) so redelivery replaces rather than duplicates. Worker concurrency 4, poll 500 ms. A reconciler (30 s interval, Postgres advisory-lock leadership) re-enqueues queued runs, expired leases (`leaseExpiresAt <= now`), near-due routines (60 s lookahead), and expired control leases. | `packages/adapters/src/background-job-handlers.ts:39-90`; `packages/adapter-kit/src/background-jobs.ts:64-131`; `packages/adapters/src/wakeup.ts`; `packages/adapters/src/job-reconciler.ts:94-215` |
| Who owns sandbox lifecycle? | Both API and worker hold a `SandboxProvider` built by `createRunSandbox(kind, …)`. `docker` → `DockerSandboxProvider` → supervisor HTTP (bearer token) → dockerode containers; `e2b`/`daytona`/`box` remote SDKs; `desktop` → `DesktopSandboxProvider` (host process spawn, roots = `DATA_DIR` + `homedir()`); `fake`/`none`/emulators. When `kind === "docker"` the provider is wrapped in `HostAwareSandbox`, which **routes provisioning to the host provider when `deploymentSettings.computerHost === "this-mac"`**. Computer state (`state`, control/execution leases, fences) is durable in `computers` / `computer_execution_leases`. | `packages/adapters/src/host-aware-sandbox.ts:22-53`; `packages/adapters/src/sandbox-factory.ts`; `packages/db/prisma/schema.prisma` models `Computer`, `ComputerExecutionLease`; `infra/sandboxes/supervisor/src/index.ts:90-570` |
| Where does durable state live? | PostgreSQL (Prisma): `runs` (status FSM, `leaseOwner`/`leaseFence`/`leaseExpiresAt`, `checkpoint`, unique `[workspaceId, clientNonce]`), `attempts`, `external_effects` (unique `idempotencyKey`, status `intended/completed/failed/ambiguous/reconciled`), `events` (unique `[threadId, seq]`), `routines` (`nextRunAt`, `lastRunAt`), `graphile_worker` job tables, `secrets` (AES via `ENCRYPTION_KEY`), `deployment_settings`. Filesystem `DATA_DIR`: agent homes, artifacts, push tokens. | `packages/db/prisma/schema.prisma:592-700`; `packages/contracts/src/ids.ts:24-43`; `apps/api/src/app.ts:150-170` |
| Where are permissions enforced? | Server-side, inside the executor tool gate: `toolRequiresApproval()` (builtin exempt list; connector mutating-name patterns) → `resolveActionApprovalDetail()` (workspace `action_approval_rules`: tool/connector/category, `always_allow`/`require_approval`) → `planActionGate()` (optional auto-review judge that can only escalate to ask). ASK persists an `ExternalEffect` `intended` + an `ask` block and parks the run in `waiting_input`; the answer (`allow` / `always` / `deny`) is recorded on the effect and the run resumes via `run.continue`, replaying approved requests in order. There is no separate DENY class: denial is only a user decision at ask time. | `packages/core/src/action-approval.ts`; `packages/adapters/src/executor.ts:1157-1200`; `packages/adapters/src/approval-effect.ts`; `packages/db/src/events.ts:452` |
| How does the web client receive state? | oRPC over `fetch` with `credentials: "include"`; SSE via the oRPC event iterator. `Shell.tsx` keeps one subscription loop per active view (bot thread effect keyed on `active?.id`, group thread effect keyed on `groupId`), tracks `cursor = max(seq)`, reconnects with backoff and re-snapshots the thread on reconnect. No `EventSource`, `WebSocket`, provider SDKs, or `import.meta.env` credentials in `apps/web/src`. Mobile calls `/rpc/threads/subscribe` with `accept: text/event-stream`. | `apps/web/src/lib/rpc.ts`; `apps/web/src/pages/Shell.tsx:1093-1164, 1261-1309`; `apps/mobile/lib/api.ts:328-345` |
| Desktop app | Electron shell that loads the web UI from a configured server URL (`setup-config.ts`). It also runs a `DesktopRuntimeController` every 15 s that registers a device/runtime and acquires a "runtime lease" via `/v1/control-plane/identity` and `/v1/runtime-leases/*`, then writes a local `sentra-personal.json` marker. **It executes nothing.** Failures retry every 15 s forever. | `apps/desktop/src/main.ts:114-184`; `apps/desktop/src/runtime-controller.ts`; `apps/desktop/src/personal-bot.ts` |
| What survives restart? | Runs: lease claim is a fenced CAS (`continueRun`), lease 5 min renewed every 60 s; expired leases are reclaimed with a higher fence; terminal runs are never re-run; interrupted effects are recorded `ambiguous`/uncertain and not replayed. Routines: `nextRunAt` CAS claim inside a transaction, keyed wakeup job, reconciler re-arm. Waiting permission: `waiting_input` is a durable status and is not touched by the reconciler. Events: durable with `seq`; clients resume from cursor. | `packages/adapters/src/executor.ts:540-725`; `packages/core/src/run-state.ts`; `packages/testkit/src/executor-lifecycle.test.ts`; `packages/testkit/src/journeys.test.ts` (3, 5, 8, 15, 21) |

### A.2 Actual topology

```text
Web (Vite 127.0.0.1:5173, proxies /api,/rpc)   Mobile (Expo)   Desktop (Electron shell → server URL)
        │  HTTP: Better Auth /api/auth/*, oRPC /rpc/* (commands)
        │  SSE : /rpc/threads/subscribe (event iterator, durable seq cursor)      ← canonical
        │  SSE : /v1/events, /v1/relay/events (transient, no consumers)          ← drift
        ▼
apps/api  — Hono on API_HOST:API_PORT (127.0.0.1:3100)          ← the de-facto harness
   ├─ auth/session (Better Auth), workspace actor (requireMembership)
   ├─ router.ts (oRPC): bots, threads, runs, routines, computers, integrations, deployment
   ├─ platform/relay/billing/managed-ai/webhook Hono routes
   ├─ composition root #1: executor + sandbox + connectors + memory + events
   │    (job handlers built but NOT started when WAKEUP_DRIVER=graphile)
   └─ PostgresRealtimeFanout (LISTEN sentrabot_events)
        ▼
PostgreSQL (Prisma) ── graphile_worker ──▶ apps/worker
   runs · attempts · external_effects        ├─ composition root #2 (hand-copied, diverges)
   events(seq) · routines · computers        ├─ Graphile host: run.continue, routine.wakeup, …
   deployment_settings · secrets             └─ reconciler (advisory-lock leader)
        ▼
SandboxProvider ── docker ──▶ sandbox-supervisor (127.0.0.1:7091) ──▶ Docker computer containers
                ── e2b | daytona | box (remote) ── fake | none
                ── desktop ("This Mac"): spawns on the API/worker host, roots DATA_DIR + $HOME
DATA_DIR: agent homes, artifacts, push tokens
```

### A.3 Run lifecycle mapping (Directive §9 states → existing FSM)

The repository already has an explicit finite state model (`packages/core/src/run-state.ts`, `packages/contracts/src/ids.ts:24-34`). No new states are needed:

| Directive state | Existing representation |
|---|---|
| created | `Task` + `Run` rows created with `status: "queued"` |
| queued | `queued` |
| starting | `leased` (fenced CAS claim, 5-minute lease) |
| running | `running` (+ `Attempt` row per fence) |
| waiting_permission | `waiting_input` (ask block + `ExternalEffect` `intended`) |
| paused | `waiting_takeover` (human takes the screen) |
| retrying | `failed → queued` transition; expired-lease reclaim with `leaseFence + 1` |
| completed / failed / cancelled | terminal statuses; `assertTransition` forbids leaving `completed`/`cancelled` |
| timed_out | not a status: lease expiry (`leaseExpiresAt`, heartbeat every 60 s) plus `SANDBOX_COMMAND_TIMEOUT_MS`. The heartbeat renews the lease independently of command duration, so the 5-minute lease and the 5-minute command timeout do not race. Cancellation is observed when the next heartbeat fails to renew (≤ 60 s) and via fenced writes. |

### A.4 Baseline verification run before any change (2026-09-02, Windows 11)

| Command | Result |
|---|---|
| `pnpm --filter @sentrabot/core test` | 31 files, 360 tests passed |
| `pnpm --filter @sentrabot/adapters test` | 13 failed / 792 passed / 7 skipped. **All 13 failures are in the trusted-host (`desktop`) sandbox on Windows**: `desktop-sandbox-paths.test.ts` ("compares Windows roots case-insensitively…" → `isAllowedDesktopPath("c:\\users\\owner\\…")` returns `false`), `desktop-sandbox-write-containment.test.ts` (6), `sandbox-conformance.test.ts` (1), `sandbox-faults.test.ts` (4) — `Error: Path escapes the computer workspace` from `desktop-sandbox-win32-path.ts:43`. |
| `pnpm --filter @sentrabot/api test` | 2 failed / 206 passed. Both in `relay-routes.test.ts`: fixtures hard-code `expiresAt: "2026-09-02T00:01:00.000Z"`, which expired today, so the handler returns `410` before reaching the `409`/`413` branches under test. |
| `pnpm --filter @sentrabot/api --filter @sentrabot/adapters --filter @sentrabot/worker check` | tsc clean |
| Postgres-backed tests (`*.postgres.test.ts`, `packages/testkit`) | not run in this assessment (they need `VERIFY_DATABASE=1` + testcontainers/Docker via `pnpm test:integration`) |

Working tree for `apps/api`, `apps/worker`, `packages/adapters` was clean, so all failures above are pre-existing.

---

## Part B — Architecture Drift Matrix

| # | Area | Intended (Directive) | Actual (verified) | Evidence | Severity | Required fix |
|---|---|---|---|---|---|---|
| 1 | Harness `127.0.0.1:8799` vs API `:3100` | One harness server on 8799 owning commands, SSE, permissions, supervisor, sandbox orchestration | No harness process exists. `apps/api` already owns all of those responsibilities on `127.0.0.1:3100`. The port is hard-coded in `.env.example`, mobile tests, desktop setup tests. | `apps/api/src/env.ts:144`; grep `8799` → only the directive and `docs/plans/whatsapp-mvp-spec.md:32` | Medium (decision + docs, no code) | **Model A**: declare `apps/api` the harness/public runtime boundary; keep 3100; record decision; align README/self-host docs (Task 1) |
| 2 | Competing control planes | One explicit answer for the role of `apps/api`; no second runtime/control plane | Two approved directions coexist: (a) server-owned execution (API + worker, mature, tested); (b) the 2026-09-01 hybrid design ("Desktop Runtime owns execution; Control Plane relays ciphertext") with 4 of 32 plan steps done, its spec header still saying "implementation has not started", schema tables `Device`, `Runtime`, `KeyEnvelope`, `SyncObjectIndex`, `RuntimeLease`, `OutboxEvent` (no application writer for `OutboxEvent`), platform routes mounted unconditionally, and the desktop lease loop. | `docs/superpowers/specs/2026-09-01-sentrabot-hybrid-platform-design.md:3`; `docs/superpowers/plans/2026-09-01-hybrid-platform-public-launch.md` (checkbox count 4/32); `apps/api/src/app.ts:400-530`; grep `outboxEvent.` → generated client only | High (architectural ambiguity) — **decision required from Chief** (Directive §26) | Freeze (b) as experimental behind an explicit flag until the golden path passes, or continue (b) as the target. Task 4 implements the freeze if chosen. Record `OutboxEvent` as debt; never drop tables. |
| 3 | Single SSE model | One canonical client activity stream | Two: `threads.subscribe` (durable, replayable) and relay `/v1/events` + `/v1/relay/events` (transient, no replay, no consumers, tests failing since today). | `apps/api/src/relay-routes.ts:50-73`; consumer grep empty; `relay-routes.test.ts` fixtures | High | Task 3 (repair time-bomb tests) always; Task 4 (do not mount relay routes unless `SENTRABOT_CONTROL_PLANE_RELAY=enabled`) if Chief freezes the hybrid path |
| 4 | Composition ownership | Agent process ownership explicit; one runtime composition | `app.ts` and `worker/index.ts` hand-copy the same 25-dependency composition and diverge: the worker never constructs `WhatsAppMessagingProvider`, passes no `whatsappMessaging`/`phoneLocale` to `createBackgroundJobHandlers`, and only wires the phone context loader for SendBlue. In the production topology (`WAKEUP_DRIVER=graphile`) `run.continue` and `phone.deliver` execute in the worker, where `primaryMessaging()` is `undefined` for WhatsApp-only deployments, so the handler returns before `deliverPhoneOutbound`. **Suspected outbound-WhatsApp loss in production; confirmed only when the failing test in Task 2 runs.** | `apps/worker/src/index.ts` (no `whatsapp` symbol); `apps/api/src/app.ts:234-245, 318-334`; `packages/adapters/src/background-job-handlers.ts:36-70` | High (runtime correctness) | Task 2: extract `workerMessagingFromEnv()` using the same helpers the API uses, wire it, add the worker's first test. Shared composition helper for both processes is P1. |
| 5 | Sandbox vs trusted host execution | Host execution labeled, opt-in, separate security class, never called sandbox isolation | Opt-in already holds: `computerHost` defaults `null`, only the deployment owner may set `this-mac`, `HostComputerPrompt` asks once, `this-mac` is refused unless `SANDBOX_PROVIDER=docker` (journey 14). Gaps: `HostAwareSandbox.describe()` reports the Docker provider even while routing to the host; `/health` reports `sandbox: docker`; docs call it "Desktop provider"; `SANDBOX_PROVIDER=desktop` (no prompt) is a first-class value; the builtin exemption list (`shell`, `write_file`, `launch_app`, `open_path`) is identical on the host; **on Windows the host provider's path containment fails 13 tests (see A.4)**. *Resolved 2026-09-02 (batch 2): the failures came from the msvcrt fd bridge, now replaced; the adapters suite is green on Windows.* | `packages/adapters/src/host-aware-sandbox.ts:56-58`; `apps/api/src/router.ts:398-405, 3521-3529`; `packages/core/src/action-approval.ts:3-20`; `docs/self-host.md:138-142` | High (security truthfulness) | Task 5: label host execution "experimental / trusted host, not isolation, unsupported on Windows until containment tests pass" in docs and `.env.example`; add the DENY invariant test (host never reached when `computerHost` is not `this-mac`). **Whether host-affecting tools (`shell`, `write_file`, `launch_app`, `open_path`) should become ASK on a `desktop` computer is a policy decision for Chief** (Directive §7 lists host-when-disabled as DENY, not host-when-enabled as ASK). |
| 6 | Permission broker model | USER POLICY → CAPABILITY GRANT → ACTION → RISK CHECK → ALLOW / ASK / DENY | ALLOW/ASK exist with deterministic rule precedence and a fail-closed judge. DENY is implicit: workspace isolation via `requireMembership`/`resolveThreadTarget`, path containment in sandboxes, `this-mac` refusal. No cross-workspace or unauthorized-credential case reaches the tool gate as an explicit DENY decision. | `packages/core/src/action-approval.ts:110-175`; `apps/api/src/app.ts:533-545`; `apps/api/src/thread-target.ts` | Medium | Document the mapping (Task 1 architecture doc). No engine change in P0. |
| 7 | Local-first trust boundary | Truthful disclosure of what optional remote providers receive | Product copy states "Data tinggal di tempat Anda … Kami tidak punya pintu belakang" while optional providers (model providers, E2B/Daytona/Box, Composio, Pipedream, Supermemory, managed OpenAI, PostHog, SendBlue/WhatsApp Cloud API, Xendit) receive data when configured. `SECURITY.md` scopes them out; no single disclosure table exists. Root `README.md` describes only the landing site; `docs/self-host.md:7` points to a "README quick start" that does not exist in this capsule (the pre-rebrand README was the SAFRS governance page). | `apps/site/public/tentang.html:58-59`; `apps/api/src/env.ts` key list; `README.md`; `git show f05e7a9:README.md` | Medium (docs) | Task 1: one provider disclosure table in `docs/architecture.md`, README pointer. Marketing copy change is flagged for Chief, not edited here. |
| 8 | Routines / background execution | Schedule survives restart; exactly one execution per occurrence; retries do not duplicate side effects | Verified: transactional `nextRunAt` CAS claim, keyed wakeup job, reconciler lookahead, tests 5/5b/21/22/23 and reconciler unit tests. Gap: the "routine survives restart and fires once" invariant is proven only with fakes, not on Postgres. | `packages/adapters/src/executor.ts:495-640`; `packages/adapters/src/job-reconciler.test.ts:42` (fakes) | Low (verify) | Task 6 adds the Postgres-backed test |
| 9 | Recovery / idempotency | Worker restart keeps durable state; duplicate job does not duplicate action; permission wait survives restart | Verified on Postgres: single claim, expired-lease reclaim with higher fence, no replay of interrupted effects, fenced terminal commit, atomic rollback (`executor-lifecycle.test.ts`); retry of a completed effect does not duplicate (journey 8); SSE reconnect from cursor (journey 3). Gap: "waiting permission survives restart" has no direct test. | `packages/testkit/src/executor-lifecycle.test.ts:38-260`; `packages/testkit/src/journeys.test.ts:463, 1140` | Low (verify) | Task 6 adds the test |
| 10 | Client-side transports | Client → HTTP commands; Client ← one SSE stream | Verified compliant for web and mobile. The only other browser transport is the noVNC screen iframe, which the web server proxies (`/novnc/*`) with a signed, expiring path — server-owned. | `apps/web/src/lib/rpc.ts`; `apps/web/vite.config.ts:20-40`; `apps/web/src/screen-proxy.ts` | None | — |
| 11 | `@rakazo/*` → `@safrs/*` | Controlled migration boundary | Neither namespace exists; everything is `@sentrabot/*`. | grep | None | Record N/A in the decision log (Task 1) |
| 12 | Observability | Correlation across workspace/bot/thread/run/job/tool/permission/sandbox | Present: `runId`, `attempt.fence`, `ExternalEffect.idempotencyKey`, `AdapterContext.operationId/traceId`, events `agent.tool.called`, `effect.recorded`, 21 `redactSecrets` sites in the executor. Logs are unstructured `console.error`. | `packages/contracts/src/events.ts`; `packages/adapters/src/executor.ts` | P1 | Deferred: structured run log helper after golden path |
| 13 | Monolithic files | Split only at proven boundaries | `router.ts` 3870, `Shell.tsx` 6489, `executor.ts` 3404 lines. No fix in this phase requires a split. | `wc -l` | P1 | Deferred |
| 14 | Stale config | — | `vitest.config.ts` and `biome.json` reference `apps/www`, which does not exist. | `ls apps/www` → missing | P2 | Task 7 |
| 15 | Desktop runtime loop | No client-owned orchestration | Desktop registers device/runtime and heartbeats a lease every 15 s against the control plane on every launch, creating rows with no consumer of the lease. | `apps/desktop/src/main.ts:114-184` | Medium (tied to #2) | Follows Chief's decision on #2; untouched in P0 otherwise |

---

## Part C — Root-Cause Analysis

| Root cause | Symptoms it explains | Not a root cause |
|---|---|---|
| **RC1 — Two approved architectural intents coexist.** The server-owned runtime (API + worker) is complete and tested. The hybrid Control Plane / Desktop Runtime design was approved on 2026-09-01 and partially scaffolded (contracts, schema, routes, desktop lease loop) but stopped at 4/32 steps. Nothing marks the scaffolding as experimental, so it ships mounted by default. | Drift #2, #3, #15; unused `OutboxEvent`; relay tests rotting; desktop 15-second control-plane loop. | The relay code being "old" or the platform tables existing. |
| **RC2 — Duplicated composition root without a parity check.** Two hand-maintained 25-dependency compositions (`app.ts`, `worker/index.ts`) drift silently because the worker has no tests and the integration harness runs `WAKEUP_DRIVER=memory` (API-only). | Drift #4 (WhatsApp/phone locale missing in the worker). | File size of `app.ts`. |
| **RC3 — Host execution modeled as "just another SandboxProvider".** `DesktopSandboxProvider` satisfies the same interface, the same tool exemptions, and is hidden behind `HostAwareSandbox`, so nothing in the runtime distinguishes isolation from trusted host execution. | Drift #5; `describe()`/`/health` masquerade; identical policy on host; Windows containment failures unnoticed. | The name "desktop". |
| **RC4 — Documentation ownership moved to the landing-site work.** The root README was replaced by the site README; `docs/self-host.md` still points at a quick start that never existed here; no document states the runtime topology. | Drift #1 (directive assumed a harness/8799 lineage), #7. | Old documentation per se. |

---

## Execution status (2026-09-02)

Decisions taken by Chief: solo implementation; hybrid Control Plane / Desktop Runtime **frozen as
experimental** (Task 4 applied); host-tool policy **unchanged** (Task 5 labels only).

| Task | Status | Verification evidence |
|---|---|---|
| 1 Architecture decision record + docs | done | `docs/architecture.md` created; README "Product runtime" section; `docs/self-host.md` references fixed (`apps/www` → `apps/site`, quick start pointer) |
| 2 Worker/API messaging parity | done | RED: `Cannot find module './messaging.js'`; GREEN: `apps/worker/src` 5 tests pass (`vitest run --root . apps/worker/src`); `pnpm --filter @sentrabot/worker check` clean. Note: `isSendBlueEnabled`/`isWhatsAppEnabled` are off under `process.env.VITEST` by design, so the test stubs `VITEST=""` to exercise the real rules and keeps one case proving the guard. |
| 3 Relay fixture repair | done | `apps/api` suite: 26 files, 209 tests pass (was 2 failing) |
| 4 Relay stream gated | done | RED: `expected undefined to be false`; GREEN: `env.test.ts` 14 pass; `createRelayRoutes` mounted only when `env.controlPlaneRelay`; `pnpm --filter @sentrabot/api check` clean; decision recorded in `docs/architecture.md`. Live `curl` check of `/v1/events` not run (no database on this machine). |
| 5 Host execution labeling + invariant | done | `host-aware-sandbox.test.ts` 7 pass including "never reaches the host provider while this-mac is off"; docs + `.env.example` updated |
| 6 Restart invariants on Postgres | done | Two tests added to `packages/testkit/src/executor-lifecycle.test.ts`. `pnpm test:integration` (testcontainer `postgres:16-alpine`): 10 files, 68 tests pass, exit 0. Verbose re-run of the lifecycle file alone: 10/10 pass, including "a due routine survives a restart and fires exactly once" and "a run waiting for permission is untouched by restart reconciliation". |
| 7 Stale `apps/www` references | done | `vitest.config.ts`, `biome.json`, `docs/self-host.md` |

### Batch 2 (2026-09-02, after commit 2aba358; multiagent, decisions by Chief: fix Windows containment now, ASK on host)

| Task | Lane | Status | Verification evidence |
|---|---|---|---|
| Host-affecting tools ASK on `desktop` computers (`applyHostExecutionPolicy`) | Opus | done | core 365 tests (+5), tsc core/adapters clean, three executor suites 26 pass; wiring is one call at the gate |
| Shared agent-runtime composition (`composeAgentRuntime`) used by API and worker | Opus | done | tsc api/worker/adapters clean; api 209 tests; worker 5; composition test; `pnpm test:integration` 68/68 on Postgres; `worker-artifacts.test.ts` repointed at the shared composition |
| Windows host containment: replace the msvcrt fd bridge with handle identity checks | Opus ×2 rounds, finished inline | done | root cause: `_get_osfhandle` cannot see Node's descriptors (probe returned `-1`); fix: `CreateFileW`/`NtCreateFile` relative to a parent handle whose volume serial + file index match `fstat` of the held fd, live `GetFinalPathNameByHandleW` on kept NT handles, directory pathname recheck (inline); adapters suite on Windows 811 passed, 0 failed (was 13 failed) |
| Executable bit on Windows | inline + lane | done | four assertions gated for the desktop provider on win32 (libuv `st_mode` carries no exec bit) |
| Rebrand-broken fixture in `desktop-sandbox-paths.test.ts` | inline | done | root restored to `sentrabot` (the rebrand had rewritten only the root string) |
| Avatar contract class on clay/organic variants; `group-chats.spec.ts` variant-neutral working assertion | Sonnet | done | ui-web 21 tests; E2E outcome recorded below |
| P1 §13 first split: `routines` handlers out of `router.ts` into `apps/api/src/routes/routines.ts` (+ `authed.ts` for the shared oRPC middleware) | Opus | done | moved block diffed byte-for-byte against HEAD (dedent only); `router.ts` −311/+7 lines; api 27 files / 213 tests; tsc clean; `pnpm test:integration` 68/68 and `routine-crud.spec.ts` 4/4 after the split |
| P1 §15 structured run log (`runLog` in core; four executor anchors: attempt started, tool gated, effect recorded, lease lost) | Sonnet | done | core 368 tests; executor suites 24/26 pass; JSON lines carry ids and enums only |
| P2 lint gate | inline | done | `biome.json` excludes the cloned site captures (`apps/site/assets`, `apps/site/original`, `apps/site/public/assets`, raw `apps/site/src/html` fragments); `biome check --write` applied repo-wide (line-wrapping only, verified with `git diff -w`); root Vitest 2048 passed; remaining supervisor failures on this machine are Windows-environment only (`python` missing, uid 0 ownership) |
| Golden path E2E (`pnpm test:e2e`) | inline | passed with load flakes | run 1: 32 passed / 3 failed; `golden.spec.ts` alone 4/4, `artifact-preview.spec.ts` alone 2/2; `group-chats` failed deterministically → avatar contract fix → 1/1. Run 2 (after fixes): 36 passed / 1 failed (`message-hover-actions`), which passes 2/2 alone. Root cause found in batch 4 (item 1). |

### Batch 4 (2026-09-02, next-steps list items 1-11; multiagent, commit per verified batch)

| Item | Lane | Status | Verification evidence |
|---|---|---|---|
| 1 E2E flakes under full-suite load | inline | resolved | root cause: spec files run in parallel workers against one shared API/web server with a 20 s expect timeout; `pnpm test:e2e --workers=1` → 37/37 (2.1 min). The harness now defaults to one worker (`--workers=N` passthrough added to `packages/testkit/src/cli/harness.ts`). |
| 2 WhatsApp delivery wiring pinned | Sonnet | done | `background-job-handlers.test.ts` 8/8: `run.continue` enqueues `phone.deliver` when only `whatsappMessaging` is configured; `phone.deliver` delivers through it; nothing is enqueued/delivered with no provider |
| 3 Host ASK invariant on Postgres | Opus | done | `packages/testkit/src/host-approval.test.ts` (registered in the integration harness): with `SANDBOX_PROVIDER=desktop` a scripted `shell` call parks the run in `waiting_input` with an `ask` block and an `intended` effect; an `always_allow` rule for `shell` lets it complete. Scripted runtime gained the `run the shell command "…"` pattern. 2/2 on a Postgres testcontainer with the real desktop provider. |
| 4 `router.ts` → `routes/mcp.ts` | Opus (+ inline: unused `repos` param dropped, `computerContext` moved to `route-context.ts` to avoid a runtime import cycle) | done | moved block byte-identical to HEAD; `router.ts` −448/+3; api 213; tsc and biome clean |
| 7a `Shell.tsx` → `components/composer/Composer.tsx` (+ `shared.ts` for `PendingAttachment`, `previewMessageText`) | Opus | done | Composer, slash label, mention icons moved token-identical (md5 of whitespace-stripped source equal on both sides); `Shell.tsx` −626/+3; web 153 tests, tsc, build, biome clean; E2E recorded below |
| 6 `router.ts` → `routes/phone.ts` | Opus | done | block and three phone-only helpers (+ `ACTIVE_CHANNEL_MEMBERS`, `PhoneIdentityRecord`, `whatsAppPairingStatus`) moved byte-identical; `router.ts` now 2240 lines; api 213; tsc, biome clean |
| 8 `executor.ts` helpers → `run-lifecycle.ts` (lease renew, retry delay, requeue) and `run-effects.ts` (record/complete effect, uncertain error) | Sonnet | done | seven functions byte-identical apart from `export`; `executor.ts` −120/+8; adapters suite 819 passed; tsc, biome clean. `continueRun` itself stays one closure (no proven boundary yet). |
| Test flakes on Windows | inline | done | `sandbox-conformance` abort test: temp-dir cleanup is best effort (killed child keeps the cwd open); `group-chats.spec.ts`: the second bot reply gets the same 60 s budget as the first. Full E2E with one worker after the Composer move: 36/37 with that single load flake, spec 1/1 alone. |
| 7b `Shell.tsx` → `components/conversation/MessageView.tsx` (MessageView, ToolSteps, six card/block components) | Opus (second order after a designed stop: Transcript renders MessageView, so the cluster moved instead of Transcript) | done | eight declarations md5-identical after `export` normalization; `Shell.tsx` 6489 → 4871 lines over 7a+7b; web 153 tests, tsc, build, biome clean; E2E recorded below |
| 9 `runLog` events extended: `run.finalized` (outcome, durationMs), `routine.fired`, `computer.provisioned`, `run.cancelled` (API stop path); `traceId` already equals `runId` in the run context | Sonnet | done | executor/router suites 37 pass; tsc api/adapters/core clean; fields remain ids and enums |
| 10 Graphile recovery after a dead worker | Opus (+ inline: explicit schema migration in `beforeAll`) | done | `graphile-restart.postgres.test.ts` (in the integration harness): a `run.continue` row locked by `dead-worker` two hours ago plus a keyed re-enqueue → handler runs exactly once on a new host, the orphan row is `key IS NULL, attempts = max_attempts`; a double keyed enqueue runs once. 2/2 on a Postgres testcontainer. Graphile 0.17.3 `add_jobs` semantics read from its SQL. |
| 11 Windows: retract the created object on identity mismatch | Opus | done | `FileDispositionInformation` via `NtSetInformationFile` on the NT handle (DELETE right requested only for `FILE_CREATE`); three new win32 tests; containment set 50/51 (one skip) |
| 5 `router.ts` → `routes/computer.ts` | Opus | done | block + six block-only helpers moved (transitive closure, so no value import back from `router.ts`); token-identical to HEAD (three biome line reflows after dedent); `router.ts` now 2512 lines (was 3870); api 213; tsc, biome, `pnpm lint` clean |

Repository-wide `pnpm lint` fails before and after this change set because of the cloned
landing-site assets (`apps/site/assets/*.js`, ~23k errors) and the `biome.json` schema-version note;
every file touched here passes `biome check` individually.

### Batch 7 (2026-09-03, next-steps items 12-16; decisions by Chief: register page is a static funnel in `apps/site`; `outbox_events` documented as write-only debt; the no-backdoor copy is aligned on all live site surfaces)

| Item | Lane | Status | Verification evidence |
|---|---|---|---|
| 12 `biome migrate` to schema 2.5.11 | inline | done, commit accepted by Chief | migration rewrote only `$schema` (2.5.8 → 2.5.11), `files.includes` untouched; `pnpm lint` exit 0 (2 pre-existing warnings in `infra/updater/src/compose-service.test.ts`, from CLI 2.5.11, not the schema bump) |
| 13 supervisor tests impossible on Windows gated | inline | done | `computer-spec.test.ts` argv test skips on win32 or missing `python3`; two `home-ownership.test.ts` symlink tests skip on win32 or non-root; `pnpm vitest run infra/sandboxes/supervisor/src` → 63 passed, 5 skipped, 0 failed (was 3 failed) |
| 14a dead `/v1/events` relay alias removed | inline | done | grep for `v1/events` in code → zero hits; relay suite 5/5; `tsc` clean; the untrusted-runtime test now pins `/v1/relay/events`; stale comments in `env.ts` and `.env.example` updated |
| 14b `outbox_events` recorded as write-only debt | inline | done | corrected fact: `applyVerifiedPaymentEvent`/`applyEntitlementEvent` (`packages/db/src/platform.ts`) write `entitlement.changed` rows from the live Xendit webhook path, no reader exists, `sentAt` never set; two 2026-09-03 decision-log entries added to `docs/architecture.md`, the frozen-hybrid evidence line corrected |
| 15 no-backdoor copy aligned with the provider table (all live surfaces) | inline | done | `tentang.html` panel and the `Privacy.html` bullet gained the optional-provider qualifier (vendor-access claims kept, "Titik." absolutism dropped); FAQ now says connected services receive data "sebatas fungsinya"; `privasi.html` left as-is (its claim is vendor-scoped and already followed by a third-party disclosure section); `pnpm --filter cora build` passes |
| 16 static register funnel page in `apps/site` | inline | done | `apps/site/public/daftar.html` (landing chrome, flow Daftar → pilih paket → Pasang, static funnel, CTAs point at the existing `/workspace` beta target); served check: `vite preview` → `daftar.html` HTTP 200, title + 3 panels + `polish.css` 200; `pnpm --filter cora build` passes; nav wiring into other pages intentionally not done (not requested) |

### Batch 8 (2026-09-03, residual closure and workspace-state reconciliation)

| Item | Status | Verification evidence |
|---|---|---|
| `continueRun` attempt body named | done | `executeRunAttempt(...)` owns the former attempt body; a pre-format comparison found the moved body byte-identical after indentation normalization. `pnpm --filter @sentrabot/adapters check` and adapters Vitest pass. |
| Frozen hybrid outbox | closed debt | No drainer, writer, or schema change. The existing billing writer and frozen-delivery decision remain canonical in `docs/architecture.md`. |
| Historical plan state | done | Part D and Part E now identify resolved decisions and historical instructions; Part F records only the frozen outbox residual. |
| Unrelated workspace state | classified | Restored the six uncommitted `gsap-cinematic` sources. `.agent/`, `.mimosa/`, and local preview captures are ignored; untracked documentation, legal, font, and product assets remain separate candidate source work and are not staged here. |

## Part D — Decisions resolved by Chief

All decisions in this section are historical. The selected outcomes are recorded in the
Batch 4–7 execution-status tables and `docs/architecture.md`; they are not active gates.

1. **Hybrid Control Plane / Desktop Runtime (Drift #2, #3, #15).** Options: (a) *Freeze as experimental* — keep code and tables, mount relay routes only behind `SENTRABOT_CONTROL_PLANE_RELAY=enabled`, record the decision, resume after the golden path passes (Tasks 3+4). (b) *Continue as target* — then the directive's canonical model must be amended and Task 4 is dropped. Recommendation: (a); the directive forbids two competing control planes and the scaffolding has no consumer today.
2. **Host-tool policy on a `desktop` computer (Drift #5).** Keep `shell`/`write_file`/`launch_app`/`open_path` approval-exempt on the trusted host (current), or make them ASK unless an `always_allow` rule exists. Recommendation: ASK by default on `desktop` computers, as a follow-up task after Task 5, because it changes user-visible behavior.
3. **Windows host execution.** With 13 containment tests failing on Windows, mark "This Mac"/`desktop` unsupported on Windows in docs (Task 5) until fixed. Fixing `desktop-sandbox-win32-path.ts` is security-sensitive work for the heavy lane, scheduled separately.

---

## Part E — Historical task instructions

The unchecked boxes below are the original implementation recipe. They are superseded by the
Batch 4–7 execution-status tables and do not represent remaining work.

### Task 1: Architecture decision record and documentation alignment (P0 — Architecture)

**Files:**
- Create: `docs/architecture.md`
- Modify: `README.md` (add a "Product runtime" section; keep the landing-site section)
- Modify: `docs/self-host.md:5-7` (replace the dangling "README quick start" reference)

**Interfaces:**
- Produces: the canonical description other tasks and docs link to (`docs/architecture.md`).

- [ ] **Step 1: Write `docs/architecture.md`**

```markdown
# Sentra Bot runtime architecture

This document describes what the repository does today. It is the single source of truth for the
runtime topology; other documents link here instead of restating it.

## Topology

(paste the diagram from Part A.2 of docs/superpowers/plans/2026-09-02-convergence-directive.md,
without the "← drift" annotations once Task 4 is applied)

## Process ownership

| Concern | Owner |
|---|---|
| Public runtime boundary, auth/session, HTTP commands (`/api/auth`, `/rpc`) | `apps/api` (Hono + oRPC on `API_HOST:API_PORT`, default `127.0.0.1:3100`) |
| Client activity stream | `threads.subscribe` over the oRPC event iterator, backed by the `events` table (`threadId`, `seq`); Postgres `LISTEN/NOTIFY` only wakes readers |
| Agent execution | `createRunExecutor` in `packages/adapters`, driven by Graphile Worker jobs in `apps/worker` (`WAKEUP_DRIVER=graphile`) or in-process in the API (`WAKEUP_DRIVER=memory`, tests only) |
| Permission broker | executor tool gate: `toolRequiresApproval` → workspace rules → optional auto-review → ALLOW or ASK; DENY is enforced by workspace membership, path containment, and provider gating |
| Sandbox lifecycle | `SandboxProvider` adapters; Docker computers through `infra/sandboxes/supervisor` (`127.0.0.1:7091`) |
| Durable state | PostgreSQL via Prisma; files under `DATA_DIR` |

## Run lifecycle

`queued → leased → running → (waiting_input | waiting_takeover | completed | failed | cancelled)`,
enforced by `packages/core/src/run-state.ts`. Leases are fenced (`leaseFence`) and renewed every
60 s; an expired lease is reclaimed with a higher fence. Consequential tool calls are recorded as
`external_effects` with a unique `idempotencyKey` before execution and are never replayed after an
interrupted result.

## Trusted host execution

`SANDBOX_PROVIDER=desktop` and the deployment-owner setting `computerHost = "this-mac"` run
commands on the API/worker host with the bot home and the user's home directory as allowed roots.
This is trusted host execution, not sandbox isolation. It is experimental, off by default, and
unsupported on Windows until `packages/adapters/src/desktop-sandbox-*.test.ts` pass there.

## Optional remote providers and what they receive

| Provider (env) | Enabled by | Receives |
|---|---|---|
| Model providers (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, user BYOK) | key present | prompts, tool results, memory context for the run |
| Managed AI (`OPENAI_API_KEY` + `SENTRABOT_MANAGED_AI_FREE_BUDGET_MICROS`) | both present | same as model providers, via the deployment's OpenAI key |
| E2B / Daytona / Box (`*_API_KEY`) | key present | the computer workspace, files, screenshots, commands |
| Composio / Pipedream | keys present | integration OAuth, tool arguments and results |
| Supermemory (`SUPERMEMORY_API_KEY`) | key present | memory documents |
| SendBlue / WhatsApp Cloud API | all keys present | phone numbers, message bodies, media |
| Xendit | `XENDIT_API_KEY` | billing references and amounts |
| PostHog (`PUBLIC_POSTHOG_*`) | key present | anonymous product metadata only |

Nothing in this table is required to run the product. Transcripts, memory, files, audit events,
approval rules, and locally-managed credentials stay in the self-hosted PostgreSQL and `DATA_DIR`.

## Decision log

### 2026-09-02 — `apps/api` is the harness
- Problem: the convergence directive assumes a separate harness on `127.0.0.1:8799`.
- Evidence: no such process exists; `apps/api` already owns commands, SSE, permissions, and sandbox orchestration; port 3100 is embedded in `.env.example`, mobile and desktop tests.
- Decision: Model A — the harness is `apps/api`; the worker is its execution lane. Port stays 3100.
- Rejected: introducing a new harness process (duplicate control plane); renaming/porting (cosmetic churn).
- Trade-off: `app.ts` remains the composition root for both roles until a shared helper is extracted (P1).
- Migration consequence: none.

### 2026-09-02 — package namespaces
- `@rakazo/*` and `@safrs/*` do not exist in this capsule; `@sentrabot/*` is canonical. No migration boundary is needed.

### 2026-09-02 — hybrid Control Plane / Desktop Runtime
- Status: decision pending with Chief (see docs/superpowers/plans/2026-09-02-convergence-directive.md, Part D). Record the outcome here.
```

- [ ] **Step 2: Add the product section to `README.md`** (insert after the `## App` section)

```markdown
## Product runtime

The Sentra Bot product (API, worker, web, desktop, mobile, sandbox supervisor) lives in `apps/*`,
`packages/*`, and `infra/*`. Start here:

- [`docs/architecture.md`](docs/architecture.md) — verified runtime topology, process ownership,
  run lifecycle, trust boundary
- [`docs/self-host.md`](docs/self-host.md) — running it locally, with published images, or on a VM
- [`docs/computer-runtime.md`](docs/computer-runtime.md) — computer/sandbox providers

Quick start from a checkout: copy `.env.example` to `.env`, start Postgres
(`docker compose --env-file .env -f infra/compose/docker-compose.yml up postgres`),
run `pnpm install && pnpm db:migrate && pnpm sandbox:build && pnpm dev`, then open
`http://127.0.0.1:5173`.
```

- [ ] **Step 3: Fix the dangling reference in `docs/self-host.md`**

Replace line 7's "Same as the README quick start:" with "Same as the quick start in the root `README.md` (Product runtime section):".

- [ ] **Step 4: Verify links resolve**

Run (Git Bash):
```bash
cd D:/DEV/Monorepo/projects/product/sentrabot && for f in docs/architecture.md docs/self-host.md docs/computer-runtime.md; do test -f "$f" && echo "ok $f"; done && grep -n "Product runtime" README.md docs/self-host.md
```
Expected: three `ok` lines and one match in each file.

- [ ] **Step 5: Commit** (only when Chief asks for a commit)

```bash
git add docs/architecture.md README.md docs/self-host.md
git commit -m "docs(sentrabot): record apps/api as the harness and describe the verified runtime"
```

---

### Task 2: Worker/API messaging parity (P0 — Reliability)

**Files:**
- Create: `apps/worker/src/messaging.ts`
- Create: `apps/worker/src/messaging.test.ts`
- Modify: `apps/worker/src/index.ts` (replace the SendBlue-only block; pass `whatsappMessaging`, `phoneLocale`, and the phone context loader)
- Modify: `apps/worker/package.json` (`"test": "vitest run --root ../.. apps/worker/src"`)
- Modify: `vitest.config.ts` (add `"apps/worker/src/**/*.test.ts"` to `include`)

**Interfaces:**
- Consumes: `sendBlueConfigFromEnv`, `isPhoneSurfaceEnabled`, `SendBlueMessagingProvider`, `whatsAppConfigFromEnv`, `isWhatsAppEnabled`, `WhatsAppMessagingProvider` from `@sentrabot/adapters`; `normalizePhoneLocale`, `PhoneLocale` from `@sentrabot/core`; `MessagingProvider` from `@sentrabot/adapter-kit`.
- Produces: `workerMessagingFromEnv(env: NodeJS.ProcessEnv, deploymentModelKey: string | undefined): { messaging?: MessagingProvider; whatsappMessaging?: MessagingProvider; phoneLocale: PhoneLocale }`.

- [ ] **Step 1: Write the failing test** — `apps/worker/src/messaging.test.ts`

```ts
import { SendBlueMessagingProvider, WhatsAppMessagingProvider } from "@sentrabot/adapters";
import { describe, expect, it } from "vitest";
import { workerMessagingFromEnv } from "./messaging.js";

const whatsAppEnv = {
  WHATSAPP_ACCESS_TOKEN: "token",
  WHATSAPP_PHONE_NUMBER_ID: "123",
  WHATSAPP_APP_SECRET: "secret",
  WHATSAPP_VERIFY_TOKEN: "verify",
  WHATSAPP_BUSINESS_PHONE_E164: "+6281234567890",
};

describe("worker messaging composition", () => {
  it("builds the WhatsApp provider from the same environment the API reads", () => {
    const result = workerMessagingFromEnv({ ...whatsAppEnv, PHONE_LOCALE: "en" }, undefined);
    expect(result.whatsappMessaging).toBeInstanceOf(WhatsAppMessagingProvider);
    expect(result.messaging).toBeUndefined();
    expect(result.phoneLocale).toBe("en");
  });

  it("defaults the phone locale to id and leaves both providers off without configuration", () => {
    const result = workerMessagingFromEnv({}, undefined);
    expect(result.messaging).toBeUndefined();
    expect(result.whatsappMessaging).toBeUndefined();
    expect(result.phoneLocale).toBe("id");
  });

  it("keeps SendBlue behind the deployment model key like the API", () => {
    const sendBlueEnv = {
      SENDBLUE_API_KEY_ID: "id",
      SENDBLUE_API_SECRET: "secret",
      SENDBLUE_SIGNING_SECRET: "signing",
      SENDBLUE_PHONE_NUMBER: "+15550001111",
    };
    expect(workerMessagingFromEnv(sendBlueEnv, undefined).messaging).toBeUndefined();
    expect(workerMessagingFromEnv(sendBlueEnv, "deployment-key").messaging).toBeInstanceOf(
      SendBlueMessagingProvider,
    );
  });
});
```

- [ ] **Step 2: Add the worker to the Vitest include list and package script**

`vitest.config.ts` `include` gains `"apps/worker/src/**/*.test.ts"` (after the `apps/api` line). `apps/worker/package.json` `scripts.test` becomes `"vitest run --root ../.. apps/worker/src"`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @sentrabot/worker test`
Expected: FAIL — `Cannot find module './messaging.js'`.

- [ ] **Step 4: Implement `apps/worker/src/messaging.ts`**

```ts
import type { MessagingProvider } from "@sentrabot/adapter-kit";
import {
  isPhoneSurfaceEnabled,
  isWhatsAppEnabled,
  SendBlueMessagingProvider,
  sendBlueConfigFromEnv,
  WhatsAppMessagingProvider,
  whatsAppConfigFromEnv,
} from "@sentrabot/adapters";
import { normalizePhoneLocale, type PhoneLocale } from "@sentrabot/core";

export interface WorkerMessaging {
  messaging?: MessagingProvider;
  whatsappMessaging?: MessagingProvider;
  phoneLocale: PhoneLocale;
}

/**
 * The worker must reach the same messaging decision as apps/api/src/app.ts: in the Graphile
 * topology run.continue and phone.deliver execute here, so a provider missing on this side is a
 * provider missing in production.
 */
export function workerMessagingFromEnv(
  env: NodeJS.ProcessEnv,
  deploymentModelKey: string | undefined,
): WorkerMessaging {
  const sendBlueConfig = sendBlueConfigFromEnv({
    sendblueApiKeyId: env.SENDBLUE_API_KEY_ID,
    sendblueApiSecret: env.SENDBLUE_API_SECRET,
    sendblueSigningSecret: env.SENDBLUE_SIGNING_SECRET,
    sendbluePhoneNumber: env.SENDBLUE_PHONE_NUMBER,
  });
  const whatsAppConfig = whatsAppConfigFromEnv({
    whatsappAccessToken: env.WHATSAPP_ACCESS_TOKEN,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappAppSecret: env.WHATSAPP_APP_SECRET,
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN,
    whatsappBusinessPhoneE164: env.WHATSAPP_BUSINESS_PHONE_E164,
    whatsappTemplateName: env.WHATSAPP_TEMPLATE_NAME,
    whatsappTemplateLanguage: env.WHATSAPP_TEMPLATE_LANGUAGE,
  });
  return {
    messaging: isPhoneSurfaceEnabled(sendBlueConfig, deploymentModelKey)
      ? new SendBlueMessagingProvider(sendBlueConfig)
      : undefined,
    whatsappMessaging: isWhatsAppEnabled(whatsAppConfig)
      ? new WhatsAppMessagingProvider(whatsAppConfig)
      : undefined,
    phoneLocale: normalizePhoneLocale(env.PHONE_LOCALE),
  };
}
```

If `WhatsAppEnvironmentValues` uses different property names, copy them from `packages/adapters/src/whatsapp.ts:46-56` — do not invent new ones.

- [ ] **Step 5: Wire it in `apps/worker/src/index.ts`**

Replace the `sendBlueConfig` / `messaging` block with:

```ts
  const { messaging, whatsappMessaging, phoneLocale } = workerMessagingFromEnv(
    process.env,
    deploymentModelKey,
  );
```

In `createRunExecutor({...})` change `phone: messaging ? createPhoneContextLoader(prisma) : undefined` to `phone: messaging || whatsappMessaging ? createPhoneContextLoader(prisma) : undefined`. In `createBackgroundJobHandlers({...})` add `whatsappMessaging,` and `phoneLocale,` after `messaging,`. Add `import { workerMessagingFromEnv } from "./messaging.js";` and remove the now-unused imports (`SendBlueMessagingProvider`, `sendBlueConfigFromEnv`, `isPhoneSurfaceEnabled`).

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @sentrabot/worker test && pnpm --filter @sentrabot/worker check`
Expected: 3 tests pass; tsc clean.

- [ ] **Step 7: Commit** (when Chief asks)

```bash
git add apps/worker/src/messaging.ts apps/worker/src/messaging.test.ts apps/worker/src/index.ts apps/worker/package.json vitest.config.ts
git commit -m "fix(worker): compose WhatsApp messaging and phone locale like the API"
```

---

### Task 3: Repair the relay-route time-bomb fixtures (P0 — always, regardless of Part D decision 1)

**Files:**
- Modify: `apps/api/src/relay-routes.test.ts` (the two `expiresAt`/`createdAt` fixtures at ~lines 28-29 and ~113-114)

- [ ] **Step 1: Confirm the failure**

Run: `pnpm --filter @sentrabot/api test -- relay-routes`
Expected: FAIL `expected 410 to be 409` and `expected 410 to be 413`.

- [ ] **Step 2: Replace the fixed timestamps**

In both failing tests replace
```ts
        createdAt: "2026-09-02T00:00:00.000Z",
        expiresAt: "2026-09-02T00:01:00.000Z",
```
with
```ts
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @sentrabot/api test`
Expected: 26 files, 208 tests passed.

- [ ] **Step 4: Commit** (when Chief asks)

```bash
git add apps/api/src/relay-routes.test.ts
git commit -m "test(api): relay fixtures use relative expiry instead of a fixed date"
```

---

### Task 4: Do not mount the relay stream unless explicitly enabled (P0 — conditional on Part D decision 1 = freeze)

**Files:**
- Modify: `apps/api/src/env.ts` (new `controlPlaneRelay: boolean` from `SENTRABOT_CONTROL_PLANE_RELAY`)
- Modify: `apps/api/src/env.test.ts`
- Modify: `apps/api/src/app.ts:400-415` (wrap the `createRelayRoutes` mount)
- Modify: `.env.example`, `docs/architecture.md` (decision log entry)

**Interfaces:**
- Produces: `AppEnv.controlPlaneRelay: boolean` (default `false`).

- [ ] **Step 1: Write the failing env test** — append to `apps/api/src/env.test.ts`

```ts
it("keeps the experimental control-plane relay off unless explicitly enabled", () => {
  expect(loadEnv({ ...baseEnv }).controlPlaneRelay).toBe(false);
  expect(loadEnv({ ...baseEnv, SENTRABOT_CONTROL_PLANE_RELAY: "enabled" }).controlPlaneRelay).toBe(
    true,
  );
});
```

Use the same minimal `baseEnv` fixture the file already uses for other `loadEnv` cases.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sentrabot/api test -- env`
Expected: FAIL — `controlPlaneRelay` is `undefined`.

- [ ] **Step 3: Implement**

`apps/api/src/env.ts`: add `controlPlaneRelay: source.SENTRABOT_CONTROL_PLANE_RELAY === "enabled",` to the returned env object and `controlPlaneRelay: boolean;` to `AppEnv`.

`apps/api/src/app.ts`: wrap the existing block
```ts
  if (env.controlPlaneRelay) {
    app.route(
      "/",
      createRelayRoutes({ /* unchanged */ }),
    );
  }
```
Leave `createPlatformRoutes` mounted (the desktop app calls `/v1/control-plane/identity`).

`.env.example`: add
```
# Experimental hybrid control-plane relay stream (/v1/relay/*, /v1/events). Off by default; no client uses it yet.
SENTRABOT_CONTROL_PLANE_RELAY=
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @sentrabot/api test && pnpm --filter @sentrabot/api check`
Expected: all pass, tsc clean. Then start the API (`pnpm --filter @sentrabot/api dev`) and run `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/v1/events` → `404`; with `SENTRABOT_CONTROL_PLANE_RELAY=enabled` → `401`.

- [ ] **Step 5: Record the decision** in `docs/architecture.md` (replace the "decision pending" entry with Problem/Evidence/Decision/Rejected/Trade-off/Migration consequence).

- [ ] **Step 6: Commit** (when Chief asks)

```bash
git add apps/api/src/env.ts apps/api/src/env.test.ts apps/api/src/app.ts .env.example docs/architecture.md
git commit -m "feat(api): gate the experimental relay stream behind SENTRABOT_CONTROL_PLANE_RELAY"
```

---

### Task 5: Truthful labeling of trusted host execution (P0 — Security)

**Files:**
- Modify: `packages/adapters/src/host-aware-sandbox.test.ts` (add the DENY invariant)
- Modify: `docs/self-host.md:138-142`, `.env.example` (`SANDBOX_PROVIDER` comment)

- [ ] **Step 1: Write the invariant test** — append inside `describe("host-aware sandbox")`

```ts
  it("never reaches the host provider while computerHost is unset or docker", async () => {
    for (const stored of [null, "docker"]) {
      const isolated = { ...fakeProvider("docker"), provision: vi.fn(fakeProvider("docker").provision) };
      const host = { ...fakeProvider("desktop"), provision: vi.fn(fakeProvider("desktop").provision) };
      const sandbox = new HostAwareSandbox(isolated, host, async () => stored === "this-mac");
      await sandbox.provision({ botId: "bot", homePath: "/home/bot" }, context);
      expect(host.provision).not.toHaveBeenCalled();
      expect(isolated.provision).toHaveBeenCalledTimes(1);
    }
  });
```

Reuse the file's existing fake-provider and `context` helpers (see its lines 1-23); if they are named differently, adapt the two helper names only.

- [ ] **Step 2: Run** `pnpm --filter @sentrabot/adapters test -- host-aware-sandbox` — Expected: PASS immediately (this is a pinned invariant; if it fails, stop and report — that would be a security finding).

- [ ] **Step 3: Docs**

`docs/self-host.md`: rename the bullet to **Trusted host execution (`desktop` / "This Mac") — experimental** and append: "This is not sandbox isolation: commands run as the API/worker user with the bot home and your home directory as allowed roots. Off by default; only the deployment owner can enable it. Unsupported on Windows until `packages/adapters/src/desktop-sandbox-*.test.ts` pass there (13 containment tests fail as of 2026-09-02)."

`.env.example` `SANDBOX_PROVIDER=docker` line: add the comment `# docker | e2b | daytona | box | none. "desktop" runs on this host without isolation (experimental).`

- [ ] **Step 4: Commit** (when Chief asks)

```bash
git add packages/adapters/src/host-aware-sandbox.test.ts docs/self-host.md .env.example
git commit -m "docs(sandbox): label trusted host execution as experimental and pin the host-off invariant"
```

---

### Task 6: Restart invariants on real Postgres (P0 — Reliability)

**Files:**
- Modify: `packages/testkit/src/executor-lifecycle.test.ts` (two new tests; reuse `seedRun`, `signup`, `rpc`, `handles`)

**Interfaces:**
- Consumes: `createJobReconciler` from `@sentrabot/adapters`; `routineWakeupJob` semantics (`replaceKey: routine:<id>`).

- [ ] **Step 1: Write the failing/pinning tests** — insert before `async function seedRun(`

```ts
  it("a due routine survives a restart and fires exactly once", async () => {
    const { createJobReconciler } = await import("@sentrabot/adapters");
    const seeded = await seedRun("routine-restart", "seed", {
      status: "completed",
      completedAt: new Date(),
    });
    const scheduledFor = new Date(Date.now() - 1_000);
    const routine = await handles.prisma.routine.create({
      data: {
        workspaceId: seeded.me.workspaceId,
        botId: seeded.bot.id,
        userId: seeded.me.userId,
        threadId: seeded.thread.id,
        name: "restart",
        prompt: "write a file that says restarted",
        // Daily: the re-armed nextRunAt stays inside setTimeout range under the memory driver.
        crons: ["0 0 * * *"],
        active: true,
        nextRunAt: scheduledFor,
      },
    });
    // Simulate a restart: no in-memory job exists for this routine, only the durable row.
    const reconciler = createJobReconciler(
      { prisma: handles.prisma, jobs: handles.jobs },
      { intervalMs: 3_600_000 },
    );
    await reconciler.reconcileOnce();
    await reconciler.reconcileOnce();
    const deadline = Date.now() + 10_000;
    let runs = await handles.prisma.run.findMany({ where: { routineId: routine.id } });
    while (runs.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      runs = await handles.prisma.run.findMany({ where: { routineId: routine.id } });
    }
    await reconciler.reconcileOnce();
    await new Promise((resolve) => setTimeout(resolve, 500));
    runs = await handles.prisma.run.findMany({ where: { routineId: routine.id } });
    expect(runs).toHaveLength(1);
    await expect(
      handles.prisma.routine.findUniqueOrThrow({ where: { id: routine.id } }),
    ).resolves.toMatchObject({ lastRunAt: expect.any(Date) });
    await reconciler.stop();
  });

  it("a run waiting for permission is untouched by restart reconciliation", async () => {
    const { createJobReconciler } = await import("@sentrabot/adapters");
    const seeded = await seedRun("waiting-restart", "send an email", {
      status: "waiting_input",
      leaseOwner: "dead-worker",
      leaseFence: 3,
      leaseExpiresAt: new Date(Date.now() - 60_000),
      startedAt: new Date(Date.now() - 120_000),
    });
    const reconciler = createJobReconciler(
      { prisma: handles.prisma, jobs: handles.jobs },
      { intervalMs: 3_600_000 },
    );
    await reconciler.reconcileOnce();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(
      handles.prisma.run.findUniqueOrThrow({ where: { id: seeded.run.id } }),
    ).resolves.toMatchObject({ status: "waiting_input", leaseFence: 3 });
    expect(await handles.prisma.attempt.count({ where: { runId: seeded.run.id } })).toBe(0);
    await reconciler.stop();
  });
```

- [ ] **Step 2: Run on Postgres**

Run: `pnpm test:integration` (starts a `postgres:16-alpine` testcontainer; needs Docker) or, with a database at hand, `VERIFY_DATABASE=1 DATABASE_URL=<url> pnpm --filter @sentrabot/testkit test -- executor-lifecycle`.
Expected: both new tests pass alongside the existing six. If the routine test finds two runs, first confirm that `InMemoryJobQueue.enqueue` (`packages/adapters/src/wakeup.ts`) clamps far-future delays — Node's `setTimeout` wraps delays above 2^31-1 ms to 1 ms, which would re-fire the re-armed wakeup immediately and is a harness artifact. If the delay is in range and there are still two runs, stop and report: that is a real duplicate-execution bug, not a test to loosen.

- [ ] **Step 3: Commit** (when Chief asks)

```bash
git add packages/testkit/src/executor-lifecycle.test.ts
git commit -m "test(testkit): pin routine and waiting-permission survival across restart"
```

---

### Task 7: Remove the stale `apps/www` references (P2)

**Files:**
- Modify: `vitest.config.ts` (drop `"apps/www/src/**/*.test.ts"`), `biome.json` (drop `"!**/apps/www"`)

- [ ] **Step 1: Edit both files.**
- [ ] **Step 2: Verify** — `pnpm lint` and `pnpm --filter @sentrabot/core test` still pass.
- [ ] **Step 3: Commit** (when Chief asks) — `chore: drop references to the removed apps/www`

---

## Part F — Closed residual record

- Shared composition, host-tool ASK policy, Windows containment, structured run logging, and
  the completed router/executor extractions are recorded in the Batch 4–6 execution status.
- `outbox_events` remains a write-only billing outbox while the hybrid control plane is frozen;
  do not add a drainer or alter its schema until that work resumes under a separate decision.

## Self-review

- Spec coverage: §3 A/B → Parts A/B; §4 → Task 1 (Model A); §5 → Drift #10 (compliant); §6 → Task 1 disclosure table; §7 → Drift #6 + Part D.2; §8 → Task 5 + Part D.3; §9 → Part A.3; §10–11 → Task 6 + existing lifecycle tests; §12 → Drift #3, Tasks 3–4; §13–15 → Part F; §16 golden path → existing `apps/web/e2e/golden.spec.ts` + `pnpm test:e2e`, to be run after P0; §19 order preserved; §23–24 → Task 1.
- Placeholder scan: none.
- Type consistency: `workerMessagingFromEnv` signature identical in Task 2 test and implementation; `controlPlaneRelay` name identical in env, test, and app.
