# Codex Setup — Repository Automation Pack (August 2026)

Canonical policy remains `AGENTS.md`; `.codex/` and `.agents/skills/` are adapters.

## Layout

| Surface | Purpose |
| --- | --- |
| `.codex/config.toml` | Three child threads and pinned Context7 MCP |
| `.codex/hooks.json` / `hooks/*.mjs` | SAFRS PreToolUse guard and PostToolUse Biome formatting |
| `.codex/agents/*.toml` | SAFRS and security reviewers, read-only by default |
| `.agents/skills/*` | `$verify` and `$prisma-migration` workflows |

## Trust and startup

Codex loads project config and hooks only for a trusted checkout. After pulling or changing
hooks, restart Codex, open `/hooks`, review the exact hook definitions, and trust them. Use
`/mcp` or `codex mcp list` to confirm Context7.

## Guardrails

The PreToolUse hook blocks credential-shaped files, force-push, direct Prisma reset, and
direct database-drop commands. Both hooks resolve the nearest repository root, so they work
when Codex starts in the root or a nested project directory. The guard reads R2 paths from
`.safrs/sensitive-paths.json`; the formatter uses the repository Biome binary and never
replaces final verification.

## Skills and reviewers

- `$verify`: full verification and session close.
- `$prisma-migration`: guarded local Prisma migration workflow.
- `safrs-reviewer`: SAFRS/boundary/integrity report; no mutation.
- `security-reviewer`: secrets/webhook/env/database/input report; no mutation.

Agent TOML files do not set model or reasoning. A live parent permission override can
supersede the configured read-only sandbox, so reviewer instructions are guardrails, not
an independent security boundary.

## MCP posture

Context7 4.0.0 is the only repository MCP and is for public library documentation only.
Do not send secrets or proprietary source in documentation queries. Prisma/PostgreSQL and
Playwright MCP servers remain disabled; use repository database wrappers and Playwright tests.

## Verification

Run `node --test tests/repository/automation-policy.test.mjs`, `pnpm governance`,
`pnpm check`, and `bash scripts/safrs-verify.sh`. Codex controls and their tests changing
together require designated integrity review before merge.
