# HANDOFF

Last updated: 2026-10-09 (thirteenth session, the morph)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo. The film chapter is committed as `9bb4fc70`
(not pushed, not published to `drferdi/Sentraverse`); on top of it, uncommitted, is the morph
("2026-10-09 (morph)" in `DECISIONS.md`): at the end of THE LEGACY (99.05 → 99.9), over the
film's held last frame, the left side of the founder's face as seen (Chief's call over the first
build's near side) becomes neural tissue, scrubbed by the scroll and alive at rest. `morph.ts` draws it into `<canvas data-film-morph>` over the film
from `face.ts`'s analysis of the frame's face crop; the signals are a repeating GSAP timeline.
See the ending bullet of `docs/neural-journey.md`.

Changed since `9bb4fc70`: `components/neural/morph.ts` + `morph.test.mjs` (new), `timeline.ts`
+ test (`legacy.morph`, `MasterOptions.morph`, the morph beat), `NeuralJourney.tsx` (builds the
morph from the last frame, ticks it past `covered`), `LegacyScene.tsx` (the second canvas),
`legacy.module.css` (no grade on it), `e2e/neural.spec.ts`, `package.json` (test list),
`docs/neural-journey.md`. No new dependency.

Gates on the working tree: `typecheck` 0, `eslint` 0 (2 pre-existing warnings in
`app/insights/page.tsx`), node:test 44/44, `build` 0, Playwright `neural.spec.ts` +
`smoke.spec.ts` against `next start` on 127.0.0.1:4341 15/15, Chrome frames of the film box at
2× (99.4 and 100, 1280×800 and 375×812) with the living layer changing at rest, a scroll pass
through the morph with rAF gaps of mean 6.7 / p95 12.1 / worst 78.9 ms (desktop) and 6.5 / 6.2 /
30.2 ms (phone), and no console error but the known local `/_vercel/speed-insights` 404. Local evidence only; `deploy:dry-run` not run.

## Work in flight

- Chief's verdict on the left-side morph (scratchpad `morph3/`; `morph2/` is the near side). Taste knobs: `MORPH` in `morph.ts` (the
  face ellipse, the cut's `side`/`to`/`width`/`wave`, somas, axons, lanes), `legacy.morph` in
  `timeline.ts` (when), the analysis density in `NeuralJourney.tsx` (.4 / .25), and the colours
  and alphas inside `drawStill`/`composite`.
- The clip still carries the `clideo.com` watermark, cropped by the box; a re-export goes through
  the scratchpad `extract.mjs` into `public/legacy-film/` with `FILM` and `legacy.film.length`
  updated, and `MORPH.face`/`crop` re-measured on the new last frame (scratchpad `grid.mjs`,
  `analyse.mjs`).
- The `stats` import in `app/sentrapedia/page.tsx` is still unused (Codex's litter).
- Scratchpad scripts: `capture.mjs`, `filmscrub.mjs`, `filmrefresh.mjs`, `extract.mjs`,
  `grid.mjs`, `analyse.mjs`, `morphzoom.mjs`, `morphpace.mjs`.
- The e2e asserts the morph's progress (`data-morph`), not the canvas's pixels over the face;
  a `getImageData` sample over the ellipse would be the claim-level test (follow-up).

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- Node-tested modules are leaves: no runtime relative imports (Node cannot resolve `./face`
  without an extension), so `morph.ts` takes the analysis and the frame size from the journey.
- The morph canvas shares the `.film canvas` rules (mask, cover, hidden outside cinematic) and
  overrides only the grade; the e2e selects `canvas[data-film-canvas]` and `canvas[data-film-morph]`
  by attribute, never `canvas` alone.
- The frames load from the build's start, six at a time; a frame asked for before it arrives is
  stood in for by the nearest loaded one. Under reduced motion neither the frames nor the morph
  are built.
- Never put the clip back as a `<video>`: one keyframe, and Chief rejected a play-chase.
- A ScrollTrigger refresh with `invalidateOnRefresh` reverts the master and re-renders it with
  events suppressed: repeat `onUpdate` work in `onRefresh` (done for the status line).
- Node tests: `clearProps` needs the headless no-op plugin; a nested scene at exactly its time 0
  is not rendered; a `fromTo` on a plain object needs `immediateRender: false` or it renders at
  build.
- The Browser pane leaves `data-phase` at 0.00 on a manual `scrollTo`; judge frames in real
  Chrome by the pin-spacer maths.
- A stale `next start` may hold port 4341; stop it before a rebuild (TaskStop on this session's
  own task works, `taskkill` is denied). Port 4340 is held by an older session's `next start`
  (PID 24280); the preview config `sentraverse-legacy` in `medboard/.claude/launch.json`
  attaches to 4341 instead.

## Next action

1. Chief's verdict on the morph; commit it when Chief asks.
2. Push and publish to `drferdi/Sentraverse` when Chief asks, then the sentrapedia items carried
   over (`/api/*` named in the API modal do not exist here).
