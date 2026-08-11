# SAFRS Multi-Agent Protocol

## Task state machine
`PROPOSED → CLAIMED → PLANNED → EXECUTING → VERIFYING → REVIEW → MERGED → CLOSED`

Exceptional states: `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED`.

## Machine ownership registry (Control Plane v1)

Canonical local machine state for mutation ownership lives under the Git common directory at `safrs-control-plane/active-tasks.json`, shared by every sibling worktree. It is runtime lease state, not a committed file.

- Scopes are normalized repository-relative **path prefixes** (not globs). Directories end with `/`.
- Two mutation-active tasks conflict when prefixes are identical or one is an ancestor of the other.
- Every staged, unstaged, or untracked path must be covered by exactly one active task for the current worktree.
- Task writes use an exclusive shared lock and atomic replacement.
- Only the recorded worktree may mutate a task with `state` or `close`; sibling worktrees are read-only observers of that lease.
- Observe with `pnpm status` (read-only). Mutate claims with `pnpm task claim|state|close|list`.
- `pnpm governance` runs `tools/safrs/check_task_ownership.py` against the current registry snapshot.
- When implementation and verification controls change together, matching review evidence in `.safrs/reviews/verification-integrity.json` is required; stale evidence fails closed.
- HANDOFF remains the session narrative; do not duplicate long scope lists there — reference `task_id`.

Design: `docs/superpowers/specs/2026-08-11-safrs-control-plane-v1-design.md`.

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
