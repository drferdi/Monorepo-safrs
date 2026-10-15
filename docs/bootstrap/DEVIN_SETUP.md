# Devin Setup — Devin CLI / Devin Desktop adapter (October 2026)

Devin Desktop 1.126 (Windsurf base) bundles Devin CLI 3000.10.67. Its docs ship with the app at
`%LOCALAPPDATA%\Programs\Devin\resources\app\extensions\windsurf\devin\share\devin\docs`.
Canonical policy stays in `AGENTS.md`, `SAFRS_SPEC.md`, and `docs/architecture/MONOREPO_PURPOSE.md`.
Everything under `.devin/` is an adapter, not a second policy tree.

## What Devin already reads without `.devin/`

Devin imports other agents' configuration by default (`read_config_from`):

| Source | Imported as |
| --- | --- |
| `AGENTS.md`, nested `AGENTS.md`, `CLAUDE.md`, `~/.claude/CLAUDE.md` | Always-on rules |
| `.agents/skills/`, `.claude/skills/`, `.claude/commands/` | Skills |
| `.claude/agents/` | Custom subagents |
| `.claude/settings.json`, `~/.claude/settings.json` hooks | Hooks |
| `~/.claude.json`, `.mcp.json` | MCP servers |
| `.cursor/rules/*.mdc`, `.cursor/mcp.json` | Rules, MCP servers |

So the adapter only covers what that import gets wrong.

## Layout

| Surface | Role |
| --- | --- |
| `.devin/hooks.v1.json` | `PreToolUse` on `exec`, `read`, `edit`, `write`, `apply_patch`, `notebook_edit` |
| `.devin/hooks/safrs-guard.mjs` | Translates Devin payloads into `tools/automation/src/guard.mjs`; zero policy |
| `.devin/hooks/safrs-guard.test.mjs` | `node --test` regression cases for the hook |
| `.devin/config.json` | Credential read denies and read-only command allows (mirrors `.claude/settings.json`); `read_config_from.cursor: false` |
| `.devin/agents/{safrs-auditor,token-guard}.md` | Mirrors of `.claude/agents/` with Devin tool names; change both together |
| `.devin/rules/devin-adapter.md` | Always-on Devin mechanics: skills, subagent choice, guard blocks, Jev, commit trailer |

