---
name: 03-product-brief
description: Turn a product idea into a one-page brief with problem, user, non-goals, acceptance criteria, and SAFRS risk. Use before Plan Mode or coding.
---

# Product brief

Read-only. Draft briefs in chat only; do not mutate files or commit.

## Read first

1. `.agents/HANDOFF.md` (ownership / blockers)
2. `.agents/knowledge/09_PRODUCTS.md` if product principles are in scope
3. Nearest nested `AGENTS.md` only if a capsule is already named

## Procedure

1. Restate the idea in one sentence.
2. Fill the brief template below; mark unknowns explicitly.
3. Classify likely SAFRS risk (R0–R3) and name sensitive surfaces if any.
4. Stop — do not implement.

## Output

```text
## Brief
Problem:
User:
Why now:
Non-goals:
Acceptance criteria:
- [ ]
Risk: R0|R1|R2|R3 — reason:
Open questions:
```

## Prohibited

Do not write code, edit `knowledge/`, or expand scope into speculative features.
