# HANDOFF

Last updated: 2026-10-09 (twelfth session, the film as a frame sequence)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, committed (the film-chapter commit on top of
`99920ee3`, Chief's "git commit" of 2026-10-09), not pushed, not published to `drferdi/Sentraverse`. The final chapter (15/15, phases 94–100) is "THE LEGACY" as the film
chapter ("2026-10-09 (film chapter)" + "2026-10-09 (frame sequence)" in `DECISIONS.md`): after
the SENTRA chapter the neural field dissolves straight into Chief's film (no drawn face between),
which stands large (near native, capped by the stage) over a void, shows exactly the scroll
position's frame (GSAP image sequence: `film.ts` draws one of 120 WebP frames at 12 fps into a
canvas from the master's clock tween), holds its last frame, and carries the legacy typography.
The photograph, the 2.5D gate, the play-chase `<video>` and the drawn-face reveal are retired;
the still poster is the film's last frame. See the ending bullet of `docs/neural-journey.md`.

Changed since `99920ee3`: `components/neural/film.ts` + `film.test.mjs` (new),
`LegacyScene.tsx`, `legacy.module.css` (new); `timeline.ts` + test (`MASTER_DURATION` 131.5, the
`legacy` knobs, `MasterOptions.film`, `legacyScene` with the dissolve, film and legacy beats,
`settleLegacy`), `story.ts`, `tactile.ts`, `renderer.ts` (no face after 93), `NeuralJourney.tsx`
(creates the film player on the cinematic build), `journey.module.css`, `package.json` (test
list), `e2e/neural.spec.ts`, `e2e/smoke.spec.ts`, `docs/neural-journey.md`; deleted
`callouts.ts` + test; `legacy.ts`, `legacy.test.mjs` and `public/legacy-ferdi.mp4` created and
removed inside this branch; `portrait-reveal.ts` and `portraitState` are committed code now
unused (left in place); added `public/legacy-film/` (120 frames + poster, 5.5 MB). No new
dependency.

Gates on the working tree: `typecheck` 0, `eslint` 0 (2 pre-existing warnings in
`app/insights/page.tsx`), node:test 38/38, `build` 0, Playwright `neural.spec.ts` +
`smoke.spec.ts` against `next start` on 127.0.0.1:4341 15/15, Chrome frames (headless
`channel: 'chrome'`, 1280×800 and 375×812, phases 93.5–100) with no console error but the known
local `/_vercel/speed-insights` 404, and a Chrome scroll pass 95.5 → 99.3 → 96 with every sampled
frame within 1 of the phase's. Local evidence only; `deploy:dry-run` not run.

## Work in flight

- Chief's verdict on the frames (scratchpad `film3/`). The clip still carries the `clideo.com`
  watermark, cropped by the box's 832/1016 aspect; a re-export without it goes through the
  scratchpad `extract.mjs` (Chrome, `--allow-file-access-from-files`) into `public/legacy-film/`
  with `FILM` in `film.ts` and `legacy.film.length` updated.
- Taste knobs: `legacy` (`presence`, `void`, `covered`, `film.at/in/alpha/play/end/length`, the
  text beats), `FILM` (`frames`, `fps`; the WebP quality is the extractor's argument, .72 now),
  and in `legacy.module.css` `.film` (`--fx` 63 % / 50 %, `--film-h`, the mask, the grade
  `brightness(.6) contrast(1.05) saturate(.55)`).
- The `stats` import in `app/sentrapedia/page.tsx` is still unused (Codex's litter).
- Scratchpad scripts: `capture.mjs` (frames, `VARIANT_CSS` hook), `filmscrub.mjs` (frame vs
  phase over a scroll pass), `extract.mjs`.

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- The frames load from the build's start, six at a time; a frame asked for before it arrives is
  stood in for by the nearest loaded one (`nearestLoaded`), so a slow connection shows a coarser
  scrub, never a blank. Under reduced motion no frame is fetched.
- Never put the clip back as a `<video>`: it has a single keyframe (a seek costs up to ~220 ms)
  and Chief rejected a play-chase as not following the scroll.
- A ScrollTrigger refresh with `invalidateOnRefresh` reverts the master and re-renders it with
  events suppressed: repeat `onUpdate` work in `onRefresh` (done for the status line).
- Node tests: `clearProps` needs the headless no-op plugin; a nested scene at exactly its time 0
  is not rendered.
- The Browser pane leaves `data-phase` at 0.00 on a manual `scrollTo`; judge frames in real
  Chrome by the pin-spacer maths.
- A stale `next start` may hold port 4341; stop it before a rebuild (TaskStop on this session's
  own task works, `taskkill` is denied). Port 4340 is held by an older session's `next start`
  (PID 24280); the preview config `sentraverse-legacy` in `medboard/.claude/launch.json`
  attaches to 4341 instead.

## Next action

1. Chief's verdict on the frame-sequence chapter.
2. Push and publish to `drferdi/Sentraverse` when Chief asks, then the sentrapedia items carried
   over (`/api/*` named in the API modal do not exist here).
