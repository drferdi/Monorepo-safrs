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
- ACP, the route Devin Desktop uses: a minimal ACP client drove `grok agent stdio` in
  `D:\DEV\monorepo` and approved every permission request. The hook loaded as
  `global/safrs-guard`; the merge and the `%TEMP%` write were denied, `git status` ran. The payload
  mode was `bypassPermissions` there too. Earlier Devin Desktop ACP sessions in
  `~/.grok/sessions/` show user and global hooks running, so Devin starts Grok with the same hooks.
- A checkout whose branch lacks `.grok/hooks/safrs-guard.mjs` stays unguarded: the user-level hook
  exits silently there. Since 2026-10-15 the main checkout is on `main`, which has it.

## Trust and Jev (done 2026-10-15)

- `D:\DEV\monorepo` is Grok-trusted (`grok --trust`; backup at
  `~/.grok/trusted_folders.toml.bak-20261015`). `grok inspect` now lists `Agents.md`, `Claude.md`,
  and the `.claude/rules/safrs-*.md` files as project instructions.
- Project hooks still do not load: Grok reports "repository path 'D:/DEV/monorepo' is not owned by
  current user", because the global `safe.directory` entry is spelled `D:/DEV/Monorepo` and Grok's
  git library compares case-sensitively. The guard does not need them (it is user-level). If they are
  ever wanted, add `git config --global --add safe.directory D:/DEV/monorepo`; `jev_hook.py` already
  skips Grok payloads under the Claude-labelled hook, so Jev would still log Grok once.
- `jev_hook.py` now knows `spawn_subagent`, so the Jev hook in `~/.grok/config.toml` gates Grok
  subagents. Grok warns "`[hooks]` unrecognized config key" for that file but still loads the hook.

## Open (separate changes)

- Register `.grok/**` in `.safrs/sensitive-paths.json` (a `.safrs/**` change).
