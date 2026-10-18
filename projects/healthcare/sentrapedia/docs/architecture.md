# Sentrapedia — Architecture

Current reference as of 2026-10-18. Incorporates the merged analysis from `docs/architecture.md` and `docs/architecture-overview-2026-10-11.md` (TD-38).

## 1. What Sentrapedia is

Sentrapedia is an Indonesia-first clinical reasoning and documentation workspace for **fictional** clinical encounters. It assists clinicians by producing structured clinical drafts for physician review.

- **Interface**: Bahasa Indonesia with standard English medical terms retained (`src/app/layout.tsx` sets `lang="id"`).
- **Synthetic-only boundary**: Designed strictly for synthetic/fictional patient data. PII sanitizers run in both browser and gateway to reject real personal identifiers.
- **Review model**: The reviewing clinician has ultimate authority. Drafts are labelled "Draf", "Ditinjau", and "Final" as local workflow status markers, not automated prescriptions.
- **Sovereign capsule**: Resides at `projects/healthcare/sentrapedia` with its own toolchain, dependencies, Python runtime, and tests. The monorepo root provides governance only.

## 2. Overall architecture and topology

The system consists of a browser clinical cockpit, a local Next.js server, a bundled Python diagnostic engine (MIRA), local CPU vector grounding (TheOracle), and an external LLM provider.

```text
 ┌──────────────────────────── Browser (client) ────────────────────────────┐
 │ src/components/workspace.tsx  (useReducer coordinator, Clinical Cockpit)  │
 │   ├─ generate() ── 13 local modes ─► src/lib/drafts.ts / workflow.ts     │
 │   └─ analyzeMain() ── 5 AI modes ──► src/lib/mira/composer.ts            │
 │                                       └► src/lib/mira/client.ts          │
 │ src/lib/mira/presentation.ts ◄── oracle/sentrapedia.json (144 catalog)   │
 │ localStorage "sentrapedia-workspace-v1" (unencrypted browser store)      │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ POST /api/mira (same-origin, localhost)
 ┌───────────────────────────────▼─ Next.js server 127.0.0.1:3101 ──────────┐
 │ src/app/api/mira/route.ts → src/lib/mira/gateway.ts                      │
 │   ├─ src/lib/theoracle-grounding.ts ──► theoracle/index/ (ONNX CPU)      │
 │   ├─ Single-flight gate, payload bounds, and loopback verification       │
 │   └─ fetch Bearer <per-run token>, X-MIRA-Case-Origin: synthetic         │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ http://127.0.0.1:<random port>/v1/...
 ┌───────────────────────────────▼─ Bundled MIRA engine (Python 3.11, FastAPI)┐
 │ mira/service/app.py → engine.py (StepEngine) → postchecks.py             │
 │ auth.py (per-run token) · privacy.py (PII checks) · audit.py (hash log)  │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ HTTPS (OpenAI-compatible endpoint)
                       Google Gemini API (gemini-3.1-flash-lite)
                       [OpenRouter / Claude / OpenAI supported, currently inactive]
```

### 2.1 Subsystems and key directories

| Directory / File | Role & Contents | Status |
| --- | --- | --- |
| `src/app/` | Next.js 16.4 App Router shell: `layout.tsx`, `page.tsx`, design tokens, and the single server route `src/app/api/mira/route.ts`. | Live |
| `src/components/` | React 19 UI components: `workspace.tsx` (cockpit coordinator), `composer.tsx`, `diagnosis-document.tsx`, `document-studio.tsx`, `clinical-panel.tsx`. | Live |
| `src/lib/` | Core logic: `workspace.ts` & `workspace-session.ts` (storage & restore), `workflow.ts` (review & drafts), `drafts.ts` (18 modes), `theoracle-evidence-gate.ts`. | Live |
| `src/lib/mira/` | MIRA client & gateway: `gateway.ts` (safety & orchestration), `client.ts` (browser fetch), `composer.ts` (case mapping), `presentation.ts` (formatting). | Live |
| `mira/` | Bundled Python 3.11 FastAPI diagnosis engine: `service/settings.py` and `common/guard.py` are capsule-owned; remaining engine files are hash-pinned in `SOURCE.json`. | Live |
| `theoracle/` | Medical knowledge index: 20,465 reference chunks (`theoracle/index/`), verified by manifest, embedded via local `EmbeddingGemma-300m-ONNX` (1.2 GB on CPU). | Live |
| `oracle/sentrapedia.json` | 144 primary care SKDI 4A disease records feeding the clinical library dialog and drug-name matching. | Live |
| `apps/site/` | Decoupled static marketing site. Self-contained build writing untracked HTML to `apps/site/site/` from `apps/site/source/` and `apps/site/static/`. | Live, separate |
| `scripts/` | System launcher `run-system.mjs`, runtime supervisor `mira-runtime.mjs`, build, install, and test tools. | Live |
| `tests/` | Unit, pipeline, and UI smoke tests (`tests/ui/workspace-smoke.test.tsx`) in Vitest. | Live |

## 3. Runtime supervisor and startup lifecycle

