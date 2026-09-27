# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

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
