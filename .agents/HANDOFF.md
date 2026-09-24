# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (Claude Code, branch `integration/post-adr-0007-2`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- ADR 0007 is complete; `main` at `3aef2b7f` also carries the integrity gate fix (controls are
  classified against head and base config; renames are listed with `--no-renames`) and the
  prompt contract `--smoke` run.
- `project-standalone verify` passes for `corporate/portfolio-drnovia`, `internal/unicom`, and
  `internal/prompt`.

## Work in flight

`integration/post-adr-0007-2`, base `3aef2b7f`, one merge for Chief:
- `AGENTS-MD-CONDENSED`: root `AGENTS.md` is Chief's condensed rewrite (found uncommitted in the
  main checkout on 2026-09-25, truncated inside the verifier code block; completed). Added in the
  same style: ADR 0007 decision 7 capsule memory rules and the `SAFRS_PROJECT_CAPSULES.md`
  reference. The routing block stays generator output (`generate_routing.py`), because
  `check_routing.py` requires it byte for byte.
- `PROMPT-README-CI`, `KEDIRI-STANDALONE-NO-ENV`, `DB-AUTH-MIGRATION`: see the commits and the
  capsule handoffs. The database migration was proven with Docker (PostgreSQL 16, shadow DB).
- `SMARTBOARD-LINT-REPAIR` on `fix/smartboard-lint-repair` (worked by a subagent), merged into this
  branch when done.
- The main checkout's stale ADR 0007 drafts were stashed, not deleted (`git stash list`).

## Blockers

- This branch needs a Chief integrity review: `AGENTS.md` is a verification control.
- `product/kediri-history` build needs a database at build time (public pages read Payload while
  prerendering). Chief decision recorded in that capsule's handoff.

## Next action

- Chief: integrity review and merge; the same command fast-forwards the main checkout.
- Cursor brief for the four non-conformance capsules:
  `docs/plans/active/2026-09-25-cursor-capsule-independence-prompt.md` (gitignored).
- Root database: `demos.id` has a database default (`gen_random_uuid()`, migration 0002) while the
  schema says `@default(uuid())`; `prisma migrate diff` reports `DROP DEFAULT`. Pick one.
- Gate backlog: CI and the verifiers run the checker from the change set under review; classify
  `tests/governance/test_sensitive_classification.py` and `test_handoff_scope.py` as controls.
- Verifier backlog: Windows cleanup EPERM after a `run` timeout (not reproduced since).
- `check_handoff.py` still points to "AGENTS.md § Session protocol", a heading the condensed
  `AGENTS.md` no longer has; the rules now live under "Task Lifecycle & Documentation".

## Owner collision

None. `TASK-20260823-REPO-CONTEXT-SYNC` and `TASK-20260826-KEDIRI-CINEMATIC` were moved to
`SUPERSEDED` on Chief's instruction on 2026-09-25, because they blocked WP-G.
