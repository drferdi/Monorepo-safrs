# HANDOFF

## 2026-10-18 - Contract remote (Claude)

- `TASK-20261018-HEALTHCARE-CONTRACT-REMOTES`: `project.contract.json` declares `repository` `git@github.com:drferdi/Sentraverse-N.git` (the `sentraverse-n` root remote; the README GitHub link). Read by the root `check_capsule_remotes.py`; no lifecycle change.

## 2026-10-11 - Site public, durable Vera limit (Claude)

- Gaffer approved making the site public: Vercel `sentraverseii` `ssoProtection` changed from `all_except_custom_domains` to `prod_deployment_urls_and_all_previews`. `https://sentraverseii.vercel.app/` returns 200; deployment URLs still require Vercel login (302).
- A Vercel Firewall rate-limit rule (10/IP/hour on `/api/vera/chat`) failed twice via API with "Seawall Config not found" and was dropped; the WAF window is at most 1 hour anyway.
- Gaffer installed Upstash Redis from the Vercel Marketplace (env `KV_REST_API_URL`, `KV_REST_API_TOKEN`, Production + Preview). New `app/api/vera/chat/limit.ts`: 10 messages per visitor per 24 h counted in Upstash over its REST pipeline (`SET NX EX`, `INCR`, `TTL`) with plain `fetch` (no new dependency); the key is a SHA-256 prefix of the IP, never the raw IP; 2 s timeout; falls back to the old per-instance memory count when the store is missing or unreachable. `route.ts` uses it; `Retry-After` is the remaining TTL.
- Verified: new `limit.test.mjs` RED first, then 4/4; `npm test` 59/59 (script now also runs `app/**/*.test.mjs`); typecheck 0; eslint on `app/api/vera/chat/` 0; build 0. Not yet verified live (needs publish and real Dify messages).

## 2026-10-11 - Vera widget hardened and verified (Claude)

- Gaffer approved committing and publishing the Vera widget with a limit of 10 messages per person. `POST /api/vera/chat` now allows 10 messages per client IP per 24 hours (in-memory, best-effort: a cold start or another serverless instance resets the count), caps questions at 1,000 characters (413), returns 429 with `Retry-After`, and no longer forwards Dify error text or names `.env.local` to the browser.
- Contract updated: `AGENTS.md` risk R1 -> R2 with the route described; `project.contract.json` risk R2 plus an optional Dify service dependency (`DIFY_API_KEY`).
- Verified: typecheck 0, lint 0, test 55/55, build 0 (route dynamic), deploy:dry-run PASS. Local production server with `DIFY_API_URL` pointed at a closed local port (no Dify calls): messages 1-10 reached the upstream step, message 11 returned 429, a 1,001-character question returned 413, and the widget banner showed the limit message.
- Design aligned with Sentrapedia's Vera on Gaffer's request: dark panel with soft neumorphism, plain official Sentraverse logo with a time-based English greeting, "Vera · Sentraverse" pill, right-aligned user bubbles, copy and sources actions (no like/dislike: there is no feedback endpoint), raised composer with `/` suggestions and a round send button, logo launcher. Inline SVG icons (no new dependency). Checked desktop and mobile in a local production server; a sent message showed the generic unavailable state.
- Published 2026-10-11: drferdi/Sentraverse-N `main` = `a8aab8d4` (snapshot on top of GitHub main, README v2.1 kept). Gaffer set `DIFY_API_KEY` (sensitive, Production) in Vercel `sentraverseii`, redeployed (`dpl_46XbJVZPKAN4VYkvqGcfvJ2P6hZk`, READY), and confirmed a live Vera answer works. A durable cross-instance limit would need a shared store (for example Vercel KV), which is a new service and not added.

## 2026-10-11 - Existing Vera changes recorded (Codex metadata only)

