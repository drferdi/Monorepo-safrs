# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-11 (Cursor — removed Prisma-Local MCP; aligned with deferral)

## Current state

- **Cursor automations implemented (uncommitted):**
  - MCP: `.cursor/mcp.json` → **Context7 only** (Prisma-Local **removed** — matches
    DECISIONS.md / CLAUDE_SETUP deferral: `prisma mcp` bypasses `run-local-prisma.mjs`)
  - Hooks: Biome after edit, shell gate, secret read deny
  - Skills: `safrs-session`, `create-migration`, `verify`; Agents: boundary + security reviewers
  - Guide: `docs/bootstrap/CURSOR_SETUP.md`
- **Claude Code pack** (R2, uncommitted) unchanged; Postgres/`prisma mcp` still deferred.
- Prior Cursor rules/ignores + golden-path R2 product diff still await Chief review
  (prefer separate commits).

## Work in flight (do not clobber)

- DX friction plan still owned elsewhere — do not touch `scripts/` / root `package.json` /
  INSTALL.md unless that scope is released.

## Blockers

- Pre-existing red token/lint gates; Stripe CLI missing; plugins need UI install.

## Next actions

| Area | Action |
| --- | --- |
| Cursor pack | Chief review → commit |
| Claude pack | Split verification-controls commit vs adapters/docs |
| Plugins | Install frontend-design + commit-commands in Cursor UI |
| MCP | Enable Context7 only; do **not** add Prisma/Postgres MCP without new R2 decision |

## Session guardrails

- Never read `.env` in `D:\Devops\abyss-monorepo`; never copy old `node_modules`/`.env`/`.next`/lockfiles.
- `.agents/knowledge/` — no changes without Chief's approval.
- PowerShell for commands; chat diagnostics in Bahasa Indonesia; docs/code in English.