The system is started via `npm run dev` (or `npm start` for production), which executes `scripts/run-system.mjs`:

1. **Environment check**: Reads `.env.local` and validates presence of `GEMINI_API_KEY`.
2. **Python virtual environment verification**: Ensures `.runtime/mira/venv` exists and matches `mira/requirements.lock`.
3. **Engine initialization**:
   - Generates a 32-byte cryptographically random per-run bearer token.
   - Selects a free loopback port dynamically.
   - Spawns the Uvicorn FastAPI server on `127.0.0.1` (wrapped by `managed_child.py` on Windows to guarantee cleanup on exit).
4. **Readiness probe**: Polls the engine `/healthz` endpoint for up to 30 seconds until the expected version and capabilities match.
5. **Next.js server start**: Spawns Next.js on `127.0.0.1:3101` (or `$PORT`), injecting `MIRA_SERVICE_URL` and `MIRA_SERVICE_TOKEN`.
6. **Grounding model warm-up**: Asynchronously pings `/api/mira` to preload the local 1.2 GB ONNX embedding model into memory before user queries arrive.
7. **Process supervision**: If the MIRA engine process halts, the supervisor restarts it with exponential backoff (2 s to 30 s). If Next.js exits, the entire process tree terminates.

## 4. Diagnostic and therapy pipeline

### 4.1 Mode routing (18 modes)
- **AI-assisted modes (5)**: `question`, `ddx`, `workup`, `refer`, and `icd10` invoke `/api/mira`.
- **Local template modes (13)**: Clinic note, HPI, SOAP, referral letters, scribe, patient education, etc., format deterministically without AI or network calls (`src/lib/drafts.ts`).

### 4.2 Step-by-step MIRA request flow

1. **Case assembly (`src/lib/mira/composer.ts`)**:
   - Chief complaint is extracted from prompt text.
   - Patient age and sex are attached.
   - Patient name and identifiers are stripped.
2. **Client validation (`src/lib/mira/client.ts`)**:
   - Verifies structured case shape (`validCase`).
   - Asserts synthetic consent flag (`synthetic: true`).
   - Runs `containsIdentity` regex to block Indonesian identity formats (NIK, BPJS, phone numbers, email, titles with names).
3. **Gateway safety boundary (`src/lib/mira/gateway.ts`)**:
   - Enforces loopback origin/host checks.
   - Enforces 32 KB body size limit.
   - Applies single-flight lock (`active` flag; returns `BUSY` on concurrent calls).
4. **Local TheOracle grounding (`src/lib/theoracle-grounding.ts`)**:
   - Runs local CPU ONNX embedding (`embeddinggemma-300m`).
   - Retrieves top 6 relevant diagnosis passages plus 1 therapy dose passage from 20,465 indexed chunks.
5. **MIRA diagnosis step (`mira/service/app.py`)**:
   - MIRA verifies HMAC token and synthetic headers.
   - Sends case narrative and evidence passages to Google Gemini API (`gemini-3.1-flash-lite`).
   - Per-step budget ceiling ($0.10 USD) and 20 s deadline.
6. **Post-checks (`mira/service/postchecks.py`)**:
   - Validates ICD-10 codes against the local ICD dictionary.
   - Filters sex-incompatible differential diagnoses.
7. **Targeted therapy step**:
   - Runs a secondary focused retrieval for the leading diagnosis.
   - Queries Gemini for drug regimen, drug-drug interactions (DDI), and contraindications.
8. **Therapy Evidence Gate (`src/lib/theoracle-evidence-gate.ts`)**:
   - Compares recommended drug doses against retrieved TheOracle evidence passages.
   - **Any dose not supported verbatim in the local evidence is stripped** and marked `doseRemoved`.
   - The UI displays `"dosis: cek pedoman"` instead of an unverified dose.
9. **Presentation & rendering (`src/lib/mira/presentation.ts`)**:
   - Formats document into 6 standardized sections with line-by-line reveal animation (`src/components/diagnosis-document.tsx`).
   - Re-runs the evidence gate on stored drafts upon view to guarantee retrospective safety.

## 5. Model providers and multi-model strategy

- **Active provider**: Google Gemini API direct via its OpenAI-compatible endpoint using model `gemini-3.1-flash-lite`. Tunables are configured in `scripts/mira-profile.json` (daily budget $5 USD, per-step $0.10 USD).
- **Supported providers**: The architecture maintains support for Claude, OpenAI, Gemini, and OpenRouter. OpenRouter infrastructure in `mira/service` and `mira/common/providers.py` remains active and supported for future multi-provider routing, though inactive by default under the current Gemini launcher configuration.

## 6. Data storage and recovery

- **Browser-local storage**: Patient profiles, encounters, lists, and drafts persist in `sentrapedia-workspace-v1` via `localStorage`. No patient data is sent to a remote database.
- **Unreadable workspace backup**: If stored data fails schema validation upon startup, `restoreFromStorage` backs up the raw string to `sentrapedia-workspace-v1-unreadable`, displays a non-destructive user notice, and offers a download of the unreadable data from the settings dialog rather than silently wiping it.
