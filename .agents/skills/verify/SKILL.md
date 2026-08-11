---
name: verify
description: Run the SAFRS verification sequence and report evidence before declaring work complete, opening a PR, or closing a repository session.
---

# Verify before done

Follow root and nearest nested `AGENTS.md` files. Evidence before assertions.

## Sequence

1. Run package-scoped tests and type checks for every touched package.
2. Run `pnpm governance`.
3. Run `pnpm check:tokens`.
4. Run `pnpm lint`.
5. Run `pnpm typecheck`.
6. Run `pnpm test`.
7. Run `pnpm build`.
8. Run `pnpm test:e2e` only for browser-visible changes.
9. Run `bash scripts/safrs-verify.sh` before completion.

`pnpm check` combines steps 2–7. Stop on a regression caused by the current change.
Report known pre-existing failures separately; never weaken a gate to obtain a pass.

## Session close

Review the diff, overwrite `.agents/HANDOFF.md` under approximately 1,000 tokens,
append durable decisions only when needed, and update `.agents/PROGRESS.md` only when
an area status changed. Report `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` as a review
requirement, not a formatting error.
