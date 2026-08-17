# Master Remediation Kanban

**Plan:** `MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
**Assignment source:** `MASTER REMEDIATION AGENT ASSIGNMENTS.md`
**Owner:** Chief
**Last updated:** 2026-08-17
**Status vocabulary:** `BACKLOG` · `READY` · `IN PROGRESS` · `VERIFYING` · `REVIEW` · `BLOCKED` · `DONE`

## Board rules

- This board tracks execution status; ownership and detailed scope remain in the assignment source.
- No card becomes `IN PROGRESS` without an active SAFRS task claim and isolated worktree.
- `DONE` requires fresh evidence, reviewed diff, required authorization, and repository verification.
- R2/R3 cards require Chief authorization according to D-002 and D-004.
- Cards move left-to-right only when dependencies and exit criteria are satisfied.
- Parallel work is allowed only for cards with non-overlapping mutation scopes and isolated mutable state.

## DONE — Chief authorization decisions

| ID | Decision | Owner | Risk | Result |
| --- | --- | --- | --- | --- |
| DECISION-GATE | Approve Master Plan v0.2 | Chief | R2 | APPROVED |
| D-001 | Repository visibility | Chief | R2 | `PUBLIC` |
| D-002 | Solo-developer platform authority | Chief | R2 | Proposed R0/R1/R2/R3 model APPROVED |
| D-003 | Renovate policy | Chief | R2 | All dependency updates may automerge after CI passes |
| D-004 | R2 authorization model | Chief | R2 | Proposed explicit authorization flow APPROVED |

## BLOCKED — Evidence reconciliation before implementation

| ID | Work package | Owner | Risk | Blocker |
| --- | --- | --- | --- | --- |
| RECONCILE-RENOVATE | Align Renovate with approved all-dependency automerge policy | Codex | R2 | Current `renovate.json` only automerges patch/minor; task contract/worktree claim still required |

`RECONCILE-RENOVATE` remains blocked until `RECONCILE-GOVERNANCE` is reviewed. Do not claim or implement Renovate yet.

## IN PROGRESS — Governance ownership reconciliation

| ID | Work package | Owner | Risk | Notes |
| --- | --- | --- | --- | --- |
| RECONCILE-GOVERNANCE | Reconcile SAFRS task/worktree ownership for Master Remediation documents | Codex | R2 | `TASK-20260813-CONTROL-CENTER = CLOSED`; `docs/` is no longer blocked by that task; card is `REVIEW` |

## READY — Phase 0A, read-only, R0

These cards are authorized to collect evidence only. No source or platform mutation.

| ID | Work package | Owner | Reviewers | Deliverable |
| --- | --- | --- | --- | --- |
| GT-CLAUDE-01 | Local repository and runtime truth | Claude Code Fable 5 | Codex | Evidence fragment: Git, worktrees, runtime, ports, local verification |
| GT-CODEX-01 | GitHub, SAFRS, and platform truth | Codex | Cursor Agent | Evidence fragment: platform, Renovate, task, lease, approval state |
| GT-CURSOR-01 | Documentation and Control Center truth | Cursor Agent | Claude Code Fable 5 | Contradiction register and unsupported status claims |
| GT-INTEGRATION-01 | Ground Truth baseline synthesis | Claude Code Fable 5 | Codex, Cursor Agent | `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md` |

## BACKLOG — Wave 1: Verification integrity

Dependency: Phase 0A complete and D-001–D-004 resolved.

| ID | Work package | Owner | Risk | Depends on |
| --- | --- | --- | --- | --- |
| REM-CLAUDE-11 | Lint and deterministic line-ending baseline | Claude Code Fable 5 | R2 | GT-INTEGRATION-01 |
| REM-CODEX-11 | Test-cache integrity | Codex | R2 | GT-INTEGRATION-01 |
| REM-CLAUDE-12 | Canonical environment contract | Claude Code Fable 5 | R2 | GT-INTEGRATION-01 |
| REM-CLAUDE-13 | Database and Golden Path readiness | Claude Code Fable 5 | R2 | GT-INTEGRATION-01, D-004 |
| REM-CLAUDE-14 | Visual baseline repair | Claude Code Fable 5 | R2 | GT-INTEGRATION-01 |
| REM-CODEX-12 | Governance state reconciliation | Codex | R2 | GT-INTEGRATION-01 |
| REM-CURSOR-11 | Operator documentation reconciliation | Cursor Agent | R1/R2 | Wave 1 behavior stable |
| REM-CURSOR-12 | Operator acceptance audit | Cursor Agent | R0 | Wave 1 verification evidence |
| REM-CODEX-13 | Phase 1 master exit gate | Codex | R2 | All applicable Wave 1 cards |

## BACKLOG — Wave 2: Platform enforcement

Dependency: Phase 1 master exit gate `DONE`; D-002 and D-004 approved.

| ID | Work package | Owner | Risk | Exit result |
| --- | --- | --- | --- | --- |
| REM-CODEX-21 | Full CI on exact final `main` SHA | Codex | R2 | Full evidence for every `main` SHA |
| REM-CODEX-22 | `main` ruleset | Codex | R2/R3 | Required controls enforced by GitHub |
| REM-CODEX-23 | R2 enforcement bridge | Codex | R2 | Classification, evidence, authorization, merge gate connected |
| REM-CODEX-24 | Negative platform enforcement tests | Codex | R2/R3 | Prohibited behavior rejected |

## BACKLOG — Wave 3: Operational Control Center

Dependency: Phase 2 stable; no silent governance mutation.

| ID | Work package | Owner | Risk | Exit result |
| --- | --- | --- | --- | --- |
| REM-CURSOR-31 | Evidence ladder | Cursor Agent | R2 | Present/configured/runnable/healthy/enforced distinguished |
| REM-CURSOR-32 | Verification semantics | Cursor Agent | R2 | PASS/FAIL/NOT_APPLICABLE/BLOCKED/UNKNOWN truthful |
| REM-CURSOR-33 | Task lifecycle reconciliation | Cursor Agent | R2 | Conflicts detected and recommendations surfaced |
| REM-CURSOR-34 | Bounded local process supervisor | Cursor Agent | R2 | Safe Start/Stop/Status/log tail for approved targets |

## BACKLOG — Wave 4: Verification depth

Dependency: Phase 1 verification semantics stable; Phase 2 enforcement stable where applicable.

| ID | Work package | Owner | Risk |
| --- | --- | --- | --- |
| REM-CLAUDE-41 | API compatibility gate | Claude Code Fable 5 | R2 |
| REM-CLAUDE-42 | Migration drift gate | Claude Code Fable 5 | R2 |
| REM-CODEX-41 | Measured critical-control coverage baseline | Codex | R2 |
| REM-CURSOR-41 | Control Center browser E2E | Cursor Agent | R2 |

## BACKLOG — Wave 5: Security depth

Dependency: repository truth and platform enforcement stable.

| ID | Work package | Owner | Risk |
| --- | --- | --- | --- |
| REM-CODEX-51 | Dependency review | Codex | R2 |
| REM-CODEX-52 | pnpm trust-policy evaluation | Codex | R2 |
| REM-CODEX-53 | Useful package-manager-native SBOM | Codex | R2 |
| REM-CODEX-54 | CodeQL evaluation/integration | Codex | R2 |
| REM-CODEX-55 | Conditional OpenSSF Scorecard evaluation | Codex | R2 |

## BACKLOG — Wave 6: Performance

Dependency: verification correctness established; security controls have owners.

| ID | Work package | Owner | Risk |
| --- | --- | --- | --- |
| REM-CODEX-61 | Turbo task contract | Codex | R2 |
| REM-CODEX-62 | Affected PR lane | Codex | R2 |
| REM-CODEX-63 | Full `main` lane | Codex | R2 |
| REM-CODEX-64 | Remote-cache evaluation | Codex | R2 |

## Current snapshot

```text
BLOCKED          RECONCILE-RENOVATE waiting for RECONCILE-GOVERNANCE review
READY            none
IN PROGRESS      none
VERIFYING        none
REVIEW           RECONCILE-GOVERNANCE; GT-INTEGRATION-01 — baseline artifact ready for Chief review
DONE             GT-CLAUDE-01, GT-CODEX-01, GT-CURSOR-01, TASK-20260813-CONTROL-CENTER
```

## Card handoff template

```text
Task ID:
Owner:
State:
Risk tier:
Worktree:
Owned paths:
Forbidden paths:
Dependencies:
Changed files:
Verification commands/results:
Evidence freshness:
Chief decision/authorization:
Blockers:
Next allowed action:
```

## Completion gate

Run project-specific checks, review the diff, then run:

```text
powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1
```

If the repository is already dirty, record pre-existing ownership failures separately. Never weaken governance to make the board green.
