# Cursor Performance Pack — Design (2026-08-11)

## Goal

Maximize Cursor Agent indexing quality and context efficiency for this SAFRS monorepo without duplicating or weakening canonical policy.

## Constraints

- Root and nested `AGENTS.md` remain the single source of truth (SAFRS §5).
- `.cursor/rules/*.mdc` are thin adapters only (pointers + Cursor mechanics).
- No `.cursorrules`; no restated TypeScript/UI/security style guides in `.mdc`.
- Do not modify `.agents/knowledge/` without Chief approval.
- Risk: R1 (docs + ignore + adapter wiring); gitignore change is reversible.

## Architecture

1. **Track shared adapters**: gitignore ignores `.cursor/*` but un-ignores `.cursor/rules/**`.
2. **Ignore hygiene**: `.cursorignore` for secrets; `.cursorindexingignore` for index noise.
3. **One alwaysApply rule**: `safrs.mdc` routes to `AGENTS.md` / HANDOFF.
4. **Glob adapters**: package/project boundaries point at nested `AGENTS.md`.
5. **Agent-requested adapters**: verify, R2/R3 plan, security surfaces.
6. **Ops guide**: `docs/bootstrap/CURSOR_SETUP.md` (human + agent playbook).

## Non-goals

- Rewriting SAFRS policy into Cursor rules.
- MCP `mcp.json` templates (document hygiene only).
- Changing nested `AGENTS.md` content.

## Approval

Chief approved Approach B (maximum surface, zero policy duplication) on 2026-08-11.
