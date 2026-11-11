# Sentrabot Hybrid Platform Architecture

**Status:** Approved design; implementation has not started for this platform scope.

## Purpose

Sentrabot is a local-first personal bot service. At signup users receive a
**Sentra Personal** blueprint; their first trusted Desktop Runtime creates the
ready-to-use bot locally. Users may upgrade through Xendit. Web, desktop, and
mobile present one account and one set of bots. Execution remains in a
user-controlled runtime by default; a managed 24/7 Cloud Runtime is a future
Pro capability, not a public-launch blocker.

## Product decisions

- Free and paid users receive a default-bot blueprint at signup. The first
  trusted Desktop Runtime materializes Sentra Personal locally; the Control
  Plane never creates private bot state in plaintext.
- Free: 3 active bots, 10 web searches/day, 5 uploads/day, 250 MB files,
  30-day active memory, 3 schedules, 20 agent actions/month, 1 integration,
  15 voice minutes/month, and 3 computer-agent trials/month.
- Managed AI is included in Free. Target internal monthly COGS is at most
  Rp4,000 per active user. Expensive capability is reduced before basic chat is
  stopped.
- Launch Managed AI provider is OpenAI. The router chooses Luna for simple
  work, Terra for standard work, and Sol for complex/high-value work. Users do
  not choose a managed model. BYOK is an Advanced Settings capability.
- Billing launch provider is Xendit. QRIS is the default payment path, then
  Indonesian e-wallets, virtual account, debit/direct debit, and cards.
- Renewal failure gets retry and a 7-calendar-day grace period. Expiry downgrades to
  Free without deletion. Over-limit bots, schedules, and integrations pause;
  files and memory are retained but may become read-only or archived.
- PostHog is opt-in and disabled by default. It may receive allowlisted,
  anonymous product metadata only; it never receives private content or secrets.

## System architecture

```text
Web / Desktop / Mobile
        |
        v
Sentra Control Plane
identity | billing | entitlement | device registry | runtime registry
opaque relay | public-key/key-envelope registry | analytics consent
        |                         |
        |                         +--> E2EE Sync Store
        |                              encrypted blobs and opaque IDs only
        |
        +--> Managed AI Gateway --> OpenAI
             quota | rate limit | router | usage ledger | provider credentials
        |
        v
Sentra Runtime (one execution authority per user workspace)
local Desktop Runtime by default; managed Cloud Runtime later for explicit Pro opt-in
bot engine | permission broker | local vault | memory/files | scheduler
provider adapter | sandbox manager
```

### Component ownership

| Component | Owns | Must not own |
|---|---|---|
| Control Plane | account, subscription, entitlement, device public keys, runtime routes, opaque relay metadata | chat plaintext, memory, files, user credentials |
| E2EE Sync Store | ciphertext, version, opaque object ID, timestamps | decryption keys, plaintext names/titles/files |
| Managed AI Gateway | transient Managed AI inference, provider key, quota, cost ledger | BYOK key, durable prompts/responses |
| Runtime | execution, bot plaintext, memory, files, schedule, permissions, local credential vault | global billing authority |
| Redis | rate-limit windows, liveness, short-lived acceleration cache | durable business state or private plaintext |
| PostgreSQL | durable identity, billing, entitlement, runtime lease/epoch, outbox, config/price versions | chat plaintext, memory plaintext, credential vault |

## Runtime model

Desktop contains an embedded Harness and is the default home of a user’s bots.
When it is online, every client may send encrypted commands through the relay;
the Runtime performs reasoning, tools, integration calls, schedules, and sandbox
work. When it is offline, Free and Plus clients can decrypt already-synced
history but remain read-only. The UI states that the runtime is offline and may
offer 24/7 capability; v1 does not queue offline messages.

Cloud Runtime is a separate, per-user isolated workspace. It becomes active
only after explicit user opt-in. It is allowed to process the data user
authorizes for that workspace, so marketing must not claim that plaintext never
exists in Sentra infrastructure. It must remain separate from the E2EE Sync
Store.

Exactly one Runtime has execution authority at a time. PostgreSQL stores the
active runtime ID, monotonically increasing execution epoch, and lease expiry.
Every executable command includes the epoch; an old runtime rejects commands
after a takeover, even if Redis route cache is stale.

