# HANDOFF — Monorepo control plane

Last updated: 2026-10-10 (Claude, Jev MCP fix for Claude Code on `feat/sidepanel-ui-batch`)
Previous body: `git show 4e074a3b:.agents/HANDOFF.md`

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- `main` is at `ee38362a` (2026-10-09); `origin/main` is at `f7008f45` (2026-10-07). They have
  diverged (main 621 ahead, 39 behind). Pushes stay behind the `.husky/pre-push` publish gate.
- `governance/agents-jev-policy` and `chore/agent-skill-hygiene` are merged into `main`.
- Agent audit 2026-10-10: `verify-report/agent-audit-2026-10-10.txt` (gitignored). Overall
  NON-COMPLIANT. Native configs of Codex, Antigravity, Grok, Opencode and Factory auto-approve.
  Plaintext API keys sit in `~/.gemini/config/mcp_config.json` and `~/.factory/settings.json`;
  rotating them is Gaffer's job.
- Gaffer approved three R2 fixes from that audit (on `feat/sidepanel-ui-batch`, not pushed):
  - `fa3b86a4`: Codex PostToolUse Biome formatter removed. The test and `CODEX_SETUP.md` now
    match. Automation-policy 21/21 and topology unittest 7/7 pass.
  - `d081a67c`: Cursor filesystem MCP removed. It read files past the `beforeReadFile` guard.
    `check_tool_inventory` and `check_docs` pass.
  - `0587c471`: sentrapedia added to `.safrs/known-nonconformance.json` (reviewBy 2026-11-10).
    `check_project_independence` passes (18 capsules, 2 known non-conformance).
- `ffe210a5`: Gaffer ordered every capsule to follow the monorepo topology, so sentrapedia's
  code moved under `src/`. `CONTEXT.md` moved to `.agents/`, and `docs/data.md` and
  `docs/testing.md` were added. `check_topology` passes locally.
  - Committed tree alone: tsc, eslint and vitest (120 tests) pass.
  - Working tree: typecheck, lint, 168/168 tests, build and deploy:dry-run pass.
- `1f332331`: sentrapedia now has `project.contract.json` (with `scripts/npm.mjs`), and its
  known-nonconformance entry is gone. `pnpm project:verify healthcare/sentrapedia` passes every
  stage, smoke included. `check_project_independence` reports 19 capsules and 1 known
  non-conformance (control-center).
- `62d488ee`: `~/.cursor/hooks/jev-intent.ps1` (outside the repo) now sends only the first
  non-empty line of a prompt, capped at 200 characters, instead of up to 4000 characters. Its
  test passes 6/6. `.safrs/tool-inventory.json` records the new scope. The original hook is
  backed up in this session's scratchpad.
- `f80e4ace`: Claude Code's Jev MCP ("jev CONNECTION_CLOSED") is fixed. The repo `.mcp.json`
  resolved the interpreter from `${CLAUDE_PROJECT_DIR}`, which is the session start directory. So
  every session started in a capsule or worktree failed, and the entry shadowed the working
  user-scope server. `.mcp.json` and `enabledMcpjsonServers` are removed; Claude uses the
  `~/.claude.json` user entry that points at `D:\DEV\monorepo\tools\jev`, the only Jev.
  - The Jev `PreToolUse` hook now finds the main checkout via `--git-common-dir`. It exited 127
    in worktrees, which have no `.venv`.
  - Verified: `claude mcp list` shows jev Connected from the root, a capsule and `C:\Users\drfer`,
    with no multiple-scopes warning. `jev_route` answered live in a session. The hook printed a
    Jev decision (exit 0) from the root, a capsule and a worktree. Automation-policy passes 21/21.
  - Outside the repo: `~/AGENTS.md` and `~/.claude/CLAUDE.md` now point at `tools/jev` (the
    fallback is `-c route_task`, mode active). Backups are in that session's scratchpad.
  - Gaffer approved deleting the stale copies `~/.agents/jev`, `~/.codex/projects/muse-jev-playbook`
    and `~/.opencode/jev`; they are gone. No agent config used them. Their small logs and HANDOFF
    are archived in that session's scratchpad (`stale-jev-archive/`).
- `5c1c031e` (R2, Gaffer asked for it): the uncommitted gaffer-orchestration "Mandatory closeout"
  is committed. Its HANDOFF path is now repo-relative instead of `D:\DEV\Monorepo\...`. Task
  `TASK-20261010-GAFFER-SKILL-CLOSEOUT` ended `ABORTED` because `pnpm task close` from VERIFYING
  aborts; the work itself landed. Use VERIFYING → REVIEW → MERGED → CLOSED next time.
- `pnpm governance` stays red at `check_task_ownership`. That check fails on the first changed
  path without an active owner in `main`. `projects/healthcare/` is owned by
  `TASK-20260927-HEALTHCARE-MIGRATION` (REVIEW). Three scopes have no owner:
  `.agents/skills/superpowers/` (92 untracked), `.codex/config.toml` (`model_verbosity`) and
  `projects/internal/retriever/` (1340 untracked, mostly `data/`). Their sessions must claim,
  commit, ignore or drop them.
- CI will still flag sentrapedia `docs/architecture.md`, which is not committed. The only copy is
  another session's untracked `docs/ARCHITECTURE.md`. Windows passes because its file names are
  case-insensitive; Linux does not.
- `pnpm project:verify internal/golden-path` gets past the gate but fails on a symlink in
  `apps/web/.next/dev/node_modules` that points outside the capsule. The symlink is a local
  build cache and was already there.

## Work in flight

- The working tree still holds other sessions' uncommitted work: med-assist and sentrapedia
  capsule edits, `.codex/config.toml` (`model_verbosity`), and the untracked
  `.agents/skills/superpowers/` and `projects/internal/retriever/`. This session left their content alone. The
  sentrapedia edits moved into `src/` with their folders. A path-move note was added at the top of
  the uncommitted `projects/healthcare/sentrapedia/.agents/HANDOFF.md`.

## Blockers

- `docs/gaffer-address` (`bf4be2af`, R3 by path) is not merged into `main`. It needs Gaffer.
- `feat/sidepanel-ui-batch` still couples five capsule `AGENTS.md` files with the capsules created
  next to them. A Gaffer integrity review clears it at merge time.

## Next action

- Sentrapedia: commit the architecture doc as lowercase `docs/architecture.md` once its owner
  session finishes it.
- Gaffer: these audit actions from section 7 are not approved yet: A-2..A-7 and A-11..A-19.
  A-1 (key rotation) is Gaffer's own job.
- `.codex/agents` still say "Chief", and two agents share the name `security-reviewer`.
- Decide whether `.safrs/adapter-capabilities.json` keeps droid `read_only_disabled`.
- Claude sessions started before `f80e4ace` still hold the old MCP config. Restart them.

## Owner collision

Sentrapedia has another session's uncommitted work. Its code was last edited 2026-10-09 20:50
and `oracle-ii/` on 2026-10-10 05:09. Gaffer ordered the `src/` move anyway, and that session's
edits moved with their folders. The note at the top of its HANDOFF tells it to use the new paths.
