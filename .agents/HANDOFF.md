# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (post ADR 0007, Claude Code, branch `integration/post-adr-0007`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- ADR 0007 is complete on `main` (`c4daa98c`): WP-E, WP-A, Wave 6 (WP-B, WP-D, WP-F), Wave 7
  (WP-G), and Wave 8 (WP-C), each with a Chief integrity review. Plan:
  `docs/plans/active/2026-09-24-adr-0007-sovereignty-enforcement.md` (status COMPLETED).
- `project-standalone verify` on 2026-09-25: `corporate/portfolio-drnovia`, `internal/unicom`,
  and (on this branch) `internal/prompt` pass every stage.

## Work in flight

`integration/post-adr-0007`, base `c4daa98c`, one merge for Chief:
- `SAFRS-INTEGRITY-BASE-CONFIG`: `check_sensitive_changes.py` exempts a changed path from
  "implementation" only when the review base's `.safrs/sensitive-paths.json` already classifies
  it as a control. Before, a change set could exempt its own implementation by adding it to
  `verification_control_patterns` (WP-C did this for `tools/project-standalone/**`: at
  `4e1cf629` the gate said review required, from `a2605e28` it exited 0). On the WP-C range the
  fixed gate says `required` and accepts Chief's record from `c4daa98c`. An independent
  reviewer then found two more escapes, both fixed here with tests that were red first:
  shrinking the head config (classification now uses head and base patterns together) and
  renaming a control out of its pattern (`--no-renames`). A base config whose pattern lists
  are not lists of strings now exits 2. Suite 23/23.
- `PROMPT-RUN-SMOKE`: the prompt contract `run` starts the built app with `--smoke`; verify
  passes every stage.
- `SMARTBOARD-LINT` and `KEDIRI-BUILD-ENV`: findings recorded in the capsule handoffs, no code
  changed.

## Blockers

- This branch needs a Chief integrity review: the gate fix changes the checker together with
  `tests/governance/test_sensitive_classification.py`, which is not classified as a control, so
  it counts as implementation.
- `product/kediri-history` build needs a Chief decision on `SKIP_ENV_VALIDATION` versus declared
  secrets (see that capsule's handoff).

## Next action

- Chief: integrity review and merge of `integration/post-adr-0007`.
- `academic/academic-smartboard`: lint repair (136 Biome errors, 45 after safe fixes, mostly
  a11y on interactive markup); plan in that capsule's handoff.
- Verifier backlog: on Windows, after the `internal/prompt` `run` timeout and `taskkill /T /F`,
  the rename to quarantine failed with EPERM and the extraction stayed in `%TEMP%`; no process
  referencing it remained afterwards. `stopManagedProcess` waits only for the top process, so
  a still-exiting descendant is one possible cause (not confirmed).
- Gate backlog from the same review: CI and the verifiers run the checker from the change set
  under review, so a change set can edit the checker itself. Running the base's checker in CI
  would close this.
- Classify the gate's own tests (`tests/governance/test_sensitive_classification.py`,
  `test_handoff_scope.py`) as verification controls, in a change set of their own.
- The four known non-conformance capsules (golden-path, control-center, avery, sentrabot) are
  due for review by 2026-12-31.
- Backlog: the strict `prisma migrate diff` proof for WP-E (needs Docker, which was not
  running); the missing migrations for `user`, `session`, `account`, and `verification`.

## Owner collision

None. `TASK-20260823-REPO-CONTEXT-SYNC` and `TASK-20260826-KEDIRI-CINEMATIC` were moved to
`SUPERSEDED` on Chief's instruction on 2026-09-25, because they blocked WP-G.
