# Sentrabot Implementation Specification v1

**Status:** Locked technical design. This document is the single implementation
source of truth for the Hybrid Platform Architecture v1.

**Baseline:** `docs/superpowers/specs/2026-09-01-sentrabot-hybrid-platform-design.md`

## 1. Goal and delivery boundary

Ship a sellable Free + Plus public launch: the personal bot executes in the
user's Desktop Runtime, Managed AI is cost-controlled, QRIS upgrades activate
entitlement immediately, and web/mobile synchronize private state by E2EE.

Pro Cloud Runtime is not launch-critical. It is v1.1 unless 24/7 Pro is
explicitly sold on the first public day.

### Current-state migration constraint

The existing server database persists bot, thread, message, memory, artifact,
and secret records. That is legacy hosted-runtime behavior and is incompatible
with this design. No E2EE claim is permitted until private state is local and
cloud accepts only encrypted envelopes/ciphertext. Migration preserves data,
requires explicit migration UX, and never silently deletes data.

## 2. Trust boundaries and invariants

| Boundary | Allowed plaintext | Prohibited plaintext |
|---|---|---|
| Control Plane | account, plan, entitlement, device/runtime IDs, public keys, expiry, opaque IDs | chat, prompts, responses, bot data, memory, filenames, file bytes, credentials |
| Sync Store/object storage | ciphertext, opaque ID, coarse `object_type`, version, timestamps | decryption key, titles, tags, filenames, content |
| Ephemeral relay/SSE | signed ciphertext envelope and routing metadata | decrypted command/result |
| Desktop Runtime | user-authorized private bot state and local vault | provider-wide billing authority |
| Managed AI Gateway | one in-memory managed inference request/response | durable content in database, Redis, logs, traces, analytics |
| Redis | liveness, short cache, rate-limit counters | durable authority and private plaintext |

Release invariants:

1. One workspace has one current `execution_epoch` and at most one valid execution lease.
2. A runtime may create an external effect only with the durable current epoch.
3. Account login alone cannot decrypt sync data.
4. Revoked devices cannot submit commands, renew a lease, or receive new key envelopes.
5. Payment events mutate entitlement once, including after replay.
6. Redis loss changes neither entitlement nor execution authority.
7. Managed AI content is never persisted outside the Runtime.
8. Downgrade preserves data and pauses only over-limit capability.

## 3. Component structure

```text
apps/web, apps/mobile ── encrypted view/control clients
apps/desktop           ── UI plus local Runtime/Harness composition root
apps/api               ── Control Plane, relay, sync index, billing endpoints
apps/worker            ── durable outbox dispatch; no private-content worker
packages/contracts     ── Zod/orpc API and event contracts
packages/core          ── pure policy: entitlement, state machines, cost routing
packages/db            ── Control Plane PostgreSQL repositories and migrations
packages/adapters      ── OpenAI and Xendit provider adapters only
packages/adapter-kit   ── provider-neutral interfaces
packages/testkit       ── deterministic integration and topology harness
```

New local Runtime modules live at `apps/desktop/src/runtime/`. They must not
import cloud provider credentials or Prisma. Cloud code must not import local
vault code. Existing server-side private-state writes are retired behind a
one-way migration gate before public E2EE launch.

## 4. API contracts

All APIs are versioned JSON over HTTPS and defined in `packages/contracts`.
Clients use HTTP commands plus one SSE activity stream. They never get direct
transport to providers, integrations, sandbox infrastructure, or credentials.

### Device and runtime

```text
POST /v1/devices/register
POST /v1/devices/{deviceId}/revoke
POST /v1/runtimes/register
POST /v1/runtime-leases/acquire
POST /v1/runtime-leases/renew
POST /v1/runtime-leases/release
POST /v1/runtimes/{runtimeId}/heartbeat
GET  /v1/runtime-route?workspace_id={opaqueWorkspaceId}
```

`acquire` transactionally compares current holder/expiry, then returns
`execution_epoch`, `lease_expires_at`, and `lease_token`. `renew`
requires issued token and epoch. `release` is idempotent. Heartbeat changes
observed liveness only. A takeover increments epoch.

### Ciphertext relay and sync

```text
POST   /v1/relay/commands
GET    /v1/events?cursor={opaqueCursor}
PUT    /v1/sync/objects/{opaqueObjectId}
GET    /v1/sync/objects?cursor={opaqueCursor}
DELETE /v1/sync/objects/{opaqueObjectId}
POST   /v1/sync/key-envelopes
GET    /v1/sync/key-envelopes?device_id={opaqueDeviceId}
```

`PUT` requires a stable opaque object ID, monotonic version, ciphertext,
authenticated device proof, and idempotency key. Same ID/version/body returns
the existing result. Conflicting body/version returns
`409 sync_version_conflict`; older version returns `409 sync_stale_version`.
`DELETE` writes an idempotent tombstone. `object_type` is one of
`conversation | bot | memory | setting | file_ref`; finer labels are encrypted.

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

Relay validates device status, route, epoch, signature shape, idempotency, and
sequence without decryption. SSE supports `Last-Event-ID` and emits only
ciphertext plus allowed operational metadata.

### Entitlement, billing, and Managed AI

```text
GET  /v1/entitlements
POST /v1/billing/checkout
POST /v1/billing/xendit/webhook
POST /v1/managed-ai/responses
```

Checkout defaults to QRIS. Xendit webhook verifies signature before business
processing, deduplicates provider event ID, and commits subscription,
entitlement, and outbox event in one transaction. Managed AI accepts runtime
authentication and transient in-memory content. It uses provider-neutral
`AIProvider.generate` and `AIProvider.stream`; the v1 adapter is OpenAI
Responses. BYOK stays in Runtime and never reaches this endpoint.

