---
name: verify
description: Run the SAFRS verification sequence for this monorepo and report evidence before any work is declared complete. Use when finishing a task, opening a PR, or claiming gates are green.
disable-model-invocation: true
---

# Verify before done

Evidence before assertions. Never claim a gate is green without pasting the command
and its output.

## Sequence

Run in this order and stop at the first failure caused by the current change set:

1. `pnpm governance`
2. `pnpm check:tokens`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`
7. `pnpm test:e2e` — only when a browser-visible surface changed

`pnpm check` chains steps 1–6. Also run package-scoped tests for every touched package
(`pnpm --filter <package> test`, `pnpm --filter <package> typecheck`).

## Interpreting failures

- Separate pre-existing red gates (see `.agents/HANDOFF.md`) from failures you introduced.
- `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` means controls and implementation changed together — split or get independent review.
- Never weaken tests, token gates, or governance to force a pass.

## Session close

Overwrite `.agents/HANDOFF.md` before declaring done.
