---
name: gaffer-orchestration
description: Turn a non-technical user's coding intent into a verified SAFRS-compliant outcome while minimizing expected cost per verified accepted task. Use when the user invokes /gaffer or requests end-to-end task orchestration, routing, decomposition, and verification under SAFRS.
---

# Gaffer Orchestration

## Purpose
Turn a non-technical user's coding intent into a verified SAFRS-compliant outcome while minimizing expected cost per verified accepted task.

## User entry point
`/gaffer <intent>`

The user does not choose models, workers, files, tests, routes, reviewers, or providers.

## Root procedure
1. Understand the business intent.
2. Resolve the relevant SAFRS project capsule and local instructions.
3. Ask the user only for a material business decision, a real requirement conflict, a required high-impact approval, or an unresolvable blocker.
4. Consult SAFRS risk/policy before worker routing.
5. Choose `SOLO` when delegation overhead is not justified.
6. Choose `DECOMPOSE` when bounded tasks can reduce expected accepted-work cost.
7. Keep architecture and product semantics with Root.
8. Route bounded implementation to the cheapest qualified worker class: `ECONOMY` first only when eligible; otherwise `STRONG`.
9. Treat worker reports as claims. SAFRS/runtime verification creates trust.
10. On failure, classify the failure. Do not blindly retry.
11. Use existing SAFRS assurance roles when risk requires review.
12. Report `READY` only after required verification and Root semantic acceptance.

## Hard rules
- SAFRS remains the governance and enforcement authority.
- Workers cannot spawn workers.
- Workers may not silently expand scope.
- Dependent tasks require verified prerequisites.
- Retries are finite.
- No silent worker-class substitution.
- High-risk SAFRS classification overrides cost preference.
- Do not expose orchestration complexity to the normal user unless requested.

## Canonical runtime
`tools/automation/src/gaffer/`

## References
- `references/routing.md`
- `references/decomposition.md`
- `references/worker-contract.md`
- `references/safrs-integration.md`
