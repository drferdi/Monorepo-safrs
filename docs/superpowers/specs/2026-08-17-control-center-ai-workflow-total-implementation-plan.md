# Control Center AI + Workflow Runtime — Total Implementation Plan (2026-08-17)

## 1. Purpose

Evolve the existing Control Center into a safe, local-first operator surface with two standard infrastructure layers:

1. **AI SDK 7** — the standard AI application and agent interface.
2. **Workflow SDK** — the standard durable orchestration layer for work that must retry, pause, resume, wait, or preserve execution state.

This is an enhancement of the existing Sentra/SAFRS architecture, not a replacement for it.

The existing allowlisted executor remains the only command execution plane. AI SDK interprets intent and selects permitted tools. Workflow SDK coordinates durable execution only when durability is actually needed.

---

## 2. Status

This document supersedes the earlier **Control Center Operator Copilot — Design (2026-08-17)** as the total implementation plan for the Control Center AI/workflow runtime.

Locked direction:

- AI SDK is adopted as the standard AI interface.
- Workflow SDK is adopted as the standard durable workflow interface.
- Local and OpenAI providers remain explicitly user-selected.
- There is no silent provider fallback.
- SAFRS remains the authority and risk-control layer.
- The existing allowlisted executor remains the only command system.

Implementation is phased so either layer can be disabled without breaking the existing Control Center.

---

## 3. Core architectural rule

> **AI SDK is the intelligence adapter. Workflow SDK is the durability adapter. SAFRS and the existing executor remain the authority and execution system.**

The system must never evolve into a second shell, a second command registry, or an AI-controlled bypass around existing repository governance.

```text
Chief
  |
  v
Control Center
  |
  +------------------------------+
  |                              |
  | Short AI interaction         | Durable operation
  |                              |
  v                              v
AI SDK 7                    Workflow SDK
  |                              |
  |                              +--> durable steps
  |                              |    retry / wait / resume
  |                              |
  +------------+-----------------+
               |
               v
        SAFRS policy boundary
               |
               v
       RUNNABLE_COMMANDS
               |
               v
          runCommand()
               |
               v
         sanitizeOutput()
               |
         +-----+------+
         |            |
         v            v
   model context   UI evidence
   truncated       full sanitized
```

---

## 4. Why two SDKs

### AI SDK 7 owns

- model/provider abstraction;
- chat and streaming;
- typed AI messages;
- structured output;
- tool calling;
- tool approval policy;
- bounded agent loops;
- model timeouts;
- runtime/tool context;
- AI lifecycle telemetry.

### Workflow SDK owns

- durable multi-step orchestration;
- automatic retries for workflow steps;
- persisted workflow state;
- pause/wait/resume semantics;
- long-running processes;
- workflow-level observability;
- durable execution boundaries across multiple operations.

### Neither SDK owns

- the SAFRS risk model;
- the repository command allowlist;
- shell access;
- authorization to bypass confirmation controls;
- repository governance policy;
- business/domain truth.

---

## 5. Technology maturity policy

### AI SDK

Adopt **AI SDK 7 stable** for new implementation.

Do not begin a greenfield Control Center AI feature on AI SDK 6.

Preflight requirements before package installation:

- confirm the Control Center build is ESM-compatible;
- preserve the repository-defined Node runtime policy;
- pin exact compatible package versions through the repository catalog/package policy;
- respect `minimumReleaseAge` rather than installing an unaged release blindly.

### Workflow SDK

Adopt Workflow SDK as an approved technology direction, but treat the current v5 line as **beta infrastructure**.

Therefore:

- use a narrow first workflow;
- pin an exact tested beta version that satisfies repository release-age policy;
- do not make normal Control Center operation depend on Workflow SDK in the first phase;
- preserve a clean rollback boundary;
- expand only after deterministic acceptance tests pass.

Do not use `workflow@latest` blindly.

---

## 6. Risk

Overall implementation remains **R2**.

Reasons:

