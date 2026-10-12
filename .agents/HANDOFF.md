# HANDOFF — Monorepo control plane

Last updated: 2026-10-12 (Claude Code, `feat/claude-path-scoped-rules`)
History: `git show 4e4e10ec:.agents/HANDOFF.md` (full log through 2026-10-12) and `git log -- .agents/HANDOFF.md`.

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.
This file is overwritten with current state, not appended; keep it short (it is a MUST read).

## Current state

- Local `main` is `a54ee055` (fast-forwarded on Gaffer's go, local only) and contains
  `origin/main` `b2d3a022`. The main checkout is on `main`, so today's guards and hooks are active
  there. `docs/refresh-2026-10-12` (worktree `main-merge-tmp`) is ahead with the docs refresh;
  moving `main` needs a new go. `integrate/origin-main`, the stray Sentrapedia worktree
  `suspicious-easley-9e5623`, and the mistaken `npx biome` cache were removed with Gaffer's approval. `origin/codex/oracle-ii-grounding` was pushed by Gaffer on 2026-10-11 (`88e56bb7` included).
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
  `TASK-20261012-CODEX-AGENTS-HYGIENE`,
  `TASK-20261012-LESSON-HEREDOC`, `TASK-20261012-AUDIT-A6-A7`, `TASK-20261012-LFS-PRE-PUSH`,
  `TASK-20261012-MERGE-ASK`, `TASK-20261012-CODEX-MERGE-PROMPT`,
  `TASK-20261012-CONTROL-CENTER-BIOME`/`-A11Y`/`-HANDOFF`, `TASK-20261011-GAFFER-ADDRESS`, and
  Codex's `TASK-20261011-TOOLS-*` set, and `TASK-20261012-PROVIDER-PROOF-FIXTURES`. Move them to
  MERGED once the integrity review accepts them.
- `TASK-20261012-DOCS-REFRESH` owns this file now. Gaffer approved superseding
  `TASK-20261012-ROOT-HANDOFF-TAKEOVER` (its claim was bound to another worktree), so the
  integrity review of that task's committed handoff edits moves to this task. It also refreshes
  README (ruleset, merge policy, generated routing), `docs/bootstrap/CLAUDE_SETUP.md` (hook is
  fail-closed and asks), and the wiki pages for automation, Claude, and Codex.
- OpenCode Jev hang: next try is inside the OpenCode TUI.

## Blockers (need Gaffer)

- Filtered export and independent integrity review before anything from local `main` is published.
  Dry-run 2026-10-12 (local refs only, no fetch, per BOUNDARIES): against `origin/main` `b2d3a022`,
  outside `projects/**` the export is 371 added, 124 modified, 39 deleted files (286 under `tools/`),
  with 31 textual merge conflicts. Since the inbound integration, the local tree already contains
  `origin/main`, so the export no longer has to resolve those conflicts. PII scan of added lines: no WhatsApp JID or phone number; the
  `secret` pattern hits are code identifiers. Gaffer decided (2026-10-12): `tools/prompt` and the
  `@gmail.com` address in `tools/prompt/README.md` go into the export.
- A worktree sits inside the repo root, which AGENTS.md forbids:
  `projects/healthcare/sentrapedia/.claude/worktrees/suspicious-easley-9e5623` (detached at
  `b2d3a022`, created by another session). Not removed; Gaffer decides.
- Log in to Grok and Antigravity once so their Jev use can be verified. Upload the corrected
  `audit-monorepo-agent` skill (`~/Downloads/audit-monorepo-agent.zip`) in claude.ai.
- Audit actions (`verify-report/agent-audit-2026-10-10.txt` §7), status 2026-10-12: A-3, A-6, A-7,
  A-17, A-18 done; A-4, A-13, A-19 partly done; A-2, A-5, A-11, A-14, A-15, A-16 still open and not
  approved. A-1 (key rotation) and A-2 (repo is public) are Gaffer's own jobs.
- Gaffer's rule (2026-10-12): merges into `main` happen only on Gaffer's command. GitHub ruleset
  "SAFRS main protection" (`21369601`) now requires 1 approving review; only the repository Admin
  role may bypass, and only when merging a pull request. Apps such as `app/cursor` (which merged
  #37, #38, #41, #42 without review) can no longer merge. `~/.codex/config.toml` has
  `git-pr-watch-auto-merge = false` (Codex `approval_policy` is now `on-request`, see below).
  Before/after ruleset JSON is in the 2026-10-12 Claude session scratchpad.
- Same rule, locally (`e893452c`, `6603264b`): AGENTS.md, `~/.claude/CLAUDE.md`, and
  `~/.codex/AGENTS.md` say ask before any merge; "go", "merge it", or clear agreement approves
  that merge only. The shared guard's new `MERGE` rule asks on `git merge`, `git pull`, and
  fast-forwarding `main`. Claude now shows a permission prompt for every guard "ask" (before, ask
  blocked, so even approved merges failed). Codex (`2db20bad`): `approval_policy = "on-request"`
  (rest of A-4; `writable_roots` and the daily automation are unchanged) plus
  `~/.codex/rules/safrs-merge.rules` (`prompt` for git merge, git pull, gh pr merge, also via rtk),
  so Codex asks Gaffer itself. Codex hooks cannot ask (fail-open), so the Codex guard passes those
  merges to the prompt only while that rules file exists, and still blocks fast-forwarding `main`
  (`MAIN_REF_UPDATE`). Checked with `codex execpolicy check`; not yet seen in a live Codex session.
  Recheck 2026-10-12 (`a7302428`): these rules only matched a bare `git <subcommand>`, so
  `git.exe merge`, `git -C <path> merge`, `git -c k=v pull`, `gh.exe pr merge` (and the same
  spellings of `reset --hard` and force push) were allowed. One shared prefix now covers them, and
  `checkout -B main` / `switch -C main` count as main-ref updates. Codex passes a merge to its
  prompt only for the bare spellings the rules file matches; other spellings are blocked. Accepted
  false positive: the text "git merge" inside a commit message also asks.

## Done 2026-10-12 (Gaffer-approved)

- Inbound `origin/main` integration (Gaffer's go, local only): `integrate/origin-main` (`c0db62b4`:
  41 `origin/main` commits including #37-#42, 27 conflicts resolved by an earlier Claude session)
  is merged into `feat/claude-path-scoped-rules`. Three new conflicts: this file, the Claude hook's
  parse-error message (both exit 2), and `guard.test.mjs` (both sides' tests kept). Correction: that
  branch's handoff said local `main` was fast-forwarded to it; it never was (`main` moved on through
  the Sentrapedia branch at 06:58). This integration is the only exception to the BOUNDARIES inbound
  clause; the outbound rule is unchanged. Brought in: `next` 16.3.8 and higher override floors
  (lockfile regenerated), API security headers and demo write limiter, fail-closed Codex provider
  (`--capsule` required), CI `safrs-no-capsules`, and two guard rules: `SELF_AUTHORIZED_PUBLICATION`
  and `SELF_GUARD_MODIFICATION`. Provider Proof 2/4/5 failed after it (they relied on implicit
  acceptance); they now pass an explicit `acceptanceResult` (`a210d52d`, provider code unchanged).
  `integrate/origin-main` is now an ancestor of `feat`; its branch and worktree can go (Gaffer's call).
- Needs Gaffer: `SELF_GUARD_MODIFICATION` is unconditional in `authorize()`, so it denies every
  agent (Claude, Cursor, Codex), not only Codex as its message says, any write to `guard.mjs`, the
  Codex adapter, `.codex/hooks/**`, `.codex/config.toml`, and `.husky/pre-push`. Keep it for all
  agents or scope it to Codex? Until then `SELF_AUTHORIZED_PUBLICATION` keeps its bare `\bgit\s+push`
  match (`git.exe push --no-verify` passes); the prefix fix waits because the file is self-guarded.
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

- Claude guard gap: `.claude/settings.json` matches `Bash|Edit|Write|NotebookEdit`, and the Claude
  adapter translates only `Bash`, so commands run through Claude Code's `PowerShell` tool skip the
  guard. Fix: add `PowerShell` to the matcher and the adapter (verification control, own task).
- Policy conflict to settle: the parked Phase 6 publisher is designed to enable GitHub auto-merge
  for a verified head (`SAFRS_AUTOMATION.md`, `SAFRS_APPROVALS.md`, ADR 0002), while Gaffer's rule
  is never enable auto-merge. It stays disabled (`SAFRS_PUBLISHER_ENABLED` false); revisit before
  Phase 6.

- Resolved 2026-10-12: Control Center now has its own `biome.jsonc` and its lint script checks
  43 files (see its handoff). `TASK-20261011-TOOLS-LOCAL` was SUPERSEDED with Gaffer's approval.
- `.codex/agents` (2026-10-12, `TASK-20261012-CODEX-AGENTS-HYGIENE`): "Chief" is now "Gaffer",
  `09-security-reviewer.toml` is named `09-security-reviewer` (the documented `security-reviewer`
  stays), and agent 01 points at the AGENTS.md MUST list instead of a stale copy. Not verified
  inside Codex. `09-security-reviewer` says read-only but has no `sandbox_mode = "read-only"`.
