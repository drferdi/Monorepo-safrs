# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-11 (Cursor — Bugbot findings addressed, uncommitted)

## Current state

- **Prior on `origin/main`**: Claude/Cursor/Cline agent automation packs (governance + docs).
- **This session (uncommitted)**: Fixed five Bugbot findings from `/review-bugbot`:
  1. `.cursor/hooks/guard-shell.mjs` — allow `--force-with-lease`; deny bare `--force`/`-f`
  2. `.cline/skills/prisma-migration/SKILL.md` — path to skill-local `scripts/validate-migration.mjs`
  3. `.safrs/sensitive-paths.json` — R2: `.cursor/**`, `.cline/**`, `**/.mcp.json`;
     verification controls: `.cursor/hooks.json`, `.cursor/hooks/**`, `.cline/hooks/**`
  4. `.claude/hooks/guard-sensitive-paths.mjs` + `.claude/settings.json` — credential parity
     with Cursor (`id_ed25519*`, `credentials.json`, `secrets.json`, `*.p12`, `*.pfx`)
- **Integrity**: `SAFRS_VERIFICATION_INTEGRITY_REVIEW` likely required (controls + adapters).
- Prisma/Postgres MCP still deferred (`DECISIONS.md`).

## Work in flight (do not clobber)

- DX friction plan owned elsewhere — `scripts/`, root `package.json`, INSTALL.md stay out of scope.

## Blockers

- Pre-existing red token/lint gates; Stripe CLI missing; Cursor plugins need UI install.

## Next actions

| Area | Action |
| --- | --- |
| Commit | Commit Bugbot fixes when Chief asks (not yet requested) |
| Tool inventory | `.cursor/mcp.json` / `.cline/mcp.json` still lack `.safrs/tool-inventory.json` entries |
| CI coverage | CI on `pull_request` only; direct `main` pushes ungated — decide policy |
| Security | Dependabot: 5 vulns on `main` (3 high, 2 moderate) |
| Plugins | Install frontend-design + commit-commands in Cursor UI |

## Session guardrails

- Never read `.env` in `D:\Devops\abyss-monorepo`; never copy old `node_modules`/`.env`/`.next`/lockfiles.
- `.agents/knowledge/` — no changes without Chief's approval.
- PowerShell for commands; chat diagnostics in Bahasa Indonesia; docs/code in English.
