---
title: SAFRS Purpose-Driven Codebase Audit Protocol
status: CANONICAL
subject: purpose-driven-audit
authority: engineering-governance
---

# SAFRS Purpose-Driven Codebase Audit Protocol

## Purpose

Audit the current Monorepo by measuring code against approved objectives.

Do not begin with Git history, raw file counts, or historical blame.

The audit question is:

> Does the current codebase fulfill the purpose of the SAFRS Monorepo?

## Epistemic Order

Use this order:

1. approved Monorepo purpose and architecture invariants;
2. approved product/project requirements;
3. current architecture documentation;
4. current executable behavior;
5. current machine-verifiable evidence;
6. implementation patterns;
7. historical evidence only for a specific unresolved semantic question.

Git history, old plans, stale task records, and existing patterns are not semantic authority.

## Phase -1 — Purpose Acquisition

Before judging implementation:

1. read the explicit task objective;
2. read `docs/architecture/MONOREPO_PURPOSE.md`;
3. read the normative SAFRS specification;
4. read root `AGENTS.md` as navigation only;
5. read current architecture documentation relevant to the task;
6. read nearest capsule navigation when entering a project.

Output a Purpose Model:

- Monorepo mission;
- root responsibilities;
- project responsibilities;
- project-sovereignty invariant;
- operator-experience target;
- agent-autonomy target;
- genuine human gates;
- required machine enforcement.

Do not modify the Purpose Model merely because current code contradicts it.

## Phase 1 — Purpose-Oriented Codebase Scan

For each purpose:

`PURPOSE -> REQUIRED CAPABILITY -> CURRENT IMPLEMENTATION -> EXECUTABLE EVIDENCE -> CLASSIFICATION`

Do not scan merely to enumerate files.

Do not report raw change counts as architectural findings.

## Classification

Use only:

- ALIGNED
- DEGRADED
- CONTRADICTS
- MISSING
- BROKEN
- UNKNOWN

Priority:

- P0 — CONTRADICTS PURPOSE
- P1 — BROKEN core capability
- P2 — DEGRADED automation/reliability
- P3 — improvement/hardening

File count does not determine priority.

## Scan Dimensions

### A. Project Sovereignty
Inspect manifests, lock state, runtimes, config, environment contract, packages, tests, DB/schema/migrations, infrastructure, deployment, external services, and paths resolving outside capsule.

### B. Operator Simplicity
Inspect setup, doctor/status, dev/run, test, build, verify, deployment dry-run, and recovery.

### C. Agent Autonomy
Find per-command approvals, per-file approvals, stale claim blocking, manual task/lease reconciliation, inherited-failure blocking, premature retry termination, and inability to repair reversible local failures.

Classify each as `NECESSARY_SAFETY` or `AUTOMATION_FRICTION`.

### D. Governance Effectiveness
For each gate/check ask what risk it prevents, whether it is machine-decidable, whether it false-blocks, whether deterministic reconciliation can replace human intervention, and whether a simpler control provides equal assurance.

### E. Engineering Integrity
Verify as relevant: type safety, env validation, dependency reproducibility, lint, unit/integration/e2e tests, migrations, build, runtime smoke, deploy smoke, observability, and error handling.

### F. AI-Native Control Plane
Verify whether root can discover projects, read contracts, route work, bind permissions, execute/delegate, retry/recover, verify, collect evidence, and report—without becoming required for extracted project lifecycle.

### G. Security and Supply Chain
Evaluate secret isolation, secret scanning/push protection, dependency update policy, reproducible dependency state, pinned container inputs where appropriate, SBOM/provenance where useful, required machine checks, and minimal production credential exposure.

## Phase 2 — Identify Purpose Violations

Output findings by purpose, not directory size or historical diff.

A widespread pattern is evidence of systemic architectural drift, not proof that the pattern is correct.

## Phase 3 — FACT TO FIX

Every non-aligned finding must use:

`FACT -> WHY IT VIOLATES PURPOSE -> MINIMUM FIX -> EXECUTABLE PROOF`

Do not produce recommendations without a proof strategy.

## Required Audit Outputs

A. Purpose Matrix  
B. Capability Inventory  
C. Purpose Violations ranked P0–P3  
D. Concrete Broken Features  
E. Governance Friction  
F. Capsule Independence Matrix  
G. 2026 Best-Practice Gaps  
H. FACT -> PURPOSE VIOLATION -> FIX -> PROOF Matrix  
I. Minimal Work Packages

## Audit Anti-Patterns

Do not reconstruct thousands of historical changes, use an old commit as presumed truth, treat file-count growth as a defect by itself, perform unrelated cleanup, propose framework upgrades without evidence, rewrite architecture to accommodate accidental coupling, stop unrelated analysis because one capsule is blocked, or ask Chief to resolve deterministic bookkeeping.
