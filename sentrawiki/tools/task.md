# Task CLI

## Purpose

`pnpm task` (implemented in `tools/task/src/cli.mjs`) manages SAFRS task ownership in the shared Git common-directory control plane: claim work with scopes, advance it through legal state transitions, close it into a terminal state, and list tasks. It enforces exclusive per-worktree ownership and mutation-active scope overlap at claim time and mirrors each mutation into the local lease ledger.

## Key source files

| File | Purpose |
| --- | --- |
| `tools/task/src/cli.mjs` | `pnpm task` command entry point (claim, state, close, list) |
| `tools/task/src/ownership.mjs` | Task shape validation, states/transitions, overlap, redaction |
| `tools/task/src/storage.mjs` | Shared registry and local lease-ledger access with `wx` locks |
| `tools/automation/src/leases.mjs` | `nextEvent` used to record local lease events |
| `tools/automation/src/canonical-json.mjs` | Canonical encoding of lease events |

## How it works

Task ownership is stored in the **Git common directory**, so it is shared across all worktrees of the repository. `tools/task/src/storage.mjs` resolves the common directory via `git rev-parse --git-common-dir` and places the control plane under `git-common-dir/safrs-control-plane/`:

- `active-tasks.json` — the task registry (JSON, version 1)
- `active-tasks.lock` — `wx`-exclusive lock guarding registry writes
- `lease-events.ndjson` — append-only local lease ledger, one canonical LeaseEventV1 per line

`tools/task/src/ownership.mjs` enforces the rules:

- **States** — `PROPOSED`, `CLAIMED`, `PLANNED`, `EXECUTING`, `VERIFYING`, `REVIEW`, `MERGED`, `CLOSED`, `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED`. Mutation-active states comprise `CLAIMED`, `PLANNED`, `EXECUTING`, `VERIFYING`, `REVIEW`, `BLOCKED`, `CONFLICT`; terminal states are `MERGED`, `CLOSED`, `ABORTED`, `SUPERSEDED`, `FAILED`.
- **Transitions** — a `TRANSITIONS` table restricts legal moves; illegal transitions are rejected (for example `REVIEW → MERGED` is allowed but a direct `CLOSED` from most states is not).
- **Risk** — a task's `risk` must be `R0`–`R3`, and an `R0` task cannot be mutation-active.
- **Scopes** — `scope_prefixes` are normalized by `normalizePrefix` (POSIX prefixes, trailing `/` for directories, case-insensitive, no absolute paths, wildcards, `..`, or empty/root). `findOverlapConflicts` forbids two mutation-active tasks whose scopes overlap.
- **Ownership** — tasks are bound to a `worktree_id`; a task can only be transitioned or closed from its owning worktree.
- **Redaction** — `validateTaskShape` rejects secret-shaped values (assignments, credential URLs, credential literals) in ids, titles, notes, and tools; `publicTask` redacts notes, paths, and worktree ids before display.

Registry writes are serialized: `mutateSharedRegistry` takes the `wx` lock, reads, transforms, validates, then writes atomically via a temp-file rename. Each mutation also records a local lease event (`CLAIM`, `TRANSITION`, `RELEASE`) through `nextEvent` from `tools/automation/src/leases.mjs` with `authority_run_url: null`; remote reconciliation with the GitHub lease authority is required before any push.

```mermaid
graph TD
    subgraph Control plane (git-common-dir/safrs-control-plane)
        R["active-tasks.json"]
        LK["active-tasks.lock (wx)"]
        LV["lease-events.ndjson (append-only)"]
    end

    CLAIM["pnpm task claim"] -->|wx lock| R
    STATE["pnpm task state --to"] -->|wx lock| R
    CLOSE["pnpm task close"] -->|wx lock| R
    R -->|validate + overlap| OK["allowed / rejected"]
    CLAIM -->|record| LV
    STATE -->|record TRANSITION| LV
    CLOSE -->|record RELEASE| LV
    LV -->|nextEvent (leases.mjs)| LS["local lease event"]
```

## CLI usage

```bash
pnpm task claim --id ID --title TITLE --owner-id ID --owner-label LABEL --risk R0|R1|R2|R3 --scope PATH [--scope PATH...] [--state CLAIMED|PLANNED|EXECUTING] [--yes]
pnpm task state --id ID --to STATE [--yes]
pnpm task close --id ID [--yes]
pnpm task list [--json] [--active]
```

Every write command previews the resulting registry and requires `--yes` to actually write:

```bash
pnpm task claim --id TASK-20260813-docs --title "Write status page" \
  --owner-id drferdii --owner-label chef --risk R1 --scope droid-wiki/ --yes
pnpm task state --id TASK-20260813-docs --to EXECUTING --yes
pnpm task close --id TASK-20260813-docs --yes
```

## Integration points

- Reuses the same storage and ownership primitives as `pnpm status` — see [Status CLI](status.md).
- Local lease events rely on `nextEvent` and canonical JSON from the automation control plane; remote authority reconciliation happens through [Automation control plane](automation.md) and `.github/workflows/safrs-task-control.yml`.
- Registry validity, ownership, and lifecycle are machine-enforced by `tools/safrs/check_task_ownership.py` and `tools/safrs/check_lifecycle.py` as part of governance.

## Related pages

- [Status CLI](status.md) — registry, lease, and git summary
- [Automation control plane](automation.md) — leases, contracts, gates
- [Automation control plane (features)](../features/automation-control-plane.md) — end-to-end lifecycle
- [SAFRS governance](../features/safrs-governance.md) — risk model, roles, verification
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) — canonical JSON and ownership rules
