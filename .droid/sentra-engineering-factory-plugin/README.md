# sentra-engineering-factory-plugin

Reusable engineering workflows for Factory Droid: repository archaeology, security review, testing & verification, dependency safety, documentation maintenance, and agent governance — packaged as a plugin that installs across repositories.

Built exclusively from the [official Factory documentation](https://docs.factory.ai/) ([Plugins](https://docs.factory.ai/harness/plugins.md), [Skills](https://docs.factory.ai/harness/skills.md), [Custom Slash Commands](https://docs.factory.ai/harness/custom-slash-commands.md), [Custom Droids](https://docs.factory.ai/harness/subagents.md), [Hooks](https://docs.factory.ai/harness/hooks.md), [MCP](https://docs.factory.ai/harness/mcp.md)).

## What's inside

| Component | Contents |
|---|---|
| Skills (7) | `repository-archaeology`, `solo-developer-dx`, `security-review`, `test-and-verify`, `dependency-safety`, `documentation-maintenance`, `agent-governance` |
| Slash commands (7) | `/audit-repository`, `/plan-change`, `/verify-change`, `/review-diff`, `/security-scan`, `/explain-repository`, `/generate-report` |
| Custom droids (5) | `repository-auditor`, `security-reviewer`, `test-engineer`, `documentation-engineer`, `release-verifier` |
| Safety hooks (3) | `block-secret-output`, `validate-context`, `verify-before-finish` (PowerShell) |
| MCP servers | **None** (see `docs/mcp-decision-record.md`) |
| Docs | architecture, security model, MCP decision record, troubleshooting |

## Prerequisites

- Factory Droid CLI (tested on `0.193.0`).
- Windows PowerShell 5.1+ (hook scripts are PowerShell-native). On macOS/Linux, install `pwsh` (PowerShell 7+) if you want hooks enabled; the plugin still works without hooks.
- No external packages, no npm installs, no API keys required.

## Installation

The plugin ships as part of a local marketplace rooted at `.droid/` inside this repository. Run from the repository root.

```powershell
cd <path-to-this-repository-root>
droid plugin marketplace add .droid
droid plugin install sentra-engineering-factory-plugin@sentra-engineering --scope user
```

Verification:

```powershell
droid plugin list --scope user
# open /skills /commands /droids /hooks in a Droid session to confirm each is loaded
```

> Git-based installs track the marketplace commit. After pulling new plugin files, run `droid plugin update sentra-engineering-factory-plugin@sentra-engineering`.

## Usage

### Slash commands

| Command | Purpose | Side effects |
|---|---|---|
| `/audit-repository` | Read-only repo audit (structure, build/test, governance, security, DX) | None |
| `/plan-change` | Implementation plan before coding | None (plan only) |
| `/verify-change` | Post-change verification (diff → typecheck → lint → test → build → security → docs) | Runs test/build commands (approval requested) |
| `/review-diff` | Evidence-based code review | None |
| `/security-scan` | Severity-sorted security review | None |
| `/explain-repository` | Plain-language explanation for non-coders | None |
| `/generate-report` | Consistent shareable Markdown report | Writes the report file |

### Skills

Skills are auto-discovered by Droid via their `description`; run any of them through `/skill-name` (e.g. `/security-review`) or let Droid select them. `user-invocable` is enabled for all.

### Droids

Invoke via the Task tool: "Use the subagent `security-reviewer` on this diff." All droids use `model: inherit` and restricted tool sets.

### Hooks

Enabled automatically when the plugin is installed. All three are **non-destructive and non-exfiltrating**:

- `block-secret-output` (PreToolUse/Read): blocks reading secret-sensitive files (`.env*`, `*.pem`, `*.key`, keys/keyrings, credentials).
- `validate-context` (UserPromptSubmit): warns when a prompt contains a likely secret. **Warning only — never blocks input.**
- `verify-before-finish` (Stop): non-blocking reminder to verify changes before declaring done.

## Configuration & disabling

| Control | How |
|---|---|
| Disable all plugin hooks | set env `SENTRA_HOOKS_DISABLE=1` |
| Enable optional hook logging | set env `SENTRA_VERIFY_LOG` to a writable log path (best-effort, non-sensitive) |
| Disable a skill | `disabledSkills` in settings, or `enabled: false` in the SKILL.md frontmatter |
| Uninstall plugin | `droid plugin uninstall sentra-engineering-factory-plugin@sentra-engineering` |

## Security model

Read `docs/security-model.md` for the full model: least-privilege design, why hooks cannot exfiltrate data, secret-handling rules, and failure modes.

## Documentation

- `docs/architecture.md` — layout, decisions, and rationale.
- `docs/security-model.md` — security boundaries and trust assumptions.
- `docs/mcp-decision-record.md` — why zero MCP servers.
- `docs/troubleshooting.md` — common issues and fixes.

## License

UNLICENSED (proprietary to Sentra Engineering). See `LICENSE`.
