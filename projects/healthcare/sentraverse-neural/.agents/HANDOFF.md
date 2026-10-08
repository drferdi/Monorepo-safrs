# HANDOFF

Last updated: 2026-10-09 (the "one living organism" motion system)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Developed on branch `feat/sidepanel-ui-batch` of the monorepo (not yet snapshotted to
drferdi/Sentraverse-N). This session implemented the brief
`docs/superpowers/plans/2026-10-09-one-living-visual-organism.md` from the plan `...-implementation.md`
(local working notes) in 12 commits, `fe4162ae..HEAD`:
- motion signatures per phase;
- a restrained stage camera;
- one carrier handed from chapter to chapter (`handoff.ts`);
- the network-to-constellation reveal (`ringSeat`, `GATHER`, `RECEDE`, `reveal`);
- the opening words by meaning (`revealHero`);
- the neural-trace progress line;
- pointer node glow and micro-label;
- `inert` off-screen chapters and the server-rendered year;
- `robots.txt` and Organization JSON-LD.

The knobs are listed in `docs/neural-journey.md`, "One living organism".

Gates (fresh build, `next start` on 127.0.0.1:4347):
- typecheck 0, eslint 0, node:test 54/54, build 0, deploy dry-run 0;
- Playwright 22/22;
- network frame pacing 30–32 ms mean measured alone (50 ms when run in parallel with the suite).

## Work in flight

- Chief reviews the look in the Browser pane: the flagship (phase 60–66), the carrier, and the
  opening words.
- INP and LCP from field data after the first deploy (the opening words wait at .08 opacity until
  ready).

## Blockers

The deploy target (Vercel project, domain) waits for Chief. Canonical, sitemap and the Open Graph
image wait for the domain.

## Known quirks

- `quickSetter(el, 'scale')` is a silent no-op in GSAP (alias); use scaleX/scaleY setters.
- A stylesheet transform on an element GSAP translates is read back as pixels; keep such elements
  transform-free in CSS (`.head`).
- `node scripts/pnpm.mjs exec playwright test -g "a b|c"` loses quoting through the shell; use
  `node node_modules/@playwright/test/cli.js test -g "..."`.
- A stale `next start` from an earlier session held 127.0.0.1:4346 (PID 39072); this session
  verified on 4347 and left 4346 alone.
- Phones: the outer constellation clusters sit partly outside the frame (as the network did
  before).
- Earlier quirks still hold:
  - A re-export of the film needs a new `legacy-film/<version>/` folder.
  - Node-tested modules are leaves.
  - Under a ScrollTrigger refresh, repeat the `onUpdate` work in `onRefresh`.

## Next action

1. Chief: judge the flagship and the carrier by eye. Rule on the SENTRAVERSE timing (DECISIONS).
2. Chief: the deploy target and domain, then canonical, sitemap and the OG image.
3. Snapshot the capsule to drferdi/Sentraverse-N when Chief says so.