- new AI runtime capability;
- new workflow runtime capability;
- shared package dependencies;
- environment placeholders;
- command-surface integration;
- persistent workflow state when the workflow layer is enabled;
- approval/resume behavior for future mutating workflows.

R3 remains out of scope.

A designated review is required before merge.

---

## 7. Locked decisions

| Topic | Decision |
| --- | --- |
| Primary surface | Control Center section `copilot`, seq 09, after Knowledge |
| AI standard | AI SDK 7 |
| Durable workflow standard | Workflow SDK |
| Default provider | `local` |
| Provider switch | Explicit only; never auto-switch Local to OpenAI |
| AI execution plane | Existing allowlisted executor only |
| Workflow execution plane | Existing allowlisted executor only |
| Read tools | Auto-run only from explicit allowlist |
| Mutating tools | AI approval + existing SAFRS confirm phrase |
| Secrets | Presence/configuration status only; never print, log, stream, or persist raw secret values |
| Env ownership | Control Center still must not import `@safrs/env/server` |
| Output trust | Evidence comes from tool/workflow results, never model assertion |
| Tests | Deterministic doubles; CI never calls a live model |
| Live provider fallback | Forbidden |
| Free shell | Forbidden |
| `apply_patch` | Forbidden |
| MCP | Deferred |
| Autonomous coding | Deferred |
| R3 command ids | Forbidden |
| Worktree | `../Monorepo.worktrees/feat-operator-copilot` unless repository state requires a new isolated worktree |

---

## 8. Execution classification

Every Control Center operation must be classified before implementation.

### Class A — immediate operation

Use ordinary application code and/or AI SDK only.

Typical characteristics:

- completes within one request/short agent turn;
- no long wait;
- no durable retry requirement;
- no need to survive interruption;
- no multi-stage external process.

Examples:

- answer a repository question;
- call `status`;
- call `doctor`;
- call `task-list`;
- explain evidence already returned.

### Class B — durable operation

Use Workflow SDK.

At least one of the following should be true:

- multiple meaningful steps must be tracked;
- retry is required;
- the operation may wait for external state;
- the operation may wait for human approval for a meaningful period;
- the process may outlive a normal HTTP request;
- partial failure must resume from a known point;
- an end-to-end execution timeline is operationally useful.

Do **not** put a task into Workflow SDK merely because a workflow can be written for it.

---

## 9. Target architecture

```text
Browser / Chief
      |
      v
Control Center UI
      |
      +----------------------------+
      |                            |
      | /api/copilot               | workflow trigger
      |                            |
      v                            v
AI SDK 7                      Workflow SDK
ToolLoopAgent                 "use workflow"
      |                            |
      |                            +--> "use step"
      |                            |       |
      |                            |       v
      |                            |   deterministic operations
      |                            |
      +-------------+--------------+
                    |
                    v
            tool policy layer
                    |
          +---------+----------+
          |                    |
          v                    v
      read tools          mutating tools
      auto-run            AI approval
                               |
                               v
                     SAFRS confirm phrase
                               |
          +--------------------+
          |
          v
     runCommand(id)
          |
          v
    sanitizeOutput()
          |
   +------+-------+
   |              |
   v              v
AI evidence    UI evidence
truncated      full sanitized
```

---

## 10. AI SDK implementation

### 10.1 Provider contract

Provider selection values:

- `local`
- `openai`

Default: `local`.

There is never automatic Local -> OpenAI fallback.

#### Local

Local provider uses an OpenAI-compatible Ollama endpoint.

Readiness requires:

1. configured local endpoint responds;
2. selected model is present.

If unavailable, the UI reports that the local runtime is not ready and provides local remediation guidance. It must not call OpenAI.

#### OpenAI

The UI reports only:

- `Dikonfigurasi`, or
- `Belum dikonfigurasi`.

Presence of `OPENAI_API_KEY` does **not** prove network availability, key validity, quota, or provider health.

The actual provider availability is determined only when a request is attempted.

Never expose:

- key value;
- key prefix;
- key suffix;
- key length;
- partially masked key.

### 10.2 Model policy

Model identifiers are configuration, not architecture.

Do not permanently lock `llama3.1:8b` or `gpt-4.1-mini` into the design.

Use environment-owned model ids:

- `SAFRS_LOCAL_MODEL`
- `SAFRS_OPENAI_MODEL`
- `SAFRS_OLLAMA_BASE_URL`

Initial model candidates may be benchmarked, but selection must be based on deterministic Control Center tasks:

- correct tool selection;
- valid tool arguments;
- structured output compliance;
- refusal to invent readiness;
- approval compliance;
- latency acceptable for local operator use.

### 10.3 Agent

Use a bounded `ToolLoopAgent` for normal Copilot turns.

Required controls:

- hard maximum agent-step count;
- explicit total timeout;
- explicit per-tool timeout where appropriate;
- structured output contract;
- no dynamic tool creation;
- no unbounded recursion;
- no provider fallback.

Initial maximum agent steps: **6**.

If the answer cannot be established within the boundary, return `ready: null` and an honest next step.

### 10.4 Tool approval

Use the current AI SDK 7 tool approval mechanism for mutating tools.

Mutating action sequence:

```text
model requests allowed mutating tool
  -> AI SDK approval request
  -> Chief approves or denies
  -> server revalidates tool id + inputs
  -> existing SAFRS confirm phrase is validated
  -> runCommand(id, phrase)
```

AI SDK approval does not replace the existing confirmation mechanism.

Where supported and low-complexity, enable signed/hardened approval handling so approval data cannot be silently altered between request and resume.

---

## 11. Tool policy

### 11.1 Read tools — phase 1

Auto-run:

- `doctor`
- `status`
- `task-list`
- `saf-gate-all`

Machine-readable output is preferred. `doctor` and `task-list` gain `--json` if the existing command contract supports this change cleanly.

### 11.2 Mutating tools — phase 1

Permitted only behind both approval layers:

- `setup`
- `db-start`
- `db-stop`
- `db-generate`
- `db-migrate`
- `db-seed`

### 11.3 Forbidden during initial rollout

- free shell;
- arbitrary command strings;
- `apply_patch`;
- MCP;
- corpus query;
- any R3 id;
- any command absent from `RUNNABLE_COMMANDS`;
- autonomous source-code edits;
- autonomous Git operations;
- production deploy;
- medical/clinical answers from Control Center.

The earlier v1 restriction on `dev`, `check`, `test`, `build`, `lint`, `typecheck`, and governance full verify remains until explicitly promoted in a later SAFRS-reviewed phase.

---

## 12. Central sanitization boundary

All executor and workflow output must pass through one server-side sanitization boundary **before** entering either model context or browser state.

```text
raw executor/workflow output
        |
        v
 sanitizeOutput()
        |
        +--> bounded/truncated model evidence
        |
        +--> full sanitized UI evidence
```

Requirements:

- redact known secret shapes;
- redact values associated with secret-like keys;
- prevent environment dumps;
- cap model-bound payload sizes;
- preserve enough structured evidence for deterministic status reporting;
- never depend on the model to redact secrets.

---

## 13. Answer contract

Every completed Copilot turn returns:

- `ready`: `boolean | null`
- `summary`: Indonesian, one or two sentences
- `evidence`: command/workflow ids actually executed
- `nextStep`: one Indonesian action or an honest unknown
- `provider`: `local | openai`
- `executionMode`: `immediate | workflow`
- `workflowRunId`: string or null

Rules:

- a failed required tool cannot produce `ready: true`;
- missing evidence cannot be converted into model confidence;
- model reasoning is not evidence;
- only actual command/workflow results appear in `evidence`.

---

## 14. Workflow SDK implementation

### 14.1 First principle

Workflow SDK is **not** a wrapper around every Control Center call.

It is introduced first through one narrow, deterministic, read-only workflow so the repository can validate:

- build integration;
- workflow compilation;
- state handling;
- retries;
- observability;
- testability;
- rollback behavior;

