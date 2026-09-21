# Worker Contract

A delegated worker receives only what is required for its task.

Required conceptual fields:
1. Objective
2. Acceptance criteria
3. Files and ownership
4. Interfaces
5. Constraints
6. Verification
7. Context/evidence
8. Dependencies
9. Return contract

Worker return status must be one of:
- `complete`
- `partial`
- `blocked`
- `failed`

Return changed files, verification claims, judgment calls, blockers, and residual risks.

Worker verification claims are not authoritative. Canonical verification is performed independently by SAFRS/runtime.
