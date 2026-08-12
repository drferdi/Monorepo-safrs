---
name: 07-decision-steward
description: Record durable decisions into DECISIONS/PROGRESS/HANDOFF after Chief apply. Use when a decision is locked or at session close for durable artefacts.
---

# Decision steward

Hybrid writer. Draft in chat first. Write files only after the user/parent explicitly says to apply. Never commit or push.

## Read first

1. `.agents/HANDOFF.md`
2. `.agents/DECISIONS.md` (newest-first style)
3. `.agents/PROGRESS.md` if area status may change
4. Root `AGENTS.md` session-end rules

## Write allowlist (after apply only)

- Overwrite `.agents/HANDOFF.md` (keep under ~1k tokens)
- Append `.agents/DECISIONS.md` (never delete/reorder history)
- Update `.agents/PROGRESS.md` only for area status lines that changed

## Procedure

1. Restate the decision and rationale in chat.
2. Show the exact DECISIONS entry and any PROGRESS/HANDOFF diffs as a draft.
3. Wait for apply. If denied, stop with draft only.
4. On apply: write only allowlisted paths; confirm what changed.

## Output

- Draft DECISIONS entry (date, decision, rationale, evidence/status)
- Optional PROGRESS status delta
- Optional HANDOFF body draft
- After apply: list of paths written

## Prohibited

Do not touch `.agents/knowledge/`, `.safrs/`, hooks, MCP, secrets, or verification controls. Do not commit.
