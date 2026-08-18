# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (fix/phase-1 merged as 3e05005; SAFRS gate red pending independent review)

## Current state

- **There is no Kanban board, in any form.** Do not reintroduce the Cline app or a markdown board.
- Status tracking lives in `.agents/`: `PROGRESS.md` (area/phase), this file (session), `DECISIONS.md` (durable). `docs/plans/` is reference only.
- Rehydrate is MUST-only: one parallel batch of the Always (MUST) list. Always (SHOULD) waits until a task is assigned.

## Work in flight

- `78c62f9` — both R2 policy slices (fast-rehydrate protocol + widened address rules).
- `3e05005` — merge of `fix/phase-1-verification-integrity` (`3ecc116`), run by Chief, message authored by the agent. Never reviewed before the merge; Chief holds review responsibility.
- The merge broke two pre-existing tests because it changed policy under them: `.gitattributes` now pins `eol=lf` and Biome formats with `lineEnding: "lf"`. `precommit.test.mjs` still expected CRLF on Windows, and `workspace-config.test.mjs` used `JSON.parse` on a `biome.jsonc` that now carries comments. Both expectations were tightened, not loosened: LF is now asserted on every platform, and the JSONC parser lives in `tests/repository/jsonc.mjs`.
- **`scripts/safrs-verify.sh` is RED and cannot go green from this side.** The unpushed change set (base `374e425`) mixes implementation with verification controls, so the checker demands independent review evidence in `.safrs/reviews/verification-integrity.json`. The existing evidence is stale (bound to `fe1af2d6410b`). Nobody may author that approval from the session that wrote the change — see the 2026-08-17 entry in `DECISIONS.md`.
- Nothing is pushed. `main` is ahead of `origin/main`.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Choose the independent reviewer for the current change set: authorize the `safrs-auditor` subagent (read-only, separate context), or review it yourself and have the verdict recorded |
| **Chief** | Decide whether the whole stack gets pushed to `origin` once the gate is green |
| **Chief** | Decide the dead `hindsight` MCP server in `~/.claude.json` — restore it (`hindsight-local-mcp`, self-hosted, bank `prof`) or drop the entry — outside this repo; see `DECISIONS.md` |
| Follow-up | `stripLineComments` is duplicated in `lint-baseline.test.mjs` and `jsonc.mjs`; dedupe in a separate change, not inside the flagged set |
| Env | Docker is down, so `tests/integration/database.test.ts` cannot run (`ECONNREFUSED 127.0.0.1:54329`). Unrelated to the merge |
| **Do not** | Reintroduce a Kanban board, app or markdown |

## Session guardrails

- PowerShell; `;` not `&&`; explicit staging only; never `git add -A`.
- Evidence before assertions.
