# CLAUDE CODE — SENTRABOT CONVERGENCE DIRECTIVE

## Mission

You are working on **SentraBot**, a local-first, self-hosted, persistent multi-agent platform.

Your task is **NOT to redesign SentraBot, add new features, perform aesthetic cleanup, or modernize code indiscriminately**.

Your task is to bring the existing repository back into alignment with one coherent architecture and make the core runtime dependable.

The goal is:

> **ONE ARCHITECTURE → ONE GOLDEN PATH → ONE PROVEN RUNTIME**

Treat this as a convergence and stabilization effort.

---

# 1. Governing Objective

Every action must answer:

> Does this directly make the existing SentraBot product more coherent, reliable, secure, recoverable, or verifiable?

If not, do not do it.

Prioritize:

1. Runtime correctness.
2. Architectural consistency.
3. Human authority and permission safety.
4. Durable state and recovery.
5. Idempotent execution.
6. Maintainability.
7. Documentation alignment.

Do **not** prioritize:

- new features;
- aesthetic refactors;
- speculative abstractions;
- package renaming for cleanliness;
- unrelated dependency upgrades;
- code-style rewrites;
- premature optimization.

---

# 2. Read Before Changing Anything

Before implementation, inspect the repository and relevant project guidance.

At minimum, locate and read:

- `00_READ_FIRST.md`
- `01_COLLABORATION.md`
- `02_OBJECTIVES.md`
- `03_ARCHITECTURE.md`
- `04_CONTEXT.md`
- `05_ENGINEERING.md`
- `06_CODING.md`
- `07_DOCUMENTATION.md`
- `08_DECISIONS.md`
- `09_PRODUCTS.md`
- `10_GLOSSARY.md`
- `11_RESPONSE_STANDARDS.md`
- `agent-context.md`
- `README.md`
- root `package.json`
- workspace configuration
- Turbo configuration
- relevant Docker / Compose files
- API/harness/runtime entry points
- worker entry point
- sandbox supervisor
- event/SSE implementation
- permission/approval implementation
- agent execution pipeline
- database schema
- relevant tests

Do not assume documentation is correct simply because it exists.

Compare documentation against running code.

**Code behavior is evidence. Documentation is a claim until verified.**

---

# 3. First Deliverable: FACTUAL REPOSITORY MAP

Before modifying code, produce a concise repository assessment containing:

## A. Actual Runtime Topology

Determine from code:

- What process starts the product?
- What owns agent execution?
- What owns HTTP commands?
- What owns SSE/realtime activities?
- What port(s) are actually used?
- What does `apps/api` currently own?
- What process owns sandbox lifecycle?
- What does the worker own?
- Where does durable state live?
- Where are permissions enforced?
- How does the web client receive state updates?
- Does the frontend contain direct/native transports?
- What survives restart?

Represent the actual architecture in a small text diagram.

Example format:

```text
Client
  ↓
...
```

Do not copy the target architecture blindly.

Document what the code actually does.

---

## B. Architecture Drift Matrix

For every relevant inconsistency, report:

| Area | Intended | Actual | Evidence | Severity | Required Fix |
|---|---|---|---|---|---|

At minimum inspect:

- harness `127.0.0.1:8799` versus API `:3100`;
- HTTP command ownership;
- SSE stream ownership;
- API versus harness responsibilities;
- `@rakazo/*` versus `@safrs/*`;
- local credential ownership;
- Composio or managed external auth;
- direct host/desktop execution;
- sandbox-only guarantees;
- permission broker behavior;
- routines/background execution;
- agent lifecycle/recovery.

Do not change anything until this map is complete.

---

# 4. Canonical Architecture to Converge Toward

Unless existing verified code reveals a technically blocking reason, converge toward this model:

```text
Web / Desktop / Mobile
        │
        ├── HTTP commands
        │
        ▼
Harness Server
127.0.0.1:8799
        │
        ├── command boundary
        ├── auth/session context
        ├── permission broker
        ├── agent runtime supervisor
        ├── single SSE activity stream
        ├── sandbox lifecycle orchestration
        │
        ├────────── Worker / Graphile Worker
        │
        └────────── PostgreSQL
                         │
                         └── durable state
```

Important:

The repository must have **one explicit answer** for the role of `apps/api`.

Choose based on existing implementation and lowest-risk migration:

### Allowed model A

```text
Harness contains / composes API functionality.
```

### Allowed model B

```text
Harness is the public runtime boundary.
apps/api is an internal application service behind the harness.
```

Do NOT leave both harness and API independently behaving as competing public runtime/control planes.

Document the chosen boundary.

---

# 5. Zero Client-Side Transport Rule

The user-facing client must not independently orchestrate backend transports.

Target rule:

```text
Client → HTTP commands
Client ← one server-owned SSE activity stream
```

Inspect for:

- direct provider calls;
- browser-side API credentials;
- WebSocket implementations;
- multiple competing SSE subscriptions;
- client-side sandbox transports;
- client-side model transports;
- direct Composio/provider communication.

Move orchestration server-side where required.

Do not rewrite working frontend logic unrelated to transport ownership.

---

# 6. Local-First Contract

Do not falsely implement or document “all data always remains local” if optional cloud providers inherently receive data.

Adopt the following model:

## Local Core

Keep under user-controlled/self-hosted infrastructure wherever applicable:

- transcripts;
- memory;
- persistent files;
- workspace state;
- audit log;
- permission policy;
- durable agent state;
- locally-managed credentials.

## Explicit Remote Extensions

Remote providers may receive only data required for the operation when explicitly configured by the user.

Examples:

- model providers;
- E2B;
- Daytona;
- Composio;
- TTS providers;
- external APIs.

Create a clear provider capability/data disclosure model where practical.

Do not pretend a managed OAuth provider keeps credentials entirely local if it does not.

Do not migrate all integrations merely to achieve ideological purity.

Preserve functionality while making the trust boundary truthful and explicit.

---

# 7. Permission Broker — Correct the Model

Current behavior must be audited.

SentraBot should preserve **human authority**, but must not require a confirmation dialog for every harmless operation.

Implement or converge toward:

```text
USER POLICY
      ↓
CAPABILITY GRANT
      ↓
AGENT ACTION
      ↓
RISK / POLICY CHECK
      ↓
ALLOW | ASK | DENY
```

## ALLOW

Operations already authorized by user policy and low-risk.

Examples:

- search/read public information;
- read explicitly connected resources;
- sandbox filesystem operations within granted workspace;
- sandbox shell commands within policy;
- draft content;
- internal reasoning;
- read approved mailbox scope.

## ASK

Consequential or externally visible actions.

Examples:

- sending email;
- posting publicly;
- financial action;
- destructive deletion;
- modifying important external data;
- credential changes;
- expanding resource/access scope;
- executing outside current capability grant.

## DENY

Outside user policy or prohibited runtime scope.

Examples:

- unauthorized filesystem;
- unauthorized credentials;
- host execution when host mode is disabled;
- escaping sandbox;
- crossing organization/workspace boundaries.

Important:

**The human defines policy boundaries. The agent does not invent new authority.**

Within granted boundaries, the agent may independently choose tools, retries, methods, decomposition, and execution strategy.

---

# 8. Host Execution

Audit all computer/sandbox providers.

If a provider executes directly on the host machine, it must NOT silently satisfy the same security contract as Docker/E2B/Daytona.

Default beta posture:

```text
Docker        supported
E2B           supported
Daytona       supported
Fake/Test     supported

Direct Host / Desktop Execution
               experimental
               disabled by default
```

If keeping trusted host execution is necessary:

- label it clearly;
- require explicit opt-in;
- separate its capability/security class;
- do not call it sandbox isolation;
- ensure permission policy recognizes the increased risk.

Do not remove it if doing so unnecessarily breaks existing code.

Isolate and disable by default instead.

---

# 9. Runtime Supervisor Is P0

The agent runtime supervisor is the highest-priority subsystem.

Audit and repair lifecycle handling for:

```text
created
queued
starting
running
waiting_permission
paused
retrying
completed
failed
cancelled
timed_out
```

Verify behavior for:

- model failure;
- provider failure;
- sandbox disconnect;
- sandbox destruction;
- worker restart;
- API/harness restart;
- database reconnect;
- permission denial;
- permission timeout;
- cancellation;
- user closing client;
- duplicate job delivery;
- duplicate event delivery.

Do not create new states unless genuinely necessary.

Prefer an explicit finite state model over implicit boolean combinations.

---

# 10. Idempotency Is Non-Negotiable

A consequential external action must never accidentally execute twice because of retries, restart, queue redelivery, network failure, or ambiguous acknowledgement.

Trace operations through identifiers similar to:

```text
routine_id
scheduled_event_id
job_id
run_id
step_id
tool_call_id
permission_id
execution_id
```

Do not blindly add all identifiers if existing equivalents already exist.

Reuse existing schema whenever possible.

For side-effecting actions:

- establish an idempotency boundary;
- store execution status durably;
- distinguish requested / started / succeeded / failed;
- avoid retrying unknown-result operations blindly;
- prefer provider idempotency keys when supported;
- ensure queue redelivery cannot duplicate a completed side effect.

Add tests proving this behavior.

---

# 11. Durable Recovery

A successful SentraBot runtime must survive restart.

Test at minimum:

```text
Start run
↓
persist progress
↓
kill worker/runtime
↓
restart
↓
recover state
↓
continue or terminate deterministically
```

Also verify:

- routine schedule survives restart;
- waiting permission survives restart;
- completed actions are not replayed;
- SSE reconnect reconstructs current state;
- cancelled runs remain cancelled;
- failed runs do not silently become active.

---

# 12. SSE / Event Model

There must be one canonical client activity stream.

Audit:

- event ordering;
- event identifiers;
- reconnect behavior;
- replay;
- duplicate events;
- stale state;
- dropped connections;
- backpressure;
- reconnect after harness restart.

The UI must be capable of reconstructing current state after reconnect.

Do not rely solely on transient events to represent durable truth.

Durable database state remains authoritative.

SSE represents activity/state propagation, not the sole system of record.

---

# 13. Monolithic Files — Surgical Decomposition Only

Audit large files such as, if still present:

- `apps/web/src/pages/Shell.tsx`
- `apps/api/src/router.ts`
- `packages/adapters/src/executor.ts`

Do not split files based on KB size.

Split only when there is a real responsibility boundary.

Potential domains:

## Frontend

```text
conversation/
composer/
activity-stream/
computer/
navigation/
permissions/
routines/
```

## API

```text
bots/
threads/
runs/
routines/
computers/
integrations/
permissions/
```

## Execution

```text
lifecycle/
permissions/
tool-dispatch/
sandbox/
retry/
audit/
```

Rules:

- preserve behavior;
- no UI redesign;
- no opportunistic state-management migration;
- no mass naming cleanup;
- move one responsibility at a time;
- keep tests passing after each extraction.

If decomposition produces more indirection without better ownership, revert it.

---

# 14. `@rakazo/*` → `@safrs/*`

Do NOT mass replace package imports.

First determine actual package lineage and dependencies.

Target strategy:

```text
Existing @rakazo implementation
          ↓
compatibility boundary
          ↓
canonical @safrs contracts
```

Rules:

1. New canonical contracts should use approved `@safrs/*` namespaces where appropriate.
2. Preserve compatible existing `@rakazo/*` code during migration.
3. Migrate leaf modules first.
4. Avoid dependency cycles.
5. Do not rename packages simply for appearance.
6. Do not break upstream compatibility unless necessary.
7. Record remaining compatibility debt.

The goal is controlled convergence, not namespace cosmetics.

---

# 15. Observability Must Follow an Agent Run

For every important run, make it possible to reconstruct what happened.

Reuse existing fields where possible, but ensure correlation across:

```text
organization/workspace
bot
thread
run
job
model call
tool call
permission
sandbox
provider
retry
duration
result
error
```

The system should be able to answer:

- Why did the agent perform this action?
- Which user policy allowed it?
- Which permission was granted?
- Which tool executed it?
- Which sandbox executed it?
- Was this a retry?
- Did an external side effect actually occur?
- Which failure caused termination?

Do not build a large observability platform.

Start with structured logs + durable execution/audit records + correlation identifiers.

---

# 16. Golden Path — Beta Definition of Done

The convergence phase is successful only when this works reliably:

```text
Install
↓
Start system
↓
Create bot
↓
Configure model
↓
Chat
↓
Persist conversation
↓
Persist useful memory
↓
Assign sandbox computer
↓
Run tool
↓
Evaluate permission policy
↓
Execute safely
↓
Stream progress
↓
Persist result
↓
Restart system
↓
Recover state correctly
↓
Run scheduled routine
↓
Observe/audit execution
```

This is the primary end-to-end scenario.

Do not expand scope until this passes.

---

# 17. Required Release Invariants

Add or repair automated tests proving at least these invariants:

### Security

- DENY prevents side effect.
- Unauthorized workspace access fails.
- Credentials are not included in ordinary logs.
- Host execution cannot happen when disabled.
- Capability boundaries are enforced server-side.

### Runtime

- duplicate job does not duplicate action;
- worker restart does not lose durable run state;
- sandbox failure has deterministic outcome;
- cancellation actually stops future execution;
- permission denial terminates/skips correctly;
- permission wait survives restart when appropriate.

### Events

- SSE reconnect works;
- duplicate events do not corrupt state;
- durable state reconstructs UI after reconnect.

### Routines

- scheduled task survives process restart;
- only one execution occurs per intended schedule occurrence;
- retries do not duplicate consequential side effects.

---

# 18. Testing Strategy

Use the existing testing stack.

Prefer:

- Vitest for units/domain/runtime;
- integration tests for Postgres/Graphile;
- Playwright for user-visible golden path;
- sandbox-specific tests for Docker/E2B when relevant.

Do not substitute mocks for the most important persistence/recovery guarantees.

A critical recovery test should exercise real persistence boundaries.

---

# 19. Fix Order