without putting mutation safety on an immature path.

### 14.2 Phase-2 pilot workflow: repository readiness audit

Create `repositoryReadinessWorkflow`.

```text
repositoryReadinessWorkflow
  -> doctorStep
  -> statusStep
  -> taskListStep
  -> safGateAllStep
  -> sanitize/normalize evidence
  -> aggregate readiness result
  -> return structured audit result
```

Every step calls the existing executor using command ids. No step accepts or constructs shell text.

The workflow itself does not determine readiness through an LLM. Readiness is derived deterministically from tool outputs.

The Copilot may then explain the deterministic workflow result in Indonesian.

### 14.3 Retry policy

Retry only operations that are safe to retry.

Read-only executor steps can use bounded automatic retries for transient failures.

Mutating commands must not gain automatic retries merely because Workflow SDK supports retries. Mutating workflow steps require explicit idempotency analysis before retry is enabled.

### 14.4 Local World

Initial Control Center integration uses Workflow SDK's Local World for the pilot because it requires no external workflow service.

Important limitation:

- local workflow data can be stored on disk;
- the Local World queue itself is in-memory;
- therefore the pilot must **not claim full restart durability** across a local server crash/restart.

The UI and documentation must describe the actual durability level honestly.

### 14.5 True local restart durability — later decision gate

If Chief requires Control Center workflows to survive local process restarts automatically, evaluate the Postgres World as a separate R2 change.

That phase requires:

- dedicated workflow persistence configuration;
- a long-lived workflow worker;
- explicit migration/bootstrap procedure;
- isolation from the primary application schema where practical;
- backup/recovery consideration;
- additional evidence and failure-injection tests.

Do not add Postgres World merely to satisfy a theoretical architecture preference.

### 14.6 Vercel World

Vercel World is not required for the local Control Center.

It becomes relevant only if a future Sentra application deploys Workflow SDK on Vercel. At that point, Vercel-managed workflow infrastructure may be used behind the same workflow programming model.

---

## 15. AI SDK + Workflow SDK integration rule

Use the smallest primitive that solves the problem.

### Immediate AI turn

```text
AI SDK ToolLoopAgent
```

### Deterministic durable process

```text
Workflow SDK workflow + steps
```

### Durable AI agent that must survive waits/restarts

Only then evaluate:

```text
AI SDK WorkflowAgent / @ai-sdk/workflow
```

Do not introduce `WorkflowAgent` in phase 1 or phase 2 merely because it exists.

This preserves a simple dependency graph and keeps beta workflow infrastructure out of ordinary chat interactions.

---

## 16. Workflow candidates after the pilot

These are candidates, not automatically approved scope.

### Candidate A — safe operator mutation workflow

Use only after the read-only pilot is stable.

Potential flow:

```text
validate allowed command
  -> produce effect preview
  -> wait for AI/user approval
  -> validate SAFRS confirm phrase
  -> execute one mutating command
  -> sanitize result
  -> record evidence
```

Before implementation, each command needs an idempotency/retry classification.

### Candidate B — repository verification workflow

Future R2 review may promote:

- `typecheck`
- `lint`
- `test`
- `build`
- selected governance verification

into a deterministic multi-step verification workflow.

This is **not** phase-1 or phase-2 scope.

### Candidate C — future coding-agent workflow

AI SDK 7 can integrate established agent harnesses, but Claude Code/Codex harness execution, sandboxes, source edits, and Git actions remain explicitly deferred.

Any future coding-agent integration requires a separate SAFRS design and permission model.

---

## 17. UI

Keep the existing Control Center visual language and `@sentra/token`.

No new design system, color literals, or radius literals.

### Copilot panel

1. Provider switch: `Lokal / OpenAI`.
2. Provider configuration/readiness state.
3. Question field and send button.
4. Transcript with tool cards.
5. Approval card for allowed mutating tools.
6. Readiness/result card.
7. Evidence drawer.
8. Workflow badge when `executionMode = workflow`.
9. Workflow run status when a durable workflow is active.

