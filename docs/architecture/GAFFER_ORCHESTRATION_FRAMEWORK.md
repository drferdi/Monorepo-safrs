# Gaffer Orchestration Framework — SAFRS Integration v0.1

## Definition
Gaffer is SAFRS's cost-aware coding orchestration layer.

- SAFRS: governance, enforcement, evidence, repository safety.
- Gaffer: intent, SOLO/DECOMPOSE, task decomposition, economic routing, evidence-driven escalation, final outcome coordination.

## Objective
Minimize cost per verified accepted task subject to SAFRS safety and quality gates.

## User experience
`/gaffer <business intent>`

The user should not select models, workers, routes, files, tests, or reviewers.

## Runtime

```text
User
  -> Root
  -> Project discovery
  -> SAFRS policy/risk
  -> SOLO | DECOMPOSE
  -> (if decomposed) task DAG
  -> cheapest-qualified routing
  -> ECONOMY | STRONG
  -> SAFRS verification/evidence
  -> risk-gated assurance
  -> Root semantic acceptance
  -> READY | BLOCKED
```

## v0.1 worker classes
- ROOT
- ECONOMY
- STRONG

No Standard tier until telemetry demonstrates need.

## Key invariants
1. SAFRS remains authoritative.
2. Root owns intent and final semantic acceptance.
3. Worker output is a claim until independently verified.
4. Workers cannot spawn workers.
5. Scope cannot expand silently.
6. Dependencies unlock only after verification.
7. Retries are finite.
8. Escalation requires evidence.
9. High-risk SAFRS policy overrides economy preference.
10. Cheapest means cheapest expected successful executor, not lowest token price.
11. No delegation when Root-only execution is expected to be cheaper and equally safe.
12. Orchestration complexity stays hidden from the normal user.

## Repository placement
- Canonical behavior: `.agents/skills/gaffer-orchestration/`
- Runtime: `tools/automation/src/gaffer/`
- Cursor adapter: `.cursor/commands/gaffer.md`
- Claude adapter: `.claude/commands/gaffer.md`
- Architecture document: this file

Do not create `.gaffer/`.

## SAFRS integration rule
`REUSE > EXTEND > CREATE > REPLACE`

Before wiring runtime ports, inspect actual SAFRS exports for contracts, budgets, risk, scopes, evidence, gates, approvals, project capsules, and provider capabilities. This overlay intentionally does not guess those APIs.

## Completion
`READY` requires required task completion, independent verification, scope validity, required approvals/audits, and Root semantic acceptance.

## Economic validation
Compare against a strong Root-only baseline. Gaffer is successful only when accepted quality is maintained or improved while average cost per verified accepted task decreases.
