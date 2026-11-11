# Gaffer Implementation Handoff

Use this document after applying the overlay.

## Phase 1 — inspect, do not redesign
Inspect the real contents/exports of:
- `AGENTS.md`
- `SAFRS_SPEC.md`
- `.safrs/automation-policy.json`
- `.safrs/adapter-capabilities.json`
- `.safrs/schemas/task-contract.v1.schema.json`
- `.safrs/schemas/run-contract.v1.schema.json`
- `.safrs/schemas/evidence-manifest.v1.schema.json`
- `tools/automation/src/contracts.mjs`
- `tools/automation/src/budgets.mjs`
- `tools/automation/src/risk.mjs`
- `tools/automation/src/gates.mjs`
- `tools/automation/src/scopes.mjs`
- `tools/automation/src/evidence.mjs`
- `tools/deps-graph/src/graph.mjs`
- `tools/task/src/ownership.mjs`
- `tools/task/src/storage.mjs`

For each Gaffer port, record `REUSE`, `EXTEND`, or `MISSING`. Replacement requires explicit architectural justification.

## Phase 2 — wire Gaffer ports
Map the provider-neutral `runGaffer()` ports to verified SAFRS capabilities:

| Gaffer port | Intended SAFRS responsibility |
|---|---|
| `discoverProject` | **REUSE** `resolveCapsules()` + `loadAndValidateContract()` with strict `domain/capsule` selector |
| `authorize` | **EXTEND** `compileTaskContract()` + guard + monotonic risk + budget state |
| `rootPlan` | **MISSING** provider/root callback; required injection |
| `rootImplement` | **MISSING** provider/root callback; required injection |
| `listAvailableWorkers` | **EXTEND** adapter capability manifest + injected worker registry; active certified adapters only |
| `executeWorker` | **EXTEND** injected provider callback with lease, guard, and canonical scope checks |
| `verify` | **EXTEND** all SAFRS gates + evidence manifest + repository verifier + standalone extraction |
| `audit` | **MISSING** provider/reviewer callback; required injection |
| `rootAccept` | **MISSING** semantic Root callback, gated by final evidence and R2/R3 publication eligibility |

Do not weaken SAFRS controls to make the adapter easier.

Repository-specific adapter: `tools/automation/src/gaffer/safrs-ports.mjs`.
Provider activation and `/gaffer` entrypoint remain Phase 3 work.

## Phase 3 — provider activation
Start with one provider only. Prove:
1. `/gaffer` receives intent.
2. SOLO works.
3. DECOMPOSE creates bounded tasks.
4. Economy succeeds on eligible work.
5. Economy capability mismatch escalates once to Strong.
6. SAFRS verification independently validates output.
7. READY is impossible before gates pass.

Then add provider parity.

## Phase 4 — economic validation
Benchmark against Root-only using representative coding tasks. Record cost, retries, escalations, verification result, latency, and final acceptance. Do not claim savings before measurements exist.
