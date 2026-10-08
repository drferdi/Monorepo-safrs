# HANDOFF

Last updated: 2026-10-09 (fourteenth session, the GSAP audit and its debt)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not pushed, not published to
`drferdi/Sentraverse`. The morph is committed (`99ce16af`, Chief: "morph go"). On top of it the
GSAP audit's debt is worked off ("2026-10-09 (GSAP debt)" in `DECISIONS.md`): CI runs node:test
over a glob; the film frames live in `public/legacy-film/v1/`, are served immutable and load only
once the story reaches the network chapter; `phaseOf(id)` in `story.ts` feeds the jumps and hash
aliases; the retired photo reveal (file, shader uniforms, tests) is gone; the kinetic nav no
longer sets `gsap.defaults()` globally; the orphaned GSAP components and what only they imported
are deleted; the film pipeline is `scripts/legacy-film/`; the docs describe the journey.

Gates on the working tree: `typecheck` 0, `eslint` 0 (2 pre-existing warnings in
`app/insights/page.tsx`), node:test 44/44, `build` 0, Playwright `neural.spec.ts` +
`smoke.spec.ts` against `next start` on 127.0.0.1:4341 16/16, `Cache-Control` immutable on a
frame, Chrome 375×812 Fast 4G + 4× CPU LCP 1,420 ms / CLS 0 / 0 film frames at load. Local
evidence only; `deploy:dry-run` not run.

## Work in flight

- Non-GSAP files nothing reaches from `app/` (Chief's ruling covered GSAP orphans only):
  `SentraSim` + `sentrasim/*`, `Showcase` + `showcase/*`, `AboutSentra`, `Clients`, `FAQ`,
  `Interlude`, `ProjectSlider`, `ui/sketch-lines`, `ui/text-scramble`. Default if Chief agrees:
  delete them the same way (the scratchpad `orphans.mjs` / `unreached.mjs` method).
- Governance docs still describe deleted demo components: `docs/ai-governance.md`,
  `docs/clinical-logic.md`, `docs/data-model.md`, `docs/privacy.md`, `docs/api.md`,
  `docs/adr-001-nextjs-app-router.md`, and README's "Experience Loop" narrative.
- Verify with `@next/bundle-analyzer` whether `MotionProvider` (framer-motion, `app/layout.tsx`)
  adds weight to `/`, which uses none of it.
- INP is not measured locally; read the field Core Web Vitals in Vercel Speed Insights after
  the next deploy.
- The `stats` import in `app/sentrapedia/page.tsx` is still unused (Codex's litter).

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- Node-tested modules are leaves: no runtime relative imports, so `morph.ts` and `signal.ts`
  take what they need from the journey.
- A re-export of the film goes into a NEW `public/legacy-film/<version>/` (`extract.mjs` refuses
  an existing one) because the frames are cached immutable; then move `FILM.version`, check
  `legacy.film.length`, re-measure `MORPH.face`/`crop`/`hairline` with `measure.mjs`.
- The film loads at `phaseOf('network')`; a jump or hash straight to the legacy passes that
  phase while the scrub catches up, so it loads then.
- A ScrollTrigger refresh with `invalidateOnRefresh` re-renders the master with events
  suppressed: repeat `onUpdate` work in `onRefresh` (done for the status line).
- Node tests: `clearProps` needs the headless no-op plugin; a `fromTo` on a plain object needs
  `immediateRender: false`.
- `next start` for this session runs on 4341 (task started in this session); port 4340 is
  still held by an older session's `next start` (PID 24280, a scratchpad copy).

## Next action

1. Chief: the non-GSAP orphans and the governance docs above (default: delete, then fix docs).
2. Push and publish to `drferdi/Sentraverse` when Chief asks.
