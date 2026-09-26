# HANDOFF — Monorepo control plane

Last updated: 2026-09-27 (Claude Code, branch `migrate/healthcare`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- `main` at `dba377cd`. Landed since 2026-09-25: root without demonstrator and security patches
  (`5901a8d3`), Jev active (`de9e91bb`), sentrabot and golden-path standalone (`01587ee3`), golden-path
  context doc and `AGENTS.md` shell notes, sentrabot overrides in `package.json`, avery standalone
  with a retroactive Chief integrity review (`46da5ed4`), kediri GSAP production hardening
  (`884f7ea0`, cherry-picked from the `kediri` remote where it merged on 2026-09-12).
- `project-independence`: 8 active capsules, 1 known non-conformance (`internal/control-center`).
- `pnpm dev` proven (2026-09-25): Postgres healthy, control-center `http://127.0.0.1:3100` HTTP 200.
- Housekeeping (2026-09-26): `D:\DEV\Monorepo.worktrees` removed; `core.longpaths=true` (node_modules
  paths exceed 260 characters); local branches trimmed from 48 to 4 (`main`,
  `feat/coding-brief-v2`, `feat/auth-foundation`, `codex/release-baseline-recovery`). Worktrees go in
  a temporary location outside `D:\DEV` until Chief settles AGENTS.md rule 8 (see memory
  `pnpm-store-never-at-drive-root`).

## Work in flight

`migrate/healthcare` (local only, not pushed): brief
`docs/plans/active/2026-09-26-healthcare-migration-brief.md`, one commit per capsule.
- Migrated from abyss-monorepo as standalone capsules: sentraverse, assistverse, referralink,
  healthsphere, med-assist, medboard, sidelab-src. The root workspace excludes
  `projects/healthcare/**`.
- Clinical paths registered in `.safrs/sensitive-paths.json` as R3 (medboard CDSS, med-assist
  diagnosis engine, emergency detector, clinical lib and `penyakit.json`, sidelab engine and its
  clinical tests, mantra hospital and integrations apps).
- Left for the new Monorepo on Chief's instruction (2026-09-27): medboard's 4 hidden CDSS test
  failures, sidelab's 3 failing tests and coverage gate (its `test` is red), and mantra, which
  waits in the gitignored `docs/plans/active/healthcare-migration-tools/mantra-staging` without a
  contract. Melinda is deferred and untouched.
- Chief: re-point Railway/Vercel to the new capsule folders and decide whether to push the branch.

`fix/independence-skip-ignored`, base `dba377cd`, claim `INDEPENDENCE-SKIP-GIT-IGNORED` (R2):
- `check_project_independence.py` read every file on disk, so the ignored avery `runtime/` (3.1 GB of
  third-party Hermes files with invalid `tsconfig` JSON) failed `pnpm governance` in the main checkout
  once avery left known non-conformance. Inside a git work tree the checker now reads only files git
  does not ignore (`git ls-files --cached --others --exclude-standard`); outside one it walks the disk
  as before.
- Tests: `test_git_ignored_files_are_not_checked` failed before the change and passes after it;
  `test_untracked_files_that_git_does_not_ignore_are_still_checked` guards against over-skipping.
  The file passes 31/31. The checker on the main checkout now passes in 0.3 s.

## Blockers

None for this branch; the checker is a verification control, so Chief's integrity review is needed.

## Next action

- Chief: integrity review and merge `fix/independence-skip-ignored`.
- Chief decision: `feat/auth-foundation` (sentrabot email verification, password reset, rate
  limiting) and `codex/release-baseline-recovery` (2026-09-10) never landed anywhere; copies live on
  the `sentrabot` remote. Default: keep them there and delete locally; landing needs a large rebase
  onto the rebuilt capsule.
- Claim `KEDIRI-GSAP-PRODUCTION-HARDENING` stays REVIEW: it is bound to a removed worktree, so the
  task CLI refuses the transition. Close it when the CLI can.
- The Monorepo kediri capsule and `kediri/main` may still differ beyond the GSAP commit; compare
  before the next kediri publish.
- Origin is far behind `main`; the first origin CI run (`check:security`, workspace guards) is still
  unproven. Publishing to origin strips `projects/`.
- Control-center placement (ADR 0007) is the last known non-conformance.
- Gate backlog: CI and the verifiers run the checker from the change set under review; classify
  `tests/governance/test_sensitive_classification.py` and `test_handoff_scope.py` as controls.
- `check_handoff.py` still points to "AGENTS.md § Session protocol", a heading the condensed
  `AGENTS.md` no longer has.

## Owner collision

None.
