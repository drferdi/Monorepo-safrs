# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

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
