# ADR 0002 — SAFRS Automation Control Plane

- Status: Accepted
- Date: 2026-08-13
- Deciders: Chief (drferdii)
- Plan: `docs/plans/active/SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md`

## Context

The repository runs under SAFRS v1.1 with a local Control Plane v1: a
Git-common-directory task registry, per-worktree exclusive claims, and
deterministic governance checks. Coding agents already execute R1/R2 work,
but publication is manual, risk is classified only at review time, there is
no machine-checked task contract, and no separation between the identity
that writes code and the identity that publishes it.

## Decision

Extend Control Plane v1 into an automation control plane instead of
introducing a competing task system:

1. **GitHub is the remote coordination and approval plane.** Issues carry
   intent, workflows serialize remote leases, rulesets and protected
   environments carry human authority. No custom service, database, queue,
   or dashboard.
2. **Repository code owns the canon.** Contracts, policy evaluation, risk
   computation, verification, and evidence generation live in-repo:
   JSON Schema 2020-12 documents under `.safrs/schemas/`, machine policy in
   `.safrs/automation-policy.json`, and dependency-free Node modules under
   `tools/automation/` mirrored by Python checkers under `tools/safrs/`.
3. **Canonical JSON with content-addressed digests.** UTF-8,
   lexicographically sorted keys, preserved array order, no insignificant
   whitespace. Digests must be byte-identical across Node and Python,
   Windows and Linux; this parity is itself governance-tested.
4. **Monotonic risk.** `effective_risk = max(declared, path, operation,
   data, capability, actual_diff)`. Agents may raise risk, never lower it.
5. **Identity separation.** The coding agent never holds merge or
   production-execution authority. A publisher identity may only enable
   auto-merge for an exact verified head; a read-only auditor attests
   platform state; a separate R3 executor performs one deterministic,
   human-approved operation. R3 remains prepare-only for coding agents.
6. **Phased delivery.** Eight reviewed PRs, each preserving the controls of
   earlier phases (see the plan). Vendor adapters translate native events
   into one shared guard; an adapter without enforceable pre-action hooks
   stays read-only (Droid stays disabled pending Activation Decision 4).

## Consequences

- Every automated change becomes reconstructable from durable evidence:
  contract digest → lease chain → run → checks → approvals → publication.
- Policy exists once; Node and Python both enforce it, and drift between
  them fails governance.
- Human authority concentrates at exactly two points: R2 review and R3
  protected-environment approval. Everything else is machine-gated.
- The plan's later phases (leases, guard, budgets, publisher, platform
  audit, executor, R3) build on the contracts this ADR fixes; changing the
  canon later is an R2 change with verification-integrity review.
