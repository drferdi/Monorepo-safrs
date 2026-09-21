# Multi-agent protocol

**Canonical:** `SAFRS_SPEC.md` §9, `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md`, root `AGENTS.md`.

Only one actor owns mutation authority for the **same bounded scope** at a time.

Lifecycle:

`PROPOSED → CLAIMED → PLANNED → EXECUTING → VERIFYING → REVIEW → MERGED → CLOSED`

Exceptional: `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED`.

CLI: `pnpm task`. Storage: git common dir `.git/safrs-control-plane/` (`tools/task/src/storage.mjs`).

## Isolation

Parallel mutation uses dedicated worktrees **outside** the working tree:

`../Monorepo.worktrees/<branch-name>`

Never create worktrees inside the repository root. `.worktrees/` is a gitignored safety net only.

## Stale claims are not a permanent lock

If no active mutation owner can be demonstrated for a scope, reconcile the claim (`SUPERSEDED` or another terminal state) and continue. Do not stop solely because bookkeeping is stale. Real live writers on the same scope still require a stop.

## Session protocol

Start: Always (MUST) docs in one parallel batch (generated routing block in `AGENTS.md`).

End: overwrite `.agents/HANDOFF.md` (under ~1k tokens) when the task includes repository-wide coordination. Capsule-scoped workers must not broaden mutation just to touch global `.agents/*`.

Commits authored or co-authored by an agent MUST carry an attribution trailer (SAFRS-09).
