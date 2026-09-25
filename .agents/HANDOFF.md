# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (Kilo GPT-5.6 Sol, branch `integration/jev-active`)

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

## Open items

- Cursor adds capsule-local token gates and `next`/`sharp` patches for sentrabot and golden-path.
- First origin CI run for `check:security`.
- `pnpm dev` proof once Docker runs.

## Owner collision

None.
