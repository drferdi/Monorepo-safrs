# HANDOFF

Last updated: 2026-10-03 (visit summary PDF on an Oxford band with red orange signals, Edukasi and Tindak lanjut; "Unduh PDF" on RME Terapi, Swiss grid, pdf-lib; Tren TTV text on the trajectory scale; Trajectory Tren TTV as the lab spring playground; STATS: the daily breakdown as one sidebar sub-menu; STATS drawn in the side-panel design system; 2026-10-02: STATS opens with Statistik Harian from the ePuskesmas daily service report,
identity-free, CSV for pandas; a resep step says what went wrong, out of stock is a note without Ulangi; Terapi kronis drops acute-only medications; an out-of-stock medication is left out at once; header lights the page on screen, "Lanjutkan semua" for chronic therapy;
chronic doses from the riwayat Resep table, no triad warning; the RME resep picks each medication from its ePuskesmas suggestion and
presses Tambah once per row; 2026-10-01: the signa chosen from its suggestion, "3x sehari" as 3x1;
2026-09-30: the BP algorithm on the last visit; visit-form labels no longer chronic medications)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`, local only, no push, no PR. DECISIONS 2026-09-30 (two entries) and
2026-09-29 hold the details. `main` is at cd7b7795 (Chief merged through the Tren TTV text scale).
Visit summary PDF (2026-10-03, spec `docs/specs/2026-10-03-visit-summary-pdf-design.md`, plan
`docs/plans/2026-10-03-visit-summary-pdf-plan.md`, DECISIONS): "Unduh PDF" on the RME Terapi step
saves `ringkasan-kunjungan-<RM>-<date>.pdf`, A4, 12-column grid, Helvetica, no patient name. Since
Chief's redesign: an Oxford blue band with the white logomark (`public/brand/`, cropped flush to the
mark), red orange section numbers 01-08 and signals, Edukasi and Tindak lanjut added, Sistolik and
Diastolik as separate trend rows, the trend limited to this RM's visits; usually two pages. `lib/report/*`: model →
layout (draw ops) → pdf-lib renderer; `main.tsx` passes `visitSummaryContext` (facility, triage,
SpO2, visit history). pdf-lib (1.17.1, Chief approved) loads on click in its own chunk.
Harness: `pdf.html` (one page), `pdf.html?long` (45 medications, two pages), `?zoom=200`.
Another session's uncommitted `lib/api/sentra-api.ts`, its test and `tests/e2e/zz-verify-kb-rx.spec.ts` (lint red).

- Statistik Harian (2026-10-02, Chief "konsentrasi halaman baru yaitu statistic"): first block of the
  STATS page (`DailyStatisticPanel.tsx` inside `StatisticSection.tsx`). Date picker + "Muat statistik
  harian" → background `collectDailyStatistics` opens `/laporanpelayananpasien` (all GET filters,
  `buildDailyReportUrl`) in a hidden tab; content `scanDailyServiceReport` reads by header text and
  keeps only identity-free columns (`lib/statistics/daily-report.ts`); counts in
  `daily-statistics.ts`; days in `sentra:statistic:daily` (31); "Unduh CSV" (`daily-csv.ts`) for
  pandas. Harness: `stats.html` (two synthetic days, 136 and 121 rows).
  Live (read-only): the built URL gives today's 136 rows, the header grid finds all 15 columns.
  Since 2026-10-03 the page uses `ct-v2-layout` / `ct-v2-panel` / `ttv-*` / `action-btn`; 10 Besar
  Penyakit opens from 5 to 10 in place, the panels below are accordions (DECISIONS).
  Since the second 2026-10-03 entry (Chief: lab sidebar-submenu "di salah satu section") DPJP,
  Poli / Ruangan, Asuransi, Kelompok Umur and Waktu Layanan are one `ct-v2-panel` sub-menu
  (`StatisticSubmenu`, `shareRows` in `StatisticCharts.tsx`): one rail, a 3px accent tick at the
  open title, its rows on a border-drawn branch; DPJP without the meter bars; colour-only change.
  Harness of this session: launch `stats-harness` (port 5180), `stats.html`, Diagnosis frame.

- Trajectory Tren TTV (2026-10-03, Chief: lab spring-playground; "KOK DESIGN NYA BEDA" on the
  first cut, then redrawn to the lab's measured sizes): `v2/VitalPlayground.tsx` inside
  `TrajectoryVitalSignsPanel` (outer CHART frame and Hasil kept). Track: ball 40px on the lab's
  Snappy spring (500/45, no overshoot) to the picked visit's value, two dashed rings at the
  normal limits; SVG chart (K1..Kn, dashed limits, visit marker); Nilai / Selisih / Batas /
  Perilaku; pills Tensi / Nadi / SpO2 / Napas / Suhu, Sistolik / Diastolik segmented toggle
  (spring thumb), visit slider + Play (700 ms a step). Limits from the engine's `NORMAL_RANGES`
  (R3 export, Chief approved); SpO2 has none. Harness `traj.html` (all six chart tabs, worsening
  fixture). Since Chief's "text sizing keluar jauh dari design trajectory lain" the card's text is
  on the trajectory scale (appended overrides): labels 10px/700 uppercase, values 12px/650, body
  12px, dates 10px, pills and Play as the chart tabs (28px), chart ticks read 11px.
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
- Header (2026-10-02): `activeSurface` lights START / TRAJECTORY / DIAGNOSIS / STATS for the page on
  screen. Terapi kronis has "Lanjutkan semua" (cards with a regimen).
- Out of stock (2026-10-02, "macet di vit b6"): an empty catalogue answer fails that medication at
  once (`CATALOG_EMPTY_ERROR`), the rest are filled, the result is partial and names it.
- Terapi kronis (2026-10-02, "masa 9 macam obat?"): a medication only acute visits prescribed (ICD
  root not in `CHRONIC_ICD_ROOTS`) is no chronic card; the free-text "CTM" of an asthma visit can
  still sit beside its full stock name (not merged).
- Transfer message (2026-10-02, "Step gagal tanpa klasifikasi spesifik"): out of stock is
  `RESEP_OBAT_TIDAK_TERSEDIA` (all such medications named, no retry, warning note, no Ulangi) only
  when every failure is a stock gap; a real failure beside it keeps its own reason and Ulangi, and
  the message names all of them. Any unclassified step error shows its own message. Harness `transfer.html` shows the out-of-stock note.
- E2E on a live-shaped resep page (`tests/e2e/epuskesmas-resep-page.ts`, 7f42f2d4): the J18 KB
  row lands in the table with obat_id 20012 and signa "3X1"; red before the fixes (old signa:
  "[SIGNA_INVALID]", partial; old filler: typed "3x1").
- History parser drops form labels and the advice placeholder (`lib/clinical`, R3, approved).
- The build in `.output\chrome-mv3-dev` is the production build (`run build`, MIRA engine), last.
  MIRA on 127.0.0.1:8787 answers `/healthz` 200. Native host registered for
  `bhcffleclpadneocndhembhjbemimhkm`.

## Verification (final tree)

2026-10-03 (PDF redesign + review fixes): lint 1 only from the two known files · typecheck 0 ·
test 0 (1598 passed, 17 skipped) · e2e 20 · dev build 0 (pdf-lib only in its chunk) · `run:check` 0 ·
style.css untouched. Root as below. `run build` 0, last.

2026-10-03 (visit summary PDF): lint 1 only from the two known files · typecheck 0 · test 0 (1590
passed, 17 skipped; 30 new) · e2e 20 · dev build 0 (pdf-lib only in `chunks/download-visit-summary`)
· `run:check` 0 · style.css untouched since main. Harness: one and two pages render in Chrome's
viewer; logo on column 1 at the title's cap height. Root: governance 1 (root HANDOFF owner, other
session) · check:tokens 0 · lint 1 (`tools/automation/**/gaffer` only) · typecheck 0 · test 1
(PostgreSQL 127.0.0.1:54329 down) · build 0. `run build` 0, last.

2026-10-03 (Tren TTV text scale, CSS only): lint 1 only from the two known files · typecheck 0 ·
test 0 (1560 passed, 17 skipped) · dev build 0 · e2e 20 · `run:check` 0 · `run build` 0, last ·
style.css 92 added / 0 deleted since main. Harness: computed sizes match the Linimasa and
Perburukan tabs (eyebrow 10/700, title 12/650, meta 10, chart tab 10/700 at 28px, tick 11px).

2026-10-03 (Tren TTV playground): lint 1 only from `zz-verify-kb-rx.spec.ts` (other session) and
the old `platform-api-client.test.ts` warning · typecheck 0 · test 0 (1560 passed, 17 skipped) ·
dev build 0 · e2e 20 · `run:check` 0 · `run build` 0, last · style.css 317 added / 0 deleted
since main. Red first (module missing), 8 new tests. Harness: ball and toggle thumb sampled per
frame, monotonic, overshoot 0, settle about 0.5 s (the lab's 0.51 s). token-guard: no colour
literal; radii on `--radius-chip` / `--radius-container`, 12px literal (no token).

2026-10-03 (sidebar sub-menu): lint 1 only from `zz-verify-kb-rx.spec.ts` (other session) and the
old `platform-api-client.test.ts` warning · typecheck 0 · test 0 (1552 passed, 17 skipped) · dev
build 0 · e2e 20 · `run:check` 0 · `run build` 0, last · style.css 85 added / 0 deleted. Red first
(5 panels, not 1; subtitle on a closed section). Harness `stats.html`: tick 16px = title line,
elbow on the first label line, closed titles `--ct-v2-text-soft`. Code review: ready with fixes,
fixed (empty-state spacing, elbow on wrapped labels). token gate passed.

2026-10-03 (STATS design, dropdown + accordion): eslint touched 0 · typecheck 0 · test 0 (1551
passed, 17 skipped) · dev build 0 · e2e 20 · `run:check` 0 · `run build` 0, last. Root: governance 1
only from another session's uncommitted root `.agents/HANDOFF.md` (Gaffer, melindaOs, no owner);
lint 1 (`tools/*`), test 1 (PostgreSQL 54329) as before.

2026-10-02 (Statistik Harian): typecheck 0 · test 0 (1546 passed, 17 skipped; contract list +2
names) · dev build 0 · e2e 20 (incl. the daily report scan and the other session's
`zz-verify-kb-rx.spec.ts`) · `run:check` 0 · `run build` 0, last · full lint 1 (only
`zz-verify-kb-rx.spec.ts`; my files 0).

2026-10-02 (transfer message, incl. mixed failures): eslint touched 0 · typecheck 0 · test 0 (1528
passed, 17 skipped) · dev build 0 · e2e 19 (18 own + the other session's `zz-verify-kb-rx.spec.ts`) ·
`run build` 0, last · `run:check` 0 · full lint 1 (only `zz-verify-kb-rx.spec.ts`).

2026-10-02 (chronic filter): typecheck 0 · test 0 (1522 passed, 17 skipped) · e2e 18 · `run build` 0, last.
2026-10-02 (out of stock): typecheck 0 · test 0 (1521 passed, 17 skipped) · e2e 18 · `run build` 0, last.
2026-10-02 (header/select-all): typecheck 0 · test 0 (1521 passed, 17 skipped) · e2e 17 · `run build` 0, last.
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

00. Visit summary PDF live: "Unduh PDF" on RME Terapi after a real case, then open the file. My
    calls: Tren TTV without SpO2 (visit history has none), last 8 visits, Tatalaksana prints the
    resep list then the CDSS alerts, triage as its bold word, the logomark only, red orange
    #FF4500 and Oxford #002147, a typical visit on two pages. Deferred review minors (ledger):
    no double-click guard, no error log, trend x by index with dd-mm end labels.

0. Statistik Harian live: "Muat statistik harian" in Chief's Chrome not yet seen (Playwright cannot
   route the hidden tab's first navigation). Rows are services, not distinct patients (no identity
   kept to deduplicate). Age bands 0-4/5-14/15-44/45-59/≥60 and "10 besar over all diagnoses" are
   my defaults.

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
6. Dead CSS (append-only file): `.dx-tx-safety-list`, `.diagnosis-transfer-secondary`, and the old
   statistic surface classes (list in DECISIONS 2026-10-03).
7. MIRA's use of the earlier-BP row is not verified live (no model call without Chief's
   "jalankan"). The scraper origin of the form labels is inferred, not patched.
8. Earlier items: proposals remote-only (R3), DDI table ~20 pairs, J20 red_flags (R3), R3 sign-off
   recurrent-diagnosis, dose table sign-off, class allergies (R3), Kontrol intervals assumption,
   `DiseaseNote.followUp` unused, host does not stop MIRA when Chrome closes (MIRA repo).

## Next action

Chief opens a case to RME Terapi and presses "Unduh PDF" (harness `pdf.html` shows the synthetic one).
Chief looks at TRAJECTORY → Tren Tanda Vital. Open: the outer CHART frame and Hasil are kept
around the lab card (shared `TrajectorySimplePanel`); the ball drag of the lab is left out.
Chief looks at the STATS sub-menu (harness or the extension): closed-title contrast
(`--ct-v2-text-soft`) and the dropped DPJP bars are my calls.
STATS → Statistik Harian → "Muat statistik harian" for today (an ePuskesmas tab signed in), then
"Unduh CSV". Still pending from before: Chief reloads "Asisten Medis" and walks one case: pick diagnosis → Isi diagnosis ke RME (ePuskesmas
Diagnosa page open) → Tatalaksana, tick a chronic card → Selesai → Isi resep ke RME (Resep page) →
Isi anamnesa ke RME (Anamnesa page).
