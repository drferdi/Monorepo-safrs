# SAFRS Approvals — Canonical R2/R3 Rules

Approval records use `ApprovalRecordV1`
(`.safrs/schemas/approval-record.v1.schema.json`). An approval is data
bound to exact content — never a standing permission.

## Who approves

Chief is the R2 authority for this repository. An explicit "yes" from Chief on a change,
given after verification has run, is the approval — there is no second human reviewer here
and none is required (D-004, accepted 2026-08-18). Agents never approve. The approval is still
recorded and still bound to exact content, so it dies the moment the content changes.

## Kinds

| Kind | Grants | Bound to |
| --- | --- | --- |
| `R2_CODE_OWNER` | Publication of a sensitive change | task, contract digest, head SHA, diff digest, reviewer authority, expiry |
| `R2_INDEPENDENT` | Same, from a designated reviewer who neither authored nor mutated the change | same bindings |
| `VERIFICATION_INTEGRITY` | A change set that modifies implementation and its governing verification together | exact change-set fingerprint |
| `R3_EXECUTION` | One deterministic operation, once | task, contract digest, commit, operation digest, target, idempotency key, expiry |

## Invalidation — always fail closed

An approval is void when any of these holds: self-review; unknown or
revoked reviewer authority; GitHub review dismissal; expiry passed;
subject head SHA changed; canonical diff digest changed; contract digest
changed; operation digest, parameters, or target changed; R3 idempotency
key already reached a terminal postcondition. A void approval requires a
fresh human decision — nothing refreshes automatically.

## R2 flow

1. All pre-review gates pass; the task pauses at `REVIEW`.
2. Required owners derive from changed paths and `.github/CODEOWNERS`;
   risk reasons may add security or integrity reviewers.
3. After a qualifying current approval, the publisher enables auto-merge.
   No second human click is required; a new commit re-opens review.

## R3 flow

1. The coding run prepares `OperationContractV1`, a dry-run artifact, a
   rollback contract, and precondition evidence. It cannot execute.
2. A protected-environment job displays task ID, commit, operation
   digest, target, dry-run digest, idempotency key, expiry, rollback ID.
3. The named authorized human approves that exact pending job in GitHub
   (**Review deployments → Approve and deploy**). This UI event is the
   only accepted R3 authorization.
4. Immediately before acting, the executor re-verifies every binding and
   stops without side effect on any mismatch.
5. One approval consumes one idempotency key. Retry needs proof of no
   terminal effect — or a fresh approval.

The coding agent, publisher, and auditor can never approve an R3
environment or read its credentials.
