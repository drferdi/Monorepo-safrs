# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.
> **BINDING: read `.agents/BOUNDARIES.md` first — no push/publish/visibility change without an explicit Chief order in YOUR session; other sessions' local commits are off-limits.**

Last updated: 2026-08-25 (reusable /sentra-docs skill)

## Current state

- **Skill `/sentra-docs` (this session):** reusable SPDS 1.0 generator, not Avery-only.
  Repo: `.cursor/skills/sentra-docs/` + slash `.cursor/commands/sentra-docs.md`.
  Mirrors: `.agents/skills/sentra-docs/`, `~/.cursor/skills/sentra-docs/`,
  `~/.cursor/commands/sentra-docs.md`. Catalog: `references/catalog.json`.
  Usage: `/sentra-docs <capsule> [--refresh] [--overlay healthcare,ai,agent]`.
- Avery SPDS instance remains at `projects/healthcare/avery/docs/spds/`
  (lowercase names; `docs/README.md` kept). Reference instance only.
- No commit. No live Hermes check.

## Next action

Chief can invoke `/sentra-docs` on any capsule. Restart Cursor if the slash command
does not appear yet.
