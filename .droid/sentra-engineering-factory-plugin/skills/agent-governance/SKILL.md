---
name: agent-governance
description: Separate planning, implementation, verification, and approval; define who holds authority; ensure human approval for high-impact actions; record decisions, evidence, and unresolved risks. Use for any change lifecycle, especially R2/R3 changes.
version: 1.0.0
compatibility: droid
---

# Agent Governance

Run a safe change lifecycle: **Plan → Implement → Verify → Approve**, with clear authority boundaries and an honest record of decisions, evidence, and unresolved risks.

## When to use this skill

- Any multi-step change in a governed repository.
- A change classified as boundary-affecting or high-impact (e.g. auth, migrations, dependencies, CI/CD, shared APIs, production, credentials, security boundaries).
- When the repo defines a risk model (e.g. SAFRS R0-R3) or a task lifecycle that must be followed.

## Preconditions

- Understand the repository's governance model (from `AGENTS.md`/policy files) before acting.
- Know the current task's stage and who approved entering it.

## Workflow

1. **Classify risk.** Determine the impact level using the repo's policy (read-only → reversible local → boundary-affecting → high-impact).
2. **Separate phases.** Do not mix them:
   - *Plan* (see `/plan-change`): produce the plan, no code.
   - *Implement*: make the smallest safe change for the approved plan.
   - *Verify* (see `test-and-verify`): run evidence-based checks — never assume.
   - *Approve*: get explicit human authorization for any high-impact or irreversible action before execution.
3. **Assign authority.** Define who decides at each gate: the human for R2/R3 and irreversible actions; the agent for reversible, in-scope implementation steps only.
4. **Confirm before high-impact action.** Push, deploy, force-operations, credential changes, production mutations, and large deletions require explicit human approval and are not auto-approved by autonomy settings.
5. **Record decisions & evidence.** Log: what was decided, by whom, the evidence that supports it, and any unresolved risk (`DECISIONS.md`, `PROGRESS.md`, ADRs, or the repository's designated record).
6. **Write the residual-risk report.** What is unknown or unverified and who needs to review it.

## Output contract

A concise governance record containing:

- **Risk classification** of the change (R0-R3 or repo equivalent).
- **Lifecycle stage** currently in, and what is next.
- **Approval gates**: what still requires human authorization and why.
- **Decisions**: made, by whom, when.
- **Evidence**: commands/checks run and their status.
- **Unresolved risks**: tracked with owner/next step.

## Stop conditions

- At any approval gate awaiting the human → stop and present the ask.
- After implementation, before declaring done → pass through verification.
- When scope would exceed the approved plan → stop and request re-plan/approval.

## Security boundaries

- **Never** use autonomy level as a substitute for explicit human approval on high-impact actions.
- Never weaken governance, tests, or security gates to pass.
- If the task conflicts with repository governance, raise the conflict; do not silently override it.

## Example usage

> A dependency update (R2) in a governed repo: agent produces the plan → user approves scope → agent updates the narrow set → agent verifies with tests → agent presents residual risk → user approves merge. All decisions appended to `DECISIONS.md`.

## Anti-patterns

- Implementing while still planning (or planning while implementing).
- Claiming completion before verification runs.
- Auto-pushing/deploying because autonomy is "high".
- Silently changing scope or governance to finish faster.
- Leaving decisions and risks unrecorded.
