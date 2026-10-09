# HANDOFF

Last updated: 2026-10-06 (audit remediation. Earlier, 2026-10-05: MedBoard default sign-in,
presence heartbeat, "Asisten Medis" name.)

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

## Verification (2026-10-06, audit remediation, after `915e588c`)

tsc 0 · vitest 0 (1862 passed, 17 skipped) · e2e 21 passed · dev build 0 · run:check 0 ·
production build 0, last · eslint: only the 4 `no-console` in another session's
`zz-verify-kb-rx.spec.ts`. Red first for every change (mutation for the qSOFA and KB pins).

## Next action

1. Gaffer reloads `.output\chrome-mv3-dev` and transfers one synthetic visit to RME; with that
   patient's tab closed the panel must say "Halaman pasien entri ini tidak terbuka".
2. Gaffer's decisions, plan Part C: engine authority text, PHI in storage.local, CI location,
   trajectory from one visit, dependency prune, `calculateDosage`, KB confidence tier, version.
3. Deploy order with MedBoard: this build (has `b2592f0b`) before MedBoard `6eb89e69`.
