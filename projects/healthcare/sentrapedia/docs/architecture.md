# Sentrapedia — Architecture

Current reference as of 2026-10-18 and the only architecture document (TD-38). It merges the former `docs/architecture-overview-2026-10-11.md` and the 2026-10-17 maintainer's review (`docs/ARCHITECTURE-2026-10-17.md`); both are in git history. Trust the code over this page when they disagree.

## Glossary

| Term | Plain meaning |
| --- | --- |
| Capsule | A self-contained project folder in the monorepo with its own dependencies, config, tests and CI. |
| Next.js | The web framework that serves the workspace page and its one server endpoint, `/api/aadi`. Version 16.4, which has breaking changes from older Next.js. |
| AADI | The bundled Python (FastAPI) diagnosis engine. It sends a case to an AI model and returns a structured differential. |
| Gemini | Google's AI model service. AADI calls `gemini-3.1-flash-lite` directly; every call costs money. |
| TheOracle | The local search index of 17,990 medical reference passages that grounds every AI answer. |
| Oracle (catalog) | A different file of 330 disease records, derived from the knowledge SSOT, shown in the "Pustaka Klinis" library. The similar names are a trap. |
| Evidence gate | Code that removes any drug dose it cannot find word for word in the retrieved passages. |
| Synthetic data | Fictional patient cases. The whole product is for synthetic data only. |
| SAFRS / R0-R3 | The monorepo's risk tiers: R0 read-only, R1 small reversible, R2 reviewed boundary change, R3 needs the owner's prior approval (includes clinical logic). |

## 1. What Sentrapedia is

Sentrapedia is an Indonesia-first clinical reasoning and documentation workspace for **fictional** clinical encounters. It assists clinicians by producing structured clinical drafts for physician review.

- **Interface**: Bahasa Indonesia with standard English medical terms retained (`src/app/layout.tsx` sets `lang="id"`).
- **Synthetic-only boundary**: Designed strictly for synthetic/fictional patient data. PII sanitizers run in both browser and gateway to reject real personal identifiers, and the engine refuses `AADI_SERVICE_ENV=production` (`aadi/service/settings.py`, `check_startup`).
- **Review model**: The reviewing clinician has ultimate authority. Drafts are labelled "Draf", "Ditinjau", and "Final" as local workflow status markers, not automated prescriptions.
- **Not** an electronic health record, a validated clinical device, or integrated with SATUSEHAT or BPJS.
- **Sovereign capsule**: Resides at `projects/healthcare/sentrapedia` with its own toolchain, dependencies, Python runtime, tests and CI (`.github/workflows/ci.yml`). The monorepo root provides governance only.

## 2. Overall architecture and topology

The system consists of a browser clinical cockpit, a local Next.js server, a bundled Python diagnostic engine (AADI), local CPU vector grounding (TheOracle), and an external LLM provider. All patient-like data stays in the browser, except the case text and evidence passages sent to Gemini for an AI answer.

```text
 ┌──────────────────────────── Browser (client) ────────────────────────────┐
 │ src/components/workspace.tsx  (useReducer coordinator, Clinical Cockpit)  │
 │   ├─ generate() ── 13 local modes ─► src/lib/drafts.ts / workflow.ts     │
 │   └─ analyzeMain() ── 5 AI modes ──► src/lib/aadi/composer.ts            │
 │                                       └► src/lib/aadi/client.ts          │
 │ src/lib/aadi/presentation.ts ◄── oracle/sentrapedia.json (330 catalog)   │
 │ localStorage "sentrapedia-workspace-v1" (unencrypted browser store)      │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ POST /api/aadi (same-origin, localhost)
 ┌───────────────────────────────▼─ Next.js server 127.0.0.1:3101 ──────────┐
 │ src/app/api/aadi/route.ts → src/lib/aadi/gateway.ts                      │
 │   ├─ src/lib/theoracle-grounding.ts ──► theoracle/index/ (ONNX CPU)      │
 │   ├─ Single-flight gate, payload bounds, and loopback verification       │
 │   └─ fetch Bearer <per-run token>, X-AADI-Case-Origin: synthetic         │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ http://127.0.0.1:<random port>/v1/...
 ┌───────────────────────────────▼─ Bundled AADI engine (Python 3.11, FastAPI)┐
 │ aadi/service/app.py → engine.py (StepEngine) → postchecks.py             │
 │ auth.py (per-run token) · privacy.py (PII checks) · audit.py (hash log)  │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ HTTPS (OpenAI-compatible endpoint)
                       Google Gemini API (gemini-3.1-flash-lite)
                       [OpenRouter / Claude / OpenAI supported, currently inactive]
```