## 5. PostgreSQL schema

Existing private-content tables are legacy until migration. New Control Plane
rows carry no private content and all reads are user/workspace scoped.

| Table | Required fields and constraints |
|---|---|
| `plans` / `plan_limits` | versioned limits; Free `computer_trials_monthly = 3` |
| `subscriptions` | user, plan, state, period end, `grace_ends_at`, provider reference |
| `payment_events` | provider, unique event ID, verified timestamp, sanitized lifecycle payload |
| `entitlement_states` | one user/workspace row, version, effective limits, status |
| `usage_reservations` | idempotency key, capability, reserved units/cost, expiry, final state |
| `usage_ledger` | provider/model, token categories, tool/sandbox cost, price version; no content |
| `devices` / `device_public_keys` / `device_revocations` | public identities and revocation state only |
| `runtimes` / `runtime_leases` | class/liveness; current runtime, epoch, expiry, token digest |
| `sync_object_index` / `key_envelopes` | opaque object locator/type/version/tombstone and envelope locator |
| `outbox_events` / `idempotency_keys` | transactional event delivery and replay-safe operations |
| `analytics_consents` | explicit opt-in and policy version; no content |

Required indexes: unique `payment_events(provider, provider_event_id)`;
primary `runtime_leases(workspace_id)`; unique
`sync_object_index(user_id, opaque_object_id)`; cursor index
`sync_object_index(user_id, cursor_seq)`; `usage_ledger(user_id, created_at)`;
and `outbox_events(status, created_at)`.

## 6. Runtime state machine

```text
registered -> acquiring -> active -> draining -> released
                      |             |
                      v             v
                   rejected       expired
```

- `registered`: authenticated identity but no execution authority.
- `acquiring`: transaction compares expiry/current holder and increments epoch on takeover.
- `active`: executes only current-epoch commands.
- `draining`: accepts no new work and creates no uncommitted external effect after release/expiry.
- `released`/ `expired`: read-only until new acquire.

Every sensitive action passes the local permission broker. Effects use a stable
local idempotency key containing workspace, epoch, run, and effect identity.
Sandbox execution remains local and isolated with explicit resource limits.

## 7. Entitlement, billing, and cost state machine

```text
free -> checkout_pending -> active_plus
active_plus -> past_due -> grace_period -> free
grace_period -> active_plus  (successful verified renewal)
```

Grace is exactly 7 calendar days after first verified renewal failure. At Free,
data remains; excess bots/schedules/integrations pause, writes stop above file
limit, and aged memory archives rather than deletes. Upgrade restores capability
without re-creating data. Every transition publishes `entitlement.changed`
from the outbox after commit.

Cost engine:

1. Read durable entitlement and budget state.
2. Reserve costly capability atomically.
3. Classify simple, standard, or complex.
4. Route to Luna, Terra, or Sol using policy and budget band.
5. Call Managed AI Gateway with in-memory content only.
6. Finalize actual cost using effective price version; release unused reservation on failure.

Free bands: 0–70% normal, 70–90% economical, 90–100% limited premium tools, and
above 100% economical basic chat only until reset. Tool/platform limits remain
independent from AI cost.

## 8. E2EE key and device lifecycle

1. Desktop generates Sync Master Key and device key pair locally.
2. Registration uploads public key and signed device metadata only.
3. Pairing authenticates both devices and writes a recipient-specific encrypted envelope.
4. Devices encrypt/decrypt sync objects locally.
5. Revocation blocks command/lease/envelope delivery and excludes device from future key rotations.
6. Recovery Key restores a replacement device; account login alone cannot recover historical data.

File blobs are optional v1. If enabled, bytes are encrypted before upload and
use opaque locators; filenames remain ciphertext. Search indexes are local only.

## 9. Integration tests and deployment topology

`packages/testkit` owns deterministic suites:

- signed/replayed Xendit webhook mutates entitlement once;
- Redis flush/restart returns to PostgreSQL truth;
- DB commit plus worker crash eventually delivers exactly one outbox event;
- lease takeover increments epoch and stale runtime cannot create an effect;
- device revoke blocks command, renew, and envelope delivery;
- Recovery Key restores ciphertext on replacement desktop;
- sync transport/database/object storage and Managed AI logs/PostgreSQL/Redis
  contain no private plaintext;
- stable sync `PUT` retry creates one object; conflict rejects;
- Free cost guardrail reduces model/tools while basic chat stays available;
- full user journey: signup, local Sentra Personal, Managed AI, QRIS Plus,
  paired device, desktop offline read-only, 7-day grace, Free with retained data.

Production topology: stateless horizontally scalable API/Control Plane and
outbox worker behind TLS; PostgreSQL primary with backups; disposable Redis;
ciphertext-only object storage/CDN; user-owned Desktop Runtime; separately
scalable Managed AI Gateway with content-redacting logs. Secrets reside only in
managed server secret storage, never clients/logs. Deploy dry run must have no
production side effect and validate migrations/topology against isolated test
infrastructure.

## 10. Implementation order

1. Add contracts and Control Plane tables for identity, entitlement, devices,
   leases, and transactional outbox.
2. Implement Desktop registration/lease/heartbeat and local Sentra Personal
   blueprint materialization.
3. Implement Managed AI Gateway, OpenAI adapter, reservations, and ledger.
4. Implement Xendit QRIS checkout/webhook and 7-day lifecycle.
5. Replace legacy cloud private-state writes with E2EE sync, pairing, recovery,
   and one SSE stream before public web/mobile release.
6. Run the complete journey and deployment dry run.
7. Add isolated Pro Cloud Runtime only as separately approved v1.1 work.

No phase may add active multi-provider routing, server plaintext search, offline
command queues, default file sync, or free persistent Cloud Runtime.
