# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-17 (main residual consolidation, VERIFYING)

## Current state

- Branch `main` in the primary worktree, rebased onto `origin/main` (`fe1af2d`). Ahead 9, behind 0.
- Working tree is clean. The mixed residual change set on `main` is now split into one commit per work stream:
  `docs(governance)` AGENTS.md directive, `docs` README, `docs(handbook)`, `docs(superpowers)` plans/specs plus
  the SpecStory removal, `chore(agents)` Cline rules and Cursor skill, `chore(agents)` Cursor agent renumbering.
- Chief decisions this session: reaffirm D-003 (all dependency updates automerge as PRs once CI passes);
  commit the AGENTS.md language directive with the formatting corrected; commit residual work directly on `main`;
  delete the temporary scratch files permanently.
- `tmp-extract/` and `tmp-task2-extract.md` are deleted. Nothing from them entered git history.
- `projects/control-center/apps/web/AGENTS.md` and `CLAUDE.md` are covered by the upstream `.gitignore` rule.
- Renovate keeps the D-003 rule from `f8d5c52`; the upstream patch/minor restriction was superseded during rebase.
- Nothing has been pushed to `origin`.

## Verification evidence (this worktree)

- `npx biome check docs/handbook` PASS after adding explicit button types, exporting the tab handlers on
  `window`, and removing the duplicated `padding` declaration.
- Husky pre-commit passed on every commit.
- `pnpm governance` FAILS at `tools/safrs/check_sensitive_changes.py`:
  `verification controls and implementation changed in the same change set`.
  Verification controls changed: `AGENTS.md`, `tests/repository/automation-policy.test.mjs`.
  Implementation changed in the same set: `.github/renovate.json`, `.cursor/**`, `.clinerules`.
  All other SAFRS checks report OK, including task ownership and lifecycle.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Decide who issues the independent integrity review for this R2 change set |
| **Then** | Write `.safrs/reviews/verification-integrity.json` for the current base and change-set fingerprint, rerun `pnpm governance`, and only then push `main` |
| **Do not** | Weaken or bypass `check_sensitive_changes.py`; do not push while governance is red |

## Session guardrails

- PowerShell; explicit staging only; never `git add -A`.
- Evidence before assertions.
