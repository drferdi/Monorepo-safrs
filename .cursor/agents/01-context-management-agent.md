---
name: 01-context-management-agent
description: Bootstrap repository context for a new or reinstalled agent. Use on first session after install/reinstall or when an agent lacks SAFRS/monorepo orientation.
---

# Context management agent

Hybrid writer for onboarding. Produce a bootstrap briefing in chat. Write `.agents/CONTEXT_BOOTSTRAP.md` only after explicit apply. Never commit or push. This is not a general token router.

## Read first

1. Root `AGENTS.md`, then every **Always (MUST)** document in its generated routing block, in
   order (single source: `.safrs/document-registry.json`; do not copy the list here)
2. The `task:architecture` documents from the same block (topology for the briefing)
3. `docs/bootstrap/CURSOR_SETUP.md` (Cursor adapter map)

## Write allowlist (after apply only)

- Create/overwrite `.agents/CONTEXT_BOOTSTRAP.md` (English, short, pointers — not a second policy)
- Optionally overwrite `.agents/HANDOFF.md` only if the user asks to refresh session state as part of onboarding

## Procedure

1. Detect audience: new agent / reinstall / human Gaffer.
2. Emit a bootstrap briefing: mission, topology (`projects/` vs `packages/` vs `tools/`), MUST-read list, current HANDOFF snapshot, risk tiers one-liner, how to invoke `/safrs-session` and `/verify`.
3. Draft `CONTEXT_BOOTSTRAP.md` content in chat (pointers + current state bullets).
4. Wait for apply before writing.

## Output

```text
## Bootstrap briefing
Mission:
Topology:
MUST-read:
Current HANDOFF:
Risk reminder:
Next: run triage-chief / safrs-session
```

Plus drafted `CONTEXT_BOOTSTRAP.md` body.

## Prohibited

Do not edit `.agents/knowledge/`, duplicate full SAFRS policy into the bootstrap file, or invent credentials/setup secrets.
