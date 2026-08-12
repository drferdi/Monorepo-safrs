---
description: Create an implementation plan before writing any code. Plan-only; makes no changes.
argument-hint: [task or goal]
---

Create a concrete implementation plan for: $ARGUMENTS

Use the `agent-governance` skill to separate planning from implementation/verification/approval.

Constraints:
- Do NOT change, create, or delete any file. This is plan-only.
- Do NOT run build/test/lint unless strictly needed to read the current state (if so, request approval and note it).

Plan output:
1. Objective and success criteria (testable).
2. Current state summary (what exists today, evidence-based).
3. Change inventory: each file to add/modify, with purpose.
4. Ordered steps with the verification command for each.
5. Risk register: impact + likelihood + mitigation; note risk level R0-R3.
6. Approval points: what requires human authorization before execution (especially R2/R3).
7. Rollback/reversal notes.

Return the plan and stop. Do not proceed to implementation without explicit approval.
