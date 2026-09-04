# WhatsApp Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver hosted, public-beta WhatsApp Business onboarding through Meta Embedded Signup and a thin public bridge.

**Architecture:** `apps/whatsapp-bridge` is the only Meta-facing Hono service. `apps/api` retains Sentra identity, tenant authorization, threads, runs, artifacts, media handling, and the permission broker; the two services exchange typed requests authenticated by a narrow server credential.

**Tech Stack:** TypeScript strict, Hono, Zod, Prisma/PostgreSQL, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-01-whatsapp-bridge-design.md`

## Global Constraints

- Hosted public beta is self-service and account-first. Never create a Sentra account from an inbound message.
- Customers own their WABA and pay Meta directly. No credit-line sharing or usage invoicing.
- Support Meta coexistence for eligible WhatsApp Business App numbers and new-number onboarding.
- Verify `X-Hub-Signature-256` before parsing raw webhook bytes; reject invalid signature or tenant mismatch.
- Encrypt WABA tokens per workspace and never expose a token to browser, log, agent prompt, event, test fixture, or API response.
- Retain raw webhook payloads for 30 days, using an auditable, idempotent purge.
- The permission broker stays authoritative; render only fixed non-secret asks with at most three Meta interactive buttons.
- All tests use a deterministic fake Meta Graph API. No test or dry run calls Meta.

---

### Task 1: Add contracts and connection persistence

**Files:**
- Create: `packages/contracts/src/whatsapp-bridge.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_whatsapp_bridge/migration.sql`
- Create: `packages/contracts/src/whatsapp-bridge.test.ts`
- Create: `packages/db/src/whatsapp-bridge-retention.ts`
- Create: `packages/db/src/whatsapp-bridge-retention.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:** Produce `WhatsAppConnectionStateSchema`, `WhatsAppBridgeInboundTurnSchema`, `WhatsAppBridgeOutboundRequestSchema`, and `WhatsAppInteractiveReplySchema`. Add Prisma models `WhatsAppBusinessConnection`, `WhatsAppWebhookReceipt`, and `WhatsAppOnboardingAttempt` with workspace/user/bot binding.

- [ ] **Step 1: Write failing contract tests.**

```ts
it("rejects an inbound turn without a Meta message id", () => {
  expect(() => WhatsAppBridgeInboundTurnSchema.parse({ connectionId: "c1" })).toThrow();
});
it("permits only declared connection states", () => {
  expect(WhatsAppConnectionStateSchema.parse("ready")).toBe("ready");
  expect(() => WhatsAppConnectionStateSchema.parse("active")).toThrow();
});
```

- [ ] **Step 2: Run `pnpm exec vitest run packages/contracts/src/whatsapp-bridge.test.ts`; expect failure because no bridge contract exists.**
- [ ] **Step 3: Define the Zod contracts and export them.** Inbound turns require `connectionId`, `metaMessageId`, `fromE164`, content, and nullable media metadata. States are exactly `needs_action`, `waiting_for_meta`, `connecting`, `ready`, and `error`.
- [ ] **Step 4: Add schema and migration.** Connections store binding, encrypted token ciphertext, WABA ID, phone-number ID, display number, template configuration, state, stable error code, and timestamps. Receipts have unique `(connectionId, metaMessageId)`, raw JSON, and expiry. Onboarding attempts have opaque nonce, binding, requested coexistence, expiry, and one-time completion. Index phone-number lookup, connection `(workspaceId, botId)`, and expiry fields.
- [ ] **Step 5: Implement and test retention.**

```ts
export async function purgeExpiredWhatsAppWebhookReceipts(prisma: PrismaClient, now: Date) {
  const result = await prisma.whatsAppWebhookReceipt.deleteMany({ where: { expiresAt: { lte: now } } });
  return result.count;
}
```

Test expired deletion, future preservation, and a zero-result second purge.
- [ ] **Step 6: Run `pnpm --filter @sentrabot/contracts test -- whatsapp-bridge.test.ts && pnpm --filter @sentrabot/contracts check && pnpm --filter @sentrabot/db check`; expect PASS.**
- [ ] **Step 7: Commit only this slice with `feat(sentrabot): add WhatsApp bridge contracts` and `Co-Authored-By: Codex <codex@local>`.**

