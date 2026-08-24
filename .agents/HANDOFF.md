# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.
> **BINDING: read `.agents/BOUNDARIES.md` first — no push/publish/visibility change without an explicit Chief order in YOUR session; other sessions' local commits are off-limits.**

Last updated: 2026-08-25 (MD060 compact table pipes in sentra-docs SKILL.md)

## Current state

- **This session:** fixed MD060/table-column-style in `/sentra-docs` skill.
  Separator rows now use compact pipes (`| ------ | --------- |`).
  Files: `.cursor/skills/sentra-docs/SKILL.md`, `.agents/skills/sentra-docs/SKILL.md`,
  plus home mirror `~/.cursor/skills/sentra-docs/SKILL.md`.
- Pre-existing MD040 (fence language) and MD013 (line length) remain; not in scope.
- `/sentra-docs` skill otherwise unchanged. No commit.

## Next action

Chief can invoke `/sentra-docs` on any capsule. Restart Cursor if the slash command
does not appear yet.
