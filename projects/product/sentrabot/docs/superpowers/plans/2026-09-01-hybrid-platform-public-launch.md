# Hybrid Platform Public Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the minimum local-first Free + Plus launch foundation without a Pro Cloud Runtime.

**Architecture:** Keep Better Auth, Hono, oRPC, Prisma, Graphile Worker, the current sandbox, and the existing Permission Broker. Add a Control Plane metadata boundary, Desktop Runtime authority, and encrypted sync in dependency order; retire cloud private-state writes only after an explicit recoverable migration.

**Tech Stack:** TypeScript strict mode, Hono, oRPC, Prisma/PostgreSQL, Graphile Worker, Electron, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-sentrabot-implementation-spec-v1.md`

## Global Constraints

- Preserve the existing `@sentrabot/*` package namespace; no `@safrs/*` packages exist in this capsule.
- No production code before its failing test is observed.
- Control Plane, Redis, analytics, ordinary logs, and SSE may contain only allowed operational metadata or ciphertext.
- PostgreSQL, not Redis, is authoritative for entitlement and execution epoch.
- Existing Permission Broker and sandbox isolation remain mandatory.
- Free includes 3 computer-agent sessions/month and a 7-calendar-day payment grace period.
- No Pro Cloud Runtime, CRDT, offline command queue, default file sync, or active multi-provider routing.
- Do not commit, deploy, or mutate production data without separate Chief authorization.

## FACT-TO-FIX

| Current | Target | Gap | Smallest fix | Files | Test |
|---|---|---|---|---|---|
| `apps/api/src/app.ts` composes `PiAgentRuntime`, executor, memory, artifacts, and sandbox in API. | Desktop Runtime owns execution; Control Plane routes only ciphertext. | Cloud API is execution authority. | Introduce Desktop Runtime protocol first; remove cloud execution only behind an explicit migrated-workspace gate. | `apps/api/src/app.ts`, `apps/desktop/src/runtime/*`, `packages/contracts/*` | stale epoch and offline-runtime tests |
| Prisma `Bot`, `Message`, `MemoryDocument`, `Artifact`, `Secret` persist private state. | Cloud stores ciphertext/opaque metadata only. | Existing model is hosted-runtime legacy. | Add separate Control Plane metadata schema and an explicit export/encrypt/import migration; do not delete legacy rows automatically. | `packages/db/prisma/schema.prisma`, migrations, `packages/db/src/*` | migration and plaintext-boundary tests |
| Better Auth plus organization bootstrap already exists. | Same account/auth foundation. | No plan/device entitlement data. | Extend existing user/workspace bootstrap with Free entitlement and blueprint metadata only. | `packages/auth`, `packages/db/src/bootstrap-user.ts` | signup produces no plaintext bot |
| Postgres realtime fanout and thread SSE exist. | One server-backed ciphertext activity stream. | Current stream carries database event payloads. | Add a separate relay SSE contract; retain legacy thread stream until E2EE migration cutover. | `packages/db/src/events.ts`, `apps/api/src/router.ts` | ciphertext-only relay test |
| Graphile Worker already runs jobs; no Redis service exists. | Postgres outbox; Redis optional/disposable acceleration later. | No transactional outbox. | Implement outbox with existing PostgreSQL + Graphile Worker; do not add Redis in the first authority slice. | `apps/worker/src/index.ts`, `packages/db/src/*` | commit-then-crash recovery |
| Server `EncryptedSecretStore` exists. | E2EE device keys stay local; BYOK remains local. | Server encryption is not E2EE. | Add new desktop key material and encrypted envelopes; do not repurpose server secret store. | `apps/desktop/src/runtime/crypto/*`, `packages/db/*` | unpaired login cannot decrypt |
| Permission approval and sandbox leases already exist. | Same broker/sandbox protect Runtime effects. | New Runtime commands need epoch/idempotency before invoking them. | Wrap dispatch with current-epoch and envelope idempotency guard. | `apps/desktop/src/runtime/*`, `packages/core/*` | stale runtime cannot create effect |
| No Xendit/QRIS code is present. | Provider-neutral billing with Xendit launch adapter. | Billing lifecycle absent. | Add billing contract/adapter, verified webhook, durable entitlement transition, and outbox. | `packages/adapter-kit/*`, `packages/adapters/*`, `apps/api/*`, `packages/db/*` | signed replay webhook |
| Provider configuration is multi-provider and deployment credentials are API-owned. | Managed OpenAI via gateway; BYOK direct local path. | Credential paths are mixed. | Add a provider-neutral Managed AI boundary; migrate only after Desktop Runtime exists. | `packages/adapter-kit/*`, `packages/adapters/*`, `apps/api/*`, desktop runtime | no prompt persistence test |

## File structure

- `packages/contracts/src/platform.ts`: device, lease, relay, sync, entitlement, billing, and Managed AI schemas.
- `packages/core/src/platform-policy.ts`: pure plan limits, billing transitions, cost bands, and epoch guards.
- `packages/db/src/platform.ts`: transactional repositories for Control Plane metadata.
- `packages/db/prisma/schema.prisma` and one migration: durable metadata/outbox tables.
- `apps/api/src/platform-routes.ts`: Hono endpoints composed from repositories, never decrypting content.
- `apps/desktop/src/runtime/*`: local key store, lease client, encrypted object store, runtime dispatcher, and blueprint materializer.
- `packages/adapter-kit/src/managed-ai.ts` and `packages/adapters/src/openai-managed.ts`: provider-neutral Managed AI boundary.
- `packages/testkit/src/hybrid-platform.test.ts`: end-to-end deterministic launch journey.

---

### Task 1: Contracts and pure policy

**Files:**
- Create: `packages/contracts/src/platform.ts`, `packages/contracts/src/platform.test.ts`
- Create: `packages/core/src/platform-policy.ts`, `packages/core/src/platform-policy.test.ts`
- Modify: `packages/contracts/src/index.ts`, `packages/core/src/index.ts`

**Interfaces:**
- Produces `RuntimeLease`, `RelayEnvelope`, `SyncObjectType`, `PlanLimits`, `transitionSubscription`, and `routeFreeBudget`.
- Consumed by every later task.

- [x] **Step 1: Write failing contract/policy tests**

```ts
it("keeps Free computer sessions deterministic", () => {
  expect(freePlanLimits.computerAgentSessionsMonthly).toBe(3);
});
it("keeps paid entitlement through exactly seven calendar days", () => {
  expect(transitionSubscription("active_plus", "renewal_failed", at).graceEndsAt)
    .toEqual(addCalendarDays(at, 7));
});
```

- [x] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/core test -- platform-policy.test.ts`
Expected: FAIL because the platform policy module does not exist.

- [x] **Step 3: Implement minimal pure contracts**

```ts
export type SyncObjectType = "conversation" | "bot" | "memory" | "setting" | "file_ref";
export function transitionSubscription(state: SubscriptionState, event: SubscriptionEvent, now: Date): SubscriptionTransition;
```

- [x] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/contracts test && pnpm --filter @sentrabot/core test`
Expected: PASS.

### Task 2: Durable Control Plane metadata and outbox

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260901120000_platform_control_plane/migration.sql`
- Create: `packages/db/src/platform.ts`, `packages/db/src/platform.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes `RuntimeLease`, plan transitions, and sync object types.
- Produces `acquireRuntimeLease`, `renewRuntimeLease`, `recordSyncObject`, `applyEntitlementEvent`, and `drainOutbox`.

- [ ] **Step 1: Write failing repository tests**

```ts
it("increments epoch when a different runtime takes an expired lease", async () => {
  const next = await acquireRuntimeLease(db, { workspaceId, runtimeId: "runtime-b", now });
  expect(next.executionEpoch).toBe(2);
});
it("commits entitlement and outbox event together", async () => {
  await applyEntitlementEvent(db, event);
  expect(await listOutbox(db)).toContainEqual(expect.objectContaining({ type: "entitlement.changed" }));
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/db test -- platform.test.ts`
Expected: FAIL because repositories/tables are missing.

- [ ] **Step 3: Add minimum schema and transactional repositories**

```ts
export async function acquireRuntimeLease(db: PrismaClient, input: AcquireRuntimeLeaseInput): Promise<RuntimeLease>;
export async function applyEntitlementEvent(db: PrismaClient, input: VerifiedBillingEvent): Promise<EntitlementState>;
```

Use a serializable transaction and a unique provider event ID. No field accepts private bot/chat/file content.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/db test && pnpm --filter @sentrabot/db check`
Expected: PASS.

### Task 3: Control Plane device, lease, route, and ciphertext-sync APIs

**Files:**
- Create: `apps/api/src/platform-routes.ts`, `apps/api/src/platform-routes.test.ts`
- Modify: `apps/api/src/app.ts`, `apps/api/src/router.ts`

**Interfaces:**
- Consumes Task 1 contracts and Task 2 repositories.
- Produces the locked register/acquire/renew/release/heartbeat/route and idempotent sync endpoints.

- [ ] **Step 1: Write failing HTTP tests**

```ts
it("rejects a sync object with semantic object type", async () => {
  const response = await app.request("/v1/sync/objects/object-1", { method: "PUT", body: JSON.stringify({ objectType: "payroll" }) });
  expect(response.status).toBe(400);
});
it("returns the existing object for an identical sync PUT retry", async () => {
  expect((await putTwice()).second.status).toBe(200);
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/api test -- platform-routes.test.ts`
Expected: FAIL because routes are absent.

- [ ] **Step 3: Implement validated metadata-only routes**

```ts
export function mountPlatformRoutes(app: Hono, dependencies: PlatformRouteDependencies): void;
```

Validate payloads with contracts, reject revoked devices, write tombstones on DELETE, and return `409` for stale/conflicting versions. Do not log request bodies.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/api test && pnpm --filter @sentrabot/api check`
Expected: PASS.

### Task 4: Desktop Runtime authority and local Sentra Personal

**Files:**
- Create: `apps/desktop/src/runtime/lease-client.ts`, `dispatcher.ts`, `blueprint.ts`
- Create: matching `.test.ts` files
- Modify: `apps/desktop/src/main.ts`, `apps/desktop/src/preload.cjs`

**Interfaces:**
- Consumes Task 1 envelopes and Task 3 APIs.
- Produces `DesktopRuntime.start`, `dispatchEnvelope`, and local blueprint materialization.

- [ ] **Step 1: Write failing local-runtime tests**

```ts
it("materializes Sentra Personal only after first local lease", async () => {
  await runtime.start();
  expect(await store.getBot("sentra-personal")).toMatchObject({ source: "default-blueprint" });
});
it("rejects an envelope from a stale epoch before effects run", async () => {
  await expect(runtime.dispatch(staleEnvelope)).rejects.toThrow("stale execution epoch");
  expect(permissionBroker.request).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/desktop test -- runtime`
Expected: FAIL because Runtime modules are absent.

- [ ] **Step 3: Implement the minimum local dispatcher**

```ts
export interface LocalRuntimeStore { getBot(id: string): Promise<LocalBot | null>; putBot(bot: LocalBot): Promise<void>; }
export async function dispatchEnvelope(input: DispatchInput): Promise<DispatchResult>;
```

Verify epoch/device/expiry/sequence/envelope id before the existing Permission Broker or sandbox call. Persist private bot data only in local runtime storage.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/desktop test && pnpm --filter @sentrabot/desktop check`
Expected: PASS.

### Task 5: E2EE device lifecycle and ciphertext relay

**Files:**
- Create: `apps/desktop/src/runtime/crypto/device-keys.ts`, `sync.ts` and tests
- Modify: `apps/api/src/platform-routes.ts`, `packages/db/src/platform.ts`

**Interfaces:**
- Consumes Task 3 sync APIs and Task 4 local runtime.
- Produces recipient key envelopes, local encryption/decryption, relay validation, and read-only offline state.

- [ ] **Step 1: Write failing cryptographic boundary tests**

```ts
it("does not allow account login without Recovery Key to decrypt historical ciphertext", async () => {
  await expect(replacementDevice.open(ciphertext)).rejects.toThrow("recovery key required");
});
it("stores no plaintext title or bot name in sync metadata", async () => {
  expect(await syncIndex()).not.toContain("Payroll Bot");
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/desktop test -- crypto`
Expected: FAIL because local device crypto is absent.

- [ ] **Step 3: Implement local keys and envelopes**

```ts
export interface DeviceKeyStore { create(): Promise<DeviceKeyPair>; wrapFor(recipient: DevicePublicKey, key: Uint8Array): Promise<KeyEnvelope>; }
export async function encryptSyncObject(input: EncryptSyncObjectInput): Promise<EncryptedSyncObject>;
```

Private keys and Recovery Key remain local. No server secret-store reuse. Offline web/mobile runtime status disables commands rather than queueing them.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/desktop test && pnpm --filter @sentrabot/api test`
Expected: PASS.

### Task 6: Managed AI boundary and Free cost ledger

**Files:**
- Create: `packages/adapter-kit/src/managed-ai.ts`, `packages/adapters/src/openai-managed.ts` and tests
- Create: `apps/api/src/managed-ai.ts`, `apps/api/src/managed-ai.test.ts`
- Modify: package exports and `apps/api/src/app.ts`

**Interfaces:**
- Produces `AIProvider.generate`, `AIProvider.stream`, budget reservation/finalization, and a runtime-authenticated gateway.

- [ ] **Step 1: Write failing privacy/routing tests**

```ts
it("records usage metadata without prompt or response", async () => {
  await gateway.respond(requestWithPrivateText);
  expect(await usageLedger()).toEqual([expect.not.objectContaining({ prompt: expect.anything(), response: expect.anything() })]);
});
it("uses economical routing above the Free 70 percent budget band", () => {
  expect(routeFreeBudget(0.8).tier).toBe("economical");
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/adapters test && pnpm --filter @sentrabot/api test -- managed-ai.test.ts`
Expected: FAIL because gateway/adapter are absent.

- [ ] **Step 3: Implement adapter-only provider integration**

```ts
export interface AIProvider { generate(request: AIRequest): Promise<AIResponse>; stream(request: AIRequest): AsyncIterable<AIEvent>; }
```

Verify official OpenAI identifiers at implementation time; retain product routing classes without leaking server key to desktop. BYOK does not call gateway.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/adapter-kit check && pnpm --filter @sentrabot/adapters test && pnpm --filter @sentrabot/api test`
Expected: PASS.

### Task 7: Xendit billing and preservation-first entitlement

**Files:**
- Create: `packages/adapter-kit/src/payments.ts`, `packages/adapters/src/xendit.ts` and tests
- Create: `apps/api/src/billing.ts`, `apps/api/src/billing.test.ts`
- Modify: `apps/api/src/app.ts`, `packages/db/src/platform.ts`

**Interfaces:**
- Consumes Task 2 entitlement/outbox repositories.
- Produces QRIS checkout and verified idempotent webhook handling.

- [ ] **Step 1: Write failing billing tests**

```ts
it("processes a verified Xendit event once when replayed", async () => {
  await handleWebhook(signedEvent);
  await handleWebhook(signedEvent);
  expect(await countEntitlementEvents()).toBe(1);
});
it("downgrades after seven calendar days without deleting stored state", () => {
  expect(transitionSubscription("grace_period", "grace_elapsed", afterSevenDays).state).toBe("free");
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/adapters test -- xendit && pnpm --filter @sentrabot/api test -- billing.test.ts`
Expected: FAIL because adapter/routes are absent.

- [ ] **Step 3: Implement payment adapter and webhook**

```ts
export interface PaymentProvider { createCheckout(input: CheckoutInput): Promise<Checkout>; verifyWebhook(raw: Uint8Array, headers: Headers): Promise<VerifiedPaymentEvent>; }
```

Reject unverifiable payloads, never log raw body, and only emit outbox event after transactional commit.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @sentrabot/adapters test && pnpm --filter @sentrabot/api test && pnpm --filter @sentrabot/db test`
Expected: PASS.

### Task 8: Legacy private-state migration and launch journey

**Files:**
- Create: `packages/db/src/private-state-migration.ts` and tests
- Create: `packages/testkit/src/hybrid-platform.test.ts`
- Modify: `apps/api/src/app.ts`, `apps/web/src/*`, `apps/mobile/*` only for explicit migration/read-only state

**Interfaces:**
- Consumes all prior tasks.
- Produces recoverable opt-in export/encrypt/import, blocks legacy cloud plaintext path after workspace migration, and proves end-to-end launch behavior.

- [ ] **Step 1: Write failing migration/journey tests**

```ts
it("does not mark a workspace E2EE-ready until encrypted local import succeeds", async () => {
  await expect(migrateWorkspace(failingLocalImport)).rejects.toThrow();
  expect(await workspacePrivacyMode()).toBe("legacy");
});
it("shows offline clients as read-only and creates no queued command", async () => {
  expect(await submitWhileRuntimeOffline()).toEqual({ status: "runtime_offline" });
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @sentrabot/testkit test -- hybrid-platform.test.ts`
Expected: FAIL because migration/journey are absent.

- [ ] **Step 3: Implement recoverable migration and final boundary gate**

Export each legacy private object to the trusted Desktop Runtime, encrypt/import it locally, verify acknowledgment, then mark only that workspace migrated. Preserve legacy source until explicit retention policy is separately approved. Remove no records automatically.

- [ ] **Step 4: Run GREEN and release verification**

Run: `pnpm test && pnpm check && pnpm test:integration && pnpm test:topology`
Expected: PASS. Then run the capsule deploy-dry-run command from its local lifecycle contract; it must create no production resources.

## Plan self-review

- Coverage: Tasks 1–8 cover contracts, durable authority, Desktop execution, E2EE, Managed AI, Xendit, offline behavior, migration, and end-to-end verification. Pro Cloud Runtime and listed non-goals are excluded.
- Placeholder scan: no production placeholders are authorized; adapter identifiers and deploy command require verified repository/provider configuration at execution time.
- Type consistency: `RuntimeLease`, `RelayEnvelope`, `AIProvider`, `PaymentProvider`, and `SyncObjectType` originate in Task 1/6/7 and are consumed only afterward.
