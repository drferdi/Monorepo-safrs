# HANDOFF

Last updated: 2026-10-08 (seventh session of the day, the sentrapedia build repair)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not pushed, not published to
`drferdi/Sentraverse`. After the dramatic-ending work, Codex landed four sentrapedia commits
(`e55523ac`, `2700f65e`, `eab37de3`, `1d567c1f`: the agent node graph, the Multi-AI section
and API modal, the video intro splash, the Audrey wording). `2700f65e` re-pointed the page's
import to `@/lib/data`, a module this capsule never had, so `next build` failed with
"Module not found: Can't resolve '@/lib/data'"; the typecheck also showed the page passing
`onOpenApiModal` to the shared `Navbar` (no props), and lint failed on the splash's
`setState` inside an effect.

Fixed in `13e00e54`: the import points back at `components/sentrapedia/data.ts` (the real,
tracked data: 14 categories, 144 SKDI 4A diseases, sources, methodology; no new module), the
Navbar prop is dropped (the API modal keeps its own "Lihat Contoh Kode Integrasi" button), and
the splash's seen flag is read through `useSyncExternalStore` (server snapshot "not seen").
See "2026-10-08 (sentrapedia)" in `DECISIONS.md`.

Gates on `13e00e54`: `typecheck` 0, `lint` 0 (two pre-existing `img` warnings in
`app/insights/page.tsx`), node:test 38/38, `build` 0 (`/sentrapedia` prerendered static),
`deploy:dry-run` 0. Browser check of the production build (`next start` on 127.0.0.1:4341,
stopped afterwards): the splash plays, "Masuk ke Sentrapedia" sets the session flag and fades
the overlay, the page lists 144 entries across 14 domains with the four methodology phases
and the Kemenkes sources, a return visit hides the splash after hydration, no hydration
error in the console (only the local `/_vercel/speed-insights` 404). Playwright `test:e2e`
was not run this session.

## Work in flight

- The `stats` import in `app/sentrapedia/page.tsx` is unused (the hero hardcodes 144 / 14 /
  5 / < 20 ms); no gate flags it. Codex's litter, left in place.
- A stale `next start` from an earlier session may still hold 127.0.0.1:4340; it serves an
  older build. Chief's `next dev` on port 3000 was not touched (it was not answering).
- The neural-journey taste knobs for Chief's eye (develop, scan, reticle, scramble, title
  masks) are unchanged from the sixth session; the list lives in "2026-10-08 (ending)" in
  `DECISIONS.md` and `docs/neural-journey.md`.

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- `next/image` caches optimized images in `.next/cache/images` by URL; after replacing a
  `public/` image delete that folder before `next start`. The Browser pane keeps its own copy.
- In Node the GSAP `attr` plugin and ScrambleText need `headless: true` copies (see
  `timeline.test.mjs`); a nested scene at exactly its time 0 is not rendered, sample at +.01.
- Never `clearProps: 'all'` on an element whose inline style React owns (the callout labels'
  `left/top`). `settleEnding` names its props.
- Titles are split once per matchMedia build; only the 768 px crossing re-splits.
- In the Browser pane a manual `window.scrollTo` leaves `data-phase` at 0.00; use the chapter
  buttons. While the pane is hidden, requestAnimationFrame ticks slowly, so framer-motion
  exits (the splash fade) take seconds; judge timing in real Chrome.
- The build log warns that the Edge Runtime is deprecated (the `/api/*` routes);
  pre-existing.

## Next action

1. Chief judges the sentrapedia page by eye (splash, node graph, Multi-AI cards, API modal)
   and the neural-journey ending items carried over.
2. Decide whether `/api/agent-query`, `/api/diseases` and `/api/categories` named in the API
   modal should exist in this capsule (they do not; the modal documents them as live).
3. Publish to `drferdi/Sentraverse` (subtree split) when Chief asks; the Vercel root re-point
   and the README publish from 2026-09-27 are still pending.