User-level files (`%APPDATA%\devin\`, shared with Devin Desktop's own data) are personal and
outside the repository: `AGENTS.md` (Gaffer's general rules), `config.json`, `mcp_config.json`
(`jev` with `--agent devin`), and `agents/` (general subagents).

## Why each choice

- **Own guard instead of the imported Claude hook.** Devin's tool names are `exec`/`edit`/`write`, so
  the `.claude/settings.json` matchers (`Bash|Edit|Write`) and `adapters/claude.mjs` do not
  recognise them; the Claude render also emits `permissionDecision: "ask"`, which Devin does not
  document. Relying on the import would leave Devin unguarded without any error.
- **Ask renders as block.** Devin hooks support only `approve`/`block`. Like Codex
  without merge rules, a guard "ask" (merge, pull, `reset --hard`, destructive DB, `.env` mention)
  blocks, and Gaffer runs the command.
- **Inline translator, not `tools/automation/src/adapters/devin.mjs`.** `tools/automation/**` is a
  verification control; adding an adapter there plus a parity test is a separate change.
- **Block with JSON and exit 0, not exit 2.** `powershell -Command` turns a native exit 2 into 1
  (observed 2026-10-15), and Devin treats 1 as a non-blocking error. The hook prints
  `{"decision":"block","reason":...}` and exits 0, which every shell passes through unchanged.
- **Shell-agnostic hook command.** The shell Devin uses for hooks is not documented. A
  `$(git rev-parse ...)` command exits 1 under `cmd.exe` (observed), which is fail-open. The command
  is now `node -e` with no shell expansion: it finds the root with git (falling back to
  `DEVIN_PROJECT_DIR`), and it prints a block decision if the guard cannot be loaded. Tested through
  `cmd.exe`, `pwsh`, `powershell` 5, and Git Bash, from the root, from a subdirectory, and from
  outside the repository (32/32). The binary also knows undocumented `powershell` and
  `working_directory` hook fields; they are not used.
- **Guard paths resolve from the hook file.** A wrong cwd would make the import fail with exit 1,
  which Devin treats as non-blocking.
- **Cursor import off (effect unverified).** It loaded eleven more copies of the same policy; Devin's
  guidance is to keep always-on rules small. `devin rules list` still lists the Cursor rules with
  `cursor: false` in either the project or the user config, so whether a session honors the setting
  is not yet observed. This also drops `.cursor/mcp.json` servers, so Devin has no second `jev`
  entry attributed to Cursor; its MCP servers come from the user-level `mcp_config.json`.
- **`read` is guarded too.** Every file read starts the hook (`git rev-parse` plus node), which costs
  latency on large explorations. Claude leaves reads to permission denies only. Dropping `read` from
  the matcher is Gaffer's call; the `config.json` read denies would still apply.
- **No policy rules in `.devin/rules/`.** `AGENTS.md` is canonical; the one rule holds Devin mechanics only.

## Verify after `devin auth login` (not yet done)

The CLI was not logged in when this adapter was written, so loading is **unverified**.

1. **Fail-open check first.** In a session that uses **Devin's own agent**, ask it to run
   `git merge --no-ff devin-guard-probe-nonexistent` and to read `devin-probe/.env`. Pass means the
   tool call is refused with a `SAFRS guard:` reason. If the merge reaches git ("not something we can
   merge"), the hook did not block: fail-open.
2. `devin doctor` from the repository root. The CLI is not on `PATH` by default; it ships at
   `%LOCALAPPDATA%\Programs\Devin\resources\app\extensions\windsurf\devin\bin\devin.exe`. It only
   checks subagent profiles (expect `safrs-auditor` and `token-guard` once each); it does not cover hooks.
3. In a session: `/hooks` must list `.devin/hooks.v1.json`; check that the imported Claude hooks
   do not misfire.
4. Add a temporary `PostToolUse` hook with matcher `""` that appends stdin to a file. Confirm the
   real `tool_name` values and `tool_input` keys (`file_path`, `command`, `workdir`, and the
   `apply_patch` key), then remove it.
5. Confirm the subagent list shows `safrs-auditor` and `token-guard` once each, with shell access.
6. Confirm `/safrs-session` and `/verify` appear in the skill list. Devin's import table does not
   name `.agents/skills/`; if they are missing, `.devin/rules/devin-adapter.md` must point elsewhere.
7. Confirm `jev_route` is listed and that a call appends `"agent": "devin"` to
   `tools/typesafe-jev/playbook/logs/agents.jsonl`.

Hook regression tests: `node --test .devin/hooks/safrs-guard.test.mjs`. They also run the configured
command through the platform shell and `powershell -Command`.

**ACP agents are not covered.** Devin Desktop can run other agents through ACP
(`devin.acp.preferredAgent`, for example `grok-build`). Those sessions use their own agent's
configuration: on 2026-10-15 a Grok ACP session logged Jev calls as `"agent": "grok"`. `.devin/`
hooks, rules, and subagents apply only to Devin's own agent, so every check above must run there.

Observed 2026-10-15 (Grok ACP session plus `devin` CLI commands, not yet Devin's own agent): `devin
doctor` passes with 4 profiles; skills appear as `/agents:safrs-session` and `/agents:verify`, with
duplicates `/claude:safrs-session` and `/claude:verify` from the Claude import; `devin mcp list` shows
`jev` with `--agent devin`.

## Open follow-ups (separate changes)

- Register `.devin/**` in `.safrs/sensitive-paths.json` (R2, plus `hooks.v1.json`, `hooks/**`, and
  `config.json` as verification controls). This is a `.safrs/**` change.
- Add `.devin/hooks.v1.json`, `.devin/hooks/**`, and `.devin/config.json` to the guard's
  `SELF_GUARD_PATTERNS` so Devin cannot edit its own guard (Claude has the same gap today).
- `tools/typesafe-jev/mcp/jev_hook.py` ignores Devin's `webfetch` and `run_subagent`; adding them would
  let a Devin `PreToolUse` hook consult Jev automatically.
