# HANDOFF

Last updated: 2026-10-02 (chronic doses from the riwayat Resep table, no triad warning; the RME resep picks each medication from its ePuskesmas suggestion and
presses Tambah once per row; 2026-10-01: the signa chosen from its suggestion, "3x sehari" as 3x1;
2026-09-30: the BP algorithm on the last visit; visit-form labels no longer chronic medications)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`, local only, no push, no PR. DECISIONS 2026-09-30 (two entries) and
2026-09-29 hold the details. `main` is at 555e538a (Chief merged the 2026-10-02 resep fix). In flight, not mine: another session's
uncommitted `lib/api/sentra-api.ts`, its test and `tests/e2e/zz-verify-kb-rx.spec.ts` (lint red).

- Steps: Temuan 1/5 · Diagnosis 2/5 · **RME Diagnosa 3/5** (page 1) | Tatalaksana 4/5 | **RME Terapi
  5/5** (`steps/RmeDiagnosisStep.tsx`, `diagnosisSteps.ts`, `DiagnosisStepFlow.tsx`). "Isi otomatis
  RME" is gone: "Isi diagnosis ke RME" after the pick, "Isi resep ke RME" + "Isi anamnesa ke RME"
  at the end (`RMETransferPanel.tsx`); `handleAutoFillAll` removed. Both pages share one transfer
  state; `transfer.lastStep` keeps a run's state, error, Ulangi, result and reasons on its own page
  (cc67c33b + fixup). Harness: after the diagnosa fill, RME Terapi's resep button reads `idle`.
- Tatalaksana: a chronic card's tick (or a tap on the card) continues it (`chronicContinuation` in
  `tatalaksana.ts`, wired in `ClinicalDifferential.tsx` as a prescription candidate shown only on
  its card); "Lanjut tanpa terapi tambahan" breathes until decided (`.dx-tx-breathe`, appended);
  since 2026-10-01 a green ring orbits the medication proposals until decided (`.dx-tx-orbit`).
- No tensi today: the diagnosis request carries the last visit's BP (`previous_blood_pressure`,
  from `useRecurrentDiagnoses`); `encounterToCaseState` sends it as a results row flagged by
  `getHTNSeverity`, never as today's vitals (9b8dddd9).
- Resep fill (2026-10-01, read live on the ePuskesmas resep page): Signa is chosen from the
  "Cari Resep Signa" autocomplete with an exact match (`fillSignaField`, `pickExactSuggestion`,
  bridge `matchMode: 'exact'`); `normalizeSignaValue` turns "3x sehari" into `3x1` (b562f747,
  bf5b1c3d). Tambah needs the hidden `obat_id` and `obat_signa`, both written only by the
  autocompletes' select.
- Resep fill (2026-10-02, Chief "lagi lagi stuck" on the 2nd drug): Nama Obat is chosen in the
  main world (`pickMedicationInPage`: leading words searched, the item that is the medication
  clicked, hidden `obat_id` confirmed); the live entry-row layout is single-entry from row 1; one
  Tambah press per row; resep step time +15 s per further medication (`resepStepTimeoutMs`).
- Chronic doses (2026-10-02, Chief "Pengisian dosis salah"): the visit therapy is the riwayat Resep
  table (name, signa, aturan pakai); a name without a signa gets no dose ("Signa tidak tercatat",
  not continuable); the store replaces a rescanned visit's therapy. No triad warning any more.
- E2E on a live-shaped resep page (`tests/e2e/epuskesmas-resep-page.ts`, 7f42f2d4): the J18 KB
  row lands in the table with obat_id 20012 and signa "3X1"; red before the fixes (old signa:
  "[SIGNA_INVALID]", partial; old filler: typed "3x1").
- History parser drops form labels and the advice placeholder (`lib/clinical`, R3, approved).
- The build in `.output\chrome-mv3-dev` is the production build (`run build`, MIRA engine), last.
  MIRA on 127.0.0.1:8787 answers `/healthz` 200. Native host registered for
  `bhcffleclpadneocndhembhjbemimhkm`.

## Verification (final tree)

2026-10-02 (dose fix): typecheck 0 · test 0 (187 files, 1516 passed, 17 skipped) · e2e 17 passed
· `run build` 0, last. Earlier 2026-10-02: test 0 (185 files, 1510 passed, 17 skipped) · eslint on the touched
files 0 (full lint 1: only the other session's untracked `zz-verify-kb-rx.spec.ts`, console.log) ·
`run:check` 0 · e2e 17 passed (7 synthetic incl. three medications on the live-shaped page, 10 others)
· `run build` 0, last. 2026-10-01: `test:e2e` 17 passed incl. the live-shaped resep. Earlier: `test:e2e` 15 passed
(on the dev build, no MIRA calls).
Red first for every new test; mutations: a skip that clears continuations, and the fixture set to
"Kontrol 1 minggu", each turn a test red. token-guard PASS (its a11y note - a button inside a
`role="button"` card - fixed: the tick is a real button). Harness `?triage=none&dx=3-J20.9&rmedx=idle`:
RME Diagnosa → "terkirim" → Tatalaksana; Amlodipin continued; RME Terapi with the two buttons.
Screenshots failed (Claude window hidden); checks were read from the DOM.

## Open for Chief

1. Live ePuskesmas test of each fill on its own page. Claude in Chrome is connected but reaches
   only its own tab (Chief gave the resep URL once); a full fill was not run on his form.
   Uncommitted work from another session (`lib/api/sentra-api.ts`, `tests/e2e/zz-verify-kb-rx.spec.ts`,
   the latter fails lint with console.log) is in the working tree and in the build.
2. Continued chronic quantity: the RME mapper caps days at 3 and rounds to 10 (Amlodipin 1x1 → 10),
   not 30 days; a PRB-style 30-day quantity is Chief's call. Signa rule "1x10mg = one unit a take"
   is my assumption.
3. The ePuskesmas Diagnosa screenshot had two empty rows under J45 with other staff names; not
   investigated yet (maybe earlier fills adding rows).
4. "harus on the same side with RME page": still my reading; the page-by-page fill may be what
   Chief meant.
5. Stock names vs the ePuskesmas autocomplete: since 2026-10-01 (Chief) NAC/NASETIL/PCT resolve to
   the full stock names and "tab" no longer matches a wrong drug (Metildopa); see DECISIONS. Still
   open: NAC tablet is filled as kapsul 200 mg; live ePuskesmas acceptance not yet seen; any other
   name the autocomplete does not offer falls to the typed candidate loop (slow); since 2026-10-02
   the step has 15 s more per further medication, but the orchestrator still retries a timed-out
   resep while the first fill may run on (two fills over one form).
6. Dead CSS (append-only file): `.dx-tx-safety-list`, `.diagnosis-transfer-secondary`.
7. MIRA's use of the earlier-BP row is not verified live (no model call without Chief's
   "jalankan"). The scraper origin of the form labels is inferred, not patched.
8. Earlier items: proposals remote-only (R3), DDI table ~20 pairs, J20 red_flags (R3), R3 sign-off
   recurrent-diagnosis, dose table sign-off, class allergies (R3), Kontrol intervals assumption,
   `DiseaseNote.followUp` unused, host does not stop MIRA when Chrome closes (MIRA repo).

## Next action

Chief reloads "Asisten Medis" and walks one case: pick diagnosis → Isi diagnosis ke RME (ePuskesmas
Diagnosa page open) → Tatalaksana, tick a chronic card → Selesai → Isi resep ke RME (Resep page) →
Isi anamnesa ke RME (Anamnesa page).
