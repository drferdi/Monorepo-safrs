# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

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
