# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-11 (Cursor — DBCode/SpecStory/Quick Presets setup; Claude — repo hygiene fixes, uncommitted)

## Current state

- **Repo hygiene (Claude session — committed & pushed):**
  - `scripts/safrs-verify.ps1` now runs `check_handoff.py` (was silently skipped on Windows; `.sh` already had it)
  - `.github/CODEOWNERS.example` deleted — superseded by real `CODEOWNERS`
  - `docs/bootstrap/README.md` retitled: archive vs active setup guides made explicit
  - `README.md` orphan `</div>` removed
  - Deferred until in-flight branches land: moving setup guides out of `docs/bootstrap/`, registering `docs/superpowers/{plans,specs}` in the document registry
- **Incident fixed:** main `.git/config` contained `core.worktree = .worktrees/solo-noncoding-agents` (set by a Codex session) — every git command in the main checkout silently operated on that worktree's files. Unset 2026-08-11. Any git output observed while it was active is suspect.
- **Known red gates (pre-existing, owned by the in-flight renumbering change set):** `check_docs`/`check_topology`/topology test fail because `.cursor/rules/*.mdc` were renamed to numbered files on disk but `.safrs/document-registry.json` still lists old paths, and `projects/_template/AGENTS.md` + `tools/AGENTS.md` are deleted uncommitted. `check_sensitive_changes` demands independent review (controls + implementation mixed in the working tree).

- **Extensions (local Cursor):**
  - `dbcode.dbcode` + SpecStory installed by Chief
  - `EnginCannot.cursor-quick-presets` v0.1.5 installed via CLI (search by ID if missing)
  - Local workspace config in `.vscode/settings.json` (gitignored): SpecStory local-only; DBCode pinned to Docker Postgres `127.0.0.1:54329` / `safrs_local`; `.env` zero-config discovery **disabled** (avoids Neon)
- **Postgres:** `pnpm db:start` healthy on `:54329`
- **Gitignore:** `.specstory/history/` + `statistics.json` ignored (chat dumps may contain secrets)
- Prior: Bugbot follow-ups on `main`; Prisma/Postgres MCP still deferred (`DECISIONS.md`) — DBCode is the interim DB agent surface

## Work in flight (do not clobber)

- DX friction plan owned elsewhere — `scripts/`, root `package.json`, INSTALL.md stay out of scope.

## Blockers

- Pre-existing red token/lint gates; Stripe CLI missing.

## Done this session (env)

- `.env`: Neon `DATABASE_URL` commented; only local `127.0.0.1:54329/safrs_local` remains active.

## Next actions

| Area | Action |
| --- | --- |
| DBCode | Reload Window → open DBCode sidebar → connect `SAFRS local`; confirm MCP tools in chat picker |
| SpecStory | Cmd/Ctrl+Shift+P → `SpecStory:` commands appear; history under `.specstory/history/` |
| Quick Presets | Explorer → “Cursor Quick Presets” panel (or Command: Show in Explorer) |
| Tool inventory | `.cursor/mcp.json` still lacks `.safrs/tool-inventory.json` entries |

## Session guardrails

- Never read `.env` in `D:\Devops\abyss-monorepo`; never copy old `node_modules`/`.env`/`.next`/lockfiles.
- `.agents/knowledge/` — no changes without Chief's approval.
- Do not point DBCode/agent at Neon/cloud DBs from this workspace.
- PowerShell for commands; chat diagnostics in Bahasa Indonesia; docs/code in English.