User-facing copy is Indonesian. Internal identifiers remain English.

### Provider wording

Local:

- `Siap`
- `Runtime belum siap`
- `Model belum tersedia`

OpenAI:

- `Dikonfigurasi`
- `Belum dikonfigurasi`

Do not display OpenAI as `available` based only on key presence.

---

## 18. Observability

Observability must be evidence-oriented rather than prompt-oriented.

Correlate where available:

- Control Center request id;
- AI call/agent run id;
- workflow run id;
- executor command id;
- tool call id;
- approval decision;
- final structured result.

Do not persist chain-of-thought or hidden model reasoning.

Persist only operational metadata and sanitized evidence needed to understand what happened.

Workflow observability is supplemental; it does not replace SAFRS evidence records where SAFRS requires them.

---

## 19. Error handling

| Case | Operator behavior |
| --- | --- |
| Local selected, Ollama down | Report local runtime not ready; never call OpenAI |
| Local selected, model missing | Report missing model and local remediation guidance |
| OpenAI selected, key absent | Report OpenAI not configured; no network call |
| OpenAI request fails | Report provider request failure; do not infer repository status |
| Unknown command id | Refuse; command is not allowlisted |
| Approval denied | Do not execute |
| Confirm phrase mismatch | Do not execute |
| Agent step limit reached | Return `ready: null` with honest next step |
| Tool timeout | Record failure; do not invent green status |
| Workflow step transient failure | Apply only the step's approved bounded retry policy |
| Workflow terminal failure | Preserve sanitized evidence and return failed/unknown result |
| Workflow runtime unavailable | Fall back only to non-workflow behavior where explicitly designed; never silently emulate durability |

---

## 20. Testing strategy

### 20.1 AI SDK unit tests

- provider selection;
- no silent fallback;
- OpenAI configured/not-configured state;
- local readiness;
- tool allowlist mapping;
- tool approval mapping;
- max agent-step enforcement;
- total/per-tool timeout mapping;
- structured output parsing;
- secret redaction;
- evidence truncation.

### 20.2 Route tests

- requested provider is the only provider constructed;
- local failure never constructs OpenAI;
- absent OpenAI key causes typed refusal before network call;
- unknown tools cannot reach `runCommand`;
- sanitized output is the only output returned to UI/model.

### 20.3 UI tests

- provider switch;
- accurate Local/OpenAI wording;
- OpenAI disabled/unavailable-to-call when not configured;
- tool cards;
- approval card;
- confirm phrase flow;
- workflow badge/status;
- evidence drawer contains sanitized data only.

### 20.4 Workflow tests

- readiness workflow calls only expected command ids;
- deterministic aggregation;
- safe bounded retry behavior;
- terminal failure behavior;
- sanitized workflow result;
- workflow run id propagation;
- duplicate/replay safety for read-only steps;
- cancellation/timeout behavior where used.

### 20.5 Failure-injection tests

Simulate:

- executor failure on each readiness step;
- model timeout;
- provider network failure;
- malformed model structured output;
- workflow step retry then success;
- workflow step permanent failure;
- page refresh during a workflow status view;
- Local World restart limitation is surfaced honestly.

### 20.6 CI rule

CI must not require:

- live Ollama;
- live OpenAI;
- real API keys;
- remote workflow backend;
- mutating repository/database operations.

Use deterministic doubles and local test infrastructure only.

---

## 21. Package and dependency policy

### Phase 1 — AI SDK

Add only the packages actually required for the Local/OpenAI Control Center integration.

Expected package families:

- `ai` major 7;
- compatible `@ai-sdk/react`;
- compatible `@ai-sdk/openai`;
- compatible OpenAI-compatible provider package for Ollama if still required by the selected implementation.

Pin exact compatible versions through repository policy after release-age validation.

### Phase 2 — Workflow SDK

Add:

- `workflow` exact tested beta version satisfying release-age policy.

