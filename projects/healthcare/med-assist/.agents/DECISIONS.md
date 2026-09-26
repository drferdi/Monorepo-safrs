# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

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
