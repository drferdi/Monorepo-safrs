# HANDOFF

Last updated: 2026-10-08 (second session of the day)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not yet published to `drferdi/Sentraverse`. The
homepage is the GSAP neural journey (`components/neural/`, `docs/neural-journey.md`): Codex
baseline `834f6d99`, the tactile/face/photo session up to `fb71a429` + docs `33a9ab9e` (see the
first 2026-10-08 entry in `DECISIONS.md`), then Codex's "portrait realism" change of the same
day, found uncommitted in the checkout and finished, gated and committed by this session as
`cf742bb7` (code) plus the docs commit after it. See the "2026-10-08 (later)" entry in
`DECISIONS.md` for the decisions, the visible rulings and the evidence.

What the page does now, on top of the earlier state: the drawn face has a real relief
(`geometry.ts` `faceDepth`, calibrated by hand, not brightness-as-depth) and grows from the
facial features outward (`faceContour`); from phase 94.25 to 95.5 it settles flat onto the photo
plane and its pointer turn fades (`tactile.ts` `portraitState`); from 95.5 to 98.5 the real
photograph resolves nose, eyes and lips first through a canvas mask built from the same contour
field (`portrait-reveal.ts`, `<canvas data-photo-reveal>` inside `[data-photo]`,
`[data-reveal]` = `active` / `complete`), while the drawn vertices fade where the skin has
resolved. Pointer turn is now ±0.085 rad (chapter-03 sway ±0.045). Reading mode, reduced motion
and no-JavaScript keep the plain `next/image`.

Gates on `cf742bb7`: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), `test` 14/14 (node:test), `build` 0, `deploy:dry-run` 0. Playwright
`e2e/neural.spec.ts` + `e2e/smoke.spec.ts`: 14/14 through the installed Google Chrome
(session-only `playwright.chrome.config.ts`, deleted) against the production preview on
127.0.0.1:4340. Browser checks of the production build: 1280×800 (phase 96.5 mid-reveal, 98.7
full photo, chapter 03), 375×812 (96.5, 98.7, reading mode), 768×1024 (97), 800×500 (98.7).
`public/` unchanged. The production preview "sentraverse-tactile" (next start, port 4340) may
still be running.

## Work in flight

None. Taste knobs: `renderer.ts` (turn `.085`, sway `.045`, vertex fade `.94`), `tactile.ts`
`portraitState` (relief lock 94.25 → 95.5, reveal 95.5 → 98.5), `geometry.ts` `faceDepth`
bulges and `faceContour` reaches, `faceDissolve` window `.16`, `portrait-reveal.ts` mask size
192 / 180 steps, `journey.module.css` (`.human > .photo` mask and filter, `.scrim`, halos).

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Next action

1. Chief judges the new relief, the feature-first reveal and the smaller pointer turn by eye.
2. Known, Chief's call: on a 768×1024 portrait tablet the opaque photo's left edge overlaps the
   end of the description line (`facePlacement` scale .7 for aspect < 1.2, or a narrower text
   block there). Earlier known quirk still stands: on phones past the pin end under the tall
   footer the stage scrolls up and the photo leaves the top of the viewport.
3. Not checked this session: no-JavaScript on a phone in the browser (Playwright covers it at
   desktop size).
4. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
