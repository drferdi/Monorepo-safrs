# HANDOFF

Last updated: 2026-10-08 (third session of the day)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not yet published to `drferdi/Sentraverse`. The
homepage is the GSAP neural journey (`components/neural/`, `docs/neural-journey.md`). Today's
chain: Codex's portrait realism finished and committed as `cf742bb7` + docs `b19cfa12`, the
portrait-tablet face scale `79652787`, handoff `3040e7f5`, then points 2–4 of the neural-realism
spec on Chief's approval: `9e7b0a6c` (SWC-shaped tapered neurons drawn as strands, with
normals), `3d42f121` (key, rim, occlusion, impulse-only specular, focus plane), `8d91b089` (a
GSAP-timed activity cycle through six network lanes, `main[data-signal]`), plus the docs commit
after it. See the "2026-10-08 (realism)" entry in `DECISIONS.md` for the rulings.

What the page does now, on top of the earlier state: every neuron grows from `makeMorphology`
(soma, 6–9 basal trunks, one apical, one axon ending in vesicle particles; Rall 3/2 branching,
taper to 35 %, parallel strands for thickness); the neuron and network layers are lit (ambient
.6, key .55, rim .35, occlusion floor .7, specular only under pulse or activity, far tissue
softened by a focus plane); in the synapse-to-network window (phase 49–94) `signal.ts` runs
impulse → terminal flash → release → next-lane response through the five hubs and the centre,
tempo and peaks re-rolled per repeat. Reduced motion parks the cycle at the first terminal;
Canvas 2D draws no particles; unlit layers look as before.

Gates on `8d91b089`: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), `test` 24/24 (node:test), `build` 0, `deploy:dry-run` 0. Playwright
`e2e/neural.spec.ts` + `e2e/smoke.spec.ts`: 15/15 through the installed Google Chrome
(session-only `playwright.chrome.config.ts`, deleted) against the production preview on
127.0.0.1:4340; pacing mean 6.6 ms. Browser checks of the production build: pane 800×500 and
375×812 (`data-renderer` webgl, `data-signal` active at phase 67.5), Chrome 1280×800 and
375×812 frames at phase 22 (hero neuron) and 67.5 (activity), 2× clips around the top hub.
`public/` unchanged. The production preview "sentraverse-tactile" (next start, port 4340) may
still be running.

## Work in flight

None. Taste knobs: `geometry.ts` (strand pitch .012, taper .65, soma colour .35, trunk counts
and radii in `makeMorphology`), `renderer.ts` (ambient .6, key .55, rim .35, occlusion floor
.7, specular .9, coc /6, activity mix .85, response .9, particle travel .35), `signal.ts`
(`laneOffset` .45, `stageAt`, tempo .8–1.25, peak .6–1, window 49–94), scrim 60 %.

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- In the Browser pane a manual `window.scrollTo` into the pin leaves `main[data-phase]` at
  0.00 and `data-signal` paused while the canvas shows the chapter; the chapter buttons
  ("Go to …") update both. Use the buttons for checks.
- The chapter-02 hero neuron has far fewer line vertices than before the spec (3,872 lines and
  2,455 points at density .85, against 17,930 and 3,178 on `79652787`) and reads thinner and
  dimmer; the strand weight and the occlusion floor recovered part of it. Chief judges by eye.
- At full viewport the network activity is subtle under the 60 % scrim; the magnified clips
  show it. Phones (density .35, half the strands) look dark in the network chapter.
- Earlier: on phones past the pin end under the tall footer the stage scrolls up and the photo
  leaves the top of the viewport; no-JavaScript on a phone was not checked in a browser.

## Next action

1. Chief judges by eye: the tapered neurons, the lighting, the activity cycle, the thinner hero
   neuron and the dark phone network; knobs above.
2. Spec points 1 (face parallax shear) and 5 (colour after detail, shoulder fade) wait for
   Chief's word.
3. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