Do not add:

- Postgres World package in the pilot;
- `@ai-sdk/workflow` in the pilot;
- Vercel-specific workflow backend packages unless deployment requires them.

Every new dependency must have a named responsibility.

---

## 22. Environment contract

Continue to keep Control Center environment ownership separate from `@safrs/env/server`.

Expected non-secret settings:

- `SAFRS_LOCAL_MODEL`
- `SAFRS_OPENAI_MODEL`
- `SAFRS_OLLAMA_BASE_URL`

Secret:

- `OPENAI_API_KEY`

Workflow pilot should require no secret remote backend credential when using Local World.

If Postgres World is later approved, introduce a dedicated workflow database connection variable rather than silently reusing unrelated application credentials.

`.env.example` contains placeholders only, never real values.

---

## 23. Proposed file map

Exact paths may be adjusted surgically to match current repository conventions.

| File | Responsibility |
| --- | --- |
| `projects/control-center/apps/web/src/lib/copilot/provider.ts` | Resolve Local/OpenAI or typed refusal |
| `projects/control-center/apps/web/src/lib/copilot/tools.ts` | Allowlisted AI tools over existing executor |
| `projects/control-center/apps/web/src/lib/copilot/agent.ts` | Bounded AI SDK 7 `ToolLoopAgent` |
| `projects/control-center/apps/web/src/lib/copilot/schema.ts` | Structured answer/tool schemas |
| `projects/control-center/apps/web/src/lib/copilot/sanitize.ts` | Central server-side evidence sanitization |
| `projects/control-center/apps/web/src/app/api/copilot/route.ts` | Copilot POST handler |
| `projects/control-center/apps/web/src/app/copilot-panel.tsx` | Chat, tool, approval, evidence, workflow status UI |
| `projects/control-center/apps/web/src/lib/exec/commands.ts` | Add/normalize machine-readable command arguments only where needed |
| `projects/control-center/apps/web/src/workflows/repository-readiness.ts` | Phase-2 deterministic readiness workflow |
| `projects/control-center/apps/web/src/workflows/steps/run-read-command.ts` | Workflow step wrapper over allowlisted read commands |
| `projects/control-center/apps/web/src/workflows/schema.ts` | Workflow input/output contracts |
| `projects/control-center/capabilities.json` | Record `ai` and later `workflow` capabilities |
| `.env.example` | AI configuration placeholders |
| `pnpm-workspace.yaml` | Pin approved dependency versions/catalog entries |

Do not create a generic workflow abstraction package in advance. Keep the first workflow close to Control Center until there is proven cross-project reuse.

---

## 24. Implementation phases

### Phase 0 — preflight and contract lock

No feature code yet.

1. Inspect current Control Center package/runtime/module configuration.
2. Confirm AI SDK 7 compatibility.
3. Resolve exact package versions under `minimumReleaseAge`.
4. Confirm existing `RUNNABLE_COMMANDS` and `runCommand` contracts.
5. Define the central sanitized evidence schema.
6. Confirm `doctor` and `task-list` JSON strategy.
7. Add/confirm acceptance tests before implementation.

**Gate:** no architectural conflict and no existing test regression.

### Phase 1 — AI SDK 7 Copilot

Implement:

- provider resolver;
- Local/OpenAI explicit switch;
- bounded ToolLoopAgent;
- allowlisted tools;
- structured response;
- central sanitization;
- approval UI;
- existing SAFRS confirmation integration;
- deterministic tests.

Do not install Workflow SDK merely as part of this phase.

**Gate:** AI Copilot passes all deterministic tests and cannot execute non-allowlisted actions.

### Phase 2 — Workflow SDK foundation

Implement only:

- exact pinned Workflow SDK beta;
- Local World integration;
- `repositoryReadinessWorkflow`;
- deterministic workflow steps over read commands;
- workflow status/evidence UI;
- workflow tests and failure injection.

Normal chat continues to work if workflow capability is disabled.

**Gate:** pilot proves value without adding unsafe mutation semantics or breaking Control Center simplicity.

