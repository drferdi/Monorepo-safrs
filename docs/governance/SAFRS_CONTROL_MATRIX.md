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
