Title: feat: card-index cabinet beside the sign-in and sign-up card, Clerk-styled card, auth/sync refactor

## What this carries

Split `75518917` of the capsule, which descends from the last published split `06f26a0d`. Thirteen commits that `main` never took, in three groups:

1. **The auth figure (R1).** The sign-in, sign-up and apply pages get a card-index cabinet beside the form card: 24 drawers filed alphabetically, one per `kategori` of the knowledge SSOT, 335 entries, one drawn card per eight. A tour slides a drawer out and raises its cards; hover selects a drawer; `prefers-reduced-motion` leaves it shut. Server-rendered SVG, one small client component, `aria-hidden`, nothing focusable, the form stays first in the DOM. The card is side by side with the figure from 640px and takes Clerk's look (rounded, ring, soft shadow) while the widget keeps its native fields and buttons. `src/lib/anatomy/` vendors the anatomy kit (MIT, licence included).
2. **Auth and sync refactor (R1).** `errorResponse` shared by `access.ts` and `/api/sync`; `store.ts` takes its types from `contract.ts`. Behaviour unchanged, 93/93 auth and sync tests before and after.
3. **Already on beta by hand, now in code (R2, `bb870efa`).** `deploy/beta/update.sh` passes the Clerk publishable key as a `--build-arg` and refuses to start without the Clerk variables; the zod bump to 4.6.7 (`ac6de554`) and the HANDOFF records.

## Proof

- Full vitest 52 files / 569 tests, `tsc --noEmit` 0, eslint 0 errors.
- `tests/cabinet-figure.test.ts` holds the figure's category table to `theoracle/ssot/sentrapedia-knowledge-ssot.json`.
- The anatomy skill's `lines.mjs`: `line ends: 0`. Motion proved headlessly with `drive.mjs` (tour, hover, reduced motion).
- Split checks: descends from `06f26a0d` PASS; tree equals the capsule tree PASS; 0 LFS-filtered files changed; `merge-tree` against `main` has no conflict. No key, token or connection string in the added lines.

## Not verified

The real Clerk form inside the restyled card was not seen: there are no Clerk keys locally. Check `/sign-in` on beta after the image is built.

## Merge

**Merge commit only, never squash or rebase**, so the subtree-split chain stays intact; the next split must descend from `75518917`. Do not merge until Gaffer says so.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