## Privacy and E2EE sync

Desktop creates the Sync Master Key locally. Each trusted device owns a local
private key and publishes only its public key. Pairing wraps a sync key for the
new device; Sentra stores only encrypted key envelopes. Recovery uses a user
held Recovery Key. A new unpaired device cannot recover old ciphertext solely
from account login.

E2EE objects cover conversations, bot definitions/configuration, selected
memories, lightweight settings, and file references. File blob sync is optional
in v1 and stores encrypted blob data with opaque object keys. API keys, OAuth
secrets, browser cookies, raw sandbox state, and local credential vault data do
not join general sync.

The Control Plane sees only operational metadata such as account ID, device ID,
runtime ID, envelope ID, sequence, and timestamps. Bot names, conversation
titles, filenames, tags, prompts, responses, memory, file content, and tool
arguments are encrypted. Local search happens in a trusted Runtime/device cache;
there is no Control Plane plaintext search.

## Data flows

### Live execution

```text
Client -> Control Plane: encrypted command envelope
Control Plane -> Runtime: opaque relay using runtime route + epoch
Runtime: verify sender signature, sequence, entitlement, and epoch; decrypt; execute
Runtime -> Control Plane -> Client: encrypted activity/result envelope
```

Live relay is ephemeral. It is not the durable chat database.

### Durable sync

```text
Runtime or trusted device -> encrypt object locally -> Sync Store
Trusted device -> authenticated ciphertext download -> decrypt locally
```

### Managed AI

```text
Runtime -> Managed AI Gateway -> OpenAI Responses API
```

The gateway is the only cloud component permitted to see Managed AI inference
content transiently so it can call OpenAI. It must never persist content to
PostgreSQL, Redis, analytics, or application logs. BYOK calls travel directly
from Runtime to the selected provider.

### Payment and entitlement

```text
Xendit signed webhook -> verify + deduplicate -> PostgreSQL transaction
  subscription update + entitlement update + transactional outbox event
-> cache invalidation -> entitlement.changed event -> clients refresh
```

## API design

All APIs use versioned JSON over HTTPS. User-facing commands use the existing
authenticated RPC boundary; Runtime endpoints use runtime/device credentials.
No client has direct transport to OpenAI, a provider, Gmail, browser automation,
or sandbox infrastructure.

| Endpoint family | Examples | Purpose |
|---|---|---|
| Account | `GET /v1/entitlements`, device registration | account, plan, consent, trusted device metadata |
| Runtime | `POST /v1/runtimes/register`, `POST /v1/runtime-leases/acquire`, `POST /v1/runtime-leases/renew`, `POST /v1/runtime-leases/release`, `POST /v1/runtimes/{id}/heartbeat`, `GET /v1/runtime-route` | register and route exactly one execution runtime |
| Relay | `POST /v1/relay/commands`, `GET /v1/events` | ephemeral encrypted commands and one activity stream |
| Sync | `PUT /v1/sync/objects/{opaqueObjectId}`, `GET /v1/sync/objects?cursor=...`, `DELETE /v1/sync/objects/{opaqueObjectId}`, key-envelope operations | idempotent durable ciphertext replication |
| Billing | `POST /v1/billing/xendit/webhook`, checkout creation | QRIS payment, signed webhook processing, lifecycle |
| Managed AI | Runtime-authenticated gateway endpoint | cost-guarded request to provider-neutral adapter |

Relay payloads contain only:

```json
{
  "envelope_id": "opaque-id",
  "runtime_id": "opaque-id",
  "execution_epoch": 42,
  "sender_device_id": "opaque-id",
  "sequence": 18,
  "ciphertext": "base64url",
  "signature": "base64url"
}
```

## Database schema

PostgreSQL tables use opaque identifiers and tenant/user scoped indexes.