### 2.1 Subsystems and key directories

| Directory / File | Role & Contents | Status |
| --- | --- | --- |
| `src/app/` | Next.js 16.4 App Router shell: `layout.tsx`, `page.tsx`, design tokens, and the single server route `src/app/api/aadi/route.ts`. | Live |
| `src/components/` | React 19 UI components: `workspace.tsx` (cockpit coordinator), `composer.tsx`, `diagnosis-document.tsx`, `document-studio.tsx`, `clinical-panel.tsx`. | Live |
| `src/lib/` | Core logic: `workspace.ts` & `workspace-session.ts` (storage & restore), `workflow.ts` (review & drafts), `drafts.ts` (18 modes), `theoracle-evidence-gate.ts`. | Live |
| `src/lib/aadi/` | AADI client & gateway: `gateway.ts` (safety & orchestration), `client.ts` (browser fetch), `composer.ts` (case mapping), `presentation.ts` (formatting). | Live |
| `aadi/` | Bundled Python 3.11 FastAPI diagnosis engine. `SOURCE.json` records every file's origin; capsule-owned files (most of `service/`, `common/guard.py`) carry no pin, the rest stay byte-identical to upstream. `ruff.toml` lints the capsule-owned files. | Live |
| `theoracle/` | Knowledge SSOT (`theoracle/ssot/`) and the index derived from it by `npm run knowledge:build`: 17,990 reference chunks (`theoracle/index/`), verified by manifest, embedded via local `EmbeddingGemma-300m-ONNX` (1.2 GB on CPU, downloaded at install into the gitignored `theoracle/model/`). | Live |
| `oracle/sentrapedia.json` | 330 disease records derived from the knowledge SSOT, feeding the clinical library dialog and drug-name matching. | Live |
| `apps/site/` | Decoupled static marketing site (section 9). | Live, separate |
| `scripts/` | System launcher `run-system.mjs`, runtime helpers `aadi-runtime.mjs`, build, install, and test tools. | Live |
| `tests/` | Unit, pipeline, launcher and UI smoke tests (`tests/ui/workspace-smoke.test.tsx`) in Vitest and `node --test`. | Live |
| `.agents/` | Working notes for agents: CONTEXT, DECISIONS, HANDOFF. | Process |
| `.runtime/`, `.next/`, `verify-report/` | Local working files, logs, build output. Not in git. | Generated |

## 3. Runtime supervisor and startup lifecycle

The system is started via `npm run dev` (or `npm start` for production), which executes `scripts/run-system.mjs`. Bare `npx next dev` starts no engine and answers analyses with HTTP 502.

1. **Environment check**: Reads `.env.local` and requires `GEMINI_API_KEY`; `preflightProvider` (`scripts/aadi-runtime.mjs`) reads the model's metadata with the key, without a paid completion, and stops on a rejected key.
2. **Python virtual environment verification**: Ensures `.runtime/aadi/venv` exists and matches `aadi/requirements.lock`.
3. **Engine initialization**:
   - Generates a 32-byte cryptographically random per-run bearer token.
   - Selects a free loopback port dynamically.
   - Spawns the Uvicorn FastAPI server on `127.0.0.1` (wrapped by `managed_child.py` on Windows to guarantee cleanup on exit).
