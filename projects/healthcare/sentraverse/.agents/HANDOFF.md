# HANDOFF

Last updated: 2026-10-08 (sixth session of the day, after the dramatic ending)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not pushed, not published to
`drferdi/Sentraverse`. Today after the grade: the task "Make the Sentraverse neural journey
ending more dramatic (GSAP)" in three local commits — `899705ae` (the master timeline in
`components/neural/timeline.ts`, `labelToScroll` jumps, the 100-unit guard), `bdd4cefb` (Scan →
Develop → Lock-on over the portrait, labels decode with ScrambleText), `ae21fe7b` (SplitText
title reveals, the tempo dwells), the docs commit `eda88d20`, then `2b298200` (the ending's
teardown clears only what it tweened, so the callout labels keep their places across a
breakpoint crossing; a flaw older than the task, found in the Browser pane, where the viewport
had read 0×0 for a moment) and the docs commit after it. See "2026-10-08 (ending)" in
`DECISIONS.md` and `docs/neural-journey.md`.

Gates on `ae21fe7b` and again on `2b298200`: `typecheck` 0, `lint` 0 (two pre-existing `img`
warnings), node:test 38/38,
`build` 0, `deploy:dry-run` 0, Playwright `e2e/neural.spec.ts` + `e2e/smoke.spec.ts` 16/16
through the installed Chrome (session-only `playwright.chrome.config.ts`, deleted) against the
production preview on 127.0.0.1:4340; frame pacing mean 6.07 ms. Chrome frames at phase 28.6,
30, 60.4, 62, 66.6, 68, 96.5, 97.5, 98.7, 99.6 (1280×800), 30 and 99.6 (375×812), 99.6 (1024×768,
768×1024), all webgl, reveal `complete` from 98.7; they live in the session scratchpad
(Playwright empties `test-results/`). The preview `next start` on port 4340 may still be running.

## Work in flight

None. Taste knobs, in phases unless noted:
- `timeline.ts` `ending`: develop start 1.02 / .92 / .22 (the finals .74 / 1.26 / .55 are CSS on
  `.human > .photo`), scan fade .25, lock lead .2, reticle draw .35 / stagger .05, settle .45 at
  .35 with `wiggle(3)` to scale 1.05, callouts from .25 in .27 steps (dot .25, line .4, label .45
  at +.2, glint .2 at +.4), scramble hex / speed .4 / delay .12, flash at 1.4 (peak .5).
- `timeline.ts` `tempo` (dwells 25–40, 58–66, 94–100; travel unchanged) and the title reveal
  (`yPercent` 110, duration 1, stagger .12; centered chars `amount: .6, from: 'center'`).
- `callouts.ts` `reticle` (2.5 % around the head, arm 5); `journey.module.css` `.scan`
  (hairline, glow, 9 % trail), `.flash` (radial, screen blend), `.reticle path` (1.3 px).
- Earlier knobs (photo masks, callout geometry, neuron drawing) as in the previous entries.

What Chief should judge by eye at 1280×800: the develop (does the photo starting brighter and
colder read as developing, or should it start closer to the final: B 1.1 / .85 / .12 or
C .95 / 1 / .35); the scan hairline (thin with a short trail, or heavier); the reticle size
(2.5 % margin; tighter crowds the hair, looser meets the first callout line); the scramble (hex
characters at speed .4; binary or the alphabet would read differently); the title masks
(descenders are clipped only mid-slide, by design).

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- `next/image` caches optimized images in `.next/cache/images` by URL; after replacing a
  `public/` image delete that folder before `next start`. The Browser pane keeps its own copy
  (a `cache: reload` fetch refreshes it).
- In Node the GSAP `attr` plugin and ScrambleText need `headless: true` copies (see
  `timeline.test.mjs`); a nested scene at exactly its time 0 is not rendered, sample at +.01.
- SplitText with `tag: 'span'` sets no display and collapsed the lines; keep the default `div`
  wrappers and the `> span` scoping of the block rule in `journey.module.css`.
- Never `clearProps: 'all'` on an element whose inline style React owns (the callout labels'
  `left/top`): React does not re-apply it on the next build. `settleEnding` names its props.
- Titles are split once per matchMedia build (no `autoSplit`, by the task): a resize inside a
  breakpoint keeps the build-time line split; only the 768 px crossing re-splits.
- In the Browser pane a manual `window.scrollTo` leaves `data-phase` at 0.00; use the chapter
  buttons. The Chrome capture scripts are the evidence source.
- Engines without `mask-composite` show the union of the photo masks; on phones past the pin
  end the photo scrolls off the top under the tall footer; no-JavaScript on a phone unchecked.

## Next action

1. Chief judges the ending and the title reveals by eye (the list above) and the earlier open
   items (grade, callout positions, the chapter 03 bust).
2. Spec points 1 and 5 wait for the word of Chief; scroll snap, velocity, audio and MorphSVG
   were out of scope.
3. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