### Phase 3 — durable approval/mutation evaluation

Do not implement automatically.

Review whether a durable operator mutation workflow materially improves:

- approval resume;
- auditability;
- failure recovery;
- operator experience.

If yes, design each mutating command's idempotency and retry behavior before implementation.

**Gate:** separate R2 approval.

### Phase 4 — broader workflow standardization

Only after proven use:

- repository verification pipelines;
- background AI workflows;
- research/data pipelines;
- deployed Sentra application workflows;
- Postgres World or Vercel World when their deployment model is actually required;
- AI SDK `WorkflowAgent` for genuinely durable agent runs.

No speculative framework adoption.

---

## 25. Acceptance criteria

### AI layer

- [ ] AI SDK 7 is used, not AI SDK 6.
- [ ] Local remains the default provider.
- [ ] Provider switch is explicit.
- [ ] No silent provider fallback exists.
- [ ] The model cannot submit arbitrary shell text.
- [ ] Only allowlisted command ids can reach the executor.
- [ ] Agent loop has a hard step limit.
- [ ] Agent/model/tool timeouts are bounded.
- [ ] Mutating tools require AI approval and existing SAFRS confirmation.
- [ ] Secrets are sanitized before model context and UI state.
- [ ] Readiness is evidence-derived.
- [ ] CI makes no live model calls.

### Workflow layer

- [ ] Workflow SDK is isolated behind a capability boundary.
- [ ] Exact beta version is pinned and release-age compliant.
- [ ] First workflow is read-only and deterministic.
- [ ] Workflow steps use command ids, never shell strings.
- [ ] Retry policy is explicit and safe.
- [ ] Local World limitations are documented and surfaced honestly.
- [ ] Workflow failures cannot become green readiness.
- [ ] Workflow evidence is sanitized.
- [ ] Copilot still works when workflow capability is disabled.
- [ ] No Postgres/Vercel World is introduced without a concrete deployment need.

---

## 26. Rollback strategy

### AI SDK rollback

Disable/remove the Copilot capability. Existing Control Center commands and executor continue unchanged.

### Workflow SDK rollback

Disable the workflow capability and remove the readiness workflow route/UI integration. Immediate Copilot tools continue using the existing executor.

The design must not require changing `runCommand()` semantics merely to support either SDK.

This rollback property is mandatory.

---

## 27. Non-goals

This plan does **not** authorize:

- a second command system;
- free shell access;
- arbitrary command construction;
- `apply_patch`;
- autonomous repository edits;
- autonomous Git operations;
- production deploy;
- R3 execution;
- Corpus Engine merge;
- clinical/medical answers;
- MCP integration;
- Prisma/Postgres MCP;
- AI Gateway requirement;
- second design system;
- Golden Path chat;
- image tools;
- HarnessAgent coding automation;
- universal use of Workflow SDK for ordinary requests;
- Postgres World or Vercel World without a demonstrated need.

---

## 28. Decision summary

The Control Center standard becomes:

```text
Need AI capability?
  -> AI SDK 7

Need durable multi-step execution?
  -> Workflow SDK

Need an application/repository action?
  -> existing allowlisted executor

Need mutation?
  -> AI approval + SAFRS confirmation

Need evidence?
  -> sanitized deterministic tool/workflow output
```

The intended result is higher solo-developer productivity with less custom infrastructure, while preserving the existing Sentra/SAFRS trust boundary.

**Enhance the existing architecture. Do not rebuild it around AI.**

---

## 29. Source basis checked for this revision

This plan was updated against the current official documentation available on 2026-08-17:

- Vercel AI SDK 7 release and current agent/runtime guidance.
- Workflow SDK official documentation for `use workflow`, `use step`, Local World, Vercel World, and Postgres World.
- Vercel Workflow current durability/versioning/observability guidance.

Current-source verification matters because AI SDK 7 is stable while the current Workflow SDK v5 line remains beta and requires a more conservative rollout policy.