### Task 2: Scaffold bridge and deterministic Meta client

**Files:**
- Create: `apps/whatsapp-bridge/package.json`
- Create: `apps/whatsapp-bridge/tsconfig.json`
- Create: `apps/whatsapp-bridge/src/env.ts`
- Create: `apps/whatsapp-bridge/src/index.ts`
- Create: `apps/whatsapp-bridge/src/app.ts`
- Create: `apps/whatsapp-bridge/src/meta-client.ts`
- Create: `apps/whatsapp-bridge/src/meta-client.test.ts`
- Create: `apps/whatsapp-bridge/src/fake-meta.ts`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`

**Interfaces:** Produce `createWhatsAppBridgeApp(deps)` and `MetaGraphClient` methods `exchangeSignupCode`, `subscribeApp`, `sendText`, `sendTemplate`, `sendInteractiveButtons`, `getMedia`, and `getConnectionAssets`.

- [ ] **Step 1: Write failing Meta client tests.**

```ts
it("does not follow a redirect while sending a bearer token", async () => {
  await expect(client.sendText(request, context)).rejects.toThrow("redirect");
});
it("maps Graph failure to a stable redacted code", async () => {
  await expect(client.exchangeSignupCode("bad", context)).rejects.toMatchObject({ code: "meta_signup_failed" });
});
```

- [ ] **Step 2: Run `pnpm exec vitest run apps/whatsapp-bridge/src/meta-client.test.ts`; expect failure because the package is absent.**
- [ ] **Step 3: Create the package following the API lifecycle.** Add `dev`, `start`, `check`, and `test`; use Hono/node-server shutdown handling; add only bridge dependencies.
- [ ] **Step 4: Implement env and Graph client.** Require Graph base/version, Meta app ID/secret, Embedded Signup configuration ID, webhook verify token, internal API URL, internal bridge credential, database URL, and encryption key. Every Graph call uses `redirect: "error"`, an abort timeout, capped diagnostics, and stable public error codes.
- [ ] **Step 5: Implement fake Meta.** It records requests and deterministically returns callback assets, media bytes, send handles, transient failure, or permanent failure without network I/O.
- [ ] **Step 6: Run `pnpm --filter @sentrabot/whatsapp-bridge test && pnpm --filter @sentrabot/whatsapp-bridge check`; expect PASS.**
- [ ] **Step 7: Commit with `feat(sentrabot): scaffold WhatsApp bridge service` and attribution trailer.**

### Task 3: Move signed webhook ingress behind bridge

**Files:**
- Create: `apps/whatsapp-bridge/src/webhook.ts`
- Create: `apps/whatsapp-bridge/src/webhook.test.ts`
- Create: `apps/api/src/whatsapp-bridge-internal.ts`
- Create: `apps/api/src/whatsapp-bridge-internal.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/phone-inbound.ts`
- Modify: `apps/api/src/phone-media.ts`

**Interfaces:** Produce bridge `GET /webhook` and `POST /webhook`, API `POST /internal/channels/whatsapp/turns`, `verifyBridgeCredential(request, env)`, and `submitWhatsAppBridgeTurn(input, deps)`.

- [ ] **Step 1: Write failing ingress tests.**

```ts
it("rejects an invalid raw-body HMAC", async () => {
  expect((await bridge.request("/webhook", invalidRequest)).status).toBe(401);
});
it("rejects a turn for a connection bound to another workspace", async () => {
  expect((await api.request("/internal/channels/whatsapp/turns", crossTenantRequest)).status).toBe(403);
});
```

- [ ] **Step 2: Run `pnpm exec vitest run apps/whatsapp-bridge/src/webhook.test.ts apps/api/src/whatsapp-bridge-internal.test.ts`; expect failure because routes are absent.**
- [ ] **Step 3: Implement bridge ingress.** Reuse current bounded-body and constant-time HMAC behavior. Verify before JSON parse. Atomically claim the receipt before forwarding; duplicate verified messages return 200 and create no turn. Set receipt expiry to 30 days.
- [ ] **Step 4: Implement API ingress.** Verify the internal credential in constant time, parse the shared schema, load the connection, and prove workspace/user/bot binding before reusing `createPhoneInboundHandler` and `ingestPhoneMedia`. Media access crosses the bridge client; API never receives a WABA token.
- [ ] **Step 5: Remove direct Meta ingress/configuration from API.** Remove `mountWhatsAppWebhookRoutes`, global `WhatsAppMessagingProvider`, and Meta access-token/app-secret/verify-token parsing while preserving SendBlue.
- [ ] **Step 6: Run focused API/bridge inbound tests and both checks; expect PASS.**
- [ ] **Step 7: Commit with `feat(sentrabot): route WhatsApp ingress through bridge` and attribution trailer.**

### Task 4: Implement Embedded Signup and onboarding RPC

**Files:**
- Create: `apps/whatsapp-bridge/src/onboarding.ts`
- Create: `apps/whatsapp-bridge/src/onboarding.test.ts`
- Modify: `apps/whatsapp-bridge/src/app.ts`
- Create: `apps/api/src/whatsapp-bridge-onboarding.ts`
- Create: `apps/api/src/whatsapp-bridge-onboarding.test.ts`
- Modify: `apps/api/src/router.ts`
- Modify: `packages/contracts/src/rpc.ts`

**Interfaces:** Produce authenticated RPC methods `phone.whatsapp.beginOnboarding`, `phone.whatsapp.onboardingStatus`, and `phone.whatsapp.disconnect`; produce bridge internal `POST /onboarding/start` and `POST /onboarding/complete`.

- [ ] **Step 1: Write failing onboarding tests.**

```ts
it("binds the signup nonce to one user, workspace, and bot", async () => {
  await expect(completeSignup(otherOwnerCallback)).rejects.toMatchObject({ code: "invalid_onboarding_state" });
});
it("stays needs_action when webhook subscription fails", async () => {
  expect((await completeSignup(failedSubscription)).state).toBe("needs_action");
});
```

- [ ] **Step 2: Run onboarding tests; expect failure because no state machine exists.**
- [ ] **Step 3: Implement account-first start/completion.** API proves session and bot/workspace ownership before nonce issue. Bridge exchanges callback code server-side, resolves WABA/phone assets, encrypts token, subscribes app, and marks `ready` only after success.
- [ ] **Step 4: Implement coexistence and Indonesian action states.** Persist requested coexistence and provider outcome. Map incomplete verification, unavailable coexistence, unverified number, and template setup to stable Indonesian `needs_action` messages; never return Graph body text.
- [ ] **Step 5: Implement disconnect.** Require owner authorization, block inbound work, clear encrypted token material, preserve conversation/audit data, then attempt remote unsubscribe.
- [ ] **Step 6: Run onboarding tests plus API/bridge typechecks; expect PASS.**
- [ ] **Step 7: Commit with `feat(sentrabot): add WhatsApp Embedded Signup onboarding` and attribution trailer.**

### Task 5: Route outbound delivery and interactive approvals through bridge

**Files:**
- Create: `apps/whatsapp-bridge/src/delivery.ts`
- Create: `apps/whatsapp-bridge/src/delivery.test.ts`
- Create: `apps/whatsapp-bridge/src/interactive-approval.ts`
- Create: `apps/whatsapp-bridge/src/interactive-approval.test.ts`
- Modify: `packages/adapters/src/phone-delivery.ts`
- Modify: `packages/adapters/src/whatsapp.ts`
- Modify: `packages/core/src/phone-strings.ts`
- Modify: `apps/api/src/phone-inbound.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:** Produce bridge internal `POST /internal/deliveries` and `POST /internal/approvals/replies`; produce `buildInteractiveApproval(block): MetaInteractiveButtonRequest | null`.

