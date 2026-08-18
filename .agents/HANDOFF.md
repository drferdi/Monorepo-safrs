# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (merge reviewed, gate green, everything pushed)

## Current state

- **There is no Kanban board, in any form.** Do not reintroduce the Cline app or a markdown board.
- Status tracking lives in `.agents/`: `PROGRESS.md` (area/phase), this file (session), `DECISIONS.md` (durable). `docs/plans/` is reference only.
- Rehydrate is MUST-only: one parallel batch of the Always (MUST) list. Always (SHOULD) waits until a task is assigned.

## Work in flight

Nothing. `main` and `origin/main` are both at `8e22025`; the working tree holds no
content changes.

Shipped this session, in order:

- `78c62f9` — two R2 policy slices: forbidden address terms widened to five, rehydrate narrowed to the Always (MUST) list.
- `3e05005` — merge of `fix/phase-1-verification-integrity` (`3ecc116`) on Chief's authorization. It pins `* text=auto eol=lf` and Biome `lineEnding: "lf"`, so line endings are now deterministic on every platform.
- `74497c0` — the two tests that merge broke, realigned. `precommit.test.mjs` now asserts a literal LF instead of branching on platform; `workspace-config.test.mjs` reads `biome.jsonc` through the new JSONC parser in `tests/repository/jsonc.mjs`. Both expectations are stricter than what they replaced.
- `8e22025` — integrity review evidence rebound to `base_sha 374e425dde71…`, `change_set_sha256 9da8491c7cea…`, recomputed from scratch by an independent read-only reviewer and approved by Chief.

Verified: `scripts/safrs-verify.sh` PASS, 67/67 repository tests, typecheck 8/8, `pnpm lint`
clean after the worktree was renormalized to LF.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Decide the dead `hindsight` MCP server in `~/.claude.json` — restore it (`hindsight-local-mcp`, self-hosted, bank `prof`) or drop the entry — outside this repo; see `DECISIONS.md` |
| Follow-up | `stripLineComments` is duplicated in `lint-baseline.test.mjs` and `jsonc.mjs`; dedupe in a separate change, not inside the flagged set |
| Env | Docker is down, so `tests/integration/database.test.ts` cannot run (`ECONNREFUSED 127.0.0.1:54329`). Unrelated to the merge |
| **Do not** | Reintroduce a Kanban board, app or markdown |

## Session guardrails

- PowerShell; `;` not `&&`; explicit staging only; never `git add -A`.
- Evidence before assertions.
