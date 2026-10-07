# HANDOFF

Last updated: 2026-10-08

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not yet published to `drferdi/Sentraverse`. The
homepage is the GSAP neural journey (`components/neural/`, `docs/neural-journey.md`): Codex
baseline `834f6d99`, then this session's commits — tilt and magnet maths `0adef8a8`, portrait
card `88705077` (superseded the same day), pointer wake `afcda086`, the founder's face drawn from
neuron lines and points `4d0866ff`, e2e/docs `9dc2c9a6`, the review fix pass with the face in
chapter 03 `aa1a67ce`, still text and the scrim `a8595851`, darker scrim `c455a20e`, the soft
text halo on the division chapters, and the docs/handoff commit after it. See the 2026-10-08
entry in `DECISIONS.md` for the decisions and rulings.

What the page does now: the face (`public/neural-face.webp` as pixel data, not LFS) appears in
chapter 03 and at the end, right of the text (above it on phones), turns toward the pointer and
brightens near it; the chapter text never moves; the CTA is pulled and grows, buttons lift,
all springing back; a scrim darkens the network under the text from phase 58 to 94.

Gates on this tree: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), `test` 10/10 (node:test, `tactile.test.mjs` + `face.test.mjs`),
`build` 0, `deploy:dry-run` 0. Playwright `e2e/neural.spec.ts` + `e2e/smoke.spec.ts`: 12/12
through the installed Google Chrome (`channel: 'chrome'`, a session-only config override,
deleted) against the production preview on 127.0.0.1:4340. Browser checks of the production
build at 1280×800, 800×500 and 375×812 are recorded in `docs/neural-journey.md` and the
DECISIONS entry.

## Work in flight

None. The last two changes (scrim strength, text halo) were tuned live with Chief; further
taste tuning is single numbers in `journey.module.css` (`.scrim` alpha, the `.division`
text-shadow), `renderer.ts` (`placeFace` alpha/growth/pulse), `tactile.ts` (`facePlacement`)
and `face.ts` (`analyseFace` threshold, dot probability).

## Blockers

None.

## Next action

1. Chief decides whether the face and the contrast are final or wants another tuning round.
2. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
