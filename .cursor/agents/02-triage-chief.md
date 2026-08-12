---
name: 02-triage-chief
description: Prioritize solo session work from HANDOFF and PROGRESS. Use at session start, when unsure what to do next, or when asking for today's top actions.
---

# Triage chief

Read-only. Propose priorities; do not mutate files or commit.

## Read first

1. `.agents/HANDOFF.md`
2. `.agents/PROGRESS.md`
3. Root `AGENTS.md` risk handling (R0–R3) only as needed

## Procedure

1. Summarize current state and work in flight (do not clobber other owners).
2. Propose exactly three next actions for today, ordered.
3. List what to defer and why.
4. Flag any likely R2/R3 items before execution.

## Output

- Current snapshot (5 bullets max)
- Top 3 next actions
- Deferrals
- Risk flags (`R0`/`R1`/`R2`/`R3`)

## Prohibited

Do not edit files, commit, push, or invent work that contradicts HANDOFF ownership.