Execute in this exact priority unless repository evidence demonstrates a dependency requiring a small change in order.

## P0 — Architecture

1. Map actual runtime.
2. Lock public harness/control-plane boundary.
3. Resolve API/harness ownership.
4. Lock single SSE model.
5. Eliminate client-owned transports where present.

## P0 — Security

6. Clarify local-first trust boundaries.
7. Correct capability/permission model.
8. Separate sandbox execution from trusted host execution.

## P0 — Reliability

9. Stabilize supervisor lifecycle.
10. Establish idempotency.
11. Establish restart/recovery behavior.
12. Verify scheduled routines.

## P1 — Maintainability

13. Split proven responsibility monoliths incrementally.
14. Establish controlled `@safrs` migration boundary.
15. Improve agent-run observability.

## P2 — Cleanup

Only after P0/P1:

- lint tightening;
- package naming cleanup;
- minor dependency normalization;
- OpenAPI/documentation polish;
- cosmetic cleanup.

---

# 20. Explicit Non-Goals

DO NOT:

- rewrite the repository;
- create a new framework;
- replace Hono;
- replace oRPC;
- replace PostgreSQL;
- replace Prisma without a proven blocker;
- replace Graphile Worker;
- replace React;
- introduce Kafka;
- introduce Redis merely for architecture;
- introduce event sourcing;
- introduce Kubernetes;
- introduce microservices;
- create a generic workflow engine;
- create speculative plugin abstractions;
- rewrite all packages under `@safrs`;
- redesign the UI;
- add new customer-facing features;
- remove working integrations just because they are cloud-based.

No “while we are here” refactoring.

---

# 21. Change Discipline

Every code change must satisfy:

```text
FACT
↓
DEVIATION
↓
MINIMUM FIX
↓
TEST
↓
VERIFY
```

Before editing a file, know:

1. what behavior is wrong;
2. what target behavior should be;
3. why this file owns the fix;
4. how the fix will be objectively verified.

If you cannot answer all four, do not edit yet.

---

# 22. Work Incrementally

Use small coherent change sets.

Preferred pattern:

```text
Fix invariant
→ run focused tests
→ run affected integration tests
→ verify behavior
→ continue
```

Do not perform a massive repo-wide refactor and then try to repair tests afterwards.

Preserve working behavior continuously.

---

# 23. Documentation

When an architectural decision becomes verified, update the canonical documentation.

Documentation must describe **what the repository actually does after the change**.

At minimum keep aligned:

- README;
- architecture guidance;
- agent context;
- runtime/operations documentation.

Avoid duplicate descriptions across many files.

One source of truth per architectural concern.

---

# 24. Decision Log

For material architecture choices, record briefly:

```text
Problem
Evidence
Decision
Rejected alternatives
Trade-off
Migration consequence
```

Do not create ADRs for trivial implementation choices.

---

# 25. Reporting Format During This Work

At each meaningful checkpoint report:

## VERIFIED FACTS
What was proven from repository/tests.

## DEVIATIONS
What contradicted target architecture or invariants.

## CHANGES
Exactly what was changed.

## VERIFICATION
Commands/tests run and results.

## REMAINING RISK
What remains unresolved.

Never claim something is fixed because code “looks right”.

---

# 26. Stop Conditions

STOP and report instead of improvising if you discover:

- two incompatible persistent data models;
- a migration that risks data loss;
- unknown credential ownership;
- security behavior contradicting documented user authority;
- production behavior whose intended semantics cannot be inferred;
- a change requiring destructive database migration;
- a large architectural dependency not represented in current docs.

For non-destructive uncertainty, choose the smallest reversible path and continue.

---

# 27. Final Acceptance Criteria

Do not declare SentraBot convergence complete until all of the following are true:

- one canonical runtime/control-plane architecture exists;
- clients use the intended HTTP + SSE model;
- agent process ownership is explicit;
- sandbox ownership is explicit;
- permission enforcement happens server-side;
- human policy authority is preserved;
- trusted-host execution cannot masquerade as sandbox isolation;
- external/cloud trust boundaries are truthful;
- consequential actions are idempotent;
- runtime survives process failure/restart predictably;
- routines survive restart;
- SSE reconnect/recovery works;
- durable state remains authoritative;
- golden-path E2E passes;
- critical security/runtime invariants pass;
- documentation describes current reality;
- no unrelated feature work was introduced.

---

# Final Principle

SentraBot does not need more architecture.

It needs the architecture it already intends to have to become **true in the codebase**.

Do not optimize for the amount of code changed.

Optimize for this:

> **After every change, SentraBot should become more predictable, easier to reason about, and harder to accidentally break.**

Begin with repository inspection and the factual runtime/drift report.

Do not modify code before completing that first assessment.