4. **Readiness probe**: Polls the engine `/healthz` endpoint for up to 30 seconds until the expected version and capabilities match.
5. **Next.js server start**: Spawns Next.js on `127.0.0.1:3101` (or `$PORT`), injecting `AADI_SERVICE_URL` and `AADI_SERVICE_TOKEN`.
6. **Grounding model warm-up**: Asynchronously pings `/api/aadi` to preload the local 1.2 GB ONNX embedding model into memory before user queries arrive.
7. **Process supervision**: If the AADI engine process halts, the supervisor restarts it with exponential backoff (2 s to 30 s, reset after a minute of running) and probes `/healthz` again; the fifth crash in a row ends the system (`nextRestart` in `scripts/aadi-runtime.mjs`). If Next.js exits, the entire process tree terminates.

## 4. Diagnostic and therapy pipeline

### 4.1 Mode routing (18 modes)
- **AI-assisted modes (5)**: `question`, `ddx`, `workup`, `refer`, and `icd10` invoke `/api/aadi`.
- **Local template modes (13)**: Clinic note, HPI, SOAP, referral letters, scribe, patient education, etc., format deterministically without AI or network calls (`src/lib/drafts.ts`).

| Feature | Uses AI (AADI)? |
| --- | --- |
| Composer modes: question, ddx, workup, icd10, refer | Yes |
| The other 13 composer modes and personal templates | No, local templates |
| Pustaka Klinis, "Penyakit" tab (disease catalog) | No, local file |
| Pustaka Klinis, "Analisis kasus" tab | Yes |
| Voice dictation | No, the browser's built-in speech recognition (which may use the browser vendor's service) |
| Document views, review status, history, search, command palette | No |

### 4.2 Step-by-step AADI request flow

1. **Case assembly (`src/lib/aadi/composer.ts`)**:
   - Chief complaint is extracted from prompt text.
   - Patient age and sex are attached.
   - Patient name and identifiers are stripped.
2. **Client validation (`src/lib/aadi/client.ts`)**:
   - Verifies structured case shape (`validCase`).
   - Asserts synthetic consent flag (`synthetic: true`).
   - Runs `containsIdentity` regex to block Indonesian identity formats (NIK, BPJS, phone numbers, email, titles with names).
3. **Gateway safety boundary (`src/lib/aadi/gateway.ts`)**:
   - Enforces loopback origin/host checks.
   - Enforces 32 KB body size limit.
   - Applies single-flight lock (`active` flag; returns `BUSY` on concurrent calls).
4. **Local TheOracle grounding (`src/lib/theoracle-grounding.ts`)**:
   - Runs local CPU ONNX embedding (`embeddinggemma-300m`).
   - Retrieves top 6 relevant diagnosis passages plus 1 therapy dose passage from 17,990 indexed chunks.
5. **AADI diagnosis step (`aadi/service/app.py`)**:
   - AADI verifies HMAC token and synthetic headers.
   - Sends case narrative and evidence passages to Google Gemini API (`gemini-3.1-flash-lite`).
   - Per-step budget ceiling ($0.10 USD) and 20 s deadline; a failed call is never retried.
6. **Post-checks (`aadi/service/postchecks.py`)**:
   - Validates ICD-10 codes against the local ICD dictionary.
   - Filters sex-incompatible differential diagnoses.
7. **Targeted therapy step**:
   - Runs a secondary focused retrieval for the leading diagnosis.
   - Queries Gemini for drug regimen, drug-drug interactions (DDI), and contraindications. If this step fails, the diagnosis is still shown without therapy.
8. **Therapy Evidence Gate (`src/lib/theoracle-evidence-gate.ts`)**:
   - Compares recommended drug doses against retrieved TheOracle evidence passages.
   - **Any dose not supported verbatim in the local evidence is stripped** and marked `doseRemoved`.
   - The UI displays `"dosis: cek pedoman"` instead of an unverified dose.
9. **Presentation & rendering (`src/lib/aadi/presentation.ts`)**:
   - Formats document into 6 standardized sections with line-by-line reveal animation (`src/components/diagnosis-document.tsx`).
   - Re-runs the evidence gate on stored drafts upon view to guarantee retrospective safety.

