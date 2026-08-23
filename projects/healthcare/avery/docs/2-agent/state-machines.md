# State Machines & Invariant Specifications (Avery)

This document formalizes the runtime state transitions for message processing, memory proposals, and gateway lifecycles within the Medisync / Avery deployment.

---

## 1. Message Intake & Authorization Lifecycle

```mermaid
stateDiagram-v2
  [*] --> MESSAGE_RECEIVED: Inbound Baileys Webhook

  MESSAGE_RECEIVED --> INTAKE_FILTER: Evaluate Group & Mention Policy
  INTAKE_FILTER --> DROPPED_SILENTLY: Not in Allowlist / No Mention
  DROPPED_SILENTLY --> [*]

  INTAKE_FILTER --> AUTHORIZATION_CHECK: Matches Allowlist / Free Response
  AUTHORIZATION_CHECK --> UNAUTHORIZED_IGNORE: Sender Not Authorized
  UNAUTHORIZED_IGNORE --> [*]

  AUTHORIZATION_CHECK --> REASONING_LOOP: Sender Authorized

  state REASONING_LOOP {
    [*] --> LOAD_SKILL
    LOAD_SKILL --> EXECUTE_TOOL
    EXECUTE_TOOL --> EVALUATE_OUTPUT
    EVALUATE_OUTPUT --> FORMAT_RESPONSE
  }

  REASONING_LOOP --> PROPOSE_MEMORY: If Knowledge Mutation Needed
  PROPOSE_MEMORY --> RESPONSE_DELIVERED: Write Pending JSON

  REASONING_LOOP --> RESPONSE_DELIVERED: General Conversational Output
  RESPONSE_DELIVERED --> [*]
```

### Intake Invariants:
1. **Allowlist Invariant**:
   $$\text{Process}(\text{Msg}) \implies \text{ChatJID} \in \text{group\_allowed\_chats} \lor \text{Sender} \in \text{WHATSAPP\_ALLOWED\_USERS}$$
2. **Mention Invariant**:
   In non-free response groups, the message text must match the `mention_patterns` single-quoted regex. Messages that do not match are discarded without log pollution.

---

## 2. Memory Proposal Lifecycle (`pending/memory/`)

```mermaid
stateDiagram-v2
  [*] --> PROPOSAL_CREATED: Tool Emits memory_propose

  PROPOSAL_CREATED --> PENDING_QUEUE: Written to pending/memory/<id>.json

  state PENDING_QUEUE {
    AWAITING_REVIEW --> HUMAN_APPROVAL: Reviewed by Chief via UI/CLI
    AWAITING_REVIEW --> HUMAN_REJECTION: Rejected by Chief
  }

  HUMAN_REJECTION --> PROPOSAL_DISCARDED: JSON Removed from Pending
  PROPOSAL_DISCARDED --> [*]

  HUMAN_APPROVAL --> SUBSTRING_MATCH_CHECK: Apply Old Text Snapshot

  SUBSTRING_MATCH_CHECK --> COMMITTED: Exactly 1 Substring Match Found
  SUBSTRING_MATCH_CHECK --> STALE_REJECTED: 0 Matches (File Mutated Since Proposal)

  COMMITTED --> PERSISTED_TO_DISK: Atomic Write with \n§\n Delimiter
  PERSISTED_TO_DISK --> [*]
  STALE_REJECTED --> [*]
```

### Memory Invariants:
1. **Exact Substring Invariant (No Stale Overwrite)**:
   A memory replacement proposal is valid if and only if `old_text` matches exactly one substring in `MEMORY.md` or `USER.md` using `utf-8-sig` encoding. If 0 entries match, the proposal is deemed stale and rejected.
2. **Character Upper Bound**:
   $$\text{Length}(\text{MEMORY.md}) \le 2200 \land \text{Length}(\text{USER.md}) \le 2200$$

---

## 3. Gateway & Bridge Process Lifecycle

```mermaid
stateDiagram-v2
  [*] --> GATEWAY_START: scripts/restart-gateway.bat

  GATEWAY_START --> CLEAN_ORPHANS: Terminate Any Lingering Port 3000 Process
  CLEAN_ORPHANS --> SPAWN_BRIDGE: Launch Node.js Baileys Bridge
  SPAWN_BRIDGE --> BRIDGE_HEALTH_CHECK: GET http://localhost:3000/health

  BRIDGE_HEALTH_CHECK --> HEALTHY: Status == "connected"
  BRIDGE_HEALTH_CHECK --> EXIT_78: Unpaired Session / Bridge Hang

  HEALTHY --> GATEWAY_RUN: Python Gateway Dispatches Work

  GATEWAY_RUN --> SHUTDOWN_SIGNAL: SIGINT / SIGTERM Received
  SHUTDOWN_SIGNAL --> TERMINATE_ALL: Stop Python + Kill Child Bridge
  TERMINATE_ALL --> [*]
  EXIT_78 --> [*]
```

### Process Invariants:
- Port 3000 ownership must belong exclusively to the active gateway's child bridge.
- The gateway must never start if an orphan bridge holds the session directory locks.
