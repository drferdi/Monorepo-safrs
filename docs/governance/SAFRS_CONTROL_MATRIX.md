# SAFRS Control Matrix

| Control | R0 | R1 | R2 | R3 |
|---|---:|---:|---:|---:|
| Scoped identity/tool access | Required | Required | Required | Required |
| Mutation allowed | No | Yes | Yes | Prepare only until authorized |
| Dedicated branch/worktree | N/A | Required for mutation | Required | Required |
| Standard verification | N/A | Required | Required | Required |
| Integration/architecture/security checks as applicable | Optional | As affected | Required | Required |
| Sensitive-path detection | N/A | Required | Required | Required |
| Designated human/code-owner review | No | Policy-based | Required | Required |
| Explicit human execution authorization | No | No | No | Required |
| Isolated mutable runtime resources | N/A | As needed | Required when shared state exists | Required |
| Production credentials available to coding agent | Never | Never | Never | Never by default |
| Audit record | Basic | PR/commit | Required | Required + approval evidence |
| Resource limits for autonomous runs | Recommended | Required for long-running | Required | Required |

## Verification-integrity escalation
Any change to `.safrs/**`, `AGENTS.md`, security/architecture tests, governance scripts, or CI workflows is minimum R2 even if the textual change appears small.

## Publication gates (Phase 5)

Eight stable checks must report PASS for the exact pull-request head before
publication is eligible. Names are stable so branch protection can require
them:

`SAFRS Contract` · `SAFRS Lease` · `SAFRS Risk` · `SAFRS Budgets` ·
`SAFRS Verification` · `SAFRS Review` · `SAFRS Evidence` · `SAFRS Platform`

| Risk | Approval required | Publication |
| --- | --- | --- |
| R0 | none | evidence only; no pull request |
| R1 | none | publisher may enable auto-merge once all eight gates pass |
| R2 | current independent or code-owner approval bound to the exact head SHA and diff digest | publisher may enable auto-merge after the approval verifies |
| R3 code | R2 rules | code may merge; no consequential action |
| R3 operation | named human approval of the exact protected-environment job | never published through the publisher |

Each gate validates the artifacts present in the change set and fails
closed when they are invalid. A gate whose artifacts do not exist yet (a
human-authored pull request carries no run evidence, and platform
attestations arrive in Phase 6) reports `not_applicable` and passes; the
same code becomes enforcing the moment those artifacts exist.

Publication binds to one exact head: a new commit, a changed diff digest, a
changed contract digest, an expired or dismissed approval, or a stale
platform attestation all invalidate the verdict.
