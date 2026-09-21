# Gaffer Runtime

## Purpose

`tools/automation/src/gaffer/` is the dependency-free runtime for the Gaffer orchestration framework. It holds a provider-neutral `runGaffer()` that never guesses SAFRS exports: policy, risk, scope, leases, gates, and evidence are injected through ports, and provider behavior through callbacks.

The package lives inside `tools/automation` and inherits its boundary: it is a **verification control** (classified in `.safrs/sensitive-paths.json`), so every change is at least R2 and needs designated review. It uses Node built-ins only.

**Canonical framework:** `docs/architecture/GAFFER_ORCHESTRATION_FRAMEWORK.md`.
**Implementation handoff:** `docs/architecture/GAFFER_IMPLEMENTATION_HANDOFF.md`.

## Key source files

| File | Purpose |
| --- | --- |
| `tools/automation/src/gaffer/constants.mjs` | Frozen enums: `Route`, `WorkerClass`, `TaskState`, `FailureClass`, `AuditVerdict` |
| `tools/automation/src/gaffer/state.mjs` | Task state machine with validated transitions |
| `tools/automation/src/gaffer/contracts.mjs` | Task-contract validation/normalization + worker-result validation |
| `tools/automation/src/gaffer/classifier.mjs` | Route selection and worker-class classification |
| `tools/automation/src/gaffer/router.mjs` | Cheapest-qualified worker resolution; `assertNoSilentSubstitution` |
| `tools/automation/src/gaffer/scheduler.mjs` | Task DAG: acyclicity, dependency readiness, readiness refresh |
| `tools/automation/src/gaffer/escalation.mjs` | Failure-class → retry / escalate / block decision |
| `tools/automation/src/gaffer/telemetry.mjs` | In-memory event ledger |
| `tools/automation/src/gaffer/scope.mjs` | Changed-files-within-owned-paths assertion |
| `tools/automation/src/gaffer/runner.mjs` | The orchestration loop (`runGaffer`) |
| `tools/automation/src/gaffer/safrs-ports.mjs` | Gaffer ports wired to real SAFRS modules |
| `tools/automation/src/gaffer/provider-codex.mjs` | Codex provider + `executeGafferIntent` entrypoint |
| `tools/automation/test/gaffer/*.test.mjs` | Eight test modules exercising the runtime |

## How it works

### The run loop (`runner.mjs`)

`runGaffer({ intent, context, policy, ports })` requires eight ports (`discoverProject`, `authorize`, `rootPlan`, `rootImplement`, `executeWorker`, `verify`, `rootAccept`, `listAvailableWorkers`) plus an optional `audit`. It emits telemetry at each stage:

1. Discover the capsule, authorize the intent through SAFRS.
2. Root plans: SOLO or DECOMPOSE.
3. SOLO runs `rootImplement`, verifies, and requires Root acceptance.
4. DECOMPOSE builds a task DAG and executes ready tasks **serially** (v0.1 is deliberately serial for deterministic safety). Each task re-authorizes, resolves the cheapest qualified worker, executes under scope checks, verifies, and escalates or retries on failure.
5. Final verification, optional audit for `requiresAudit`, then Root acceptance.

A task reaches `READY` only after required verification and Root semantic acceptance; `BLOCKED` is the terminal failure state.

### SAFRS ports (`safrs-ports.mjs`)

This is the bridge that keeps SAFRS authoritative. It reuses, not re-implements, the control plane:

| Gaffer port | SAFRS capability reused |
| --- | --- |
| `discoverProject` | `resolveCapsules()` + `loadAndValidateContract()` with a strict `domain/capsule` selector |
| `authorize` | `compileTaskContract()` + shared `guard.mjs` + monotonic risk |
| `executeWorker` | lease reconciliation, scope assertion, pre/post write guards, certified-adapter check |
| `verify` | all eight PR gates + `verifyManifest` + repository verification + standalone capsule extraction |
| `rootAccept` | evidence-binding check + R2/R3 publication eligibility |

The selector is strict: exactly `domain/capsule`, lowercase-hyphen, no `projects/` prefix, no escapes. Worker execution requires a valid SAFRS lease, a prior task authorization with matching contract digest, non-empty owned paths, and an active certified adapter.

### Provider activation (`provider-codex.mjs`)

Codex is the first (and currently only) activated provider. `executeGafferIntent` assembles the Codex callbacks and a default worker registry (`codex-luna-economy`, `codex-luna-strong`) and runs through the SAFRS ports. The default callbacks return simulated completion and a default `SHIP` audit; they are injected for testing, not production execution.

## CLI usage

`tools/automation/src/cli.mjs` adds the `gaffer` domain:

```bash
node tools/automation/src/cli.mjs gaffer run <intent> [--capsule <id>] [--route <SOLO|DECOMPOSE>] [--json]
```

## Verification

```bash
node --test tools/automation/test/gaffer/
```

The eight Gaffer test modules cover routing, classification, escalation, scope, scheduling, the SAFRS ports, the run loop, and the Codex provider (7 Phase 3 proofs, including "READY is impossible before gates pass").

## Related pages

- [Gaffer orchestration (feature)](../features/gaffer-orchestration.md) — end-to-end behavior and invariants
- [Automation control plane](automation.md) — the SAFRS primitives Gaffer reuses
- [SAFRS governance checkers](safrs.md) — the Python mirror
- [Tools overview](index.md)
