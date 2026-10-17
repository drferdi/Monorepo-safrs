# Sentrapedia: Architecture and Maintainer's Mental Model

Date: 2026-10-17 · Branch: `feat/sentrapedia-hero-workspace` · Commit examined: `9af7a45c`

> **About the file name.** This was requested as `docs/ARCHITECTURE.md`. On this Windows checkout, file names ignore upper and lower case, so that name is the same file as the existing `docs/architecture.md`. Writing it would have overwritten that tracked document. If you want this file to replace the old one, run `git mv -f docs/ARCHITECTURE-2026-10-17.md docs/ARCHITECTURE.md` on purpose.

## How to read this document

**Scope.** This covers the Sentrapedia capsule only: the folder `projects/healthcare/sentrapedia` inside the larger Sentra monorepo. The capsule's own `AGENTS.md` calls this folder "the single sovereign Sentrapedia capsule and future repository boundary", so it is treated as the repository you now own. The monorepo around it is mentioned only where its rules affect you.

**Method.** Five read-only investigators (AI subagents) each read one part of the code and cited file and line for every claim. The author then re-checked the three claims with the most privacy or security weight by hand. Nothing was built, tested, installed or started. Commands are "listed, not run".

**Markers.** Every claim carries one of these:

| Marker | Meaning |
| --- | --- |
| **Verified** | Someone read the named file and line. Re-checked by the author where it says "author-checked". |
| **Inferred** | A conclusion drawn from reading, with reasoning. It may be wrong. |
| **From docs** | Taken from README, HANDOFF, DECISIONS or other notes, not checked against code. |

**The tree was moving.** Another work session committed (`464c269e` became `9af7a45c`) while this was being written. The working tree is also dirty: about 85 staged files under `apps/site/` from another session, an uncommitted removal of a "Dify/Vera" chat integration, and edits to `.agents/HANDOFF.md`, `.agents/DECISIONS.md` and `.env.example`. Line numbers below refer to that state and will drift.

### Glossary

| Term | Plain meaning |
| --- | --- |
| Capsule | A self-contained project folder in the monorepo with its own dependencies and config. |
| Next.js | The web framework that serves the clinical workspace page and its one server endpoint. Version 16.4, which has breaking changes from older Next.js. |
| API route | A web address on the server that the page calls. Here there is only one: `/api/mira`. |
| MIRA | A small diagnosis service written in Python. It sends a case to an AI model and returns a structured list of possible diagnoses. It ships inside this capsule. |
| Gemini | Google's AI model service. MIRA calls the model `gemini-3.1-flash-lite` directly, which costs money per call. |
| TheOracle | A local search index of about 20,000 passages of medical reference text. It finds evidence for a case so the AI answer is grounded in it. |
| Oracle (catalog) | A different, older file of disease records shown in the "Pustaka Klinis" library. The similar names are a trap. |
| Grounding | Giving the AI model relevant reference passages along with the question. |
| Evidence gate | Code that removes any drug dose from the AI's answer that it cannot find word for word in the reference passages. |
| Synthetic data | Fictional patient cases. The whole product is meant for synthetic data only. |
| localStorage | Storage inside the user's own browser. Not encrypted. |
| SAFRS / R0-R3 | The monorepo's risk tiers for changes. R0 read-only, R1 small reversible, R2 reviewed boundary change, R3 needs the owner's prior approval (includes clinical logic). |

---

## 1. What Sentrapedia is, and is not

**In one sentence:** Sentrapedia is a browser-based workspace where a clinician types a (fictional) case and gets a draft clinical document, and for some document types an AI-generated differential diagnosis backed by local reference text.

- **It is** an Indonesia-first tool. The interface is in Bahasa Indonesia with English medical terms kept. *(Verified: `src/app/layout.tsx` sets `lang="id"`.)*
- **It is** for synthetic cases only. The engine refuses to start in production mode and forces a "synthetic-only" data policy. *(Verified: `mira/service/settings.py:129-131`, `scripts/mira-runtime.mjs:38`.)*
- **It is not** an electronic health record, a validated clinical device, or integrated with national systems such as SATUSEHAT or BPJS. *(From docs: `README.md:15-27`, `:81`.)*
- **The reviewing clinician has final authority.** The "Draf, Ditinjau, Final" status is a local label the user sets, not a clinical sign-off or audit trail. *(From docs: `.agents/DECISIONS.md:23`.)*
- **There is also a marketing website** in `apps/site/`. It is a separate static site with no shared code. *(Verified, section 8.)*

