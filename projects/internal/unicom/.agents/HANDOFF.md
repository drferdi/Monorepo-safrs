# HANDOFF

Last updated: 2026-10-11 (Claude Code, local `main`, task `TASK-20261011-GAFFER-ADDRESS`)

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- 2026-10-11 (Claude Code, task `TASK-20261011-GAFFER-ADDRESS`, R1): docs in this capsule now address the owner as "Gaffer" instead of "Chief" (wording only; no code, config or behaviour change).
- This `.agents/` folder was created by ADR 0007 WP-G on 2026-09-25. No capsule-scoped session
  has been recorded here yet.
- ADR 0007 WP-B (merged 2026-09-25): `project.contract.json` passes the validator, and `pnpm run
  start --hostname 127.0.0.1 --port 4330` answers 200 on `/`. `project-standalone verify` stops
  after install on Windows because pnpm creates links under `node_modules/.pnpm` (tracked as WP-C
  backlog).

## Work in flight

None recorded.

## Blockers

None recorded.

## Next action

None recorded.
