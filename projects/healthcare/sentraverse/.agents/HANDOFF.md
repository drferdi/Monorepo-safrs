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
text halo on the division chapters `a2345850`, docs `eb64660a`, then the photograph at the end
and the blended centered titles `fb71a429` and the docs/handoff commit after it. See the
2026-10-08 entry in `DECISIONS.md` for the decisions and rulings.

What the page does now: the drawn face (`public/neural-face.webp` as pixel data, not LFS)
appears in chapter 03 and from phase 93 at the end, right of the text (above it on phones),
turns toward the pointer and brightens near it; at the very end the real photograph
(`public/portrait-ferdi.webp`, `next/image`, `[data-photo]`) resolves over the drawn face in
the same box (`tactile.ts` `faceBox`) from phase 95.5 to 98.5 while the drawn face stops
turning; the chapter text never moves; the CTA is pulled and grows, buttons lift, all springing
back; a scrim darkens the network under the text from phase 58 to 94; the division chapters and
the centered titles of chapters 07 and 14 carry a soft text halo, the big titles at 92 % white.
Reading mode and no-JavaScript show the photo in the flow beside the text.

Gates on this tree: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), `test` 11/11 (node:test, `tactile.test.mjs` + `face.test.mjs` + the
route test), `build` 0, `deploy:dry-run` 0. Playwright `e2e/neural.spec.ts` + `e2e/smoke.spec.ts`:
12/12 through the installed Google Chrome (`channel: 'chrome'`, a session-only config override,
deleted) against the production preview on 127.0.0.1:4340. Browser checks of the production
build at 1280×800 (chapters 07, 14, the end at phase 96 and 100, reading mode) and 375×812
(the end at phase 97.5 and 100).

## Work in flight

None. Taste tuning is single numbers in `journey.module.css` (`.scrim` alpha, the `.division`
and `.centered h2` text-shadow and colour, the `.human > .photo` mask stops and `filter`),
`NeuralJourney.tsx` (the photo tween at 95.5 for 3), `renderer.ts` (`placeFace` alpha/growth/
pulse), `tactile.ts` (`facePlacement`) and `face.ts` (`analyseFace` threshold, dot probability).

## Blockers

None.

## Next action

1. Chief decides whether the photograph, the halo and the face are final or wants another
   tuning round. Known quirk: past the pin end on phones with the tall footer the stage scrolls
   up and the photo (like the drawn face) leaves the top of the viewport; the chapter jump and
   the pinned range show it in the band above the text.
2. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
