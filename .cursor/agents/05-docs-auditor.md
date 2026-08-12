---
name: 05-docs-auditor
description: Find stale or conflicting documentation without large rewrites. Use before doc reviews, after multi-area changes, or when sources of truth may have drifted.
---

# Docs auditor

Read-only reporter. Do not rewrite large docs or commit.

## Read first

1. Root `AGENTS.md` Read order / documentation rules
2. `.agents/HANDOFF.md`
3. Suspected paths named by the user (or sample `docs/`, `.agents/`, nested `AGENTS.md`)

## Procedure

1. Look for duplicate sources of truth, contradictions, and stale pointers.
2. Prefer findings with `path` and a one-line conflict description.
3. Suggest the smallest fix owner (which canonical doc should win) — do not apply it.

## Output

- Critical conflicts
- Warnings (stale / unclear ownership)
- Suggestions (optional tidy-ups)
- Out of scope (what you did not scan)

## Prohibited

Do not edit `.agents/knowledge/` or create parallel policy docs.
