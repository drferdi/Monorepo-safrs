# HANDOFF

Last updated: 2026-09-29 (night: "stuck loading MIRA" fixed - production build again, native host
re-registered for the current extension ID; earlier: e2e on Google Chrome, Tatalaksana→ePuskesmas)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## MIRA fix (2026-09-29 night)

- Cause 1 (verified): the rebuild Chief asked for used `wxt build --mode development`, which bakes
  `parseDiagnosisEngineMode` to `return "legacy"`: MIRA was never called, the page showed the
  legacy "Data belum cukup". Fixed by `node scripts/pnpm.mjs run build` (production:
  `.env.production.local` / Vite define → `mira`); the fold is gone from `background.js`.
  **The build Chief tests is always `run build`, run last** (DECISIONS 2026-09-29).
- Cause 2 (verified): the native host `com.sentra.mira` allowed only
  `oeiclacedioeocjijdopioolfdbnbjgf`; Chrome's Default profile loads the build as
  `bhcffleclpadneocndhembhjbemimhkm` (ID from the path), so `connectNative` answered "Access to
  the specified native messaging host is forbidden." Re-ran `install_host.ps1 -ExtensionId
  bhcffleclpadneocndhembhjbemimhkm`.
- Check (verified, Chrome via Playwright, no diagnosis run so no model call): host answers
  `running`, `/healthz` 200, `sentra:mira-status` = ready. MIRA stays up on 8787.
- Inferred (MIRA repo, not changed): after that Chrome closed, the host did not stop the service;
  the uv venv `python.exe` is a redirector, so the host waits on a parent that never exits.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** Three test commits on
top of `de49a2d5` (main): `48ef1011`, `8707bc66`, `193b0a75`. No product code changed; the
extension build is the same as this morning's (Tatalaksana timeline cards, Edukasi swipe deck,
"Kontrol <interval>", Safety net timeline: see DECISIONS 2026-09-29).

- `tests/e2e/chrome-extension-launch.ts`: Chrome 154 (no Playwright Chromium on this machine),
  extension loaded through `Extensions.loadUnpacked` (DECISIONS 2026-09-29, e2e on Chrome).
- New e2e `epuskesmas-synthetic.spec.ts` "fills what the side panel sends for the whole
  Tatalaksana …": payload `tests/e2e/side-panel-tatalaksana-transfer.ts` (J02, Amoksisilin
  kapsul/kaplet 500 mg 3x1, one education point, "Kontrol 2 minggu") → Anamnesa[edukasi],
  Anamnesa[rencana_tindakan], diagnosa_id/nama, resep row 0. The RME page is the active tab while
  the extension sends (my reading of Chief's "harus on the same side with RME page", unconfirmed).
  `ClinicalDifferential.rme-transfer.e2e.test.tsx` asserts the side panel still sends that payload.
- Migrated (named in `8707bc66`): resep e2e dokter/perawat now the payload's names (961b1963);
  trajectory e2e headline Indonesian (ba789530).

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 181 files passed, 1 skipped; 1463 passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |
| `test:e2e` | 0 | 15 passed (two full runs after the last change; spec `--repeat-each=6`: 30 passed) |

Red first: without the two anamnesa textareas the step came back "partial"; fixture set to
"Kontrol 1 minggu" turns the Vitest join red. One earlier full run failed once in the new test's
resep step: "A listener indicated an asynchronous response by returning true, but the message
channel closed before a response was received" (errorClass fatal, no retry); not reproduced in
~40 later runs. Root cause unknown.

Not tested: the real ePuskesmas site (Claude in Chrome was not connected, checked three times),
live MIRA, the real Sentra prescription API, real DDInter.

## Open for Chief (code must not change for these)

1. Live ePuskesmas test: needs Claude in Chrome connected in Chief's Chrome (signed in to
   ePuskesmas, "Asisten Medis" loaded) and a test patient's anamnesa page open. Default when it
   is: I read the fields before and after, Chief clicks "Isi otomatis RME", nobody clicks Simpan;
   first check that the page does not autosave on input.
2. Resep risk seen in the synthetic run: a medicine name the ePuskesmas autocomplete does not
   offer makes the resep step time out (2 x 30 s) with nothing filled. Stock names are assumed to
   match ePuskesmas's list (both "Sistem Inventori Puskesmas"); unverified on the real site.
3. Terapi proposals remote-only (R3). 4. DDI mechanisms from the curated table (~20 pairs).
5. KB `red_flags` for J20 are complications (R3 data). 6. R3 sign-off `lib/clinical/recurrent-diagnosis.*`.
7. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`. 8. Capsule `AGENTS.md` "LLM is a
   reranker only". 9. "Berubah setelah:" may grow long. 10. Stock file is a snapshot (2026-01-30).
11. Dose table `standardDose.ts` sign-off. 12. Class allergies (penisilin → amoksisilin) need a
   clinical class table (R3). 13. Kontrol intervals and 3-day default are my assumption;
   `DiseaseNote.followUp` parsed but unused; `.dx-tx-safety-list` rules in style.css unused.

## Next action

Chief reloads "Asisten Medis" and opens a case: header dot green, MIRA diagnosis. Then the live
ePuskesmas test (open item 1) once Claude in Chrome is connected.
