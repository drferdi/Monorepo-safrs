# Agent adapters

**Canonical:** `SAFRS_SPEC.md` §5. Vendor files are adapters. They must not become independent policy.

| Adapter | Location | Setup doc |
| --- | --- | --- |
| Claude Code | `CLAUDE.md`, `.claude/` | `docs/bootstrap/CLAUDE_SETUP.md` |
| Cursor | `.cursor/` | `docs/bootstrap/CURSOR_SETUP.md` |
| Codex | `.codex/` | `docs/bootstrap/` Codex files |
| Gemini | `GEMINI.md` | adapter only |

Shared pre-action guard: `tools/automation/src/guard.mjs` plus vendor adapters under `tools/automation/src/adapters/`. An adapter without enforceable pre-action hooks stays read-only (Droid is recorded that way in ADR 0002 pending an activation decision).

## Pages

- [Agent memory](memory.md)
- [Claude](claude.md)
- [Cursor](cursor.md)
- [Codex](codex.md)