- Gaffer authorized registry/handoff cleanup. Observed existing changes in `app/layout.tsx` and `app/globals.css`, plus untracked `components/VeraNeuralWidget.tsx` and `app/api/vera/chat/route.ts`: layout mounts the widget, styles support it, and the POST route streams from Dify using deployment environment configuration.
- No application code changed by this metadata task. Existing owner `TASK-20260927-HEALTHCARE-MIGRATION` remains in the shared registry; this entry records the working tree, not application approval or authorship.
- Gates: handoff, registry ownership and lifecycle PASS / exit 0. Full root governance FAIL / exit 1 at stale integrity-review evidence for the combined branch. Application typecheck, lint, tests, build and live-provider behavior NOT RUN for these existing changes. No inference requests or environment values read.
- Risks / next tasks: review the added external-provider/API behavior against the older no-API contract below, then run capsule-local checks before application approval or publication. No deploy authorized.

Last updated: 2026-10-09 (the "one living organism" motion system)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Developed on branch `feat/sidepanel-ui-batch` of the monorepo (not yet snapshotted to
drferdi/Sentraverse-N). This session implemented the brief
`docs/superpowers/plans/2026-10-09-one-living-visual-organism.md` from the plan `...-implementation.md`
(local working notes) in 16 commits, `893e0c0d..HEAD`:
- motion signatures per phase;
- a restrained stage camera;
- one carrier handed from chapter to chapter (`handoff.ts`);
- the network-to-constellation reveal (`ringSeat`, `GATHER`, `RECEDE`, `reveal`);
- the opening words by meaning (`revealHero`);
- the neural-trace progress line;
- pointer node glow and micro-label;
- `inert` off-screen chapters;
- `robots.txt` and Organization JSON-LD;
- after Gaffer's "glitch" report and the final review: a division's marker and copy now start drawn
  back (they flashed in full with the panel on the first pass down), links from kept outer neurons
  fold instead of scratching across the frame, the micro-label forgets on scroll, and the h1 comes
  up by itself if the scripts never start.

The knobs are listed in `docs/neural-journey.md`, "One living organism".

Gates (fresh build, `next start` on 127.0.0.1:4347):
- typecheck 0, eslint 0, node:test 55/55, build 0, deploy dry-run 0;
- Playwright 24/24;
- network frame pacing 30–32 ms mean measured alone (50 ms when run in parallel with the suite).

## Work in flight

- Gaffer reviews the look in the Browser pane: the flagship (phase 60–66), the carrier, and the
  opening words.
- INP and LCP from field data after the first deploy (the opening words wait at .08 opacity until
  ready).

## Blockers

The deploy target (Vercel project, domain) waits for Gaffer. Canonical, sitemap and the Open Graph
image wait for the domain.

## Known quirks

- `quickSetter(el, 'scale')` is a silent no-op in GSAP (alias); use scaleX/scaleY setters.
- A stylesheet transform on an element GSAP translates is read back as pixels; keep such elements
  transform-free in CSS (`.head`).
- `node scripts/pnpm.mjs exec playwright test -g "a b|c"` loses quoting through the shell; use
  `node node_modules/@playwright/test/cli.js test -g "..."`.
- A `next start` from an earlier session may hold 127.0.0.1:4346; verify on another port
  (`PORT=4347` for Playwright) and leave it alone.
- Phones: the outer constellation clusters sit partly outside the frame (as the network did
  before).
- A `fromTo` with `immediateRender: false` does not render before its start: set the start state
  at build, or the element shows in full until the playhead reaches it.
- Earlier quirks still hold:
  - A re-export of the film needs a new `legacy-film/<version>/` folder.
  - Node-tested modules are leaves.
  - Under a ScrollTrigger refresh, repeat the `onUpdate` work in `onRefresh`.

## Next action

1. Gaffer: judge the flagship and the carrier by eye. Rule on the SENTRAVERSE timing (DECISIONS).
2. Gaffer: the deploy target and domain, then canonical, sitemap and the OG image.
3. Snapshot the capsule to drferdi/Sentraverse-N when Gaffer says so.
