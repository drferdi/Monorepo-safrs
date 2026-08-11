# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-11 (Cursor — Bugbot fixes committed; push to `main`)

## Current state

- **On `main` (local → push):**
  - `638e507` feat(agents): Cline automation pack
  - This commit: Bugbot follow-ups — force-with-lease allow, sensitive-paths R2
    parity (`.cursor/**` / `.cline/**` / `**/.mcp.json` + hook verification controls),
    Claude credential denials aligned with Cursor
- Prisma skill path fix already in `638e507`.
- **Integrity:** verification controls + adapters changed together — designated review
  still applies (`SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` on that change set).
- Prisma/Postgres MCP still deferred (`DECISIONS.md`).

## Work in flight (do not clobber)

- DX friction plan owned elsewhere — `scripts/`, root `package.json`, INSTALL.md stay out of scope.

## Blockers

- Pre-existing red token/lint gates; Stripe CLI missing; Cursor plugins need UI install.

## Next actions

| Area | Action |
| --- | --- |
| Tool inventory | `.cursor/mcp.json` / `.cline/mcp.json` still lack `.safrs/tool-inventory.json` entries |
| CI coverage | CI on `pull_request` only; direct `main` pushes ungated — decide policy |
| Security | Dependabot: 5 vulns on `main` (3 high, 2 moderate) |
| Plugins | Install frontend-design + commit-commands in Cursor UI |

## Session guardrails

- Never read `.env` in `D:\Devops\abyss-monorepo`; never copy old `node_modules`/`.env`/`.next`/lockfiles.
- `.agents/knowledge/` — no changes without Chief's approval.
- PowerShell for commands; chat diagnostics in Bahasa Indonesia; docs/code in English.