- [ ] **Step 1: Write failing delivery and approval tests.**

```ts
it("uses a template outside the service window", async () => {
  await delivery.send(outsideWindow);
  expect(fakeMeta.requests[0]?.type).toBe("template");
});
it("resolves one pending approval once", async () => {
  await bridge.handleReply(buttonReply);
  expect(api.resolveApproval).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the tests; expect failure because bridge delivery is absent.**
- [ ] **Step 3: Implement bridge delivery.** API keeps `PhoneOutbound` retry/backoff/mirroring state; bridge resolves bound connection and sends with per-WABA token. Return stable handle/error. Outside 24 hours use a template; missing template is actionable.
- [ ] **Step 4: Implement interactive approvals.** Render only 1–3 fixed actions without input. Carry opaque reply IDs, reject stale/unknown/wrong-connection/duplicate replies, and keep secret/free-form asks dashboard-only.
- [ ] **Step 5: Remove numeric WhatsApp approval replies but retain non-WhatsApp phone behavior.**
- [ ] **Step 6: Run bridge delivery, phone-delivery, WhatsApp adapter, and core string tests; expect PASS.**
- [ ] **Step 7: Commit with `feat(sentrabot): deliver WhatsApp through bridge` and attribution trailer.**

### Task 6: Replace pairing UI, add deploy proof, and verify

**Files:**
- Modify: `apps/web/src/pages/PhoneSettingsOverlay.tsx`
- Create: `apps/web/src/pages/PhoneSettingsOverlay.test.tsx`
- Modify: `apps/web/src/locales/en/messages.po`
- Modify: `apps/web/src/locales/id/messages.po`
- Modify: `apps/web/scripts/translations-id.json`
- Create: `apps/web/e2e/whatsapp-onboarding.spec.ts`
- Create: `infra/whatsapp-bridge/docker-compose.yml`
- Create: `infra/whatsapp-bridge/deploy-dry-run.mjs`
- Modify: `.env.example`
- Modify: `docs/self-host.md`
- Modify: `README.md`

**Interfaces:** Consume onboarding RPCs and server-owned connection state. Produce hosted bridge compose and no-side-effect deploy dry-run.

- [ ] **Step 1: Write failing UI/E2E tests.**

```tsx
it("starts signup only after a bot is selected", async () => {
  render(<PhoneSettingsOverlay />);
  await user.click(screen.getByRole("button", { name: /hubungkan whatsapp bisnis/i }));
  expect(rpc.phone.whatsapp.beginOnboarding).toHaveBeenCalledWith({ botId: "bot-1", coexistence: true });
});
```

- [ ] **Step 2: Run the UI/E2E test; expect failure because pairing UI remains.**
- [ ] **Step 3: Implement dashboard state.** Replace pairing code with Indonesian-first existing-number/new-number choices. Launch only server-issued signup metadata. Render `needs_action`, `waiting_for_meta`, `connecting`, `ready`, and `error`; never render WABA ID, token, or Graph detail.
- [ ] **Step 4: Add compose, dry-run, and docs.** Compose isolates bridge from API and requires named values only: HTTPS webhook URL, Meta app config, internal API URL/credential, database URL, encryption key. Dry run validates names/HTTPS without logging values, calling Meta, or sending messages. Docs cover App Review/Advanced Access, direct billing, coexistence eligibility, and retention.
- [ ] **Step 5: Run web typecheck, focused UI test, onboarding E2E, and `node infra/whatsapp-bridge/deploy-dry-run.mjs`; expect PASS using fake configuration.**
- [ ] **Step 6: Run final affected checks.**

```bash
pnpm --filter @sentrabot/contracts check
pnpm --filter @sentrabot/db check
pnpm --filter @sentrabot/api check
pnpm --filter @sentrabot/whatsapp-bridge check
pnpm --filter @sentrabot/web check
pnpm exec biome check apps/whatsapp-bridge apps/api packages/contracts packages/db packages/adapters packages/core apps/web/src/pages/PhoneSettingsOverlay.tsx
git diff --check
git diff --stat
```

Record existing unrelated desktop-sandbox failures separately; do not weaken them.
- [ ] **Step 7: Commit with `feat(sentrabot): add WhatsApp Business onboarding` and attribution trailer.**

## Plan Self-Review

| Spec requirement | Task |
| --- | --- |
| Thin public bridge and API boundary | 2, 3 |
| Account-first public beta, direct billing, coexistence | 4, 6 |
| Encrypted tenant credentials | 1, 2, 4 |
| HMAC, idempotency, 30-day retention | 1, 3 |
| API keeps runs/media/permissions | 3, 5 |
| Interactive Meta approvals and service window | 5 |
| Fake Graph, UI E2E, and dry run | 2 through 6 |

The plan has six independently testable tasks. The placeholder scan is clean; every design requirement maps to a task.