## 2. The big picture

**In plain words:** one command starts two programs on your own computer. A Python "engine" (MIRA) and a web server (Next.js). The web page talks only to the web server. The web server talks to the engine. The engine talks to Google's Gemini model over the internet. All patient-like data stays in the browser, except the case text and evidence passages sent to Gemini for an AI answer.

```
 Browser (one page: the workspace)
   |  saves everything in localStorage
   |  POST /api/mira  (only for 5 AI document types)
   v
 Next.js server  (port 3101, localhost only)
   |  safety checks, then searches TheOracle locally
   |  HTTP + secret token, random local port
   v
 MIRA engine (Python, FastAPI)
   |  HTTPS, paid
   v
 Google Gemini API  (gemini-3.1-flash-lite)
```

*(Verified: `scripts/run-system.mjs:57-99`, `src/lib/mira/gateway.ts`, `scripts/mira-runtime.mjs:8,35`.)*

### Folder map

| Folder or file | What it holds | Status |
| --- | --- | --- |
| `src/app/` | The single page and the single API route. | Live |
| `src/components/` | All screen pieces (about 25 React components). | Live |
| `src/lib/` | Pure logic: drafts, storage, search, the MIRA client and gateway. | Live |
| `mira/` | The Python diagnosis engine, copied from an upstream project and hash-pinned. | Live |
| `theoracle/index/` | The reference-text search index (tracked in git, large files via Git LFS). | Live |
| `theoracle/model/` | The 1.2 GB embedding model used for search. Downloaded at install, not in git. | Live |
| `oracle/sentrapedia.json` | The disease catalog shown in the library dialog. | Live |
| `oracle/*.ts`, `oracle/diseases.json` | Old copies of the catalog. Nothing imports them. | Dead |
| `oracle-ii/` | Leftover database fragments from a retired knowledge source. Not in git. | Dead |
| `data/dose-inventory/` | Offline dose data. Its rebuild script points at paths that no longer exist. | Stale |
| `scripts/` | The launcher, installers, build and test helpers. | Live |
| `tests/` | Automated tests for the web logic and launcher. | Live |
| `apps/site/` | The public marketing website. | Live, separate |
| `config/` | Example engine settings (named "deepseek" but configures Gemini). | Example only |
| `.agents/` | Working notes for AI agents: CONTEXT, DECISIONS, HANDOFF. | Process |
| `docs/` | Human documentation. Several files are stale (section 12). | Mixed |
| `.runtime/`, `verify-report/`, `.next/` | Local working files, logs, build output. Not in git. | Generated |

*(Verified by the investigators via `git ls-files` and import searches. "Dead" means no importer was found in `src`, `scripts`, `tests`, `mira`, `data` or `apps/site`.)*

## 3. How the system starts

**In plain words:** `npm run dev` does not just start a website. It runs a supervisor script that checks your AI key, starts the Python engine, waits for it to be healthy, then starts the website and warms up the search index.

1. **Load settings.** The launcher reads `.env.local`. *(Verified: `scripts/run-system.mjs:69`.)*
2. **Check the Python environment.** The engine's virtual environment must match the lock file, or startup stops. *(Verified: `scripts/mira-runtime.mjs:21-28`.)*
3. **Require `GEMINI_API_KEY`.** Without it nothing starts. The launcher asks Google once whether the key and model are valid, without running a paid completion. A rejected key stops startup. *(Verified: `scripts/mira-runtime.mjs:9-14,30`.)*
4. **Start the engine.** It picks a free port, generates a random secret token, and starts MIRA on `127.0.0.1`. On Windows it wraps the process so the whole tree is killed on exit. *(Verified: `scripts/run-system.mjs:37-38,57-63,72,80`.)*
5. **Wait until ready.** It polls the engine's health address for up to 30 seconds. The engine must report exactly the expected model and capabilities. *(Verified: `scripts/run-system.mjs:81-91`, `scripts/mira-runtime.mjs:58-63`.)*
6. **Start the website** on port 3101 (or `PORT`), passing the engine's address and token. *(Verified: `scripts/run-system.mjs:93-98`.)*
7. **Warm up.** It repeatedly calls the health check of `/api/mira` for up to 120 seconds, which loads the 1 GB search model into memory. *(Verified: `scripts/mira-runtime.mjs:47-57`, `src/app/api/mira/route.ts:12`.)*
8. **Self-healing.** If the engine crashes, it is restarted with a growing delay (2 to 30 seconds). If the website crashes, everything shuts down. *(Verified: `scripts/run-system.mjs:45-53`.)*

