# Sentra Bot WhatsApp Bridge — Design

**Status:** Proposed for Chief review  
**Date:** 2026-09-01  
**Scope:** Public beta, hosted server, self-service multi-business onboarding

## Purpose

Provide WhatsApp Business as a hosted Sentra Bot channel without moving agent orchestration, authorization, or product data out of the existing API. Businesses onboard their own Meta assets through the official Embedded Signup flow and pay Meta directly.

## Decisions

- Add `apps/whatsapp-bridge` as a thin, public Hono service.
- Use Meta WhatsApp Cloud API and Embedded Signup; do not use unofficial WhatsApp libraries.
- Public beta is self-service for multiple businesses. A user must already have a Sentra account and select a workspace before onboarding.
- Each business owns its WABA and pays Meta directly. Sentra neither shares a credit line nor invoices Meta usage.
- Support Meta coexistence so an eligible number already active in WhatsApp Business App can be connected.
- Keep approval authority in the existing permission broker. WhatsApp renders eligible approvals as interactive reply buttons only.
- Retain raw webhook payloads for 30 days, then purge them automatically.

## Architecture

```text
Sentra dashboard
  -> Meta Embedded Signup
  -> whatsapp-bridge (public HTTPS)
  -> authenticated internal channel contract
  -> apps/api -> run / worker / executor / permission broker

Meta webhook
  -> whatsapp-bridge
  -> authenticated internal channel contract
  -> apps/api -> agent response
  -> whatsapp-bridge -> Meta Graph API
```

`apps/whatsapp-bridge` is the sole public Meta-facing service. It owns Meta OAuth/signup callbacks, webhook verification, Graph API requests, tenant channel configuration, and delivery retry state. `apps/api` remains the source of truth for Sentra identity, workspace membership, threads, messages, runs, artifacts, agent execution, and approvals.

The bridge and API communicate through a typed, internal authenticated contract in `packages/contracts`. The bridge must be unable to create a run for a workspace or bot other than the one bound to its channel connection.

## Onboarding

1. An authenticated Sentra user selects a workspace and chooses **Hubungkan WhatsApp Bisnis**.
2. The dashboard offers two paths: connect an existing WhatsApp Business App number through coexistence, or connect a new business number.
3. Meta Embedded Signup handles Meta login, Business Portfolio and WABA selection/creation, phone verification, display name, Cloud API consent, and coexistence where available.
4. The bridge validates the server-side callback, resolves the WABA and phone-number identifiers, encrypts the connection token, subscribes the WABA to the bridge webhook, and validates delivery through an internal test event.
5. The dashboard displays one of: `needs_action`, `waiting_for_meta`, `connecting`, `ready`, or `error`.

The bridge clears incomplete connection material when signup is abandoned or fails. It returns short, actionable Indonesian guidance rather than Graph API errors. A connection is not `ready` until webhook subscription and the internal delivery test succeed.

## Data and Security

- Webhooks require HTTPS and validate `X-Hub-Signature-256` against the exact raw body before parsing.
- Connection tokens are encrypted at rest per workspace and never enter browser responses, logs, agent prompts, runs, or API payloads unrelated to the bridge.
- Raw webhook payloads are retained for 30 days only; purge execution is auditable and idempotent.
- Normalized inbound turns, transcripts, attachments, messages, artifacts, and approval results are stored by the API according to Sentra's application data policy.
- Webhook message IDs provide replay protection and idempotency. Rate limits apply per tenant and per sender number.
- The bridge accepts only its own narrow internal authorization credential when calling the API; the API verifies the channel-to-workspace/bot binding on every request.

## Messaging and Approval

The bridge normalizes text, audio, image, and document events then submits a channel turn to the API. Audio/media interpretation stays in the existing API/agent pipeline. Responses return to the bridge for Graph API delivery.

Within the Meta customer-service window, the bridge sends normal messages. Outside that window it sends only an approved Meta template. If no eligible template exists, the outbound item becomes actionable for the user rather than being silently discarded.

The permission broker remains authoritative. Only fixed, non-secret approvals with up to three actions are rendered with Meta Interactive Reply Buttons. Button responses resolve the matching pending approval idempotently. Free-form input, secrets, and any unsafe-to-disclose approval require the Sentra dashboard.

## Failure Handling

- Retry safe transient Graph API operations with bounded exponential backoff and recorded attempt state.
- Before retrying token exchange, number registration, webhook subscription, or other potentially non-idempotent setup, query current Meta/connection state.
- Surface recoverable configuration failures as `needs_action` with a concrete dashboard instruction.
- Treat invalid signatures, channel/workspace mismatches, malformed payloads, and unknown approval replies as fail-closed events.

## Verification

- Unit tests: signature validation, payload parsing, coexistence callback interpretation, token redaction, onboarding state transitions, idempotency, 24-hour delivery selection, and approval button round trips.
- Deterministic integration tests: fake Graph API covering signup callback, WABA subscription, media, template delivery, retries, and error mapping.
- Dashboard E2E: account-first onboarding wizard and every visible connection status, with no real Meta account.
- Bridge/API contract tests: channel identity cannot cross tenant, workspace, or bot boundaries.
- Deploy dry-run: validates public HTTPS/webhook configuration without calling Meta or sending messages.

## Out of Scope

- Group-agent behavior.
- Billing aggregation, credit-line sharing, or invoicing Meta traffic.
- Automatic account creation from an inbound WhatsApp message.
- Agent-run ownership in the bridge.
- Permanent retention of raw webhook data.

## Success Criteria

- An authenticated business can connect an eligible existing WhatsApp Business App number or a new business number through Sentra's dashboard.
- The bridge reaches `ready` only after signed webhook and internal delivery validation succeed.
- Incoming WhatsApp messages create turns only for the channel's bound workspace/bot.
- Sensitive actions remain blocked until their permission-broker approval is resolved through an eligible Meta button or the dashboard.
- A duplicate Meta webhook cannot create duplicate agent work or delivery.
- No production Meta credential, customer phone number, or raw payload is exposed in source, tests, or logs.
