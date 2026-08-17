# Master Remediation Agent Assignments

**Plan:** `MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
**Status:** Assignment map; execution remains gated by claimed work packages
**Active R2 package:** `TASK-20260817-RECONCILE-GOVERNANCE`
**Owner:** Chief
**Operating model:** Human-Governed · Agent-Executed · Machine-Enforced

## Authorization boundary

Chief approved the Master Plan and D-001 through D-004.
Phase 0A evidence exists in `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`.
`TASK-20260813-CONTROL-CENTER` is `CLOSED` and no longer owns `docs/`.
`TASK-20260817-RECONCILE-GOVERNANCE` is the authorized R2 package for these six files:

- `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
- `docs/plans/active/MASTER REMEDIATION KANBAN.md`
- `docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md`
- `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`
- `.agents/HANDOFF.md`
- `.agents/DECISIONS.md`

Phase 1 and Renovate remain unauthorized until this task is reviewed. R2 authorization remains distinct from implementation and must follow fresh verification.

## Agent ownership

| Agent | Primary ownership | Review responsibility |
| --- | --- | --- |
| Claude Code Fable 5 | Application, database, Golden Path, environment readiness | Review Codex runtime/build impact |
| Codex | SAFRS governance, verification controls, CI, platform enforcement, supply chain, performance | Review Cursor governance/security impact |
| Cursor Agent | Control Center, operator experience, browser E2E, documentation reconciliation | Review Claude application/operator impact |

