# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (Kanban board rule set; auto-review disabled on all cards)

## Current state

- One rule now governs the execution board, recorded in `AGENTS.md` → "Execution board (Cline Kanban)":
  **every unit of work is one Kanban card, and a card stops at `review` — only Chief moves it to `done`.**
- Reason it was needed: `kanban` v0.1.70 auto-review (`autoReviewEnabled: true`, mode `commit`) commits the
  worktree onto the card's `baseRef` and moves the card to `done` unattended. All five cards had
  `baseRef: main`, so the board could write to `main` with no human gate (mandatory control 5).
- Applied: all five cards switched to `--auto-review-enabled false`. `main` verified still at `a70f0c7` —
  nothing had auto-landed before the change.
- Committed to `main`: the rule in `AGENTS.md`, the `DECISIONS.md` entry, and this file. R2 governance
  change, authorized by Chief (GO 2026-08-18). Task `TASK-20260818-KANBAN-BOARD-RULE`.

## Board state (`kanban task list`)

| Card | Column | Agent | Work |
| --- | --- | --- | --- |
| `ab62e` | review | codex | Phase 2 platform enforcement — awaiting Chief |
| `fef63` | in_progress | codex | Phase 1 verification integrity |
| `f3631` | in_progress | cline | Phase 3 Control Center |
| `ec24c` | in_progress | cline | Phase 4 API compatibility + migration drift |
| `c8342` | in_progress | codex | Phase 5 supply-chain, then performance |

Cards are linked, so a card reaching `done` releases the card waiting on it.

## Earlier this session

- E2E web-server race fix committed (`d0b3d6e`); `README.md` restored (`806e7dd`); deepmerge-ts
  advisory GHSA-ggr8-5vv4-36mx remediated (`b3b767e`).

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Review the diff on card `ab62e` and move it to `done` if good — that also releases the next card |
| **Open** | Card prompts are still multi-sentence paragraphs; shorten to one line + plan pointer |
| **Open** | `PROGRESS.md` last updated 2026-08-13 and has drifted; decide whether it is frozen as an archive |
| **Do not** | Re-enable auto-review on any card; it bypasses the review gate |

## Session guardrails

- PowerShell; explicit staging only; never `git add -A`.
- Evidence before assertions.