## 4. What happens when a doctor asks a question

**In plain words:** for five of the eighteen document types, the typed case goes through a chain of safety checks, a local evidence search, one or two AI calls, and a dose check, before it is shown as a formatted clinical document.

1. **The doctor types and submits** in the composer box. *(Verified: `src/components/composer.tsx:108`, `src/components/workspace.tsx:133`.)*
2. **The app decides: AI or local template.** Modes `question`, `ddx`, `workup`, `refer` and `icd10` go to MIRA. All others are filled locally from templates. *(Verified: `src/lib/mira/composer.ts:7-9`.)*
3. **The case is built.** The prompt becomes the chief complaint. Age and sex come from the patient record. **The patient's name and ID are not included.** *(Verified: `src/lib/mira/composer.ts:11-21`.)*
4. **The browser checks first.** It rejects text that looks like an ID number, phone, email or name label. *(Verified: `src/lib/mira/client.ts:13-48`, `src/lib/mira/contract.ts:17-19`.)*
5. **The server checks again** in this order: request must come from localhost; body under 32 KB; exact case shape; no identity patterns; engine configured; only one analysis at a time per server. *(Verified: `src/lib/mira/gateway.ts:50-67`.)*
6. **Local evidence search.** TheOracle finds the six most relevant passages plus one dose passage, using the embedding model on your own CPU. *(Verified: `src/lib/theoracle-grounding.ts:45-61,132-179`.)*
7. **Diagnosis call. Data leaves the machine here.** The server sends the case and passages to MIRA, which sends them to Google Gemini. *(Verified: `src/lib/mira/gateway.ts:115`, `scripts/mira-runtime.mjs:8,35`.)*
8. **MIRA post-checks the answer.** It validates ICD-10 codes and filters diagnoses that do not fit the patient's sex. *(Verified: `mira/service/postchecks.py:133-191`.)*
9. **Therapy call (second AI call).** For the top diagnosis, a second search and a second Gemini call produce a drug regimen. If this fails, the diagnosis is still shown. *(Verified: `src/lib/mira/gateway.ts:136-164`.)*
10. **Evidence gate.** Any dose that cannot be found word for word in the passages is removed. *(Verified: `src/lib/mira/gateway.ts:165-171`, `src/lib/theoracle-evidence-gate.ts:247`.)*
11. **Rendering.** The result becomes a document with sections Ringkasan Gejala, Differential Diagnosis, Diagnosis, Penunjang, Terapi Farmakologi and Edukasi, with reference links. *(Verified: `src/lib/mira/presentation.ts:67-151`.)*
12. **Saved in the browser** under the key `sentrapedia-workspace-v1`. *(Verified: `src/lib/workspace.ts:14`.)*

**Limits along the way.** Overall timeout is 65 seconds (45 without the therapy step). Each AI step has a 20 second deadline and a cost cap. The engine never retries a failed call. *(Verified: `src/lib/mira/model-profile.ts:6-8`, `scripts/mira-profile.json`, `mira/service/app.py:54,57`.)*

**Errors.** Every failure is turned into a short Indonesian message with a code such as `TIMEOUT`, `BUSY` or `IDENTITY`. *(Verified: `src/lib/mira/gateway.ts:15,120-132`.)*

**The "thinking" animation is cosmetic.** The steps shown while waiting run on a timer and do not reflect real progress. *(Verified: `src/lib/typing.ts:32-38`.)*

### Which features use AI

| Feature | Uses AI (MIRA)? |
| --- | --- |
| Composer modes: question, ddx, workup, icd10, refer | Yes |
| The other 13 composer modes (HPI, SOAP-like notes, scribe, education, referral letter, etc.) | No, local templates |
| Personal templates, any mode | No |
| Pustaka Klinis, "Penyakit" tab (disease catalog) | No, local file |
| Pustaka Klinis, "Analisis kasus" tab | Yes |
| Voice dictation | No, uses the browser's built-in speech recognition |
| Document views, review status, history, search, command palette | No |

*(Verified: `src/lib/mira/composer.ts:8`, `src/lib/drafts.ts:30-88`, `src/components/mira-case-form.tsx:35`, `src/components/scribe.tsx:9-22`.)*

## 5. Where knowledge comes from

**In plain words:** the AI is shown evidence from one live search index. Separately, MIRA uses a fixed ICD-10 list to check codes, and the library dialog shows a separate disease catalog.

