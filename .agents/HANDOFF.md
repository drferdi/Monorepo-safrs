# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (ADR 0007 WP-C, Claude Code, branch `feat/adr-0007-wp-c`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- ADR 0007 work package: `docs/plans/active/2026-09-24-adr-0007-sovereignty-enforcement.md`.
- Merged into `main`: WP-E (root schema without SentraBot models), WP-A (one path-classification
  rule), Wave 6 at `27188dd4` (WP-B, WP-D, WP-F), and Wave 7 at `ba9760f1` (WP-G: capsule
  `.agents/` files, scope-aware handoff gate, wizard repair). Each carried a Chief integrity
  review.

## Work in flight

- WP-C on `feat/adr-0007-wp-c` (claim `ADR0007-WP-C`), base `ba9760f1`:
  - `check_project_independence.py` is blocking and fail-closed: every capsule needs a contract
    or an entry in `.safrs/known-nonconformance.json` (golden-path, control-center, avery,
    sentrabot; owner Chief, review by 2026-12-31). One `os.walk` per capsule with pruning:
    27.0 s on `main` with `node_modules`, 0.15 s now.
  - Both verifiers run one checker list (22 entries), asserted by `test_verifier_parity.py`;
    the governance workflow runs the checker and its tests.
  - `project-standalone`: per-capsule `status`; `verify` accepts links that resolve inside the
    extracted capsule and rejects the rest; classified as a verification control; its tests run
    in CI.
  - Commits: `3ea250b0`, `bdbf6a90`, `4e1cf629`, `a2605e28`, then this handoff. Integrity
    packet: `docs/plans/active/2026-09-25-adr-0007-wave-8-integrity-packet.md` (gitignored).

## Blockers

- WP-C needs a Codex review and a Chief integrity review before merge, because it changes
  verification controls.

## Next action

- Codex review of WP-C, then Chief integrity review and merge.
- Capsule work found by `project-standalone verify` on 2026-09-25 (the gate stays as it is):
  - `academic/academic-smartboard`: lint fails, two Biome findings in
    `apps/web/src/app/akademik/cakupan/page.tsx` (import order, an aria attribute not supported
    by its role).
  - `internal/prompt`: `run` (`pnpm run start`, the Electron app) never exits, so it times out
    under `smoke.kind: "none"`; install through deployDryRun pass.
  - `product/kediri-history`: build fails with "Invalid environment variables" while collecting
    `/api/graphql-playground` in the extraction.
  - `corporate/portfolio-drnovia` and `internal/unicom` pass every stage.
- Verifier backlog: after a `run` timeout on Windows, cleanup failed with EPERM because child
  processes still held the extraction; `stopManagedProcess` waits only for the top process.
- Backlog outside WP-C: the strict `prisma migrate diff` proof for WP-E; the missing migrations
  for `user`, `session`, `account`, and `verification` (golden-path migration).

## Owner collision

None. `TASK-20260823-REPO-CONTEXT-SYNC` and `TASK-20260826-KEDIRI-CINEMATIC` were moved to
`SUPERSEDED` on Chief's instruction on 2026-09-25, because they blocked WP-G.
