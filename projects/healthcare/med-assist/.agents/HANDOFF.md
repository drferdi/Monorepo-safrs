# HANDOFF

Last updated: 2026-09-29 (late night: chronic cards continue in this visit, "Lanjut tanpa terapi
tambahan" breathes, the RME fill follows the ePuskesmas pages, each RME page shows only its own
run; earlier: MIRA fix, Chrome e2e)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`, local only, no push, no PR. DECISIONS 2026-09-29 (four entries
on top) hold the details. Commits 36077bd1, 34a4ad01, cc67c33b are ahead of `main` (e0dd9545).

- Steps: Temuan 1/5 · Diagnosis 2/5 · **RME Diagnosa 3/5** (page 1) | Tatalaksana 4/5 | **RME Terapi
  5/5** (`steps/RmeDiagnosisStep.tsx`, `diagnosisSteps.ts`, `DiagnosisStepFlow.tsx`). "Isi otomatis
  RME" is gone: "Isi diagnosis ke RME" after the pick, "Isi resep ke RME" + "Isi anamnesa ke RME"
  at the end (`RMETransferPanel.tsx`); `handleAutoFillAll` removed. Both pages share one transfer
  state; `transfer.lastStep` keeps a run's state, error and Ulangi on its own page (cc67c33b).
- Tatalaksana: a chronic card's tick (or a tap on the card) continues it (`chronicContinuation` in
  `tatalaksana.ts`, wired in `ClinicalDifferential.tsx` as a prescription candidate shown only on
  its card); "Lanjut tanpa terapi tambahan" breathes until decided (`.dx-tx-breathe`, appended).
- The build in `.output\chrome-mv3-dev` is the production build (`run build`, MIRA engine), last.
  MIRA on 127.0.0.1:8787 answers `/healthz` 200. Native host registered for
  `bhcffleclpadneocndhembhjbemimhkm`.

## Verification (final tree)

lint 0 (1 old warning) · typecheck 0 · test 0 (181 files, 1479 passed, 17 skipped) · dev build 0
· `test:e2e` 15 passed (on the dev build, no MIRA calls) · `run build` 0 · `run:check` 0.
Red first for every new test; mutations: a skip that clears continuations, and the fixture set to
"Kontrol 1 minggu", each turn a test red. token-guard PASS (its a11y note - a button inside a
`role="button"` card - fixed: the tick is a real button). Harness `?triage=none&dx=3-J20.9&rmedx=idle`:
RME Diagnosa → "terkirim" → Tatalaksana; Amlodipin continued; RME Terapi with the two buttons.
Screenshots failed (Claude window hidden); checks were read from the DOM.

## Open for Chief

1. Live ePuskesmas test of each fill on its own page (needs Claude in Chrome connected).
2. Continued chronic quantity: the RME mapper caps days at 3 and rounds to 10 (Amlodipin 1x1 → 10),
   not 30 days; a PRB-style 30-day quantity is Chief's call. Signa rule "1x10mg = one unit a take"
   is my assumption.
3. The ePuskesmas Diagnosa screenshot had two empty rows under J45 with other staff names; not
   investigated yet (maybe earlier fills adding rows).
4. "harus on the same side with RME page": still my reading; the page-by-page fill may be what
   Chief meant.
5. Stock names vs the ePuskesmas autocomplete; a name it does not offer times out the resep step.
   Probe: "NAC", "PCT", "NASETIL" resolve to no stock name (sent as written); "CTM" and the full
   names do. No abbreviation table added (Chief's call).
6. Dead CSS (append-only file): `.dx-tx-safety-list`, `.diagnosis-transfer-secondary`.
7. Earlier items: proposals remote-only (R3), DDI table ~20 pairs, J20 red_flags (R3), R3 sign-off
   recurrent-diagnosis, dose table sign-off, class allergies (R3), Kontrol intervals assumption,
   `DiseaseNote.followUp` unused, host does not stop MIRA when Chrome closes (MIRA repo).

## Next action

Chief reloads "Asisten Medis" and walks one case: pick diagnosis → Isi diagnosis ke RME (ePuskesmas
Diagnosa page open) → Tatalaksana, tick a chronic card → Selesai → Isi resep ke RME (Resep page) →
Isi anamnesa ke RME (Anamnesa page).
