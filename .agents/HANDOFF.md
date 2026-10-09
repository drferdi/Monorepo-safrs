# HANDOFF — Monorepo control plane

Last updated: 2026-10-10 (Claude, approved R2 fixes from the agent audit on `feat/sidepanel-ui-batch`)
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
- `pnpm governance` still fails at `check_topology` on sentrapedia (`src`, `docs/data.md`,
  `docs/testing.md`, `.agents/CONTEXT.md`). `pnpm project:verify internal/golden-path` now gets
  past the gate but fails on a symlink in `apps/web/.next/dev/node_modules` that points outside
  the capsule. That symlink is a local build cache and was already there.

## Work in flight

- The working tree still holds other sessions' uncommitted work: med-assist and sentrapedia
  capsule edits, `.codex/config.toml` (`model_verbosity`), `.agents/skills/gaffer-orchestration`,
  and the untracked `.agents/skills/superpowers/`. This session did not touch any of it.

## Blockers

- `docs/gaffer-address` (`bf4be2af`, R3 by path) is not merged into `main`. It needs Gaffer.
- `feat/sidepanel-ui-batch` still couples five capsule `AGENTS.md` files with the capsules created
  next to them. A Gaffer integrity review clears it at merge time.

## Next action

- Gaffer: decide sentrapedia's topology. Either move its code under `src/` and add the missing
  docs, or change `CAPSULE_REQUIRED` in `tools/safrs/check_topology.py`.
- Gaffer: these audit actions from section 7 are not approved yet: A-2..A-7, A-11..A-19, and
  the jev-intent part of A-8. A-1 (key rotation) is Gaffer's own job.
- `.codex/agents` still say "Chief", and two agents share the name `security-reviewer`.
- Decide whether `.safrs/adapter-capabilities.json` keeps droid `read_only_disabled`.

## Owner collision

Sentrapedia is being edited by another session (files changed 2026-10-10 05:09, its HANDOFF is
dirty). This session only touched root files for it.
