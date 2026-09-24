# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (ADR 0007 WP-G, Claude Code, branch `feat/adr-0007-wp-g`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- ADR 0007 work package: `docs/plans/active/2026-09-24-adr-0007-sovereignty-enforcement.md`.
- Merged into `main`: WP-E (root schema without SentraBot models), WP-A (one path-classification
  rule), and Wave 6 at `27188dd4`: WP-B (valid prompt and unicom contracts), WP-D (doctrine
  alignment, ADR 0001 superseded), and WP-F (CI type check runs whenever golden-path exists).
  Each carried a Chief integrity review.

## Work in flight

- WP-G on `feat/adr-0007-wp-g` (claims `ADR0007-WP-G`, `ADR0007-WP-G-WIZARD`,
  `ADR0007-WP-G-KEDIRI-IGNORE`): every capsule and `_template` get `.agents/HANDOFF.md`,
  `DECISIONS.md`, and `CONTEXT.md`; capsule state moves out of the root; `check_handoff.py`
  becomes scope-aware; `check_topology.py` enforces the three files; the session protocol writes
  capsule state to the capsule `.agents/`.

## Blockers

- WP-G needs a Chief integrity review before merge, because verification controls and content
  change together.

## Next action

- Codex review of WP-G, then Chief integrity review and merge.
- WP-C (fail-closed coverage and blocking gate). Its backlog includes `project-standalone verify`
  rejecting pnpm's Windows links under `node_modules/.pnpm`, and the project wizard defect below.
- Backlog outside WP-C: the strict `prisma migrate diff` proof for WP-E; the missing migrations
  for `user`, `session`, `account`, and `verification` (golden-path migration).
- Project wizard (inherited, since `3a6188fe`): `_template/AGENTS.md` carries
  `<replace-with-domain>`, which the wizard never fills, and the wizard still writes flat
  `projects/slug` paths; 9 of its 35 tests fail on `main`. `pnpm project:new` cannot create a
  capsule until this is repaired.

## Owner collision

None. `TASK-20260823-REPO-CONTEXT-SYNC` and `TASK-20260826-KEDIRI-CINEMATIC` were moved to
`SUPERSEDED` on Chief's instruction on 2026-09-25, because they blocked WP-G.
