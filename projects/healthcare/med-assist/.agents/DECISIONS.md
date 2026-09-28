# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-28 — The side-panel column holds still while one part opens ("konsol nyata")

- Decision: opening a card's reasons animates only that panel (height, entries, lines, chevron);
  no other element scales or slides. Every framer-motion `layout` animation on the page is
  scoped with `layoutDependency` to the one event that should move it: the step wrapper,
  receipts and ghosts to the active step, the cards to the chosen diagnosis. New content goes
  inside an existing grid child, so no gap appears at once. Tap feedback sits only on the element
  being tapped.
- Rationale: Chief, on the live render: the dropdown was right but the column swayed
  ("bergoyang", "bergelayut"); "ANGGAP KOLOM INI ADALAH CONSOL NYATA".
- Evidence: `4df3887c`, measured with a MutationObserver on every style change in the column.

## 2026-09-28 — Diagnosis step follows Chief's mockup: utama, must not miss, banding, next best step

- Decision: the Diagnosis step reads, top to bottom, "Usulan diagnosis utama" (or "Diagnosis
  utama" once chosen), MUST NOT MISS (MIRA cannot-miss cards, outside the three-card cap),
  the numbered "Diagnosis banding N" cards (the rest behind "Lainnya (n)"), and NEXT BEST STEP
  (MIRA's first next best action, its reason, "Masukkan hasil"), separated by
  `console-divider`. Each card: title and chip, the `penyakit.json` definisi clamped to three
  lines, a tally row "✓ Mendukung n  − Menentang n  ? Data kurang n", and "Lihat alasan ⌄"
  ("Mengapa perlu dipertimbangkan ⌄" on MUST NOT MISS) opening the reasons timeline (Riwayat,
  Mendukung, Menentang, Data kurang, Catatan; on MUST NOT MISS: Temuan yang relevan, Bila
  terlewat with the `komplikasi`, Data kurang, and "Apa yang perlu diperiksa →").
- Nothing is said twice on the page (Chief, same evening, on the live render: "sekalian aja
  kamu tulis 200x", "Must not miss vs jangan terlewat vs ojo lali"): the MUST NOT MISS label is
  the only cannot-miss marker (no "Jangan terlewat" chip, no red "Jangan terlewat:" line; this
  closes the open question on that line), no "Diagnosis banding" title above the numbered
  labels, no count in the timeline (the tally carries it), one term "Data kurang", and a
  toggle's text is not repeated as the first heading it opens. This overrides the mockup,
  which showed several of these.
- Rationale: Chief pasted the layout as a mockup; it supersedes the banding-first order of
  `9f76dd66` and the "Tap here" label of `12ec57c6`. The next best step shows only engine data
  (no fallback), so the legacy engine shows no such section.
- Evidence: commits `ca874859` (layout), `2f2d70f2` (`next_best_actions` from MIRA through
  `run-diagnosis.ts` and `ClinicalDifferential`), and `c5b5ef88` (repeat removal).

## 2026-09-28 — Diagnosis page is a step flow (form B)

- Decision: `DiagnosisStepFlow.tsx` replaces `DiagnosisWorkspace.tsx` as the diagnosis page
  component (mockup form B, "fokus berjalan"): a `SafetyStrip` (danger signs and triase, never
  behind a click, rendered whenever it has content) at the top, one receipt line per finished
  step ("✓ <Step> · <chips> · ubah"), one active step in full, then ghost lines for the remaining
  steps ("3 · Terapi"). Steps are Temuan (Finding), Diagnosis, Terapi, RME, derived by
  `diagnosisSteps.ts` and read by `createDiagnosisPageViewModel`'s `steps` array, replacing
  `DiagnosisProgressStepper.tsx` and `StagedSection` (both deleted, along with
  `TherapyReviewPanel.tsx`, whose content moved into `TherapyStep.tsx`). Terapi advances only on
  an explicit "Lanjut" (with at least one medication selected) or "Lanjut tanpa obat" — not
  merely because a medication was tapped — so the step ends on the doctor's confirmation, not as
  a side effect (controller ruling; the plan's original "done when a medication is selected" rule
  was a defect that would have hidden the step after the first tap). Temuan is forced done in the
  flow (mockup B) so Diagnosis is the active step immediately, with its own loading skeleton and
  screen-reader text while data is not yet ready. The page uses one body size (13 px) throughout;
  step heading 14 px semibold; receipts and ghosts 11 px.
- Rationale: a doctor works one question at a time instead of scanning a fully expanded page, but
  safety-critical content (danger signs, triage) must never be gated behind a click or a step
  boundary — the safety strip sits outside the step sequence and is never collapsed.
- Evidence: commits `399c9937`, `792b9bf2`, `b6a67cd7`, `f22a222b`, `7ed5ed2c`. Tests:
  `DiagnosisStepFlow.test.tsx` (active step render, receipts, ghosts, "ubah" re-open, safety strip
  always present and uncapped), `SafetyStrip.test.tsx`, `StepReceipt.test.tsx`,
  `TherapyStep.test.tsx` ("Lanjut" / "Lanjut tanpa obat"); the six old page test files
  (`ClinicalDifferential.helpers.test.ts`, `.final-page.test.tsx`, `.logic-contract.test.tsx`,
  `.rme-transfer.e2e.test.tsx`, `.chronic-therapy.test.tsx`, and `DiagnosisStep.test.tsx`) were
  migrated with every replaced assertion named in the commit bodies, none weakened.

## 2026-09-28 — Recurrent diagnoses from the record are offered first; the doctor promotes them

- Decision: `lib/clinical/recurrent-diagnosis.ts` finds ICDs recorded at least twice (`minCount`
  default 2) within the last 12 months, grouped by the ICD's 3-character root (so `E11` and
  `E11.9` count as one diagnosis), deduplicated by `encounter_id`. Roots listed in
  `CHRONIC_ICD_ROOTS` — a plain data array in that module Chief may edit at any time (`I10`-`I15`
  hipertensi, `E10`-`E14` diabetes, `E78`, `I25`, `I50`, `J44`, `J45`, `N18`, `G40`, `F20`,
  `E03`/`E05`, `M06`) — are labelled "Kronis", everything else "Berulang". `useRecurrentDiagnoses`
  returns `{ candidates, loaded }`; on the Diagnosis step, history-derived candidates are seeded
  first in the card list and both display caps (candidates shown, cannot-miss slot) are widened
  by the unmatched-history count so an engine cannot-miss row is never pushed out. Selecting a
  recurrent candidate goes through the same selection path as any differential card and is never
  auto-selected; the audit records it via `auditLogger.log('suggestion_selected', …)` with
  metadata `selected_icd`, `source: 'riwayat'`, `history_label`, `history_count`,
  `visits_considered`. Recurrent candidates' names/ICDs are also appended to `knownConditions`
  sent to MIRA, de-duplicated against `penyakit_kronis`.
- Rationale: a doctor should see a patient's own recurring pattern — especially for chronic
  follow-up — before ranking a fresh differential, but the record only ever offers a candidate; it
  never overrides the doctor's own judgement.
- Evidence: commits `33ce64e2`, `11190856` (Task 8), `4ccf99cb`, `5f604855`, `affae82f` (Task 9),
  `e1ac23c7` (Task 10). Tests: `lib/clinical/recurrent-diagnosis.test.ts` (threshold, 12-month
  window edge, ICD normalisation, chronic label, ordering, current-visit excluded, missing ICD
  ignored), `ClinicalDifferential` history-seeding and audit-metadata tests, `case-state.test.ts`
  (`knownConditions` dedupe).

## 2026-09-28 — MIRA starts with Assist through a native messaging host; mira is the production default

- Decision: the extension starts the MIRA reasoning service itself, through a native messaging
  host (`nativeMessaging` permission, host `com.sentra.mira`, installed once with
  `install_host.ps1 -ExtensionId <id>` in the MIRA repository) instead of requiring the service
  to already be running, and prefetches its answer from the Trajectory stage. `SENTRA_DIAGNOSIS_ENGINE`
  now defaults to `mira` in the production build (via a Vite `define` in `wxt.config.ts`) when the
  variable is unset; Vitest and dev keep the `legacy` default. The deterministic safety layer is
  unchanged.
- Rationale: MIRA only helps if it is actually available when a physician opens a case; a
  service the extension does not manage is a service that is sometimes not running. Chief
  accepted ADR-005 on 2026-09-28 to make MIRA the production default now that autostart and
  prefetch remove that gap.
- Evidence: `assist/host/tests/test_host.py` in the MIRA repository (`D:\DEV\gafferverse\mira-system`)
  (Task 1); `lib/diagnosis-engine/mira-supervisor.test.ts` (Task 4);
  `lib/diagnosis-engine/mira-prefetch.test.ts` and `lib/diagnosis-engine/request-context.test.ts`
  (Task 6).

## 2026-09-28 — "MIRA tidak tersedia" on 2026-09-28 was the service not running

- Decision: the "MIRA tidak tersedia" note the physician saw was not a code defect. Its cause
  was that the MIRA reasoning service was not running when the extension called it; the
  extension's `mira` engine correctly fell back to the legacy result and flagged the failure.
  This is resolved by the native messaging host (Task 1): Assist now asks the host to start the
  service and shows its status in the header, so the service is running before the panel needs
  it.
- Rationale: recording the cause here keeps a future "MIRA tidak tersedia" report from being
  re-diagnosed as a client bug when the service process is simply not up yet.
- Evidence: `assist/host/tests/test_host.py` in the MIRA repository (`D:\DEV\gafferverse\mira-system`).

## 2026-09-28 — Button sound plays on press (protected main.tsx, Chief approved)

- Decision: the side panel's global button-sound listener in `entrypoints/sidepanel/main.tsx`
  plays on `pointerdown` (primary button only) instead of `click`, still plays for keyboard
  activation (a `click` with `detail === 0`), and primes `button5.mp3` as soon as button sounds
  are enabled at launch. Chief approved this protected-file edit in chat on 2026-09-28 (option
  "A. Suara saat ditekan"); the other proposed UX items (composited pulse, page transitions,
  softer press transition) were not chosen and are not built.
- Rationale: a mouse click fires on release, about 100 ms after the press; priming makes the
  first click play from a decoded buffer too.
- Evidence: new test in `main.controller.test.tsx` (red before, green after); in the built side
  panel (Edge) all six probe clicks, the first included, started Web Audio playback 0 ms after
  `pointerdown` with no `<audio>` element created.

## 2026-09-28 — UI sounds play from decoded Web Audio buffers; sound files trimmed

- Decision: `utils/sound.ts` decodes each sound once into a shared `AudioContext`
  (`latencyHint: 'interactive'`) and plays it from the buffer, starting past the file's leading
  silence (first sample at or above 0.01) and fading capped sounds with a gain ramp. The first
  play of a sound that is not decoded yet still goes through an `<audio>` element and starts the
  decode. Sound files are cut at MP3 frame boundaries without re-encoding: `opening.mp3` keeps
  its first 2.6 s (1.05 MB to 84 KB; every caller caps it at 2.2 s, and the toolbar
  `action.onClicked` path never fires because `openPanelOnActionClick` is true), and leading
  silence is cut from `hello.mp3` (919 ms to 83 ms), `beep.mp3` (204 ms to 60 ms) and
  `message.mp3` (108 ms to 56 ms).
- Rationale: Chief reported button sounds arriving late. Each click built a new `<audio>` element
  (9–63 ms to "playing" on an idle machine, more under load) and every file began with silence
  (34 ms for `button5.mp3`). Decoded buffers start in the same task as the click. A 32.7 s
  opening track decoded into memory would cost about 12 MB; trimmed, under 1 MB.
- Evidence: `utils/sound.webaudio.test.ts` (red before, green after); in the built side panel
  (Edge), clicks 2–6 started Web Audio playback 0 ms after the click event with no new `<audio>`
  element; a sample comparison of the trimmed files against the originals showed zero
  difference over the played part of `opening.mp3` and no click at any cut.

## 2026-09-28 — Review details reads as one narrative with ABCD primary survey advice

- Decision: the "Review next" checklist in `ClinicalReasoningDifferentialPanel` becomes one
  Indonesian paragraph under "Penjelasan": "Pada pasien ditemukan adanya <complaint signal>.",
  the first visit whose complaint contains the signal's matched keywords ("Keluhan ini muncul
  sejak kunjungan ke-N (date)." or "…tercatat pada kunjungan saat ini."), the engine rationale,
  vital drivers, diagnosis and therapy signals, and "Sentra menyarankan survei primer A-B-C-D
  (Airway, Breathing, Circulation, Disability)." whenever any complaint signal exists or the
  final state is deteriorating or critical. Chief chose the ABCD primary-survey meaning and the
  whole-section scope on 2026-09-28.
- Rationale: Chief asked for an explanation a doctor reads at once instead of four labelled
  items. Every complaint signal the engine emits is a safety pattern (stroke, ACS, respiratory
  with physiology, infection with sepsis-like risk), so advising the primary survey for any of
  them, or for a worsening trajectory, matches Chief's chest-pain example without advising it
  for routine visits. Display only: the gate reads existing engine fields (SAFRS R2).
- Evidence: the commit after `ba789530`; `ClinicalReasoningDifferentialPanel.narrative.test.tsx`
  was red before the change and green after.

## 2026-09-28 — Clinical Trajectory top card copy in Indonesian

- Decision: on Chief's request the Trajectory top card reads in Indonesian. Status chip:
  Prioritas tinggi / Perlu perhatian / Stabil / Pantau; trend chip: Eskalasi / Memburuk / Tetap /
  Membaik; priority chip: Tinjau sekarang / Mendesak / Hari ini / Rutin. Tabs (long / short):
  Linimasa Klinis Pasien / LINIMASA, Kurva Risiko / Perburukan / PERBURUKAN, Tren Tanda Vital /
  TREN TTV, Linimasa Tanda Bahaya / TANDA BAHAYA, Selisih Antar Kunjungan / SELISIH, Evolusi
  Hipotesis Diagnosis / EVOLUSI DX. "Trajectory" becomes "Trajektori" in running text.
- Rationale: Chief's users are Indonesian doctors and nakes; the rest of the side panel is
  already Indonesian. No short label is longer than the old longest word (DETERIORATION).
- Evidence: the commit after `78439d22`; test expectations swapped string for string (named in
  its message); token-guard PASS, SAFRS R1.

## 2026-09-28 — Clinical Trajectory must not reload or persist on equal re-renders

- Decision: objects that feed the trajectory pipeline and the reasoning-audit write keep their
  identity across re-renders with equal inputs. `ClinicalReasoningWorkbench` memoises the vitals
  object it passes to `ClinicalTrajectory` (whose load effect depends on it), and
  `ClinicalTrajectoryV2` memoises its sanitised view model and hybrid result (which feed the
  audit trail's persistence effect). Tests pin both: an equal re-render neither restarts the
  pipeline (no second canonical-engine call) nor writes the audit again.
- Rationale: the side panel (`main.tsx`, protected) re-renders on every
  `browser.storage.onChanged` event for any key, and the audit trail writes up to 100 records to
  `browser.storage.local` each time its inputs change. With fresh objects on every render this
  formed an endless loop — reload, canonical call, audit write, storage event, re-render — that
  grew Chrome's extension renderer from about 97 MB to 679 MB and the browser process from
  126 MB to 887 MB within five minutes on Chief's machine, then hung the Trajectory page and the
  PC. The loop's links date from the migration commit `809101cf`, not this branch.
- Evidence: see the commit after `88ccf25c` on `feat/sidepanel-ui-batch`; both new tests failed
  before the fix (audit persisted 2 times; canonical engine called 2 times) and pass after it.

## 2026-09-28 — Staged diagnosis page: order, collapse, and safety-first danger signs

- Decision: Diagnosis Utama renders above Diagnosis Banding (reverses the earlier order), each
  card shows its confidence word once, in the header, with one evidence tally line and no
  `ConfidenceRail`; the primary card's "Alasan" dropdown renders whenever evidence has items,
  including the insufficient-evidence state. Pemeriksaan Penunjang, Therapy + Resep, Edukasi and
  RME Transfer render as closed one-line `<details>` summaries until "diagnosis chosen"
  (`therapy.selectedDiagnosisCount > 0`), then open with a 40 ms stagger — except Pemeriksaan
  Penunjang, which forces itself open regardless of that flag whenever it is carrying the
  fallback "Tanda bahaya" list (no triage data), because safety information must not hide behind
  a click. Danger signs are built once from `redFlags` + `doNotMiss`, de-duplicated, and the
  3-item cap is removed (the separate Safety-net list that used to show the rest is gone). The
  Therapy panel's "Hanya untuk ditinjau… Dokter tetap pengambil keputusan akhir" disclaimer is
  removed; the global footer already states physician authority.
- Rationale: a doctor reads each fact once and sees only the sections useful at their current
  step, but safety-critical content is never gated behind an extra click.
- Evidence: commits `169c9ab2` (danger signs single/uncapped), `d1073b5a` (Utama above Banding),
  `47db122e` (collapse Penunjang/Therapy/Edukasi/RME), `7a07560d` (final review fix wave: F1
  Penunjang auto-open for fallback danger signs, F2 primary Alasan renders in the insufficient
  state). Spec `docs/specs/2026-09-27-diagnosis-page-staged-design.md` (`bd97f827`) D1–D3, with
  an "Updated after implementation" note for the F1 deviation.

## 2026-09-28 — Motion policy for the diagnosis page: CSS only, no framer-motion

- Decision: every new motion on the diagnosis page (stage open/close, stepper, stagger,
  selection, RME order tracker, Clinical Trajectory activity timeline) is plain CSS: open
  transitions run 250 ms, close 200 ms, both on the shared curve
  `cubic-bezier(0.23, 1, 0.32, 1)`; every new motion rule has a matching
  `@media (prefers-reduced-motion: reduce)` block that keeps only an opacity change. No new
  dependency was added; `framer-motion`, already a capsule dependency, is not used for any
  motion in this batch.
- Rationale: keeps the motion budget declarative and inspectable in `style.css`, and predictable
  under reduced motion, without pulling animation JS into the render path.
- Evidence: commits `49d7ba6c`, `2dfbe20e`, `72b12c5e`, `dac5b071`, `78a45e88` (reduced-motion
  test tightened to its own balanced `@media` block), `7a07560d` (TG2/TG3 reduced-motion fixes
  for the autofill-button label opacity transition and the audit-timeline `animation-delay`).

## 2026-09-27 — Send to Doctors opens a patient-free WhatsApp link

- Decision (Chief): the alert is a `wa.me` link whose text names only the triage zone (merah/
  kuning) — no patient name, RM, age, vitals, or alert title. Numbers come from medboard crew
  profiles via `GET /api/doctors/contacts` (crew auth, active Dokter/Dokter Gigi with a number),
  are held in memory only for the open list, and are never stored or logged. The button appears
  only in the emergency card, only for merah/kuning zones; the action bar stays three buttons.
- Evidence: commits `392b04df`, `92d5adb5` (medboard endpoint + route test), `f6a5f637`,
  `5171abc8` (Assist button and message text).

## 2026-09-27 — Emergency card and diagnosis page layout

- Decision (Chief): the verdict card keeps seven sections with Indonesian headings (Mengapa
  penting, Lakukan sekarang, Jangan lakukan, Pemicu rujukan, Evaluasi ulang, Dasar bukti). The
  diagnosis page order is Clinical Finding → Diagnosis Banding → Diagnosis Utama → Triase &
  Rujukan, with triage details folded into dropdowns (Saran, Alasan, Indikasi rujukan, Tanda
  bahaya). Clinical Trajectory results are folded into a "Hasil" dropdown with green Open/Close
  hints.
- Evidence: commits `91181d9b`, `16e3a20b` (verdict card), `d30f6fac` (diagnosis page), `48b76c4e`
  (trajectory "Hasil" dropdown).

## 2026-09-27 — RME practitioner names come from the signed-in Assist user

- Decision (Chief): the "Dokter / Tenaga Medis" and "Perawat / Bidan / Nutrisionist /
  Sanitarian" fields take the name of the user signed in to Assist, chosen by crew profession
  (Dokter, Dokter Gigi → doctor field; Perawat, Bidan, Apoteker, Triage Officer → nurse field).
  The other field, local accounts and unknown professions keep `DOKTER_NAMA` / `PERAWAT_NAMA`.
  This reverses the earlier directive "always used, never dynamic" in `lib/clinical/tenaga-medis.ts` (R3).
- Profession, not `role`, decides, because `normalizeRole` maps bidan to `doctor`.
- ePuskesmas autocomplete for these fields selects only a single exact name match; otherwise the
  field is cleared and the step reports "Nama tenaga medis tidak cocok persis di ePuskesmas".

## 2026-09-27 — Real cases may reach MIRA through OpenRouter zero data retention

- Decision (Chief, in chat): the reasoning service runs with `MIRA_DATA_POLICY=openrouter-zdr`
  (set in the service's gitignored `src/.env`), so de-identified real cases from Med Assist in
  `mira` mode are answered instead of refused with `DATA_POLICY`. Every OpenRouter request keeps
  the fixed policy (zero data retention, data collection denied, parameters required).
- Each diagnosis request in `mira` mode is one live step (about US$0.015–0.02 and 10 s with the
  current planning model); Chief waived the per-run "jalankan" rule for this mode only.
- Unchanged: the client PII guard and the service's PII re-check still run first; `legacy` stays
  the default; the local knowledge base still wins for physicians until ADR-005 is accepted.
- Evidence: before the change the service audit log held four `DATA_POLICY` refusals from the
  extension (token accepted, cost 0); `load_settings()` now reports `openrouter-zdr` with no
  policy problem.

## 2026-09-27 — Diagnosis engine modes legacy | shadow | mira; MIRA shown in the existing list

- Decision (Chief, in chat, with R3 approval for `feature-flags.ts`, `run-diagnosis.ts` and
  `lib/diagnosis-engine/`): `SENTRA_DIAGNOSIS_ENGINE` = `legacy` (default) | `shadow` (MIRA in the
  background, not awaited, audited) | `mira` (MIRA's list shown; on failure, timeout or an empty
  list the legacy list is shown with the note "MIRA tidak tersedia"). Only these exact values
  switch; anything else is `legacy`.
- In `mira` mode MIRA replaces only `diagnosis_suggestions` (likely, alternatives, then
  cannotMiss, tagged "MIRA" / "MIRA · jangan terlewat"); alerts and every other field stay the
  legacy engine's, and the safety layer is untouched. ICD codes stay as MIRA sent them, even when
  the local knowledge base lacks them. Cannot-miss entries always get one of the five places.
- This supersedes the 2026-09-27 lines "with `mira`, physicians still see only the legacy result"
  and "showing MIRA in the side panel is a separate UI task" for the `mira` value only. `mira` is
  off by default and meant for development; "the local knowledge base wins; the LLM is a reranker
  only" still holds for physicians until Chief accepts ADR-005.
- Development authentication (Chief): `VITE_MIRA_DEV_TOKEN` is sent as `Authorization: Bearer`
  and must equal the service's `MIRA_DEV_TOKEN`. It is inlined into the build, so it is a
  throwaway local value only; production authentication stays undecided. `host_permissions`
  already allow `http://127.0.0.1:*/*`, so no manifest change was needed.
- Evidence: commit `3e1b94d4`; full suite 1137 passing, 17 skipped (baseline 1109).

## 2026-09-27 — PII pattern false positives fixed (R3, Chief approved)

- Decision: `RM_NUMBER` needs "RM" / "No. RM" as a whole token plus an identifier with a digit;
  `HONORIFIC_NAME` keeps the title case-insensitive but requires a capitalised name (all-caps
  names only after dotted titles). "normal", "Ibu pasien", "Ibuprofen" and "RM: pasien baru" no
  longer block payloads.
- Accepted trade-off (the approved design's defaults): an all-caps name after "Ibu", a lower-case
  name after a title ("tn. budi") and an RM number without digits are no longer caught. The same
  patterns drive the redaction before the optional OpenAI reranker.
- Evidence: commit `b5b875a1`; the new tests fail on the old patterns (2 failing) and pass on the
  new ones.

## 2026-09-27 — MIRA planning model picked in the side panel by developers and admins

- Decision (Chief chose each option): the MIRA planning model is picked in the side panel
  (footer), only in development builds or by an admin; physicians never see the picker. The
  choice travels as the header `X-MIRA-Plan-Model`, so request contract v1 is unchanged. The
  reasoning service enforces its own allowlist (`MIRA_PLAN_MODEL_CHOICES`) and refuses any other
  value before a model call (`MODEL_NOT_ALLOWED`).
- Offered models (Chief's list): `google/gemini-3.1-flash-lite:nitro` (the service default for
  now), `inception/mercury-2`, `openai/gpt-6-luna`.
- Rationale: compare planning models on synthetic cases without rebuilding; the client-side role
  check only hides the picker, the service allowlist is the control.
- Evidence: commit `e07983ce`; 11 new tests; full suite 1109 passing, 17 skipped.

## 2026-09-27 — Diagnosis engine isolated behind an interface; MIRA slot off by default

- Decision (Chief approved the direction and the Step A inventory): diagnosis ranking goes
  through `lib/diagnosis-engine/` (`DiagnosisEngine.step(CaseState) → EngineResult`). The legacy
  engine is wrapped unchanged and stays the comparator and fallback; deleting it is a later task,
  allowed only after the Gate 1 benchmark passes.
- Flag `diagnosisEngine` lives in `lib/iskandar-diagnosis-engine/feature-flags.ts` (Chief's
  choice); only the exact value `mira` selects the candidate, anything else is `legacy`.
- With `mira`, physicians still see only the legacy result; MIRA runs in shadow mode, capped at
  20 s, and only its outcome is audit-logged. Showing MIRA in the side panel is a separate UI
  task under the freeze rules.
- The MIRA client talks only to a Sentra-side service (`VITE_MIRA_SERVICE_URL`), sends no
  credentials, screens every payload with `lib/api/pii-guard.ts`, and never holds an OpenAI key.
- The safety layer (red flags, emergency gates, triage verdict, triage/referral tree) stays
  deterministic and outside every engine; a test enforces that it imports no diagnosis pipeline
  and still produces output when an engine throws, hangs or breaks.
- "The LLM is a reranker only" stays in force until Chief accepts ADR-005 (Proposed).
- Evidence: golden recordings of 12 synthetic cases (`lib/diagnosis-engine/__golden__/`) match
  before and after the switch; a 0.0001 change in one confidence value fails them. Test run:
  1098 passing, 17 skipped (baseline 961/16).

## 2026-09-27 — Brought in Chief's GitHub updates (drferdi/Medassist PR #1–#10)

- Decision (Chief): the ten commits on `drferdi/Medassist` `main` after `de780e3b` (the commit
  the legacy snapshot was based on), up to `b17e83c2`, were applied to the capsule as one
  three-way patch: P0–P1 hygiene (#1), OCR failure without false triage (#2), LLM ICDs limited
  to KB candidates (#3), KB hygiene (#4, #8), red flags as alerts only (#5), one ranking
  authority (#6), differential populated from signals (#7), unknown age and one engine
  diagnosis source (#9), epidemiology gate and `diagnosis_banding` soft penalty (#10).
- Branch `cursor/p0-p1-hygiene-8d93` has the same tree as PR #1 (squash-merged), so nothing
  further was taken from it.
- Kept from the migration: the capsule's own `pnpm-lock.yaml` (upstream's pnpm 9 lockfile not
  taken), relative `source_file`/`kb_source_path` values in `penyakit.json`, the `Drferdi`
  author headers (also applied to the six new files), the vendored shared types, and `.agents/`
  tracked. Three import-order conflicts in the MedLens tests were resolved to upstream's order.
- Evidence: every other ported file is byte-identical to `b17e83c2`; see HANDOFF for the
  verification run.
- `eng.traineddata` (Tesseract's English OCR model, 5 MB) is no longer tracked (Chief). It was a
  cache file `tesseract.js` writes to the working folder for `services/medlens-local/ecg-ocr.mjs`,
  copied in with the migration though neither legacy nor upstream tracked it; it stays on disk
  and `*.traineddata` is ignored. A fresh machine downloads it on the first OCR run.
- `README.md` links now point to `drferdi/Medassist` and the `drferdi` profile (Chief).

## 2026-09-26 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/med-assist` was copied as it is
  to `projects/healthcare/med-assist`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `CLAUDE.md`, `graphify-out/`, `.output/`, `.wxt/`,
  `.env.local`, `node_modules/`.
- Toolchain: pnpm 9.15.0 became pnpm 11.21.0 with a fresh lockfile and `nodeLinker: hoisted`;
  Node 22 became Node 24. The pnpm 9 override block was dropped; the inert npm-style
  `overrides` field was left untouched.
- `pnpm audit` on 2026-09-26 found critical advisories in `vitest` 2.x (the legacy override
  only covered 3.x, so legacy was affected too). Raised `vitest` and `@vitest/ui` to
  `^4.1.11`, `vite` to `^6.4.3`, `wxt` to `^0.20.27`, `sharp` to `^0.35.4`; five scoped
  overrides cover the `web-ext-run` chain of wxt and wxt's esbuild. Audit then reported no
  known vulnerabilities. Build scripts allowed: `esbuild`, `sharp`; denied: `tesseract.js`
  (donation message), `spawn-sync` (old polyfill).
- `test` is the full Vitest suite (`vitest.config.ts`): 135 files, 926 passing, 16 skipped,
  and it includes every clinical test under `components/clinical/`, `lib/` and
  `entrypoints/sidepanel/`. The narrower `vitest.clinical.config.ts` and
  `vitest.unit.config.ts` were already broken in legacy (no `tests/setup.ts`, pinned
  `.pnpm` paths) and are left unchanged.
- Lint had five inherited errors (same eslint 9.39.5 as the legacy lockfile; the legacy
  `node_modules` could no longer run): two debug `console.log` lines in
  `DiagnosisWorkspace.test.tsx` were removed (assertions untouched), and three stale
  `eslint-disable-next-line import-x/order` comments referencing a plugin that is not
  installed were removed from the MedLens tests.
- `run` for a browser extension is `scripts/check-extension.mjs`: it loads the built MV3
  output like `chrome://extensions` does and checks every referenced file. `deployDryRun` is
  `wxt zip` (store package, no upload).
- Legacy references were removed: `AGENTS.md` was rewritten with the domain rules kept,
  `entrypoints/sidepanel/AGENTS.md` now points to the capsule router, and absolute legacy
  paths in docs and the `source_file` provenance fields of `public/data/penyakit.json` were
  rewritten (text only; the JSON stays valid and no clinical field changed).
