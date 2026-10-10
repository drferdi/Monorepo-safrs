# HANDOFF

Last updated: 2026-10-06 (background error flood on chrome://extensions silenced. Earlier,
2026-10-05: MedBoard default sign-in, presence heartbeat, "Asisten Medis" name.)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

- 2026-10-06 audit remediation (Cursor audit, verified; plan
  `docs/plans/2026-10-06-audit-remediation-plan.md`). Commits: `8d0ecec7` + `5d1784c8` panel RME
  transfer binds to the pelayanan the page names (live URLs end in `?from=pelayanan&action=edit`,
  which `content.ts` did not read before), refuses with PATIENT_MISMATCH otherwise; `c9c5c280` +
  `016e2ae1` `release:check` (refuses while VITE_MIRA_DEV_TOKEN is in the bundle; today's build:
  yes, 2 files; `--allow-dev-token` for Gaffer's own build); `fb6973aa` docs; `17102c3d`
  Tatalaksana says why no medication shows; R3 with Gaffer's go: `68769af4` qSOFA edges, `fa4cf4d0`
  + `915e588c` NEWS2 Scale 2 scores >=93 % on air as 0 (was 1-3 for COPD), `892db79a` KB ratchet
  (75 without diagnosis_banding, 107 without structured_criteria), `992286c7` CDSS audit log only
  after anonymisation passed.
- `06981fa6` (Gaffer's screenshot): an empty KSPR card ("Data tidak ditemukan.") is no pregnancy
  risk; "risiko terdeteksi" header line removed (protected `TTVInferenceUI.tsx`, Gaffer's request),
  a real risk shows only in the note below the select; columns measured equal in the harness
  (`.superpowers/harness`, launch "stats-harness", port 5180).
- Why no medication: therapy comes only from the KB (2026-10-01); 34 of its 130 ICD codes have no
  therapy (e.g. J45, A15, G43, J01, J44, N12, I21, H52) and diagnoses outside the KB get none.
  Filling them is Gaffer's clinical content (R3 `penyakit.json`).

- 2026-10-06 (uncommitted): Chrome lists every service-worker `console.error`/`console.warn` on
  `chrome://extensions`. The bridge poll (every 30 s) against the unreachable MedBoard host logged
  `log.error` in `authed-fetch.ts` plus `log.warn` in `bridge-poller.ts` each time. Now: network,
  timeout and HTTP failures in `authedFetch`/`authedUpload` and `auth-client` `authFetch` log at
  `debug` (errors still thrown/returned to the UI unchanged); poll backoff logs `debug`; rejected
  bridge token logs `warn` once (was `error`); `background.ts` forwards of `pageReady` and
  `visitHistoryScraped` to a closed side panel (`NO_RECEIVER`) log `debug`. Untouched: scan/fill/
  CDSS handlers, `audit-service.ts`, invalid-JSON log (`authed-fetch.ts` `parseJsonResponse`).
  New tests in `authed-fetch.test.ts` and `bridge-poller.test.ts`.
  Second pass (Gaffer's screenshot, all yellow warnings): `ClinicalTrajectory.tsx` trace logs
  (incl. the full riwayat scrape dump with visit ids/dates/vitals) and the canonical-engine
  fallback now log `debug`; success/info messages in `lib/rag/icd10-db.ts`, `icd10-loader.ts`,
  `audit-service.ts` "Initialized" now `debug`; `lib/iskandar-diagnosis-engine/audit-logger.ts`
  Initialized/Logged/Cleared now `debug` (R3 path, log level only, Gaffer approved 2026-10-06).
  Content script: `content.ts` "Diagnosa fill request received" and the autocomplete retry
  messages in `lib/filler/filler-core.ts` now `debug` (final failures still returned/logged);
  so are `fillNumberField` "Element NOT FOUND" and the text-fill "Skipped readonly"/"Skipped
  CSRF field" messages, whose failures are already in the fill result.
  Canonical engine disabled (Gaffer's choice, 2026-10-06): `evaluateCanonicalClinicalEngine` in
  `bridge-client.ts` throws `CanonicalEngineUnavailableError` before any request
  (`CANONICAL_CLINICAL_ENGINE_ENABLED = false`); `TTVInferenceUI.tsx` treats that error as a
  silent fallback (one condition added, render unchanged). Reason: `buildCanonicalTriageInput`
  (R3) sends rm/name/dob/kelurahan, which the PII guard rejects (`PIILeakError`), and MedBoard has
  no `/api/clinical/engine/evaluate` route. Re-enable only after the payload is de-identified
  (hash `patient_id`, drop identity fields, `request_id` without RM) and MedBoard ships the route.

- 2026-10-05 commits: `2e682e22` "Ghost Protocols" → "Asisten Medis" in comments and the
  `login.html` title; `65f715c1` presence: `sendPresence` (cookie session only), alarm
  `sentra-presence` every 30 s from `background.ts`, offline call on logout, the side panel's
  online-doctor count from `getOnlineDoctors` (60 s); `0b5cd564` (auth, Gaffer approved)
  `DEFAULT_AUTH_BASE_URL` = MedBoard; an empty address saved in Settings = Mode Lokal; a local
  session stored earlier stays local until logout; `99bfcca1` MedBoard host is
  `medboard.sentrahai.com` (crew.puskesmasbalowerti.com retired), manifest host permission too.
  That host serves no MedBoard yet (Vercel "DEPLOYMENT_NOT_FOUND", 2026-10-05), so sign-in fails
  until the VPS is live; do not release this build before then (`release:check` must pass).
- The real sign-in is `ConsoleLogin` in the side panel (new test: it shows MedBoard's refusal).
  `entrypoints/login` is the unused legacy popup ("Sentra Assist" logo); only e2e opens it, and its
  windows on Gaffer's screen looked like an older design. Left as is.
- Visit summary PDF, signers, sound, header, `archieved/`: see DECISIONS 2026-10-04.
- Open: in `login.html` the stored session is empty right after sign-in, so its logout never calls
  the server (dugaan whether older than today; the side panel path not checked); production cookie
  forwarding to MedBoard (`SameSite=None; Secure`) not checked, localhost only. Earlier open items:
  standard-start rules for vitamin B komplek, tiamin, zink, tambah darah, nistatin, griseofulvin;
  T-10 MIRA per-session token; dependency prune; MedLens `any` suppressions; chronic quantity rule;
  Dependabot 2 high on AsistenMedis; R3 held files (`lib/emergency-detector/index.ts`,
  `gate2-workflow.ts`, `ttv-inference.ts`, `lib/clinical/dosage-database.ts`); `LICENSE` terms.

Branch `feat/sidepanel-ui-batch`, not pushed; a push is Gaffer's call (merge `asistenmedis/main`,
push the capsule subtree). Another session's uncommitted `lib/api/sentra-api.ts`, its test,
`tests/e2e/zz-verify-kb-rx.spec.ts` (lint red), `docs/brand/` and root `.agents/HANDOFF.md` are not
this session's.

## Verification (2026-10-06, after the error-silencing change)

tsc 0 · vitest 0 (203 files, 1783 passed, 17 skipped) · eslint: only the 4 `no-console` in
another session's `zz-verify-kb-rx.spec.ts` (unchanged baseline) · build 0 into
`.output\chrome-mv3-dev` · run:check 0. e2e not rerun.

## Next action

1. Gaffer hard-reloads the extension from `.output\chrome-mv3-dev`, clicks "Clear all" on its
   errors page, waits 2-3 minutes with the side panel closed; the error count should stay at 0.
   Then signs in with an approved MedBoard account; checks ACARS on MedBoard.
2. Deploy order with MedBoard: this build (has `b2592f0b`) before MedBoard `6eb89e69`.
