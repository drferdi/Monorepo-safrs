---
name: verify
description: Run the SAFRS verification sequence for this monorepo and report the evidence before any work is declared complete.
disable-model-invocation: true
---

# Verify before done

Evidence before assertions. Never claim a gate is green without pasting the command
and its output.

## Sequence

Run in this order and stop at the first failure that is caused by the current change set:

1. `pnpm governance` — SAFRS checks (routing, policy, handoff, sensitive-change
   classification, tool inventory, topology, action pinning). On Windows this dispatches
   `scripts/safrs-verify.ps1`; on Linux and macOS, `scripts/safrs-verify.sh`.
2. `pnpm check:tokens` — raw-value scan plus WCAG 2.2 AA contrast recomputation.
3. `pnpm lint` — Biome.
4. `pnpm typecheck` — Turborepo fan-out.
5. `pnpm test` — contracts and runtime.
6. `pnpm build` — Turborepo build.
7. `pnpm test:e2e` — only when a browser-visible surface changed.

`pnpm check` chains steps 1–6 in one command; run it when the whole set is expected green.
Add the package-scoped tests for every touched package
(`pnpm --filter <package> test`, `pnpm --filter <package> typecheck`).

## Interpreting failures

- Separate **pre-existing red gates** from failures your change introduced. Check
  `.agents/HANDOFF.md` for known-red areas, and report them separately instead of
  fixing them silently outside your task scope.
- `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` means verification controls and
  implementation changed in the same change set. That is a governance signal, not a
  formatting problem: split the change set or obtain independent review.
- `SAFRS_CLASSIFICATION_UNAVAILABLE` means the change set could not be established.
  Fix the git state; do not assume the lowest risk tier.

## Prohibited

Never weaken a test, token gate, security check, or governance control to make the
sequence pass. Never skip a gate and report the run as complete.

## Session close

Review the diff, then overwrite the `HANDOFF.md` of every scope the change set touches and keep
each under about 1,000 tokens. Capsule work updates `projects/<domain>/<capsule>/.agents/HANDOFF.md`
and appends capsule-only decisions to that `DECISIONS.md`; root `.agents/` is only for
control-plane work (root tooling, governance, CI, `packages/`, cross-capsule orchestration).
`tools/safrs/check_handoff.py` enforces this.
