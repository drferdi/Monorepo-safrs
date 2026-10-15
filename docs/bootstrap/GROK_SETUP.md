# Grok Setup — SAFRS guard for Grok (October 2026)

Gaffer runs Grok (Grok Build 1.0.60) on its own and inside Devin Desktop over ACP
(`devin.acp.preferredAgent: grok-build`). Both routes use `~/.grok/` configuration, not `.devin/`.
Canonical policy stays in `AGENTS.md`; `.grok/` is an adapter. Grok's docs ship at `~/.grok/docs/`.

## Gaps this closes

Before this adapter (observed 2026-10-15), Grok in the monorepo:

- had no SAFRS guard: only the Jev hook in `~/.grok/config.toml`. A Grok session created
  `devin-probe/.env` and a file in `%TEMP%` without any block;
- skipped every project hook, because the monorepo is not in `~/.grok/trusted_folders.toml`. That
  includes the `.claude/settings.json` guard, which would not apply anyway: Grok sends
  `run_terminal_command`/`read_file`/`search_replace`/`write`, and `adapters/claude.mjs` only knows
  Claude's names;
- auto-approved hook "ask" replies, because `~/.grok/config.toml` sets
  `permission_mode = "always-approve"` (payload `permissionMode: bypassPermissions`).

## Layout

| Surface | Role |
| --- | --- |
| `.grok/hooks/safrs-guard.mjs` | Translates Grok payloads into `tools/automation/src/guard.mjs`; zero policy |
| `.grok/hooks/safrs-guard.json` | `PreToolUse` hook definition; an identical copy is installed at `~/.grok/hooks/safrs-guard.json` |
| `.grok/hooks/safrs-guard.test.mjs` | `node --test` cases, including the hook command through the platform shell and PowerShell |

## Why each choice

- **Installed at user level.** `~/.grok/hooks/` is always trusted, so the guard runs in every
  worktree without a trust grant. Outside a git repository, or in a repository without
  `.grok/hooks/safrs-guard.mjs`, the hook command exits 0 silently. The repo copy is identical: if
  the folder is trusted later, Grok sees one handler (same command) and runs it once.
- **JSON replies, exit 0.** Grok honors a JSON deny at any exit code; exit 0 survives every shell.
- **Ask only where Grok prompts.** In `default`, `auto`, or `plan` mode a guard "ask" (merge, pull,
  `reset --hard`, destructive DB, `.env` mention) becomes Grok's permission prompt. In any other
  mode, including Gaffer's `always-approve`, it denies and Gaffer runs the command.
- **Truncated commands deny.** Grok cuts hook input strings over 128 KiB; a cut command cannot be checked.
- **Unknown file tools count as writes.** Any matched tool other than `read_file` that names a file
  is treated as a write (`search_replace`, `write`, `hashline_edit`, `delete_file`).

## Payload (captured from Grok 1.0.60)

`toolName`/`tool_name`, `toolInput`/`tool_input`, `permissionMode`, `cwd`, `workspaceRoot`,
`toolInputTruncated`. Inputs: `run_terminal_command` {`command`, `description`}, `read_file`
{`target_file`}, `search_replace` {`file_path`, `old_string`, `new_string`}, `write` {`file_path`, `content`}.

## Verification (2026-10-15)

- `node --test .grok/hooks/safrs-guard.test.mjs`: 20/20.
- Headless Grok in this worktree (`grok -p`, `always-approve`): force push, `cat .env`, `read_file`
  and `write` on `devin-probe/.env`, a write to `%TEMP%`, merge, and `reset --hard` were all denied
  with `SAFRS guard:` reasons; `git status --short` ran; no probe file was created.
- Not yet observed: Grok inside Devin Desktop over ACP. Run one merge probe there.
- **Until this branch is merged, checkouts without `.grok/hooks/safrs-guard.mjs` stay unguarded.**
  The user-level hook exits silently there: piping a force-push payload through it in
  `D:\DEV\monorepo` (branch `codex/sentrapedia-website-docs`) returned no reply, so the push would run.

## Decisions for Gaffer

- **Trust the monorepo in Grok** (`grok --trust` once, or `/hooks-trust`). Grok loads project
  `AGENTS.md` only for trusted folders, so today Grok works in the monorepo without the SAFRS rules.
  Trust also enables project hooks from `.claude/settings.json`: the Claude guard is a no-op for
  Grok's tool names, and its Jev hook would log as `claude`.
- **Jev for Grok subagents.** `jev_hook.py` does not know `spawn_subagent`, so the Jev hook in
  `~/.grok/config.toml` never gates Grok subagents (same follow-up as Devin's `run_subagent`).
- Register `.grok/**` in `.safrs/sensitive-paths.json` (separate `.safrs/**` change).
