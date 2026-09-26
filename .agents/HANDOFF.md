# HANDOFF — Monorepo control plane

Last updated: 2026-09-26 (Cursor, branch `docs/golden-path-context`; previous entry Kilo GPT-5.6 Sol,
branch `integration/jev-active`)

## Latest change (Cursor)

- `main` `01587ee3` merged `integration/capsules-standalone`: sentrabot and golden-path pass standalone
  verify, have capsule-local token gates and security patches, and left known non-conformance.
- Branch `docs/golden-path-context` (task `TASK-20260925-GOLDEN-PATH-CONTEXT-DOC-2`, R1):
  `docs/context/active/golden-path.context.md` now describes golden-path as a standalone capsule with
  local package snapshots, not a root demonstrator (commit `e6c11659`).
- Same branch, task `TASK-20260926-AGENTS-SHELL-QUIRKS` (R2): root `AGENTS.md` gains two notes (RTK `git`
  wrapper and CRLF-only worktree noise; pnpm 9 ignores `pnpm-workspace.yaml` overrides). `AGENTS.md` is a
  verification control, so this commit carries no implementation change.

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- `main` is `5901a8d3`, including the merge of `integration/post-adr-0007-4`; its `pnpm governance`
  baseline passed.
- `integration/jev-active` is based on that exact main and contains the cherry-picked Jev activation
  (`.kilo/instructions/jev-active.md`, `.kilo/kilo.jsonc`), the root `AGENTS.md` active decision layer,
  and the current integration claim.
- `JEV-ACTIVE-INTEGRATION` is R2, `EXECUTING`, owned by `agent:kilo:gpt-5.6-sol` / `Kilo GPT-5.6 Sol`,
  with scopes `AGENTS.md`, `.agents/HANDOFF.md`, `.kilo/instructions/`, and `.kilo/kilo.jsonc`.

## Pre-activation observations

- The local Jev playbook is ignored; one official TypeSafe skill copy is present.
- Five kill-switch dry runs returned `proceed_full` with `jev_used: false`.
- Live routing returned `jev_used: true`; observed outcomes include `allow_subagent`, `proceed_full`,
  and `stop_retry`.
- The decision log baseline had 13 lines. These are pre-activation observations governed by active
  mode now, not proof of 20–50-decision accuracy.

## Review and handoff

- `stash@{0}` was intentionally untouched and conflicts with active mode; Chief may drop it only after
  this branch is merged.
- Because `AGENTS.md` is a verification control and `.kilo/*` is implementation, the expected
  integrity-review record is Chief-only. Final verification evidence belongs here once available.
- Verification evidence: `git diff --name-status 5901a8d3...HEAD` lists exactly the four requested
  files; `git diff --check` exited 0. `pnpm governance` exited 1 only because the expected integrity
  gate reported `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required`; all preceding governance checks passed.
- The Python and PowerShell/`sha256sum` fingerprints match:
  `0eb4fb47e59a658a71f6c526a989134638a116b0b3eff97917798ab45eea3636`.

## Open items

- Done (`01587ee3`): capsule-local token gates and `next`/`sharp` patches for sentrabot and golden-path.
  Sentrabot's gate is a per-file ratchet over 1268 legacy raw values; migrating them is open UI work.
- First origin CI run for `check:security`.
- `pnpm dev` proof once Docker runs.

## Owner collision

None.
