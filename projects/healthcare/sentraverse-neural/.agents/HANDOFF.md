# HANDOFF

Last updated: 2026-10-09 (first session, the split out of `sentraverse`)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Developed on branch `feat/sidepanel-ui-batch` of the monorepo. Its own repository is
https://github.com/drferdi/Sentraverse-N (private; Chief named it on 2026-10-09), branch `main`.
PNG is a plain blob, not Git LFS (Vercel clones without LFS). The journey, the film (`public/legacy-film/v1/`, 120 frames) and
the morph came over unchanged; links to the rest of Sentra point at sentrahai.com. Registered
in `projects/healthcare/AGENTS.md` and `README.md`.

Gates: typecheck 0, eslint 0, node:test 42/42, build 0, deploy dry-run passed, Playwright 15/15
against `next start` on 127.0.0.1:4346. Visual parity with the journey before the split: 18
frames, mean difference <= 0.14, <= 0.15% changed pixels (only the living animation).

## Work in flight

- INP is not measured locally; read the field Core Web Vitals after the first deploy.
- `docs/superpowers/` holds the ignored working notes that came over from `sentraverse`.

## Blockers

The deploy target (Vercel project, domain) waits for Chief.

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

## Next action

1. Chief: the deploy target (Vercel project, domain).
2. After the first deploy, read the field Core Web Vitals (INP above all).
