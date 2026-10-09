# Jev decision router

Jev is the repository's shared decision router for coding agents. Before a web search, a
subagent, a retry of a failed approach, an approval-needing action, or a choice between
materially different routes, agents ask Jev what to do next (see root `AGENTS.md`, "Jev
Decision Layer").

Jev belongs to the monorepo control plane. **Capsules must never depend on it**: it is not a
build, test, or runtime dependency of any project under `projects/`.

## Layout

| Path | Contents |
| --- | --- |
| `playbook/` | Vendored [Bodila51/muse-jev-playbook](https://github.com/Bodila51/muse-jev-playbook) at commit `70edf68` (MIT, see `playbook/LICENSE`); upstream `.github/` omitted. |
| `mcp/jev_mcp.py` | MCP stdio server exposing one tool, `jev_route`. No third-party dependencies. |
| `mcp/jev_hook.py` | Optional Claude Code `PreToolUse` hook that consults Jev before research or subagents. Never blocks a tool. |

Local, untracked files (ignored by `playbook/.gitignore`): `playbook/.venv/`,
`playbook/config.yaml` (mode and thresholds; start from `playbook/config.example.yaml`), and
`playbook/logs/*.jsonl` (decision log; may contain task context).

## Setup (Windows)

```powershell
cd tools/jev/playbook
uv venv .venv --python 3.12
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
copy config.example.yaml config.yaml   # then set mode: active
```

The TypeSafe API key is read from the `TYPESAFE_API_KEY` environment variable. Never put it in a
file in this repository.

## Agent wiring

Every agent runs the server with the playbook's own interpreter:

```text
command: <repo>\tools\jev\playbook\.venv\Scripts\python.exe
args:    <repo>\tools\jev\mcp\jev_mcp.py --playbook <repo>\tools\jev\playbook --agent <name>
```

Claude Code reads it from the repository `.mcp.json`. Codex, Cursor, Factory Droid, Gemini
(Antigravity) and Opencode point to the same paths from their user-level configuration.

## Agent coverage

Each agent gets the tool, a rule to use it, and an automatic trigger where the agent supports one.

| Agent | `jev_route` tool | Rule | Automatic trigger |
| --- | --- | --- | --- |
| Claude Code | `.mcp.json` (pre-approved in `.claude/settings.json`) | root `AGENTS.md` | `PreToolUse` hook before WebSearch, WebFetch, Agent, Task |
| Codex | `~/.codex/config.toml` | `AGENTS.md`, `~/.codex/AGENTS.md` | none available |
| Cursor | `~/.cursor/mcp.json` | `.cursor/rules/10-jev.mdc` | user `beforeSubmitPrompt` intent hook |
| Factory Droid | `~/.factory/mcp.json` | `AGENTS.md`, `~/.factory/AGENTS.md` | `SessionStart` reminder |
| Gemini (Antigravity) | `~/.gemini/config/mcp_config.json` | `GEMINI.md` adapter, user `GEMINI.md` | none available |
| Grok | `~/.grok/config.toml` | `AGENTS.md` (read as project instructions) | none available |
| Opencode | `jev-router` plugin | `~/.config/opencode/AGENTS.md` | plugin consults before the first expensive tool |

Every server instance is started with `--agent <name>` and appends one line per call to
`playbook/logs/agents.jsonl` (agent, kind, action; no goal text). Check coverage with:

```text
python tools/jev/mcp/jev_usage.py --days 7
```

If an agent process started before `TYPESAFE_API_KEY` was set, the server and the hook read it
from the Windows user environment.

## Governance

- Network: `api.typesafe.ai`, registered as `jev-typesafe` in `.safrs/tool-inventory.json`.
- Data sent: a one-line English goal and routing state. Never secrets or repository content.
- Updating the vendored playbook is an R2 change: record the new upstream commit here.