**Limits and errors.** The overall gateway timeout is 65 s on the targeted path (45 s without the therapy step). Every failure becomes `{error: {code, message}}` with a short Indonesian message and a code such as `TIMEOUT`, `BUSY` or `IDENTITY`; the browser keeps the code on `AadiRequestError`. The "thinking" animation while waiting runs on a timer and does not reflect real progress (`src/lib/typing.ts`).

### 4.3 Where knowledge comes from

| Source | What it does |
| --- | --- |
| `theoracle/index/` | 17,990 passages (2,404 from the SSOT, 15,586 from guideline PDFs) searched for each case and sent to the AI. |
| `theoracle/ssot/sentrapedia-knowledge-ssot.json` | The single knowledge source (v0.6, 336 entries); the index and the catalog are derived from it. |
| `aadi/service/data/icd10.json` and `aadi/service/rules/` | Code and sex checks after the AI answers. |
| `oracle/sentrapedia.json` | Library catalog and drug-name matching in the dose gate. Never sent to the AI. |

## 5. Model providers and multi-model strategy

- **Active provider**: Google Gemini API direct via its OpenAI-compatible endpoint using model `gemini-3.1-flash-lite`. Tunables are configured in `scripts/aadi-profile.json` (per-step $0.10 USD, 20 s); the launcher sets a $5 USD daily budget. The engine refuses to start when the model has no price in `aadi/common/guard.py`.
- **Supported providers**: The architecture maintains support for Claude, OpenAI, Gemini, and OpenRouter. OpenRouter infrastructure in `aadi/service` and `aadi/common/providers.py` remains active and supported for future multi-provider routing, though inactive by default under the current Gemini launcher configuration.

## 6. Data storage and recovery

- **Browser-local storage**: Patient profiles, encounters, lists, and drafts persist in `sentrapedia-workspace-v1` via `localStorage`. Storage is unencrypted and not synced. No patient data is sent to a remote database. Each document keeps up to 20 revisions, and a warning appears from 4 million stored characters.
- **Unreadable workspace backup**: If stored data fails schema validation upon startup, `restoreFromStorage` backs up the raw string to `sentrapedia-workspace-v1-unreadable`, displays a non-destructive user notice, and offers a download of the unreadable data from the settings dialog rather than silently wiping it.
- **Engine audit ledger**: one JSON line per step in `.runtime/aadi-deepseek/audit/audit-<UTC day>.jsonl` with metadata plus `requestSha256` and `responseSha256`, never the case text; day files older than 14 days are deleted when the engine starts (`aadi/service/app.py`, `prune_audit`). Today's file also restores the daily budget after a restart.

## 7. Build, test and run commands

Use the npm scripts in the capsule's `package.json`; they wrap everything, including Python. CI runs the same lifecycle on every pull request.

| Command | What it does |
| --- | --- |
| `npm ci` | Installs Node packages, then builds the Python environment and downloads the 1.2 GB model. `SENTRAPEDIA_SKIP_AADI=1` and `SENTRAPEDIA_SKIP_MODEL=1` skip those two steps (enough for lint and typecheck). |
| `npm run dev` / `npm start` | Starts engine and website (section 3); `start` needs `npm run build` first. |
| `npm run system:check` | Checks the Python environment and the key without starting servers. |
| `npm run build` | Builds the website, bundles the engine and model into `.next/standalone`, and builds the marketing site. |
| `npm run lint` / `npm run typecheck` | ESLint for `src`, `tests` and `scripts` plus the site's lint / `tsc --noEmit`. Python: `uvx ruff@0.17.1 check aadi`. |
| `npm test` | Vitest (logic, pipeline, UI smoke) plus the marketing site's node tests. |
| `npm run test:system` / `npm run test:aadi` | Launcher tests / the Python engine tests with the AI mocked (no cost). |
| `npm run test:all` | All of the above test sets. |
| `npm run deploy:dry-run` | Checks the build output is self-contained and reports which platform its native binaries are for. Does not deploy. |

`aadi/service/smoke_live.py` and `sim_benchmark.py` call the real AI and cost money; treat them as needing owner approval. `sim_benchmark.py` is a pinned upstream file that runs only from the upstream `assist/` folder: its encounter imports `run_one_case.py` and `aadi_adapter`, which the capsule does not ship. In the capsule only its pure functions run, in `test_components.py`.

