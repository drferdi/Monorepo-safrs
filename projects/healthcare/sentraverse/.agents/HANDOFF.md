# HANDOFF

Last updated: 2026-10-09 (fifteenth session, the split)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch` of the monorepo, not pushed, not published to
`drferdi/Sentraverse`. The neural journey now lives in `projects/healthcare/sentraverse-neural`
("2026-10-09 (split)" in `DECISIONS.md`); this capsule is the old landing again (Hero, About,
Ecosystem, Services, ClinicalSuite, BlueprintStory, ScrollGallery and the rest, under
`ScrollTriggerSync` and `SmoothScrollProvider`), plus the story, ecosystem, insights,
sentrapedia, legal and proxy routes.

Gates on the working tree: typecheck 0, eslint 0 (2 pre-existing warnings in
`app/insights/page.tsx`), node:test 2/2, build 0, Playwright `smoke.spec.ts` 3/3 against
`next start` on 127.0.0.1:4341. `deploy:dry-run` not run.

## Work in flight

- Governance docs still describe demo components: `docs/ai-governance.md`,
  `docs/clinical-logic.md`, `docs/data-model.md`, `docs/privacy.md`, `docs/api.md`,
  `docs/adr-001-nextjs-app-router.md`.
- The `stats` import in `app/sentrapedia/page.tsx` is still unused (Codex's litter).
- The ignored working notes for the neural journey (`docs/superpowers/*tactile-portrait*`,
  `*portrait-realism*`, `*neural-realism*`) moved to the new capsule's `docs/superpowers/`.

## Blockers

None. The Jev router at `~/dev/jev/muse-jev-playbook` does not exist on this machine (skipped).

## Known quirks

- Port 4340 may still be held by an older session's `next start`; this session served on 4341.

## Next action

1. Chief: the governance docs above.
2. Push and publish to `drferdi/Sentraverse` when Chief asks.
