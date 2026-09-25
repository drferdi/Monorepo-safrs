# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (Claude Code, branch `fix/standalone-verifier-env-timeout`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- `main` at `662e695f` carries `integration/post-adr-0007-3`: `demos.id` default follows the
  database (`dbgenerated("gen_random_uuid()")`), and kediri public pages render at request time
  with a data cache. `pnpm governance` PASS on `main`.
- `project-standalone verify` passes for `corporate/portfolio-drnovia`, `internal/unicom`,
  `internal/prompt`, `academic/academic-smartboard`, and `product/kediri-history`.
- The main checkout's stale ADR 0007 drafts are stashed at `stash@{0}` (superseded; do not
  re-apply without Chief).

## Work in flight

`fix/standalone-verifier-env-timeout`, base `662e695f`, claim `STANDALONE-VERIFIER-ENV-TIMEOUT`
(raised by the Cursor sentrabot work: native `koffi` failed to install without `LOCALAPPDATA`,
and a cold sentrabot install takes about 127 seconds):
- The sanitized lifecycle environment sets `APPDATA` and `LOCALAPPDATA` to
  `<isolated home>/AppData/Roaming` and `<isolated home>/AppData/Local`; extraction creates both
  directories. The real user profile still never reaches a lifecycle command.
- Finite lifecycle commands (`install`, `lint`, `typecheck`, `test`, `build`, `deployDryRun`) take
  an optional `timeoutSeconds`, an integer from 1 to 600; the default stays 120. `run` rejects it
  (its bound is `smoke.startupTimeoutSeconds`). `.safrs/schemas/project-contract.schema.json` has a
  matching `finiteCommand` definition.
- Tests: four new cases in `tools/project-standalone/test/project-standalone.test.mjs`; they failed
  before the change and the suite passes 23/23 after it.

## Blockers

None for this branch.

## Next action

- Chief: merge `fix/standalone-verifier-env-timeout`; then Cursor resumes the sentrabot capsule
  and may set `"timeoutSeconds"` on its `install` command.
- Cursor brief for the four non-conformance capsules:
  `docs/plans/active/2026-09-25-cursor-capsule-independence-prompt.md` (gitignored).
  Control-center placement is still a Chief decision (ADR 0007).
- Kediri: the data cache's effect on database reads is not yet observed at runtime (needs a content
  database); see that capsule's handoff.
- Gate backlog: CI and the verifiers run the checker from the change set under review; classify
  `tests/governance/test_sensitive_classification.py` and `test_handoff_scope.py` as controls.
- Verifier backlog: Windows cleanup EPERM after a `run` timeout (not reproduced since).
- `check_handoff.py` still points to "AGENTS.md § Session protocol", a heading the condensed
  `AGENTS.md` no longer has; the rules now live under "Task Lifecycle & Documentation".

## Owner collision

None.
