# HANDOFF

Last updated: 2026-10-08 (third session of the day, after the neuron redraw)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not yet published to `drferdi/Sentraverse`. The
homepage is the GSAP neural journey (`components/neural/`, `docs/neural-journey.md`). Today's
chain: Codex's portrait realism finished as `cf742bb7` + docs `b19cfa12`, the portrait-tablet
face scale `79652787`, handoff `3040e7f5`, spec points 2–4 (`9e7b0a6c` morphology, `3d42f121`
lighting, `8d91b089` activity cycle, docs `deaf5585`), then Chief rejected the strand-drawn
neuron ("jelek", "fokus pada realistic dan dramatic visual") and the redraw landed as
`0c3135ae` plus the docs commit after it. See the "2026-10-08 (redraw)" entry in `DECISIONS.md`.

What the page does now: every neuron grows from `makeMorphology` (soma, 6–9 basal trunks, one
apical, one axon with vesicle particles; Rall 3/2 splits plus one or two collaterals per chain,
taper to .7 of the chain root, persistent random-walk headings, 345 chains on the hero). It is
drawn as a core line per compartment plus, on neurons of size .5 and up, a sheath of soft
sprites sized by the shaft radius (`SHEATH_RADIUS` .008, +50 tag flag, `u_height` in the
shader) with spines at desktop density, and a soma of membrane dots at .38 over faint body
sprites with a warm amber nucleus. The neuron and network layers are lit (ambient .6, key .55,
rim .35, occlusion floor .7, specular under pulse or activity, focus plane); `signal.ts` runs
impulse → terminal flash → release → response through six lanes in phase 49–94.

Gates on `0c3135ae`: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), node:test 25/25, `build` 0, `deploy:dry-run` 0. Playwright
`e2e/neural.spec.ts` + `e2e/smoke.spec.ts`: 15/15 through the installed Google Chrome
(session-only `playwright.chrome.config.ts`, deleted) against the production preview on
127.0.0.1:4340; frame pacing mean 6.45 ms, p95 6.2 ms. Chrome frames of the production build at
phase 12, 22, 45, 55, 67.5 (1280×800) and 22, 67.5 (375×812), a 2× soma zoom, and the pane at
phase 20.5, all `data-renderer` webgl. `public/` unchanged. The production preview
"sentraverse-tactile" (next start, port 4340) may still be running.

## Work in flight

None. Taste knobs: `geometry.ts` (`SHEATH_RADIUS` .008, sheath spacing 1 radius / min .015,
sprite width 2.8× in `renderer.ts`, membrane .38, body .07, nucleus .5 and .2 r, spine reach and
size, taper .3, collateral share .18–.32 and odds .85 / .6, wobble .3 with .8 persistence, step
.13 × size), `renderer.ts` (ambient .6, key .55, rim .35, occlusion floor .7, specular .9, coc /6,
activity mix .85, response .9, particle travel .35, sheath clamp 120 px), `signal.ts`
(`laneOffset` .45, `stageAt`, tempo .8–1.25, peak .6–1, window 49–94), scrim 60 %.

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- In the Browser pane a manual `window.scrollTo` into the pin leaves `main[data-phase]` at
  0.00 and `data-signal` paused while the canvas shows the chapter; the chapter buttons
  ("Go to …") update both. Use the buttons for checks.
- At full viewport the network activity is subtle under the 60 % scrim; magnified clips show
  it. The soma's membrane dots read as a speckled halo at 2× (a granular look, by design).
- The 14 scale-.055 neurons in the synapse swarm are small white blobs: their 1,445 membrane
  dots keep a fixed pixel size and stack inside a 3 px radius (as before the redraw).
- Earlier: on phones past the pin end under the tall footer the stage scrolls up and the photo
  leaves the top of the viewport; no-JavaScript on a phone was not checked in a browser.

## Next action

1. Chief judges the redrawn neuron by eye (hero, daughters, hubs, phone); knobs above.
2. Spec points 1 (face parallax shear) and 5 (colour after detail, shoulder fade) wait for
   Chief's word.
3. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