| Source | What it does | Status |
| --- | --- | --- |
| `theoracle/index/` | About 20,465 passages searched for each case and sent to the AI. *(Verified by counting `chunks.jsonl`. `docs/data.md:23` says 20,423.)* | Live |
| `theoracle/sources/tatalaksana/` | 10 hand-written treatment documents added to the index. | Live |
| `mira/service/data/icd10.json` and sex rules | Code checks after the AI answers. | Live |
| `oracle/sentrapedia.json` | Library catalog and drug-name matching in the dose gate. Never sent to the AI. | Live |
| `theoracle/provenance/oracle-ii/` | Records of where old data came from. 72 records excluded until reviewed. *(From docs.)* | Reference only |

## 6. Build, test and run commands

**In plain words:** use the npm scripts in the capsule's `package.json`. They wrap everything, including Python. None of these were run for this document.

| Command | What it does | Covers |
| --- | --- | --- |
| `npm ci` | Installs Node packages, then automatically builds the Python environment and downloads the 1.2 GB model. Needs Python 3.11+, internet, and may take over 10 minutes. | Everything |
| `npm run dev` | Starts engine and website for development (section 3). Always use this, never bare `next dev`. | Web + engine |
| `npm start` | Same, using a production build. Needs `npm run build` first. | Web + engine |
| `npm run system:check` | Checks Python environment and key without starting servers. | Engine, key |
| `npm run build` | Builds the website, bundles the engine and model (about 1.3 GB), and rebuilds the marketing site. | Web, engine, site |
| `npm run lint` | Checks TypeScript code style, and only syntax for the site. | Web TS, site |
| `npm run typecheck` | Checks TypeScript types. | Web TS |
| `npm test` | Fast logic tests (Vitest) plus the marketing site tests. | Web logic, site |
| `npm run test:system` | Tests the launcher. | Launcher |
| `npm run test:mira` | Runs the Python engine tests with the AI mocked (no cost). | Engine |
| `npm run test:all` | All three test sets. | All |
| `npm run deploy:dry-run` | Checks build output is self-contained. Does not deploy. | Web, site |
| `npm run site:start` / `site:verify` | Serve the marketing site on port 3401 / run its integrity checks. | Site |

*(Verified: `package.json:7-22` and the scripts each one calls.)*

**Test sizes.** Roughly 263 web logic cases, 8 launcher tests, 125 engine cases and 38 site cases. *(Inferred from text searches.)* The latest HANDOFF reports "Vitest 292/292" and "181 passed". *(From docs.)*

**What is not tested.** No test draws the screen components. The Docker build, installers and launcher restart logic have no tests. Live AI calls are never tested, by design. *(Verified / Inferred.)*

**Paid scripts.** `mira/service/smoke_live.py` and `sim_benchmark.py` call the real AI and cost money. Treat them as needing owner approval. *(From docs.)*

## 7. The five files to understand first

1. **`src/lib/mira/gateway.ts`.** This is the trust boundary: every server-side safety check, timeout, cost check and error message, and the diagnosis-then-therapy-then-dose-gate pipeline. All three code investigators picked it.
2. **`scripts/run-system.mjs` with `scripts/mira-runtime.mjs`.** Together they define how the system starts, which AI provider and key are used, the budget, ports and restarts. Several older documents are wrong about this, so read the code.
3. **`src/components/workspace.tsx`.** The one page component. It holds all app state and saving, and decides whether a request goes to AI or a template. It is very dense and has no tests.
4. **`mira/service/engine.py`.** The heart of the Python engine: deadlines, cost caps, the error circuit breaker, and how every failure becomes a safe "unavailable" answer.
5. **`src/lib/theoracle-grounding.ts`.** Decides which evidence the AI sees. Wrong evidence here means wrong grounding in every answer.

Runner-up: `src/lib/mira/presentation.ts`, which turns AI output into the clinical document and re-checks doses every time a saved document is shown.

## 8. The marketing site (`apps/site/`)

**In plain words:** a hand-built static website with no framework and no shared code with the clinical app. A build script assembles pages from a source file and copies media into an output folder that is committed to git.

