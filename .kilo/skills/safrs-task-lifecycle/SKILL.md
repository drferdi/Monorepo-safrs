---
name: safrs-task-lifecycle
description: Use when starting, updating, verifying, or closing mutation work that must follow this repository's SAFRS ownership and risk lifecycle.
---

# SAFRS task lifecycle

Read root `AGENTS.md`, `.safrs/policy.json`, and the nearest nested `AGENTS.md`.

1. Classify the task as R0, R1, R2, or R3 before mutation.
2. Inspect active ownership with `pnpm task list --active --json`.
3. Claim the smallest non-overlapping scope before editing:
   `pnpm task claim --id <TASK_ID> --title <TITLE> --owner-id <OWNER_ID> --owner-label <OWNER_LABEL> --risk <RISK> --scope <PATH> --state EXECUTING --yes`.
   Replace every angle-bracket placeholder with an actual task value before execution.
4. Use a dedicated worktree for parallel mutation; never use `git stash` in a worktree.
5. Move the task to `VERIFYING` before final gates.
6. Load the `verify` skill and record exact evidence in `.agents/HANDOFF.md`.
7. R2 requires designated review. R3 may be prepared but not executed without explicit human authorization.
8. Close the task only after required verification and review state are satisfied.

Never broaden scope silently, self-approve R2/R3 work, weaken verification, or
claim ownership of unrelated parallel changes merely to make governance pass.
