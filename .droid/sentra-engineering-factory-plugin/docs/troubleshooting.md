# Troubleshooting

## Installation

### `droid plugin marketplace add .droid` fails or plugin not found
- Confirm you ran it from the repository root (or pass the absolute path to `.droid`).
- Confirm `.droid/.factory-plugin/marketplace.json` exists and is valid JSON.
- Confirm the plugin folder is `sentra-engineering-factory-plugin` at the marketplace root and that `plugins[].source` is `"./sentra-engineering-factory-plugin"`.

### Plugin installs but skills/commands/droids don't appear
- The CLI scans these at session start. Start a **new** Droid session after installing.
- Run `/skills`, `/commands`, `/droids` to inspect what's loaded and their status (Enabled/Invalid).
- If a skill shows "Invalid", check its `SKILL.md` frontmatter has valid `name` + `description` and the file is named `SKILL.md`.

## Hooks

### Hook doesn't run
- Confirm the plugin is enabled and you started a fresh session.
- Use `/hooks` to inspect Effective hooks. Note the shared `~/.factory/hooks.json` also runs a PreToolUse `Execute` hook (`rtk hook droid`); plugin hooks appear in the Plugins tab.

### Hook can't find the script ("command not found" / path error)
- Plugin hook commands use `${DROID_PLUGIN_ROOT}`. If you edited the plugin, run `droid plugin update sentra-engineering-factory-plugin@sentra-engineering` so the cache path updates.
- Confirm PowerShell exists at `powershell` on PATH (default on Windows).

### Hook blocks a legitimate file read (false positive)
- `block-secret-output` refuses strongly-secret-named paths. If it's a false positive, either rename the file, or disable hooks for the session with `SENTRA_HOOKS_DISABLE=1`.

### Prompt warning about secrets fires on normal text
- `validate-context` is warn-only and never blocks. It uses broad patterns; a false positive is harmless. You'll see a stderr note in the transcript.

### Hook seems slow
- Each hook is a single short PowerShell process with a 30s timeout and exits fast on no input. If it hangs, check for a stale PowerShell process and set `SENTRA_HOOKS_DISABLE=1` to bypass.

## Skills / commands behavior

### Skill not auto-discovered by Droid
- Tighten the `description` (action + trigger + boundary). Ensure `enabled` isn't `false` and `disable-model-invocation` isn't `true`. You can still invoke it via `/skill-name`.

### Command with `$ARGUMENTS` sends body unchanged
- `$ARGUMENTS` expands to text after the command name. Positional placeholders `$1`/`$2` are **not** supported in markdown commands — parse arguments inside the prompt. Source: official Custom Slash Commands docs.

### "Tests pass" claimed but no output
- Not this package: `test-and-verify` requires evidence. If another prompt claims success without proof, re-run through `/verify-change`.

## Droids

### Droid not available to the Task tool
- Confirm the droid file is at `droids/<name>.md`, frontmatter `name` matches the filename, and valid `tools` values are used. Run `/droids` to reload and check for validation errors/warnings.

### Droid model
- All droids use `model: inherit` so they follow the parent's model routing. No external model dependency.

## Update / uninstall

### Update plugin after pulling new files
```powershell
droid plugin update sentra-engineering-factory-plugin@sentra-engineering
```

### Uninstall
```powershell
droid plugin uninstall sentra-engineering-factory-plugin@sentra-engineering
```
This only removes the installed copy; the `.droid/` source folder is untouched.

## Still stuck?
- Run `droid --debug` to see hook matching/execution detail (official debugging guidance).
- Run `/diagnostics` to detect skill-name collisions or invalid config.
- Open an issue describing: step, expected, actual output, and the plugin commit.
