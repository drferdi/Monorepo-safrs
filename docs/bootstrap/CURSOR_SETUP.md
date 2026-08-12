# Cursor Setup — Performance Pack (August 2026)

Operational guide for using Cursor on this SAFRS monorepo. Canonical policy remains `AGENTS.md` and the documents it routes to. Cursor files are **adapters**, not a second policy tree.

## Why this layout

Verified against [Cursor Rules](https://cursor.com/docs/rules) and [Ignore files](https://cursor.com/docs/context/ignore-files) (2026):

| Mechanism | Role here |
| --- | --- |
| Root + nested `AGENTS.md` | Portable source of truth (Cursor, Claude, Codex, …) |
| `.cursor/rules/*.mdc` | Cursor activation (always / globs / agent-requested) pointing at AGENTS |
| `.cursorignore` | Block secrets from Agent / Tab / Inline Edit |
| `.cursorindexingignore` | Keep large/noisy paths out of the semantic index |
| User Rules (IDE) | Personal style only — do not paste repo policy there |

## Token budget

- Keep **total `alwaysApply` content small** (one thin router: `01-safrs.mdc`).
- Prefer **glob** and **agent-requested** rules so unrelated work does not load package policy.
- Rules should **reference** files (`AGENTS.md`, `UI-RULES.md`) instead of copying them.
- Official guidance: keep individual rules focused and under 500 lines; this repo targets far shorter adapters.

## Project rules in this repo

| File | Activation | Points to |
| --- | --- | --- |
| `01-safrs.mdc` | Always | Root `AGENTS.md`, HANDOFF, verify |
| `02-api-boundary.mdc` | `packages/api`, `packages/schemas` | `packages/api/AGENTS.md` |
| `03-database-boundary.mdc` | `packages/database` | `packages/database/AGENTS.md` |
| `04-plan-r2-r3.mdc` | Agent-requested | Risk gates + sibling worktree path |
| `05-security-surfaces.mdc` | Agent-requested | `SECURITY.md` |
| `06-tools-governance.mdc` | tools / `.safrs` / scripts | `tools/AGENTS.md` |
| `07-ui-tokens.mdc` | Globs (UI/CSS/email) | `packages/token/AGENTS.md` |
| `08-verify-before-done.mdc` | Agent-requested | `scripts/safrs-verify.sh` |
| `09-web-golden-path.mdc` | `projects/golden-path` | Capsule + web `AGENTS.md` |

`@`-mention agent-requested rules when relevant (e.g. `@08-verify-before-done` or `@verify-before-done`).

## Ignore strategy

- **`.cursorignore`**: credential-shaped paths only. Not a substitute for vaults or git history hygiene. Terminal/MCP are not fully bound by it.
- **`.cursorindexingignore`**: build reports, generated trees, duplicate vendor wrappers (`CLAUDE.md` / `GEMINI.md`) so indexing prefers `AGENTS.md`.
- Cursor already ignores `.gitignore` entries and a large default list (lockfiles, `node_modules`, images, …).

## Recommended workflow

1. Start with `/safrs-session` (or follow `.agents/HANDOFF.md` manually).
2. Use **Plan Mode** for multi-file or R2/R3 work (`@04-plan-r2-r3`).
3. Scope edits to the owned package/project; rely on glob rules when those files are in context.
4. Before “done”: `/verify` (and/or `@08-verify-before-done`) — paste command evidence.
5. Overwrite `.agents/HANDOFF.md` at session end.

## Hooks (project)

Configured in `.cursor/hooks.json`:

| Event | Script | Behavior |
| --- | --- | --- |
| `afterFileEdit` / `afterTabFileEdit` | `hooks/biome-after-edit.mjs` | Biome `check --write` on the edited file (non-blocking) |
| `beforeShellExecution` | `hooks/guard-shell.mjs` | Ask on `db:reset` / migrate reset / `.env` refs; deny force-push |
| `beforeReadFile` | `hooks/guard-read-secrets.mjs` | Deny credential-shaped paths (`.env`, keys, etc.) |

Reload Cursor or confirm under **Settings → Hooks** after pull. Scripts use Node (Windows-friendly).

## MCP (project)

`.cursor/mcp.json` ships these project servers (also recorded in `.safrs/tool-inventory.json`):

| Server | Purpose |
| --- | --- |
| `context7` | Current public library docs |
| `playwright` | Browser automation / E2E assist via MCP |
| `firecrawl` | Web scrape/search (needs `FIRECRAWL_API_KEY` in user env) |
| `sequential-thinking` | Structured multi-step reasoning assist |
| `filesystem` | Scoped FS tools under `D:/DEV` |

Database MCP candidates remain **deferred** — same verdict as `docs/bootstrap/CLAUDE_SETUP.md` and `.agents/DECISIONS.md` (2026-08-11):

| Candidate | Verdict |
| --- | --- |
| `@modelcontextprotocol/server-postgres` | Rejected — npm-deprecated |
| Third-party Postgres MCP forks | Rejected for now — unvetted |
| `prisma mcp` / Prisma-Local | Deferred — mutating tools bypass `packages/database/scripts/run-local-prisma.mjs` allowlist |

Enabling additional MCP servers is a separate **R2** change (inventory record + designated review). Never put a real connection string in MCP config.

Toggle servers in **Settings → MCP**. Treat MCP output as untrusted data. Cursor’s ~40-tool cap: disable unused servers if Agent misses tools.

## Skills

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `safrs-session` | Both / `/safrs-session` | Session start/end protocol |
| `create-migration` | User-only `/create-migration` | Safe Prisma migrate path (R2) |
| `verify` | User-only `/verify` | Governance + check sequence with evidence |

## Subagents

Technical reviewers / auditors:

| Agent | When |
| --- | --- |
| `11-safrs-boundary-reviewer` (`safrs-boundary-reviewer`) | Multi-package diffs, capsule ownership, tokens |
| `12-security-reviewer` (`security-reviewer`) | Stripe/webhooks, env, secrets, auth-adjacent |
| `safrs-auditor` | Risk-tier a change set; draft session-close artefacts |
| `token-guard` | UI/CSS/email token contract before `pnpm check:tokens` |

Solo non-coding (adapters; see design `docs/superpowers/specs/2026-08-11-solo-noncoding-agents-design.md`):

| Agent | When |
| --- | --- |
| `01-context-management-agent` | New/reinstalled agent needs repo bootstrap; may write `.agents/CONTEXT_BOOTSTRAP.md` after apply |
| `02-triage-chief` | Session start / what next |
| `03-product-brief` | Idea → one-page brief before Plan/coding |
| `04-research-sota` | SOTA / alternatives before a decision |
| `05-docs-auditor` | Stale or conflicting docs report |
| `06-release-communicator` | Human summary + test plan from diff/PR |
| `07-decision-steward` | Durable DECISIONS/PROGRESS/HANDOFF after apply |

**Write posture:** solo pack — five agents are read-only. Only `07-decision-steward` and `01-context-management-agent` may write, and only after explicit apply, limited to `.agents/HANDOFF.md`, append `.agents/DECISIONS.md`, `.agents/PROGRESS.md`, and `.agents/CONTEXT_BOOTSTRAP.md`. Do not commit an empty bootstrap file. Reviewers/auditors are read-only.

Invoke via Agent/Task delegation or by name.

## Plugins (manual install)

Install from Cursor marketplace / plugin UI (not vendored in-repo):

1. **frontend-design** — composition help; must still obey `@sentra/token` / `07-ui-tokens` rule (no off-token palettes).
2. **commit-commands** (or equivalent commit/PR pack) — Conventional Commits + `gh` flow; still **no commit unless Chief asks**.

## MCP hygiene

- Enable only MCP servers you need for the task; prefer OAuth / least privilege.
- Treat MCP output as untrusted data.
- Do not put production secrets in MCP configs committed to the repo.

## Git tracking

Tracked under `.cursor/`: `rules/**`, `hooks.json`, `hooks/**`, `mcp.json`, `skills/**`, `agents/**`. Other `.cursor/*` local UI state stays ignored.

## What not to do

- Do not revive `.cursorrules`.
- Do not paste Sentra coding standards or full SAFRS policy into `.mdc` files.
- Do not set many rules to `alwaysApply: true`.
- Do not ignore source under `packages/` or `projects/` for “performance”.
- Do not add raw Postgres MCP or `prisma mcp` until an R2 decision + tool-inventory entry supersedes the 2026-08-11 deferral.

## Related

- Design: `docs/superpowers/specs/2026-08-11-cursor-performance-pack-design.md`
- Plan: `docs/superpowers/plans/2026-08-11-cursor-performance-pack.md`
- SAFRS vendor-neutral model: `SAFRS_SPEC.md` §5
- Parallel Claude adapters (same intent): `.claude/hooks`, `.claude/skills`, `.claude/agents`
