# HANDOFF

Last updated: 2026-10-08

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not yet published to `drferdi/Sentraverse`. The
homepage is the GSAP neural journey (`components/neural/`, `docs/neural-journey.md`): Codex
baseline `834f6d99`, then the tactile work in separate commits — tilt and magnet maths
`0adef8a8`, portrait card `88705077` (superseded the same day), pointer wake `afcda086`, the
founder's face drawn from neuron lines and points `4d0866ff`, and the e2e/docs/handoff commit
after it. `public/neural-face.webp` is pixel data only (240 px grayscale, not LFS); the old
`portrait-ferdi.webp` and `Portrait.tsx` are deleted. See the 2026-10-08 entry in `DECISIONS.md`.

Gates on this tree: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), `test` 13/13 (node:test, now including `tactile.test.mjs` and
`face.test.mjs`), `build` 0, `deploy:dry-run` 0. Playwright `e2e/neural.spec.ts` +
`e2e/smoke.spec.ts`: 11/11 through the installed Google Chrome (`channel: 'chrome'`, a
session-only config override, deleted) against the production preview on 127.0.0.1:4340.
Browser checks of the production build at 1280×800, 800×500 and 375×812: face right of the
final chapter text (above it on phones), turns with the pointer and brightens near it, panels
tilt and spring back, CTA pulled and released, reading mode clean, no horizontal overflow.

## Work in flight

None.

## Blockers

None.

## Next action

1. Chief looks at the final chapter in the browser and decides on tuning (face brightness,
   size, turn amount, dot density) — all are single numbers in `renderer.ts` `faceView` /
   the `face` draw and `face.ts` `analyseFace`.
2. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
