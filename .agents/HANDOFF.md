# HANDOFF — Monorepo control plane

Last updated: 2026-10-12 (Claude Code, `feat/claude-path-scoped-rules`)
History: `git show 4e4e10ec:.agents/HANDOFF.md` (full log through 2026-10-12) and `git log -- .agents/HANDOFF.md`.

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.
This file is overwritten with current state, not appended; keep it short (it is a MUST read).

## Current state

- Local `main` is the merge of `feat/claude-path-scoped-rules` (local only). The main checkout is on
  `chore/tools-closeout`. `origin/codex/oracle-ii-grounding` was pushed by Gaffer on 2026-10-11 (`88e56bb7` included).
- Local `main` history must not be pushed as is: it holds commits from the 2026-08-24/25 PII
  incident. Publication goes only through a filtered export (control plane only, no `projects/**`,
  PII-scanned) on top of `origin/main`, with about 20 governance/security conflicts and an
  independent integrity review.
- `node --run governance`: 13/14 stages pass; sensitive-change classification fails (R3,
  verification controls and implementation in one change set). This is by design until the
  integrity review is done. Changing `check_task_ownership` to read only staged paths was refused
  as audit tampering; do not retry.
- Agent context routing: `.safrs/document-registry.json` generates the AGENTS.md read order and
  the path-scoped Claude rules in `.claude/rules/safrs-*.md` (`python tools/safrs/generate_routing.py`).
  The MUST list has 6 documents. `MONOREPO_PURPOSE.md` and `03_ARCHITECTURE.md` are `task:architecture`.
  Only Claude Code honors `.claude/rules`. `safrs-auditor` and `token-guard` run on `model: sonnet`.
- Jev: `tools/typesafe-jev` is the only Jev. Claude, Codex, Cursor, and Factory Droid calls are
  verified. Grok and Antigravity are configured but unverified (not logged in). OpenCode hangs on
  `jev_route` in `opencode run`; two fixes failed, so the work stopped.
- Tools: each folder in `tools/` is planned to get its own repository. `tools/prompt` (MyPrompt,
  repository `drferdi/Myprompt`, publish with `git subtree split --prefix=tools/prompt`) and
  `tools/retriever` are excluded from the root workspace.
- Root doctor fails while Docker/PostgreSQL is down. Fresh extraction/install is not approved.

## Work in flight

- REVIEW: `TASK-20261012-CLAUDE-PATH-RULES-WT`, `TASK-20261012-MUST-DEMOTION`,
  `TASK-20261012-ROOT-HANDOFF-TAKEOVER` (this file; Gaffer approved taking it over from
  `TASK-20261011-TOOLS-CLOSEOUT`), `TASK-20261012-CODEX-AGENTS-HYGIENE`,
  `TASK-20261012-LESSON-HEREDOC`, `TASK-20261012-AUDIT-A6-A7`, `TASK-20261012-LFS-PRE-PUSH`, `TASK-20261011-GAFFER-ADDRESS`, and Codex's `TASK-20261011-TOOLS-*` set. Move them to MERGED
  once the integrity review accepts them.
- OpenCode Jev hang: next try is inside the OpenCode TUI.

## Blockers (need Gaffer)

- Filtered export and independent integrity review before anything from local `main` is published.
  Dry-run 2026-10-12 (local refs only, no fetch, per BOUNDARIES): against `origin/main` `b2d3a022`,
  outside `projects/**` the export is 371 added, 124 modified, 39 deleted files (286 under `tools/`),
  with 31 textual merge conflicts. PII scan of added lines: no WhatsApp JID or phone number; the
  `secret` pattern hits are code identifiers. Gaffer decided (2026-10-12): `tools/prompt` and the
  `@gmail.com` address in `tools/prompt/README.md` go into the export.
- Log in to Grok and Antigravity once so their Jev use can be verified. Upload the corrected
  `audit-monorepo-agent` skill (`~/Downloads/audit-monorepo-agent.zip`) in claude.ai.
- Audit actions (`verify-report/agent-audit-2026-10-10.txt` §7), status 2026-10-12: A-6, A-7, A-17
  done; A-13 and A-19 partly done; A-2, A-3, A-4, A-5, A-11, A-14, A-15, A-16, A-18 still open and
  not approved. A-1 (key rotation), A-2 (repo is public), A-3 (ruleset requires 0 reviews), and
  A-18 (`gh` token invalid) are Gaffer's own jobs.

## Done 2026-10-12 (Gaffer-approved)

- `docs/gaffer-address-root` merged (`631c6aba`). Four sentrawiki lines where "Gaffer" meant the
  user were changed to "the user", because Gaffer is also the orchestration layer (`1a16acae`).
  `TASK-20261011-GAFFER-ADDRESS` was resumed in a recreated `main-merge-tmp` worktree (its claim
  was bound there), moved to REVIEW, and the temporary worktree was removed.
- `.husky/pre-push` (and its copy `scripts/git-hooks/pre-push`) now runs `git lfs pre-push` after
  both gates; stdin is read once and replayed. Gates and the LFS call were tested by hand.
- A-6/A-7: the shared guard asks before `git reset --hard` and `gh pr merge`; Claude and Codex
  guards block a malformed payload (exit 2). The repo-local `.claude/settings.local.json`
  (gitignored) no longer allows `rtk gh *`, and `rtk git *` is narrowed to status/diff/log/show.
  The guard test "sibling worktree ... lowercase-drive" fails when run from a linked worktree,
  before and after this change; it needs the main checkout.

## Next actions

- Resolved 2026-10-12: Control Center now has its own `biome.jsonc` and its lint script checks
  43 files (see its handoff). `TASK-20261011-TOOLS-LOCAL` was SUPERSEDED with Gaffer's approval.
- `.codex/agents` (2026-10-12, `TASK-20261012-CODEX-AGENTS-HYGIENE`): "Chief" is now "Gaffer",
  `09-security-reviewer.toml` is named `09-security-reviewer` (the documented `security-reviewer`
  stays), and agent 01 points at the AGENTS.md MUST list instead of a stale copy. Not verified
  inside Codex. `09-security-reviewer` says read-only but has no `sandbox_mode = "read-only"`.
