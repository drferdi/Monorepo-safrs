# Sentrapedia context

Current state only, rewritten 2026-10-17. History lives in git (`git log -p .agents/CONTEXT.md`), `.agents/DECISIONS.md` and `.agents/HANDOFF.archive.md`.

## Product and topology

- One sovereign capsule and future repository (2026-10-14). The clinical workspace is the Next.js app at the capsule root; the public marketing site is `apps/site/`; a future demo belongs in `apps/demo/` and reuses product code with synthetic data.
- Purpose: a clinical workspace with an Indonesian UI and browser-local workflows. Stack: Next.js 16.4, React 19.3, TypeScript, Lucide, Vitest; Python 3.11+ for the bundled MIRA engine.
- Keep every runtime, build, test and deployment dependency inside the capsule; the monorepo root is governance only.

## Runtime

- `npm run dev` (and `npm start`) run `scripts/run-system.mjs`: it starts the bundled MIRA engine under `mira/` on a random loopback port with a per-run token, restarts it with backoff if it stops, then starts Next and warms TheOracle. `npx next dev` alone starts no engine.
- MIRA calls the Gemini API directly: `GEMINI_API_KEY` in the environment or `.env.local`, the engine's `openai` provider pointed at Google's OpenAI-compatible endpoint, model `gemini-3.1-flash-lite` for both stages. Tunables live in `scripts/mira-profile.json`: 0.10 USD and 20 s per step, 25 s gateway margin, `fastCopies` 1. The launcher sets a 5 USD daily budget.
- Fast assessment skips the planning call and runs diagnosis, workup and therapy as parallel parts (`MIRA_FAST_COPIES` copies each, first valid answer wins). With one copy there is no retry inside a step and no complete-regimen grace.
- `mira/SOURCE.json` pins every packaged engine file by hash; editing a pinned file needs Gaffer's approval and a repin. `settings.py`, `common/providers.py` and `common/guard.py` must stay byte-identical to upstream.
- TheOracle (`theoracle/`) is the single knowledge source: 20,465 chunks (count in the manifest) with local EmbeddingGemma-300m vectors, verified by `theoracle/index/manifest.json`; `src/lib/theoracle-grounding.ts` embeds the query on local CPU. `npm ci` downloads the 1.2 GB model into `theoracle/model/` (git-ignored). `oracle/sentrapedia.json` (144 disease records) feeds the read-only disease catalog through `src/lib/theoracle.ts`.

## Workspace behaviour

- Layout: three-column Clinical Cockpit (navigation, document canvas, context and Timeline panel above 1200 px; a panel dialog below; navigation drawer at 760 px and below). Four intent groups (Analisis, Dokumentasi, Rencana, Komunikasi) over 18 modes; slash picker, Focus Mode and Command Center (Ctrl/Cmd+J).
- Main composer Enter on an analysis mode sends the case to `/api/mira` after a fictional-data confirmation; the answer becomes a draft with its full source, trace and a fresh review checklist. The answer shows six sections (Ringkasan Gejala, Differential Diagnosis, Diagnosis, Penunjang, Terapi Farmakologi, Edukasi) and TheOracle references; fresh answers reveal line by line. A therapy evidence gate removes doses the retrieved evidence does not support.
- Data: `src/lib/workspace.ts` owns patients, lists, encounters and messages in unencrypted browser storage (`sentrapedia-workspace-v1`). A saved workspace that fails validation is kept under `sentrapedia-workspace-v1-unreadable` and offered as a download. `src/lib/workflow.ts` adds personal templates, review checklists and up to 50 revisions per document; editing resets a document to draft, and final requires every required review item.
- Local drafting (`src/lib/drafts.ts`, `note-structure.ts`) builds clinician-review templates from labelled input without clinical inference or external AI.
- Language: Indonesian interface and default document language; English medical terms and saved language preferences are kept. Stored text is never translated in place.

## Safety boundary

- Fictional data only. Browser storage is unencrypted and not synced. The local engine has no production authentication and must stay on loopback. Prompts go to Google under the Gemini API terms (paid-tier key). Optional browser speech recognition may use the browser vendor's service.
- Nothing here is clinically validated; answers are drafts for physician review, never automatic prescriptions or finalisation.

## Where to look

- Lifecycle commands: `project.contract.json` and `package.json`; tests in `docs/testing.md`; setup in `docs/mira-integration.md`.
- Known debt and its ranking: `docs/TECH-DEBT.md`. Current work: the newest entries in `.agents/HANDOFF.md`.
