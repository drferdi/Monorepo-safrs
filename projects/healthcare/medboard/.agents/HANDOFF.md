# HANDOFF

Last updated: 2026-10-05

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

`lint` (tsc), `test:capsule` (intelligence-route 228, safety-net 29/29, CDSS 26/26, NEWS2 28/28,
Symphony 6/6), `build` and `deploy:dry-run` are green. Branch `feat/sidepanel-ui-batch`, not pushed;
MedBoard has no remote.

Chief's direction (2026-10-04): MedBoard's own diagnosis engine is retired; MIRA in Med-Assist
provides the differential. `LEGACY_CDSS_ENGINE_ENABLED` (off when unset) brings it back.

This session (MedBoard commits): `de22eb08` build traces from the capsule, CI uses the pinned
pnpm; `3279be63` bridge entry status guard and path-like ids rejected; `79ed70ae` consult retry
dedupe by `event_id` (per process); `8bdbec0c` SBP trajectory bands follow NEWS2, missing AVPU stays
missing, three unwired tests now run; `e9d5beed` momentum sees falling BP/temperature/glucose and the
shock pattern; `6eb89e69` (R3) engine retired behind the flag, `mira_differential` accepted and
shown (telemedicine card, dashboard 'mira' source, EMR button disabled); `ddf8706d` card tokens;
`5e9053da` MIRA card on `/emr` (incoming banner and accepted-consult panel), card moved to
`src/components/telemedicine`. Browser pane check (2026-10-05, local dev server, no database,
synthetic consult): button disabled with the notice, card on both pages.
Med-Assist side: see its `DECISIONS.md` 2026-10-04 "MedBoard session" entry.

2026-10-05 styling (Chief): `ef28a942` EMR alerts lose the colour blocks (2px severity rule,
severity word, dash list); `5d0259fe` IBM Plex Sans everywhere on the Carbon scale (see
DECISIONS). Gates after `5d0259fe`: lint, test:capsule, build, deploy:dry-run green.

`/verify` (after `6e9be024`): red but not from these commits: `pnpm governance` (other session's
uncommitted root `HANDOFF.md` and Med-Assist `sentra-api.ts`; integrity review required by
`med-assist/AGENTS.md` from `9918e69d`), `pnpm lint` (Biome in `tools/automation/**`, same as
`main`), `pnpm test` (no PostgreSQL on 127.0.0.1:54329).

## Work in flight

Local demo server (`medboard-demo`, 127.0.0.1:4345, dev, no database) is running for Chief. On
stop: remove the entry from `med-assist/.claude/launch.json`, delete scratchpad `mb-demo/`
secrets, `git restore next-env.d.ts`, delete `runtime/consult-accepted.jsonl`.

## Blockers

- `railway.toml` change was refused by auto mode (production deploy): builder RAILPACK, drop the
  `nodejs_22` Nixpacks pin, `buildCommand = "pnpm run build:railway"`, `startCommand = "pnpm exec
  prisma migrate deploy && pnpm run start"`. Chief applies it; watch the first Railpack deploy.

## Next action

1. Chief: `railway.toml` (above); push (`CHIEF_PUSH_OK`); whether to squash `320ac1af` (wrong
   message, fixed by `ff303c12`).
2. Open clinical items (R3, Chief's call): ePuskesmas kesadaran → ACVPU mapping; Med-Assist TTV
   state defaults AVPU to 'A' (unrecorded = alert); Med-Assist CORE deterioration score still
   averages over all seven vitals (absent = 0.1), which moves its 70/50 cutoffs; sepsis, PE (Wells)
   and momentum unit fixes from the rule research are not done.
3. MIRA follow-ups: `ConsultLog` has no column, so a consult loaded from `/api/consult/pending`
   carries no differential (needs a migration — Chief's approval); MIRA cannot be called from the
   MedBoard server (production mode, shared token, loopback).
4. The `/emr` assessment workspace copy still says "jalankan Iskandar"; the accepted-consult grid
   overflows a pane narrower than about 1050 px (pre-existing, not caused by the card).
5. Deploy order: release the Med-Assist build with `b2592f0b` before MedBoard `6eb89e69` reaches
   Railway, or set `LEGACY_CDSS_ENGINE_ENABLED=true` there until it is out; older Assist builds send
   no `mira_differential`. `deploy:dry-run` re-run after the last commit: passes.
6. Docs still describing the engine as live: `README.md`, `SECURITY.md`, `docs/AI_GOVERNANCE.md`.
7. Pre-existing: telemedicine page uses `--text-primary` and `--border-subtle`, which no stylesheet
   defines; `consult-dedupe` is per process.
8. Typography leftovers: inline `letterSpacing` literals (up to 0.22em) were not normalised, only
   the `--ls-*` tokens; `src/lib/report` (print) and email templates keep their own sizes.