Agents work in sibling worktrees under `D:\DEV\Monorepo.worktrees\`. Never mutate dirty `D:\DEV\Monorepo` or overlap an active mutation scope. Claim each bounded task through the SAFRS control plane.

## Wave 0 — Phase 0A ground truth, R0, read-only

### GT-CLAUDE-01 — Local repository and runtime truth

**Owner:** Claude Code Fable 5. **Mutation:** none.

Collect Git/worktree/task-local state, Docker, PostgreSQL, Golden Path, Jaeger, ports, and local verification results. Record timestamp, SHA, environment, and `FRESH`/`CACHED`/`HISTORICAL` status. Do not fix failures, read `.env`, reset databases, or clean worktrees.

### GT-CODEX-01 — GitHub, SAFRS, and platform truth

**Owner:** Codex. **Mutation:** none.

Collect visibility, branch rules, required checks, Actions/security settings, Renovate behavior, task registry, lease/fencing state, and approval/evidence state. Produce evidence for D-001, D-003, and D-004. Do not change GitHub settings, task state, rulesets, or governance checkers.

### GT-CURSOR-01 — Documentation and Control Center truth

**Owner:** Cursor Agent. **Mutation:** none.

Compare documentation, repository, runtime, Control Center, and verification semantics. Record contradictions, unsupported status claims, command-name drift, and stale operator guidance. Do not edit documentation during Phase 0A.

### GT-INTEGRATION-01 — Baseline synthesis

**Owner:** Claude Code Fable 5; **review:** Codex and Cursor Agent.

Synthesize evidence fragments into the factual `MONOREPO GROUND TRUTH BASELINE v1`. Facts only; recommendations remain in the Master Plan or later execution specifications. If the baseline is written to the repository, it requires explicit documentation authorization because Phase 0A source mutation is forbidden.

## Decision gate

After Wave 0, stop. Chief must resolve:

- **D-001:** `PUBLIC` or `PRIVATE` repository visibility.
- **D-002:** solo-developer platform authority for R0/R1/R2/R3.
- **D-003:** Renovate policy A, B, or C after evidence.
- **D-004:** explicit R2 authorization and evidence flow.

No unresolved decision becomes an implementation assumption.

## Wave 1 — Verification integrity

### Claude Code Fable 5

- **REM-CLAUDE-11:** Phase 1.1 lint and deterministic line-ending baseline. Own formatter scope/configuration and documented exclusions. No blanket ignores or unrelated mass-formatting. Exit: `pnpm lint`, zero errors.
- **REM-CLAUDE-12:** Phase 1.3 canonical environment contract. Make `pnpm run doctor`, `pnpm build`, `pnpm test`, and `pnpm check` deterministic across local, CI, test, and build contexts.
- **REM-CLAUDE-13:** Phase 1.4 database and Golden Path readiness. Prove fresh PostgreSQL, migration, seed, UI write, API validation, database write/read, UI read, reload, and persistence. Treat `TransactionSample` removal as a separate R2 schema decision if still speculative.
- **REM-CLAUDE-14:** Phase 1.5 visual baseline repair. Materialize real PNG data, reject Git LFS pointers, and prove fresh visual E2E.

### Codex

- **REM-CODEX-11:** Phase 1.2 test-cache integrity. Unit/contract/pure repository tests may cache; database integration, functional E2E, and visual E2E must not. Stopped PostgreSQL must yield `FAIL` or `BLOCKED`, never replayed `PASS`.
- **REM-CODEX-12:** Phase 1.6 governance reconciliation. Correct stale tasks, leases, worktrees, branches, and ownership. Never weaken fail-closed checks.
- **REM-CODEX-13:** Phase 1 master gate coordination. Require fresh evidence for database and browser checks; reject cached, historical, or `NOT_APPLICABLE` output presented as execution success.

### Cursor Agent

- **REM-CURSOR-11:** Reconcile operator documentation after behavior stabilizes; use `pnpm run doctor` terminology.
- **REM-CURSOR-12:** Read-only operator acceptance audit. Confirm fresh/cached/historical semantics and no premature readiness claims.

## Wave 2 — Platform enforcement, Codex owner

- **REM-CODEX-21:** Full CI on exact final `main` SHA.
- **REM-CODEX-22:** `main` ruleset, conditional on D-002/D-004.
- **REM-CODEX-23:** R2 classification, evidence, authorization, and merge-gate bridge.
- **REM-CODEX-24:** Negative tests: direct push, failed/missing checks, force push, branch deletion, unauthorized R2, and exact-`main` CI.

Platform settings are R2/R3 boundary work and require scoped Chief authorization. Do not test destructive platform behavior against an unapproved target.

## Wave 3 — Operational Control Center, Cursor owner

- **REM-CURSOR-31:** Evidence ladder: `Present`, `Configured`, `Runnable`, `Healthy Now`, `Last Verified`, `Enforced`.
- **REM-CURSOR-32:** Verification semantics: `PASS`, `FAIL`, `NOT_APPLICABLE`, `BLOCKED`, `UNKNOWN`, with freshness, timestamp, SHA, and environment metadata.
- **REM-CURSOR-33:** Detect stale task/PR/branch/lease/worktree/owner conflicts; recommend reconciliation only, never silently mutate governance state.
- **REM-CURSOR-34:** Bounded local supervisor for PostgreSQL, Golden Path, Control Center, and Jaeger. Fixed executables/arguments, containment, PID ownership, port checks, bounded logs, audit, confirmation, and no R3 commands.

Use `@sentra/token`; raw colour/radius values are forbidden. User-facing strings remain Indonesian; code and comments remain English.

## Wave 4 — Verification depth

- **Claude:** `REM-CLAUDE-41` API compatibility gate; `REM-CLAUDE-42` disposable-PostgreSQL migration drift gate.
- **Codex:** `REM-CODEX-41` measured coverage baseline for critical controls; no arbitrary 90% threshold.
- **Cursor:** `REM-CURSOR-41` Control Center E2E for unavailable Docker, unhealthy DB, command safety, audit failures, R3 denial, and sensitive-value rendering.

## Wave 5 — Security depth, Codex owner

`REM-CODEX-51` dependency review, `REM-CODEX-52` pnpm trust-policy evaluation, `REM-CODEX-53` useful package-manager-native SBOM, `REM-CODEX-54` CodeQL, and `REM-CODEX-55` conditional OpenSSF Scorecard. Every control requires purpose, owner, trigger, failure semantics, evidence, and remediation path.

## Wave 6 — Performance, Codex owner

`REM-CODEX-61` Turbo task contract, `REM-CODEX-62` affected PR lane, `REM-CODEX-63` full `main` lane, and `REM-CODEX-64` remote-cache evaluation. Correctness comes first; integration and sensitive artifacts remain non-cacheable where required.

## Integration and review rules

1. Merge in dependency order: Ground Truth, decisions, Wave 1, Phase 1 gate, Wave 2, Wave 3, Waves 4–6.
2. Shared files (`package.json`, lockfile, Turbo/Biome config, workflows, `.safrs/**`, and `.agents/**`) are serialized, not edited in parallel.
3. Implementation plus verification-control changes require `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` and independent review.
4. Implementers never author approval evidence for their own work and never infer Chief authorization from a passing test.
5. Every package records task ID, objective, risk, owned/forbidden paths, verification, blockers, and next action.
6. Final completion requires project-specific verification plus `scripts/safrs-verify.sh` (or the repository Windows equivalent), a reviewed diff, and updated handoff state.