- **Build** is `apps/site/scripts/transform.mjs`. It regenerates marked sections of `source/index.html` and writes `site/index.html`. *(Verified.)*
- **Surprise: the build rewrites its own source file.** Hand edits inside the generated sections are lost on the next build. *(Verified: `transform.mjs:38`.)*
- **Strict file manifest.** A test hashes every file in `source`, `assets`, `site`, `reference` and `scripts` against `docs/migration-manifest.json`. Adding or changing any of those files fails tests until the manifest is updated. *(Verified: `apps/site/tests/migration-boundary.test.mjs:21-38`.)*
- **Heavy media.** About 90 MB in `assets/` and again about 90 MB in `site/`, mostly not in Git LFS. Some committed videos and images are never loaded by any page. *(Verified.)*
- **Hosting** is Vercel, and a contact form sends email through Resend. Without Resend settings the form refuses requests. *(From docs / Verified.)*
- **In flux right now.** About 85 staged changes there belong to another session. Site visuals were not browser-checked in the latest handoff. *(From docs.)*

## 9. Conventions you will see

- **Folders.** `src/app` for routes only, `src/components` for screens, `src/lib` for logic, `tests/` at the top. File names are lower-case with dashes. *(Verified.)*
- **Language.** All user-facing text and error messages are Indonesian; medical terms stay in English. *(Verified.)*
- **Errors.** The server always answers `{error: {code, message}}`. The engine never crashes with a server error; it returns a valid "unavailable" answer instead. The browser shows errors as toasts or inline warnings. *(Verified.)*
- **Validation.** Hand-written checks and JSON schemas guard every boundary, in both directions. *(Verified.)*
- **Styling.** Plain CSS with design tokens (teal palette, 2 px corners, no decorative shadows). No Tailwind. *(Verified.)*
- **Code density.** Many very long single lines and long comments citing owner decisions with dates. This is the house style, not an accident. *(Verified.)*
- **Commits.** Messages look like `type(scope): message (R2)` with a risk tier, and include a `Co-Authored-By` line. The tier suffix is a habit, not enforced by any hook. *(Verified from git history.)*
- **Hash pinning.** Every file in `mira/` is pinned by hash in `mira/SOURCE.json`. Editing one fails the engine tests until it is re-pinned. *(Verified: `mira/service/tests/test_packaging.py:15-27`.)*
- **Agent notes.** Work is recorded in `.agents/HANDOFF.md` and decisions in `.agents/DECISIONS.md`. *(Verified.)*

## 10. Fragile, undocumented or surprising

### Privacy and security

- **Your Gemini key reaches the web server process.** The launcher passes a full copy of its environment to Next.js. *(Author-checked: `scripts/run-system.mjs:93` spreads `process.env`. That the key sits in that environment is inferred from `.env.local` being loaded at `:69`.)*
- **The engine's audit log stores the full case and full answer** on disk under `.runtime/mira-deepseek/audit`, although a code comment says case text never appears in logs. *(Author-checked: `mira/service/app.py:151-152`; comment at `mira/service/engine.py:5`.)*
- **Two different consent models.** The main composer always declares the case synthetic without asking. The library's "Analisis kasus" form requires a checkbox. *(Author-checked: `src/components/workspace.tsx:122`; `src/components/mira-case-form.tsx:30,55`.)*
- **Synthetic-only is a policy, not a guarantee.** Identity patterns catch common formats only. *(Verified: `src/lib/mira/contract.ts:17-19`.)*
- **Browser storage is unencrypted and unbounded.** *(Verified / From docs, TECH-DEBT row 17.)*
- **No machine-enforced R3 protection.** Clinical logic counts as R3 by policy, but the monorepo's sensitive-path list has no Sentrapedia entries. *(Verified: `.safrs/sensitive-paths.json`.)*
- **The HANDOFF says the Gemini key was once pasted into a chat** and should be rotated. *(From docs.)*

### Correctness

- **A damaged saved workspace is silently replaced by demo data.** One unknown field wipes the user's local work on next load. Rated the top risk in TECH-DEBT. *(Verified: `src/lib/workspace.ts:84,91,94`.)*
- **Saved AI documents can change.** Doses are re-checked every time a document is displayed, so a code change can alter old documents. *(Verified: `src/lib/mira/presentation.ts:162-172`.)*
- **One analysis at a time.** A second request while one runs gets "BUSY". *(Verified: `src/lib/mira/gateway.ts:67`.)*
- **A Google outage looks like a privacy refusal.** A 503 from Google is reported as `PROVIDER_POLICY`. *(Verified: `mira/common/providers.py:55`.)*
- **Unknown models are priced as an expensive older model** unless a price row exists. *(Verified: `mira/common/guard.py:53`, `mira/service/app.py:34`.)*
- **A bad `MIRA_FAST_COPIES` value fails at the first request**, not at startup. *(Verified: `mira/service/engine.py:256`.)*
- **Daily budget mismatch.** The UI and CONTEXT say US$1 per day; the launcher sets US$5. *(Verified: `src/components/mira-case-form.tsx:43`, `scripts/mira-runtime.mjs:42`.)*
- **The therapy dose gate is written in three places** (server, browser, renderer). *(Verified.)*

