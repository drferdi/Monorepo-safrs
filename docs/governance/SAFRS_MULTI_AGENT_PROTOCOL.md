# SAFRS Multi-Agent Protocol

## Task state machine
`PROPOSED → CLAIMED → PLANNED → EXECUTING → VERIFYING → REVIEW → MERGED → CLOSED`

Exceptional states: `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED`.

## Ownership rules
1. A bounded mutation scope has one active mutation owner by default.
2. Analysis/review may occur in parallel.
3. Parallel implementers use separate worktrees.
4. If tasks touch shared mutable state, isolate that state or serialize the tasks.
5. Scope expansion must be recorded before or with the change.
6. Conflicts in architectural intent escalate to human decision; agents do not silently pick competing interpretations.

## Minimum handoff record
```text
Task ID:
Objective:
State:
Risk tier:
Owned paths:
Changed files:
Verification run/results:
Decisions made:
Open blockers:
Next allowed action:
```

## Integration order
For dependent tasks, merge foundational contracts/migrations before downstream consumers unless the execution plan explicitly defines a compatible alternative.
