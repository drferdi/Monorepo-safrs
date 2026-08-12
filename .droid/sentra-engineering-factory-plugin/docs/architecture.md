# Architecture

## Purpose

`sentra-engineering-factory-plugin` packages reusable engineering workflows for Factory Droid so any repository on the machine gets consistent, safe, and verifiable agent behavior. It follows the official [Factory Plugins](https://docs.factory.ai/harness/plugins.md) layout.

## Goal

Every decision in this package is matched to official documentation. The package is **focused, modular, safe, and minimal** — components are added only when there is a clear need.

## Layout

```
.droid/                                    # local marketplace root
├── .factory-plugin/marketplace.json       # marketplace manifest (plugins[] -> ./sentra-engineering-factory-plugin)
└── sentra-engineering-factory-plugin/     # the plugin
    ├── .factory-plugin/plugin.json        # plugin manifest
    ├── commands/                          # 7 slash commands (markdown prompts)
    ├── skills/<name>/SKILL.md             # 7 skills (model-discovered workflows)
    ├── droids/<name>.md                   # 5 custom droids (subagents with tool policy)
    ├── hooks/hooks.json + *.ps1           # 3 lifecycle hooks (PowerShell)
    ├── docs/                              # architecture, security model, MCP record, troubleshooting
    └── README.md, CHANGELOG.md, LICENSE
```

Per official docs: `commands/`, `skills/`, `droids/`, `hooks/`, `mcp.json` live at the plugin root; `.factory-plugin/` holds only metadata.

## Component decisions (with official sources)

| Component | Decision | Official basis |
|---|---|---|
| Skills | 7 SKILL.md, model-discovered, `user-invocable` | docs.factory.ai/harness/skills.md |
| Slash commands | 7 markdown commands with `description` frontmatter + `$ARGUMENTS` | docs.factory.ai/harness/custom-slash-commands.md |
| Droids | 5 droids, `model: inherit`, restricted `tools` (read-only / limited execute) | docs.factory.ai/harness/subagents.md |
| Hooks | 3 hooks using `${DROID_PLUGIN_ROOT}` command paths | docs.factory.ai/harness/hooks.md |
| MCP | none; documented in mcp-decision-record.md | docs.factory.ai/harness/mcp.md |
| Distribution | local marketplace + `droid plugin install` | docs.factory.ai/harness/plugins.md |

## Layering

1. **Skills** inline procedures the model can select automatically.
2. **Commands** user-invoked shortcuts that reference the skills.
3. **Droids** context-isolated subagents with enforced tool boundaries (read-only review roles, limited-execute test roles).
4. **Hooks** deterministic safety rails at lifecycle events.

Precedence: chain of trust is Skills (discoverable) → Commands (explicit) → Droids (isolated, stricter tools) → Hooks (deterministic enforcement). Hooks do not grant capabilities; they only warn or block.

## Design principles

- Keep each skill narrow; precise `description` drives selection.
- Minimal side effects: audit/explain/plan/review are read-only; only test/build/dependency/report steps can modify state, and each requires approval.
- No hardcoded machine paths; plugin-root variables resolve to the install cache.
- No secrets anywhere in the package.
- Windows PowerShell native; portability documented.

## Versioning

`plugin.json` `version` is metadata. Git-based installs track the marketplace/plugin commit; see official [Versioning and updates](https://docs.factory.ai/harness/plugins.md#versioning-and-updates).