### Build and deploy

- **The Docker build is broken.** Install runs a site check before the site folder is copied in. *(Verified: `Dockerfile:4-7`, `package.json:7`; also TECH-DEBT row 1.)*
- **Docker networking will not work as is.** The container listens on all addresses, but the server rejects any request that is not addressed to localhost. *(Inferred: `Dockerfile:20` vs `src/lib/mira/gateway.ts:56,60`.)*
- **A Windows build lacks Linux binaries** for the search model, yet passes the dry run. *(From docs, TECH-DEBT row 13.)*
- **No continuous integration** runs for this capsule. *(Verified / From docs, TECH-DEBT row 16.)*
- **Lint and typecheck skip the Python engine and the scripts folder.** *(Verified.)*
- **`npm run build` modifies tracked site files**, so building dirties the git tree. *(Verified.)*
- **Typecheck on a fresh clone may fail** until `.next/` exists. *(Inferred: `tsconfig.json:19`, `next-env.d.ts`.)*
- **Running `next dev` by hand gives 502 errors** because `.env.local` holds stale engine settings. Also, `next dev` rewrites part of `AGENTS.md`. *(From docs / Verified.)*
- **Git LFS is required.** Without it, index vectors and some images arrive as placeholder files. *(Verified: `.gitattributes`.)*

### Naming traps and leftovers

- `src/lib/theoracle.ts` reads the old Oracle catalog, not TheOracle. *(Verified.)*
- Folders and settings named "deepseek" configure Gemini. *(Verified.)*
- Default ports in code (8765, 8787) are never used; the launcher picks a random port. *(Verified.)*
- Dead code: `oracle/*.ts`, several unused props and types, and leftovers from an upstream project called Med Assist. *(Verified.)*
- The Dify/Vera chat integration was removed in the working tree but still exists in the last commit. *(Verified.)*

## 11. Open risks and next steps from the latest HANDOFF

*(All From docs: `.agents/HANDOFF.md`.)*

- Rotate the Gemini key.
- Nothing has been pushed. The 85 staged site files and the Dify removal are uncommitted.
- Running one AI copy instead of three is cheaper and faster (one run at 4.4 s, about US$0.005 per case) but loses a built-in fallback. Slow-case latency was not measured.
- Site visuals have not been verified in a browser.
- Next: the owner picks TECH-DEBT rows to fix. Row 14 (silent workspace reset) is the top risk.

## 12. Documents that are now out of date

Trust code over these. Each was checked against the code by an investigator.

- **`docs/architecture.md` (2026-10-09).** Wrong on folder paths (code moved to `src/`), the external MIRA launcher, which modes use AI (now 5, not 2), timeouts (now 65 s, not 135 s), and several file names that no longer exist.
- **`docs/architecture-overview-2026-10-11.md`.** Describes the retired Oracle II database search, OpenRouter preflight and keys, and says the system stops if either part stops (the engine now restarts).
- **`docs/mira-integration.md`.** Still tells you to set `OPENROUTER_API_KEY`. The code uses `GEMINI_API_KEY` and deletes the OpenRouter key.
- **`README.md`.** Several sections still describe OpenRouter.
- **`docs/TECH-DEBT.md:3`.** Says nothing has been fixed, but rows 2, 4 and 8 were fixed in `9af7a45c`.
- **`docs/data.md` and `README.md`** say feedback goes to localStorage. It goes to sessionStorage and each save overwrites the last.
- **`.agents/CONTEXT.md`.** Largely stale according to TECH-DEBT row 6. Read the newest HANDOFF entries instead.
- **`mira/service/README.md`.** Describes an older two-model flow with a 12 s deadline.

## 13. What this document did not check

- Nothing was run: no install, build, test, server, or AI call.
- The quality and safety of the AI's clinical answers and the prompts in `mira/service/prompts.py` were not judged.
- The contents of the audit log files were not opened.
- Secret files were not opened. One investigator listed setting names from `.env.local` without seeing values.
- Marketing-site visuals were not viewed.
- TECH-DEBT rows 5, 17, 30, 33 and 36 were not re-checked.