## 8. The five files to understand first

1. **`src/lib/aadi/gateway.ts`.** The trust boundary: every server-side safety check, timeout, cost check and error message, and the diagnosis-then-therapy-then-dose-gate pipeline.
2. **`scripts/run-system.mjs` with `scripts/aadi-runtime.mjs`.** How the system starts, which provider and key are used, the budget, ports and restarts.
3. **`src/components/workspace.tsx`.** The one page component: app state and whether a request goes to AI or a template. Saving, restore, media queries and the toast live in `workspace-hooks.ts`; the header, home, conversation and chat composer in `workspace-views.tsx`; the record dialogs in `workspace-forms.tsx`. Covered by the UI smoke tests.
4. **`aadi/service/engine.py`.** Deadlines, cost caps, the error circuit breaker, and how every failure becomes a safe "unavailable" answer.
5. **`src/lib/theoracle-grounding.ts`.** Decides which evidence the AI sees.

Runner-up: `src/lib/aadi/presentation.ts`, which turns AI output into the clinical document and re-checks doses every time a saved document is shown.

## 9. The marketing site (`apps/site/`)

A hand-built static website with no framework and no shared code with the clinical app. `apps/site/scripts/transform.mjs` builds pages from `source/`, `assets/` and `static/` into `site/`, which is untracked build output. A test hashes every tracked site file against `apps/site/docs/migration-manifest.json`; regenerate it with `npm --prefix apps/site run manifest`. Hosting is Vercel (not Git-linked, so a CLI deploy must build first), and the contact form sends email through Resend; without Resend settings it refuses requests.

## 10. Conventions

- **Folders.** `src/app` for routes only, `src/components` for screens, `src/lib` for logic, `tests/` at the top. File names are lower-case with dashes.
- **Language.** All user-facing text and error messages are Indonesian; medical terms stay in English. Repository docs are English.
- **Errors.** The engine never answers with a server error; it returns a contract-valid "unavailable" answer instead.
- **Validation.** Hand-written checks and JSON schemas guard every boundary, in both directions.
- **Styling.** Plain CSS with design tokens (teal palette, 2 px corners, no decorative shadows). No Tailwind.
- **Code density.** Many long single lines and comments citing owner decisions with dates. This is the house style.
- **Commits.** `type(scope): message (R1|R2)` with a `Co-Authored-By` line.

## 11. Sharp edges

- **The Gemini key reaches the web server process**: the launcher passes its whole environment to Next.js (`scripts/run-system.mjs`, `webEnv`).
- **Two consent models**: the main composer always declares the case synthetic (`src/components/workspace.tsx`); the library's "Analisis kasus" form requires a checkbox (`src/components/aadi-case-form.tsx`).
- **Synthetic-only is a policy, not a guarantee**: identity patterns catch common formats only (`src/lib/aadi/contract.ts`, `aadi/service/privacy.py`).
- **Saved AI documents can change**: doses are re-checked on every display, so a gate change can alter old documents.
- **Daily budget text mismatch**: the case form says US$1 per day (`src/components/aadi-case-form.tsx`); the launcher sets US$5 (`scripts/aadi-runtime.mjs`).
- **A bad `AADI_FAST_COPIES` value** raises inside the engine (`aadi/service/engine.py`) rather than at startup.
- **Docker is single-user and local only**: the image has no login; publish it as `docker run -p 127.0.0.1:3000:3000 ...`, never on a public port. CI builds the image but never runs it.
- **A standalone build carries the native binaries of the machine that built it**; `deploy:dry-run` warns when they are not linux-x64.
- **Git LFS is required**: without it the index vectors and media arrive as pointer files.
- **`next dev` rewrites part of `AGENTS.md`** (the Next.js agent-rules block).
- **Naming traps**: `src/lib/theoracle.ts` reads the Oracle catalog, not TheOracle; the audit folder is named `aadi-deepseek` but serves Gemini; the default ports in code (8787 in the gateway, 8765 in the engine docstring) are never used because the launcher picks a random port.
