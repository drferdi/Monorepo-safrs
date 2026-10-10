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
12. Complete the mandatory delivery report and HANDOFF record.
13. Report `READY` only after required verification, Root semantic acceptance, and a successful HANDOFF write.

## Mandatory closeout

Before ending every Gaffer run, provide this report using the complete runtime model names and actual outcome. Use the exact model label and reasoning effort exposed by the runtime or active session configuration (for example, `GPT-6.1 Sol (xhigh)` or `GPT-5.6 Terra (high)`). Never use generic labels such as `GPT-5`, invent a model name, or use example values as a substitute for runtime evidence. If a reasoning effort is unavailable, write `reasoning effort not exposed` after the complete model name.

```text
Laporan Orkestrasi
- Orchestrator: <complete orchestrator model name> (<reasoning effort>)
- Worker: <complete worker model name> (<reasoning effort>) for each dispatched worker, or "SOLO - no worker dispatched"
- Result: SUCCESS | FAILED - <concise reason>
- Suggested remediation: <required when Result is not SUCCESS or any required gate is blocked or failed; give one evidence-based, scoped next action for each unresolved item, or "None - all required work is complete">
```

When remediation is required, name the owner or scope, the exact blocking evidence, and the smallest safe next action. Do not recommend a third retry after a circuit breaker, an unrelated rewrite, or an action outside granted authority.

Then write the current run status to the project-required `HANDOFF` file. For the SAFRS Monorepo control-plane scope, this is `.agents/HANDOFF.md` at the repository root. Preserve its required handoff fields: last updated, scope/capsule, current state and acceptance-gate evidence, next action, plus the orchestration report above with complete model names and suggested remediation.

The HANDOFF write is a delivery gate. If it cannot be completed, do not report `READY` or `SUCCESS`; report `FAILED` with the handoff-write reason and surface the blocker.

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
