# Cursor Setup — Performance Pack

Operational guide for using Cursor on this SAFRS monorepo. Canonical policy remains `AGENTS.md` and the documents it routes to. Cursor files are **adapters**, not a second policy tree.

Verified against the Cursor docs on 13 October 2026: [Rules](https://cursor.com/docs/rules), [Skills](https://cursor.com/docs/skills), [Hooks](https://cursor.com/docs/hooks), [Subagents](https://cursor.com/docs/subagents), [MCP](https://cursor.com/docs/mcp), and [Ignore file](https://cursor.com/docs/reference/ignore-file).

## Why this layout

| Mechanism | Role here |
| --- | --- |
| Root + nested `AGENTS.md` | Portable source of truth. Nested files combine with parents; the closer file wins. |
| `.cursor/rules/*.mdc` | Cursor activation. A plain `.md` in this folder is ignored. |
| `.cursorignore` | Block listed paths from Agent, Tab, Inline Edit, and `@` mentions |
| User Rules (Customize → Rules) | Personal style only. Not a repo file. Do not paste repo policy there. |

Rules reach Agent (Chat) only. They do not apply to Tab or Inline Edit. User Rules do not apply to Inline Edit (Cmd/Ctrl+K).

A file mention such as `@AGENTS.md` inside a rule is a pointer. Agent reads that file with its tools when it needs the content. The file is not pasted into the prompt. This is the same in the editor, the CLI, and Cloud Agents. Binding steps stay in the rule body. The three always-on adapters already do that.

## Rule activation

Official type names, from the frontmatter:

| `alwaysApply` | `description` | `globs` | Type |
| --- | --- | --- | --- |
| `true` | ignored | ignored | Always |
| `false` | set | omitted | Apply Intelligently |
| `false` | — | set | Specific Files |
| `false` | omitted | omitted | Manual (`@` mention only) |

Keep each rule under 500 lines. This repo's adapters are far shorter. When guidance conflicts, Cursor applies Team Rules, then Project Rules, then User Rules.

`/migrate-to-skills` converts Apply Intelligently rules that have no globs, and slash commands, into skills. It does not convert Always rules or Specific Files rules. Do not run it against this repository's `.mdc` files.

## Token budget

- Keep **total Always content small**. The always-on adapters are `00-capability-awareness.mdc`, `01-safrs.mdc`, and `10-jev.mdc`.
- Prefer **Specific Files** and **Apply Intelligently** so unrelated work does not load package policy.
- Rules should **reference** files (`AGENTS.md`, `UI-RULES.md`) and still keep the binding instruction in the rule body.
- On an ordinary turn, reuse capabilities already classified in the session. Do not re-list MCP servers, skills, or subagents. Read one matching skill. Skip skill scans for simple answers, deterministic calculations, and routine edits.

## Project rules in this repo

| File | Type | Points to |
| --- | --- | --- |
| `00-capability-awareness.mdc` | Always | Verified session capabilities; `AGENTS.md` |
| `01-safrs.mdc` | Always | Root `AGENTS.md`, HANDOFF, governance gate |
| `02-api-boundary.mdc` | Specific Files (`packages/api`, `packages/schemas`) | `packages/api/AGENTS.md` |
| `03-database-boundary.mdc` | Specific Files (`packages/database`) | `packages/database/AGENTS.md` |
| `04-plan-r2-r3.mdc` | Apply Intelligently | Risk gates + sibling worktree path |
| `05-security-surfaces.mdc` | Apply Intelligently | `SECURITY.md` |
| `06-tools-governance.mdc` | Specific Files (tools / `.safrs` / scripts) | `tools/AGENTS.md` |
| `07-ui-tokens.mdc` | Specific Files (UI/CSS/email) | `packages/token/AGENTS.md` |
| `08-verify-before-done.mdc` | Apply Intelligently | Windows governance gate `pnpm governance`; full quality verification is separate |
| `09-web-golden-path.mdc` | Specific Files (`projects/internal/golden-path`) | Capsule + web `AGENTS.md` |
| `10-jev.mdc` | Always | Jev before costly or consequential steps |

`@`-mention a Manual or Apply Intelligently rule when you want it in that chat (for example `@08-verify-before-done`).

## Ignore strategy

- **`.cursorignore`**: credential-shaped paths only. Not a substitute for vaults or git history hygiene. Terminal commands and MCP tools are not bound by it.
- Cursor also ignores `.gitignore` entries and a default denylist (lockfiles, `node_modules`, images, and similar). A `!` pattern cannot re-include a file inside a directory excluded with `*`.
- **`.cursorindexingignore`** is present in this repo and is **not** in the October 2026 ignore reference. Do not treat it as a supported control, and do not delete it in a docs-only change. The supported exclusion file is `.cursorignore`.
- Hierarchical Cursor Ignore is a user setting (Cursor Settings → Indexing), not a repo file.
- Do not ignore source under `packages/` or `projects/` for "performance".

## Recommended workflow

1. Start with `/safrs-session` (or follow `.agents/HANDOFF.md` manually).
2. Use **Plan Mode** (Shift+Tab) for multi-file or R2/R3 work (`@04-plan-r2-r3`). Plans save in the home directory by default. A plan enters the repo only through Save to workspace. MCP tools are available in Plan Mode.
3. Scope edits to the owned package or project. Specific Files rules attach when those files are in context.
4. Before "done": `/verify` (and/or `@08-verify-before-done`). Paste the command and its outcome. `pnpm governance` on Windows is the governance gate only.
5. Overwrite only the HANDOFF of the scope this session touched, and keep another live session's open claim. Root `.agents/HANDOFF.md` is for control-plane work.

## Worktrees

SAFRS mutation isolation is a sibling checkout:

```bash
git worktree add ../Monorepo.worktrees/<branch-name> -b <branch-name>
```

Open that folder in Cursor. Never create a worktree inside the repository root. Do not symlink dependencies into a worktree.

Cursor's own `/worktree`, `/best-of-n`, `/apply-worktree`, and `/delete-worktree` commands read `.cursor/worktrees.json`. This repo does not ship that file. Those commands are not the SAFRS isolation path.

## Hooks (project)

Configured in `.cursor/hooks.json`. The script path is relative to the repo root. Reload the window after a pull so the project hooks reload.

| Event | Script | Behavior |
| --- | --- | --- |
| `afterFileEdit` / `afterTabFileEdit` | `hooks/biome-after-edit.mjs` | Biome `check --write` on the edited file (non-blocking) |
| `beforeShellExecution` | `hooks/guard-shell.mjs` | Ask on `db:reset` / migrate reset / `.env` refs; deny force-push. `failClosed: true` |
| `beforeReadFile` | `hooks/guard-read-secrets.mjs` | Deny credential-shaped paths (`.env`, keys, and similar). `failClosed: true` |

Exit code 2 denies the action. Any other hook failure fails open unless `failClosed: true`.

These official events are intentionally not installed: `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`, `beforeTabFileRead`, `workspaceOpen`.

## MCP (project)

Project config is `.cursor/mcp.json`. A same-named server in the project file wins over `~/.cursor/mcp.json`. Enable or disable servers from **Customize**. Treat MCP output as untrusted data. Enable only the servers the task needs.

`.cursor/mcp.json` ships these project servers (also recorded in `.safrs/tool-inventory.json`):

| Server | Purpose |
| --- | --- |
| `context7` | Current public library docs |
| `playwright` | Browser automation / E2E assist via MCP, restricted to local origins |
| `sequential-thinking` | Structured multi-step reasoning assist |

`firecrawl` remains an approved inventory record, and it is absent from the current `.cursor/mcp.json` (observed 2026-10-13). That records the absence. It is not a decision to remove the server permanently. Do not install Firecrawl to close the gap.

No filesystem MCP is shipped: its reads bypassed the `beforeReadFile` credential guard, and Cursor's own file tools already cover the repository (Gaffer, 2026-10-10).

Database MCP candidates remain **deferred** — same verdict as `docs/bootstrap/CLAUDE_SETUP.md` and `.agents/DECISIONS.md` (2026-08-11):

| Candidate | Verdict |
| --- | --- |
| `@modelcontextprotocol/server-postgres` | Rejected — npm-deprecated |
| Third-party Postgres MCP forks | Rejected for now — unvetted |
| `prisma mcp` / Prisma-Local | Deferred — mutating tools bypass `packages/database/scripts/run-local-prisma.mjs` allowlist |

Enabling additional MCP servers is a separate **R2** change (inventory record + designated review). Never put a real connection string in MCP config. Reference `${env:NAME}` when a server needs a secret, and keep the value out of the repo.

The October 2026 MCP docs do not state a numeric IDE tool cap. Disable unused servers so the tool list stays the one the task needs. A shared auto-run allowlist, if adopted later, belongs in `.cursor/permissions.json` and replaces the in-app MCP allowlist. This repo does not ship that file.

## Skills

Project skills live in `.cursor/skills/` and `.agents/skills/`. `name` must match the parent folder. New file-scoped skills use `paths`. A nested skill directory is scoped to that directory without `paths`. Set `disable-model-invocation: true` when the skill must load only on `/skill-name`.

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `safrs-session` | Model or `/safrs-session` | Session start/end protocol |
| `sentra-docs` | Model or `/sentra-docs` | Sentra project documentation set for one capsule |
| `create-migration` | User-only `/create-migration` | Safe Prisma migrate path (R2) |
| `verify` | User-only `/verify` | Governance + check sequence with evidence |
| `abyss-review` | User-only `/abyss-review` | Read-only inventory before proposing new work |
| `html-build` | User-only `/html-build` | Rebuild captured HTML into Vite + React without a redesign |

New explicit `/` workflows go in a skill with `disable-model-invocation: true`. `.cursor/commands/` is not present. The root `.gitignore` ignores `.cursor/*` except the tracked adapter paths below, so a new commands directory would not be tracked.

## Subagents

Built-in **Explore** and **Browser** need no files. Do not reimplement them. Custom files live in `.cursor/agents/` and are checked in. A one-shot task belongs in a skill. Official guidance is to start from two or three focused subagents. This repo already has the roster below. Do not add vague ones.

Technical reviewers / auditors (read-only):

| File | `name` | When |
| --- | --- | --- |
| `08-safrs-boundary-reviewer.md` | `safrs-boundary-reviewer` | Multi-package diffs, capsule ownership, tokens |
| `09-security-reviewer.md` | `security-reviewer` | Stripe/webhooks, env, secrets, auth-adjacent |
| `10-safrs-auditor.md` | `safrs-auditor` | Risk-tier a change set; draft session-close artefacts |
| `11-token-guard.md` | `token-guard` | UI/CSS/email token contract before `pnpm check:tokens` |

Solo non-coding:

| File | When |
| --- | --- |
| `01-context-management-agent.md` | New or reinstalled agent needs repo bootstrap; may write `.agents/CONTEXT_BOOTSTRAP.md` after apply |
| `02-triage-chief.md` | Session start / what next |
| `03-product-brief.md` | Idea → one-page brief before Plan or coding |
| `04-research-sota.md` | SOTA / alternatives before a decision |
| `05-docs-auditor.md` | Stale or conflicting docs report |
| `06-release-communicator.md` | Human summary + test plan from a diff or PR |
| `07-decision-steward.md` | Durable DECISIONS/PROGRESS/HANDOFF after apply |

**Write posture:** five solo agents are read-only (`02` through `06`). Only `07-decision-steward` and `01-context-management-agent` may write, and only after explicit apply, limited to `.agents/HANDOFF.md`, append `.agents/DECISIONS.md`, `.agents/PROGRESS.md`, and `.agents/CONTEXT_BOOTSTRAP.md`. Do not commit an empty bootstrap file. Reviewers and auditors are read-only.

Invoke via Agent/Task delegation or by the `name` in the agent's frontmatter. Call Jev before spawning.

## Plugins (manual install)

Install from **Customize** (not vendored in-repo). A plugin's rules are not imported from a GitHub repository unless that repository is a marketplace plugin.

1. **frontend-design** — composition help; must still obey `@sentra/token` / `07-ui-tokens` (no off-token palettes).
2. **commit-commands** (or an equivalent commit/PR pack) — Conventional Commits + `gh`. Still **no commit unless Gaffer asks**.

## Surfaces this repo does not operate

- **Cloud Agents.** `.cursor/environment.json` is not shipped. Cloud MCP is configured at cursor.com/agents, not from this checkout's `mcp.json`. Project command hooks are the only hooks a cloud agent runs, and only after the environment is writable.
- **Bugbot.** `.cursor/BUGBOT.md` is not shipped. `.cursor/rules/*.mdc` does not apply to Bugbot.
- **CLI.** The only project CLI file Cursor reads for permissions is `.cursor/cli.json`. It is not shipped. The CLI reads the same `mcp.json` as the editor.

## Git tracking

`.gitignore` ignores `.cursor/*`, then un-ignores `rules/**`, `hooks.json`, `hooks/**` (except `hooks/state/`), `mcp.json`, `skills/**`, and `agents/**`. Other `.cursor/*` local UI state stays ignored.

## What not to do

- Do not revive `.cursorrules`.
- Do not paste Sentra coding standards or full SAFRS policy into `.mdc` files.
- Do not set many rules to `alwaysApply: true`.
- Do not ignore source under `packages/` or `projects/` for "performance".
- Do not add raw Postgres MCP or `prisma mcp` until an R2 decision and a tool-inventory entry supersede the 2026-08-11 deferral.
- Do not run `/migrate-to-skills` on the Always or Specific Files rules in this repo.
- Do not add `.cursor/permissions.json`, `.cursor/worktrees.json`, `.cursor/cli.json`, `.cursor/environment.json`, or `.cursor/BUGBOT.md` as part of a docs edit.

## Related

- SAFRS invariants: `SAFRS_SPEC.md`
- Capsule lifecycle: `docs/governance/SAFRS_PROJECT_CAPSULES.md`
- Agent autonomy: `docs/governance/AGENT_AUTONOMY_MODEL.md`
