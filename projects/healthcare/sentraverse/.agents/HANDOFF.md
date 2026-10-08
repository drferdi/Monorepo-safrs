# HANDOFF

Last updated: 2026-10-08 (fifth session of the day, after the low-key grade of the end photograph)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not yet published to `drferdi/Sentraverse`. The
homepage is the GSAP neural journey (`components/neural/`, `docs/neural-journey.md`). Today:
neuron redraw `0c3135ae` + docs `46654a49`; the half-body portrait from Chief and the HUD
callouts `93883c91`, `b99ca859`, docs `f2298e1c`; then Chief asked for a darker, more dramatic
photo ("lebih dramatis, tidak terlalu terang"): grade `1263ffc1`, then the docs commit after
it. See the "2026-10-08 (grade)" and "(portrait)" entries in `DECISIONS.md`.

What the page does now at the end: the drawn figure (chapter 03 and from phase 93) is a
half-body bust grown from `public/neural-face.webp` (480×480, from the same source as the
photo), registered to the landmarks in `faceDepth`/`faceContour`; the photograph
`public/portrait-ferdi.webp` (500×500, transparent background) resolves over it from phase 95.5
to 98.5, graded low-key in `journey.module.css` (brightness .74, contrast 1.26, saturate .55;
masks: vertical fade from 70 %, radial vignette on the face, 95deg falloff from .4 on the left,
`mask-composite: intersect`); from scene time 2.2 three SVG callouts draw in (`callouts.ts`:
anchor dot, elbow, horizontal end, label right of it; attr `stroke-dashoffset` on `pathLength` 1,
CSS glint, off under reduced motion), label font `clamp(7px, 2.3cqi, 10px)` on the photo
container. Reading mode shows the graded photo and the labels still.

Gates on `1263ffc1`: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings), node:test
28/28, `build` 0, `deploy:dry-run` 0, Playwright `e2e/neural.spec.ts` + `e2e/smoke.spec.ts`
16/16 through the installed Chrome (session-only `playwright.chrome.config.ts`, deleted) against
the production preview on 127.0.0.1:4340; frame pacing mean 6.07 ms. Chrome frames (p4) at
phase 30, 96.5, 98.7, 99.6 (1280×800), 30, 99.6 (375×812), 99.6 (1024×768, 768×1024), all webgl,
reveal `complete` from 98.7; the Browser pane shows the graded end scene. The production preview
"sentraverse-tactile" (next start, port 4340) may still be running.

## Work in flight

None. Taste knobs for the end scene: `journey.module.css` photo grade (`brightness(.74)
contrast(1.26) saturate(.55)`, vignette `ellipse 64% 74% at 50% 33%` with stops 40 % / .55 at
70 % / .12, left falloff `95deg` .4 at 8 % to opaque at 50 %), `callouts.ts` (anchor, elbow and
end percents), `NeuralJourney.tsx` (callout start 2.2, step .45, draw .6, label .5, glint .3),
`journey.module.css` (`.lines` stroke #adc4d6 1 px, glint 1.6 px `.08 .92` over 2.8 s, label font
clamp, letter-spacing .14em), `tactile.ts` (desktop scale .55 / 1 / 1.2 at aspect 1.2 / 1.45),
`geometry.ts` (`faceDepth` bulges, `faceContour` reach). The asset recipe (sharp: grayscale,
alpha on black, luminance floor 56, 480 px lossless) lives only in the decision entry; there is
no script in the repo. Neuron knobs as in the redraw entry.

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- `next/image` caches optimized images in `.next/cache/images` by URL, not by content: after
  replacing a `public/` image, delete that folder (or the whole `.next`) before `next start`.
  The Browser pane keeps its own HTTP copy too; a `cache: reload` fetch of the image URL in the
  pane refreshes it.
- Engines without `mask-composite` (Chrome before 120, Safari before 15.4) show the union of the
  three mask layers, so the photo appears almost unvignetted there; the filter still applies.
- Chapter 03 now draws the half-body bust (one source drives drawing and photo); a head-only
  crop there would need a second asset. Ask Chief before changing it.
- The 500 px source is soft above device pixel ratio 1.4 in the desktop box (not viewed on a
  high-density screen). The suit reads as sparse dots at phone density .35.
- In the Browser pane a manual `window.scrollTo` leaves `data-phase` at 0.00; use the chapter
  buttons. The pane throttles when hidden; the Chrome capture scripts are the evidence source.
- Earlier: on phones past the pin end under the tall footer the stage scrolls up and the photo
  leaves the top of the viewport; no-JavaScript on a phone was not checked in a browser.

## Next action

1. Chief judges the graded end scene by eye (darkness, vignette, the left falloff), the callout
   positions and labels, and the chapter 03 bust.
2. Spec points 1 (face parallax shear) and 5 (colour after detail, shoulder fade) wait for the
   word of Chief.
3. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