| Group | Core tables | Rules |
|---|---|---|
| Identity | `users`, `devices`, `device_public_keys`, `device_revocations`, `sessions` | private keys never leave device |
| Billing | `plans`, `plan_limits`, `subscriptions`, `payment_attempts`, `payment_events` | provider event ID unique for idempotency |
| Entitlement | `entitlement_states`, `usage_counters`, `entitlement_events` | subscription changes rights, never deletes user data |
| Runtime | `runtimes`, `runtime_leases`, `runtime_routes`, `runtime_events` | epoch/lease authority is transactional and durable |
| Sync | `sync_object_index`, `key_envelopes`, `sync_cursors` | payload bytes go to object storage; `object_type` is coarse non-sensitive enum only; index has no semantic metadata |
| AI cost | `usage_ledger`, `model_price_versions`, `budget_states`, `routing_policies` | no prompt/response persistence; price version retained per event |
| Reliability | `outbox_events`, `idempotency_keys` | events are committed with state changes then delivered asynchronously |

Key fields:

```text
runtime_leases(workspace_id PK, active_runtime_id, execution_epoch, lease_expires_at, updated_at)
sync_object_index(user_id, opaque_object_id, object_type, version, ciphertext_locator, updated_at)
  object_type IN (conversation, bot, memory, setting, file_ref)
usage_ledger(user_id, workspace_id, bot_id, provider, model, input_tokens,
             cached_tokens, output_tokens, model_cost, tool_cost, sandbox_cost,
             total_cost, price_version, created_at)
```

## Entitlement and cost policy

The router classifies work into simple, standard, or complex. It routes Managed
AI to Luna, Terra, or Sol respectively while applying plan entitlement and
budget state. Free routing is normal at 0–70% budget, increasingly economical at
70–90%, limits premium tools at 90–100%, and retains basic economical chat above
budget while expensive execution waits for reset. Limits for tools and platform
resources are distinct from AI cost.

All expensive attempts reserve entitlement before execution and finalize a usage
ledger event afterward. A failed execution releases unused reservation. Managed
AI cost is reproducible using the effective provider price version at request
time.

## Caching and reliability

PostgreSQL is durable authority. Redis provides short-lived entitlement and
runtime-route cache, runtime liveness heartbeats, and rate-limit windows.
Execution epoch never relies on Redis. Cache invalidation is event-driven through
the transactional outbox; TTL is only a safety net. Redis loss may reset
heartbeats/rate-limit windows but must never change subscription, entitlement,
or execution authority.

Object storage and authenticated CDN URLs may distribute ciphertext only. Edge
responses must not contain decrypted content or plaintext filenames.

## Delivery sequence

1. Identity, Free entitlement, device identity, and default-bot blueprint.
2. Desktop Runtime registration, heartbeat, lease/epoch, and local bot
   materialization/execution.
3. OpenAI-backed Managed AI Gateway, model router, usage ledger, and Free cost
   guardrail.
4. Xendit QRIS checkout, signed/replayed webhook verification, Plus activation,
   grace period, and preservation-first downgrade.
5. E2EE multi-device pairing, encrypted conversation/bot sync, Recovery Key,
   and read-only offline clients when web/mobile launch publicly.
6. Managed Pro Cloud Runtime is v1.1 unless Pro 24/7 is explicitly sold at v1.

## Required verification

- entitlement upgrade/downgrade and preservation behavior;
- Xendit signature and replay/idempotency;
- lease takeover/epoch rejection and no duplicate side effect;
- device revoke and Recovery Key recovery;
- E2EE envelope/sync tests proving no plaintext reaches Control Plane storage;
- Redis-loss test preserving durable authority;
- transactional outbox crash recovery;
- Managed AI privacy test proving prompts/responses avoid logs, PostgreSQL, and Redis;
- Free cost guardrail/model downgrade;
- full journey: signup -> Desktop Runtime -> local Sentra Personal -> Managed AI
  -> QRIS Plus upgrade -> E2EE paired device -> desktop offline/read-only ->
  failed renewal/grace/downgrade with retained data;
- deploy dry run before any public launch.

## Non-goals for public launch

- active multi-provider routing or automated provider fallback;
- queued offline messages;
- server-side plaintext search over E2EE data;
- default file blob sync;
- free persistent Cloud Runtime;
- multi-region active-active infrastructure;
- Pro Cloud Runtime unless Pro 24/7 is sold on day one.
