# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (address rules widened; two uncommitted slices share the working tree)

## Current state

- **There is no Kanban board, in any form.** Do not reintroduce the Cline app or a markdown board.
- Status tracking lives in `.agents/`: `PROGRESS.md` (area/phase), this file (session), `DECISIONS.md` (durable). `docs/plans/` is reference only.
- Rehydrate is MUST-only: one parallel batch of the Always (MUST) list. Always (SHOULD) waits until a task is assigned.
- The working tree carries **two different agents' uncommitted work in the same files** (`AGENTS.md`, `.agents/knowledge/12_LESSONS.md`). Stage per slice; never `git add -A`. In `12_LESSONS.md` the two slices sit in one adjacent hunk — staging needs `git add -p` edit mode, not plain hunk selection.

## Work in flight

- **Branch `fix/phase-1-verification-integrity` holds real, unreviewed work** — commit `3ecc116`. Nothing has reviewed or verified it.
- **R2** `TASK-20260818-FAST-REHYDRATE` (VERIFYING, `agent:cursor:grok`): `AGENTS.md` session protocol, `.cursor/rules/01-safrs.mdc`, `12_LESSONS.md` rehydrate line. Uncommitted. Designated review still required (verification controls).
- **R2** address-rule slice (`agent:claude`, Chief-authorized): `AGENTS.md:11` forbidden terms now "kamu", "elu", "elo", "gua", "gue"; one `12_LESSONS.md` line (read root `AGENTS.md` before the first reply); one `DECISIONS.md` entry. Uncommitted. Changes no verification logic, but `AGENTS.md` is itself a classified governance control, so designated review still required.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Decide what happens to `fix/phase-1-verification-integrity` — review and merge it, or drop it |
| **Chief** | Review/commit the rehydrate-protocol slice if it should ship |
| **Chief** | Commit the address-rule slice, or say what to change first |
| **Chief** | Decide the dead `hindsight` MCP server in `~/.claude.json` — restore it or drop the entry (outside this repo; see `DECISIONS.md`) |
| **Do not** | Reintroduce a Kanban board, app or markdown |

## Session guardrails

- PowerShell; `;` not `&&`; explicit staging only; never `git add -A`.
- Evidence before assertions.
