# HANDOFF

Last updated: 2026-10-05 (MedBoard is the default sign-in; presence heartbeat for ACARS; "Asisten
Medis" name. Earlier, 2026-10-04: visit summary template, signers, one welcome sound, archive.)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

- 2026-10-05 commits: `2e682e22` "Ghost Protocols" → "Asisten Medis" in comments and the
  `login.html` title; `65f715c1` presence: `sendPresence` (cookie session only), alarm
  `sentra-presence` every 30 s from `background.ts`, offline call on logout, the side panel's
  online-doctor count from `getOnlineDoctors` (60 s); `0b5cd564` (auth, Chief approved)
  `DEFAULT_AUTH_BASE_URL` = MedBoard; an empty address saved in Settings = Mode Lokal; a local
  session stored earlier stays local until logout; `99bfcca1` MedBoard host is
  `medboard.sentrahai.com` (crew.puskesmasbalowerti.com retired), manifest host permission too.
  That host serves no MedBoard yet (Vercel "DEPLOYMENT_NOT_FOUND", 2026-10-05), so sign-in fails
  until the VPS is live; do not release this build before then.
- The real sign-in is `ConsoleLogin` in the side panel (new test: it shows MedBoard's refusal).
  `entrypoints/login` is the unused legacy popup ("Sentra Assist" logo); only e2e opens it, and its
  windows on Chief's screen looked like an older design. Left as is.
- Visit summary PDF, signers, sound, header, `archieved/`: see DECISIONS 2026-10-04.
- Open: in `login.html` the stored session is empty right after sign-in, so its logout never calls
  the server (dugaan whether older than today; the side panel path not checked); production cookie
  forwarding to MedBoard (`SameSite=None; Secure`) not checked, localhost only. Earlier open items:
  standard-start rules for vitamin B komplek, tiamin, zink, tambah darah, nistatin, griseofulvin;
  T-10 MIRA per-session token; dependency prune; MedLens `any` suppressions; chronic quantity rule;
  Dependabot 2 high on AsistenMedis; R3 held files (`lib/emergency-detector/index.ts`,
  `gate2-workflow.ts`, `ttv-inference.ts`, `lib/clinical/dosage-database.ts`); `LICENSE` terms.

Branch `feat/sidepanel-ui-batch`, not pushed; a push is Chief's call (merge `asistenmedis/main`,
push the capsule subtree). Another session's uncommitted `lib/api/sentra-api.ts`, its test,
`tests/e2e/zz-verify-kb-rx.spec.ts` (lint red), `docs/brand/` and root `.agents/HANDOFF.md` are not
this session's.

## Verification (final tree, 2026-10-05, after `0b5cd564`)

tsc 0 · vitest 0 (203 files, 1779 passed, 17 skipped) · eslint 0 without
`zz-verify-kb-rx.spec.ts` (full lint 1, its 4 `no-console`) · e2e 20 passed (auth-bridge-local,
extension-smoke, clinical-trajectory-preview, epuskesmas-synthetic) · production
`node scripts/pnpm.mjs run build` into `.output\chrome-mv3-dev`, last. Red first: auth-client
default-address tests, Settings tests, presence heartbeat tests.

## Next action

1. Chief reloads the extension from `.output\chrome-mv3-dev` and signs in with an approved
   MedBoard account; checks ACARS on MedBoard.
2. Deploy order with MedBoard: this build (has `b2592f0b`) before MedBoard `6eb89e69`.
