# Sentrapedia: agent context

Onboarding brief for any AI agent (Claude Code, Codex, Gemini/Antigravity, Factory Droid, Opencode, Cursor, Grok) working in this capsule. Written 2026-10-19 and checked against the code on that date.

Precedence when sources disagree:

1. The code and `project.contract.json` decide facts.
2. `.agents/DECISIONS.md` records the owner's decisions (an entry without a `Status:` line is live).
3. `.agents/HANDOFF.md` (newest five entries) describes work in flight.
4. `docs/architecture.md` is the architecture reference; `.agents/CONTEXT.md` is the short current-state summary.
5. This file is a map. If it disagrees with any of the above, they win; fix this file.

Inside the Sentra monorepo, the root `AGENTS.md` also applies and wins on conflict.

---

## 0. Ten-line summary

1. Sentrapedia is an Indonesia-first clinical reasoning and documentation workspace ("Indonesian Glass Health") for **fictional patients only**. Owner: dr. Ferdi Iskandar, addressed as **Gaffer**.
2. One sovereign capsule: a Next.js 16.4 / React 19.3 / TypeScript app at the capsule root, a bundled Python 3.11 FastAPI engine (`aadi/`), a local vector index (`theoracle/`), and a static marketing site (`apps/site/`).
3. 18 composer modes in 4 intent groups. 5 modes call AI (`question`, `ddx`, `workup`, `icd10`, `refer`); 13 build documents locally from templates, with no AI and no network.
4. AI path: browser, then `POST /api/aadi` (Next server), then TheOracle retrieval on local CPU, then the AADI engine on a random loopback port, then Google Gemini `gemini-3.1-flash-lite`. A therapy evidence gate removes any dose the retrieved passages do not support.
5. One knowledge source (2026-10-21): structured clinical facts live only in `theoracle/ssot/sentrapedia-knowledge-ssot.json`; guideline PDF texts are the citation library. `npm run knowledge:build` derives TheOracle (17,560 chunks, EmbeddingGemma-300m vectors, 768-d, vector search only) and the read-only catalog `oracle/sentrapedia.json` (330 diseases) from them.
6. All patient-like data lives in unencrypted browser `localStorage` (`sentrapedia-workspace-v1`). There is no database server.
7. Start the system with `npm run dev` (launcher). `npx next dev` alone starts no engine and every analysis returns HTTP 502.
8. Every AI call costs money (0.10 USD cap per step, 5 USD per day). Never run a live or paid call without Gaffer's explicit approval.
9. `aadi/SOURCE.json` pins upstream engine files by hash. Editing a pinned file needs Gaffer's approval and a repin. `aadi/common/providers.py` must stay byte-identical to upstream.
10. Push, merge, deploy, publish and any write to an external system need an explicit "go" from Gaffer. Publishing to GitHub is a `git subtree split` to `drferdi/Sentrapedia` after three checks.
11. **Public code, private data** (Gaffer, 2026-10-19): the code is meant to go public under a paid royalty licence (`LICENSE`, still a draft); the database never does. `scripts/private-data.mjs` lists the private paths and `npm run export:split` produces the two trees. The repository is private until Gaffer publishes it.

---

## 1. Working with Gaffer

- Address him as **Gaffer** (Doc is also accepted). Do not use "Chief" in new material. In Indonesian, never use the pronouns kamu, elo, elu, gua or gue.
- Chat language: Bahasa Indonesia mixed with English, about 70:30. Repository documents, code comments and commit messages are in **English**. Every user-facing string in the product is **Indonesian**, with standard English medical terms kept.
- Gaffer is a physician, not a full-time programmer. Lead with the conclusion, explain in plain language, separate verified fact from inference, and state uncertainty.
- Close the problem he raised before reporting new ones. He has said agents tend to overengineer and to answer problem A with a list of new problems. Prefer the simplest change that meets the goal.
- Push back once if a risk is significant, then follow his decision without repeating the objection.
- If a time-sensitive decision comes up mid-work, ask him directly instead of batching questions.
- Never claim a test, build or check passed unless it was run in this session and exited 0.
- **Approval gates.** You may read, edit, test and commit locally. You need Gaffer's explicit "go" before you:
  - push, merge, open or close a PR, or force anything;
  - deploy `apps/site` to Vercel;
  - run anything that calls Gemini or another paid model (`aadi/service/smoke_live.py`, `sim_benchmark.py`, a live analysis);
  - repin or edit a pinned AADI file;
  - generate paid media (Higgsfield and similar);
  - change clinical logic (risk tier R3: retrieval, the evidence gate, prompts, postchecks).
- **Risk tiers (SAFRS):** R0 read-only; R1 small and reversible; R2 a reviewed boundary change; R3 needs the owner's prior approval (includes clinical logic). Tag commits with the tier.
- **Jev router:** if a `jev_route` tool is available, call it before the first web search, spawning a subagent, retrying a failed approach, any approval-needing action, or choosing between materially different routes, and state `Jev: <action> (<reason>)`. If it is not available, continue normally. Jev is never a build, test or runtime dependency.

---

## 2. What the product is, and is not

**Is:** a clinical cockpit that drafts structured documents for physician review. The interface is Indonesian (`<html lang="id">`). It is calibrated to Indonesian practice: Puskesmas/FKTP, RSUD referral, PNPK/PPK guidelines, Fornas, SKDI 4A diseases and BPJS-style prior authorization.

**Is not:** an electronic health record; a validated medical device; integrated with SATUSEHAT or BPJS; a production multi-user service. It has no authentication.

**Authority:** the clinician decides. "Draf", "Ditinjau" and "Final" are local workflow markers, not clinical sign-off. AI output is a draft, never an automatic prescription.

**Positioning (public site):** AI clinical reference plus clinical decision support for Indonesian doctors, for individual clinicians and facilities. The main call to action is the waitlist ("Gabung Waitlist").

---

## 3. Topology and directory map

```text
sentrapedia/                     capsule root = future standalone repo (drferdi/Sentrapedia)
├─ src/
│  ├─ app/                       App Router: layout.tsx, page.tsx, globals.css, sentra-tokens.css
│  │  └─ api/aadi/route.ts       the ONLY server endpoint (GET health/warm-up, POST analysis step)
│  ├─ components/                React UI; workspace.tsx is the page coordinator
│  └─ lib/
│     ├─ workspace.ts            reducer and storage (patients, lists, encounters, messages, settings)
│     ├─ workspace-session.ts    restore and the unreadable-backup path
│     ├─ workflow.ts             review checklists, revisions (20 per doc), personal templates
│     ├─ drafts.ts               modeIds (18), mode labels, local draft builder
│     ├─ note-structure.ts       label parser (Concern, History, Examination, Assessment, Plan...)
│     ├─ clinical-templates.ts   template pack v1 (sections and rules per mode)
│     ├─ studio.ts               4 intent groups (ask, document, plan, communicate)
│     ├─ layout.ts               JS breakpoints (760 / 1200 px), tied to CSS by a test
│     ├─ theoracle-grounding.ts  vector retrieval over theoracle/index (local ONNX on CPU)
│     ├─ theoracle-evidence-gate.ts  applyTherapyGate: verified / doseRemoved / removed
│     ├─ theoracle.ts            reads the Oracle CATALOG (oracle/sentrapedia.json), not TheOracle
│     └─ aadi/                   gateway.ts (trust boundary), client.ts, composer.ts, contract.ts (PII),
│                                presentation.ts (6-section document), model-profile.ts, JSON schemas
├─ aadi/                         bundled Python 3.11 FastAPI engine (service/, common/, SOURCE.json, locks)
├─ theoracle/
│  ├─ index/                     chunks.jsonl, vectors.f32, manifest.json   (Git LFS)
│  ├─ model/                     EmbeddingGemma-300m ONNX, 1.2 GB, downloaded at install (gitignored)
│  └─ ssot/                      the knowledge SSOT: every structured clinical fact, edited only here
├─ oracle/sentrapedia.json       330 disease records derived from the SSOT: library catalog and drug-name matching
├─ apps/site/                    static marketing site (no framework, no shared code with the app)
├─ scripts/                      run-system.mjs (launcher), aadi-runtime.mjs, aadi-profile.json, build/install/eval
├─ tests/                        Vitest (*.test.ts[x]), node --test (*.node-test.mjs), fixtures/
├─ docs/                         architecture.md, data.md, testing.md, aadi-integration.md, TECH-DEBT.md,
│                                plans/{active,completed}, specs/, verification/
├─ .agents/                      CONTEXT.md, DECISIONS.md, HANDOFF.md, HANDOFF.archive.md, this file
└─ .runtime/ .next/ verify-report/   local working files and build output (not in git; never cite as evidence)
```

A future demo belongs in `apps/demo/` as configuration plus synthetic data that reuses product code, never a forked copy. The monorepo root is governance only: never import from it or from a sibling capsule (`capsule.json`: `"rootDependencies": []`).

---

## 4. Runtime: what `npm run dev` does

`npm run dev` and `npm start` both run `scripts/run-system.mjs`:

1. Read `.env.local` and require `GEMINI_API_KEY`. A preflight reads the model's metadata with the key (no paid completion) and stops on a rejected key.
2. Check that `.runtime/aadi/venv` exists and matches `aadi/requirements.lock`, using the digest stamp in `.runtime/aadi/installed.json`.
3. Generate a per-run 32-byte bearer token, pick a free loopback port, and start uvicorn on `127.0.0.1`. On Windows, `managed_child.py` ensures cleanup.
4. Poll `/healthz` for up to 30 s.
5. Start Next on `127.0.0.1:3101` (or `$PORT`), injecting `AADI_SERVICE_URL` and `AADI_SERVICE_TOKEN`. The browser never sees the token.
6. Warm TheOracle in the background with `GET /api/aadi`, so the first case does not pay the cold-load cost.
7. Supervise: if the engine dies, restart it with exponential backoff from 2 s to 30 s; the fifth crash in a row ends the system. If Next exits, everything stops.

**Model profile** (`scripts/aadi-profile.json`): model `gemini-3.1-flash-lite` for both stages, `stepBudgetUsd` 0.10, `dailyBudgetUsd` 5, `stepDeadlineS` 20, `gatewayMarginS` 25, `fastCopies` 1.

- Gemini is reached through the engine's `openai` provider pointed at Google's OpenAI-compatible endpoint, so the engine reports `provider=openai`. A paid-tier key is required, because free-tier prompts may be used by Google.
- Each step reserves its cap from the daily budget before any call. A rejected key is `PROVIDER_AUTH` and does not trip the circuit breaker.
- OpenRouter, Claude and OpenAI stay supported in the engine but are inactive.
- `AADI_TARGETED_THERAPY=false` restores the legacy single-step path. The default is targeted.

---

## 5. The AI analysis pipeline

Entry: `workspace.tsx` checks `composerUsesAadi(mode, personalTemplate)`. AI modes go to `analyzeMain`; everything else goes to the local draft builder.

1. **Case assembly** (`src/lib/aadi/composer.ts`): chief complaint, age and sex; names and identifiers are stripped.
2. **Client checks** (`client.ts`, `contract.ts`): shape validation, `synthetic: true`, and `containsIdentity` (NIK, BPJS, phone, email, titled names). The main composer declares the case synthetic without asking. The library's "Analisis kasus" form (`aadi-case-form.tsx`) requires a checkbox.
3. **Gateway** (`src/lib/aadi/gateway.ts`, the trust boundary): loopback origin/host checks, bounded bodies, a single-flight lock (`BUSY` on concurrent calls), stage timers. The retrieval limit is 15 s. The therapy stage has its own `AbortController`.
4. **Retrieval** (`theoracle-grounding.ts`): verifies the manifest hashes, embeds the query on local CPU, and returns at most 6 passages (at most 2 per document, text capped at 2,400 characters), including dose-bearing passages. A privacy filter skips chunks that match PII patterns, after stripping DOIs.
5. **Engine diagnosis step** (`aadi/service/app.py`, `engine.py`): token and synthetic-header checks, PII scan of case and evidence text, one Gemini call within 20 s and 0.10 USD, no retry. `postchecks.py` validates ICD-10 codes against `aadi/service/data/icd10.json` and drops sex-incompatible diagnoses (`rules/sex_icd_ranges.json`). If the caller disconnects, the engine cancels the step and charges an estimate.
6. **Targeted therapy step:** a second retrieval for the leading diagnosis, then a Gemini call for the regimen, interactions and contraindications. If it fails, the diagnosis is still shown, without therapy.
7. **Evidence gate** (`applyTherapyGate` in `theoracle-evidence-gate.ts`), run in the gateway, again in the client, and again in the presentation on every display:
   - `verified`: the dose was found in the retrieved evidence.
   - `doseRemoved`: the drug is shown and the dose is stripped; the UI says "dosis tidak ditemukan di TheOracle, cek pedoman".
   - `removed`: the drug is not shown because its indication is not supported.
   Because the gate re-runs on display, a gate change can alter how old saved documents look.
8. **Presentation** (`presentation.ts`, `diagnosis-document.tsx`): six sections (Ringkasan Gejala, Differential Diagnosis, Diagnosis, Penunjang, Terapi Farmakologi, Edukasi) plus TheOracle references. A fresh answer reveals line by line. The "thinking" animation runs on a timer and is not real progress.

**Errors:** every failure becomes `{error: {code, message}}` with a short Indonesian message. Codes include `TIMEOUT` (504), `BUSY`, `IDENTITY`, `PII_DETECTED` (400), `PROVIDER_AUTH` (503, "Kunci API ditolak, periksa GEMINI_API_KEY."), `MODEL_NOT_ALLOWED`, `DATA_POLICY`, `INTERNAL_ERROR`, `THEORACLE_UNAVAILABLE`. The engine never answers with a server error; it returns a contract-valid "unavailable" answer instead. The overall gateway limit is 65 s on the targeted path and 45 s on the legacy path.

---

## 6. Modes and intent groups

Source: `src/lib/drafts.ts` (`modeIds`, labels) and `src/lib/studio.ts` (groups).

| Intent group | Modes | AI? |
| --- | --- | --- |
| Analisis (`ask`) | `question` Pertanyaan Klinis (PICO), `ddx` Diagnosis Banding, `workup` Pemeriksaan Penunjang, `icd10` Pengodean Diagnosis, `refer` Telaah Rujukan | Yes, through AADI |
| Dokumentasi (`document`) | `clinic` Catatan Klinis (SOAP), `hpi` Anamnesis, `chronic` Penyakit Kronis, `handoff` Serah Terima (SBAR), `scribe` Catatan Scribe | No |
| Rencana (`plan`) | `ap` Asesmen dan Rencana, `tasks` Daftar Tugas, `referral` Surat Rujukan, `monitoring` Pemantauan Klinis | No |
| Komunikasi (`communicate`) | `education` Edukasi Pasien, `avs` Ringkasan Kunjungan, `telephone` Konsultasi Telepon, `authorization` Persetujuan Penjaminan | No |

Personal templates always render locally. `workup`, `icd10` and `refer` are focus modes: the same analysis with a different section first. `icd10` lists only the codes the analysis returned; it never infers codes from a local lookup.

Local drafting (`drafts.ts`, `note-structure.ts`) is deterministic. It reads only explicitly labelled input, separates what the patient reported from what the clinician found, keeps conflicting values labelled separately, and leaves missing facts as visibly unfilled. It never invents a diagnosis, treatment or guideline recommendation. Templates carry rules such as "Jangan mengarang studi, rekomendasi pedoman, nomor DOI, atau tingkat kepastian bukti."

UI shell: a three-column Clinical Cockpit (navigation, document canvas, and above 1200 px a context and Timeline panel). Below 1200 px the panel becomes a dialog; at 760 px and below navigation becomes a drawer. Also: a slash picker, Focus Mode, Command Center (Ctrl/Cmd+J) and voice dictation (browser Web Speech API, optional; no audio stored).

---

## 7. The three knowledge layers (naming trap)

| Name | File(s) | Used for | Sent to the AI? |
| --- | --- | --- | --- |
| **TheOracle** | `theoracle/index/` (17,560 chunks derived by `npm run knowledge:build`; count and hashes in `manifest.json`) | Grounding every AI answer; the dose gate's evidence | Yes, the retrieved passages |
| **Oracle catalog** | `oracle/sentrapedia.json` (330 diseases, 42 categories, derived from the SSOT) | "Pustaka Klinis" library, Penyakit tab; drug-name matching in the gate | Never |
| **ICD-10 dictionary** | `aadi/service/data/icd10.json`, `aadi/service/rules/` | Engine postchecks | No |

TheOracle facts:

- Two layers, written by `scripts/build-theoracle-chunks.mjs`: 1,974 SSOT v0.6 chunks (origin `ssot`, one document per entry, disease name in every chunk) and 15,586 guideline-PDF chunks carried over unchanged from Gaffer's AnythingLLM "theoracle" export, minus 10 off-topic PDFs (`EXCLUDED_LIBRARY_PDFS`). Splitter 2048 characters, overlap 20.
- Embedded with `onnx-community/embeddinggemma-300m-ONNX` at a pinned revision, fp32, 768 dimensions, L2-normalised, prefixes `task: search result | query: ` and `title: none | text: `.
- `indexSha256` is `7c5877fc...`. Rebuild with `npm run knowledge:build` after changing the SSOT (embedding alone: `node scripts/build-theoracle-index.mjs [--device dml]`).
- Retrieval is **vector only, by Gaffer's decision**. Do not add BM25 or keyword hybrid search, regex-only search, or hardcoded disease-to-drug tables.
- `src/lib/theoracle.ts` reads the Oracle **catalog**, not TheOracle. The audit folder `.runtime/aadi-deepseek/` serves Gemini despite its name. Default ports in code (8787, 8765) are never used, because the launcher picks a random port.

---

## 8. Data and storage

- `localStorage["sentrapedia-workspace-v1"]`: one JSON blob, `version: 1`, holding patients, lists, encounters, messages and settings. It is unencrypted and not synced. JSON export/import backup lives in the Workspace dialog.
- `localStorage["sentrapedia-feedback"]`: draft feedback.
- If the stored blob fails validation, it is kept under `sentrapedia-workspace-v1-unreadable` and offered as a download. It is never silently wiped.
- Up to 20 revisions per document. A warning appears from 4 million stored characters. Editing resets a document to Draf; Final requires every required review item.
- **Format changes:** a new format gets a new key (`-v2`), reads v1 through the parser, migrates in memory, and leaves the v1 blob untouched. Ship the reader before the writer. Every fixture in `tests/fixtures/workspace/` must keep parsing. See `docs/data.md` and `docs/plans/active/2026-10-19-workspace-v2-migration.md`. No v2 format exists yet.
- Stored text is never translated in place.
- Engine audit ledger: `.runtime/aadi-deepseek/audit/audit-<UTC day>.jsonl` holds metadata plus request and response SHA-256, never case text. Files are pruned after 14 days. Today's file restores the daily budget after a restart.

### Closed beta settings (2026-10-19)

- `SENTRAPEDIA_PUBLIC_ORIGIN` (for example `https://beta.sentrapedia.com`) lets the gateway accept that one https origin behind Cloudflare Tunnel and Access. Unset, the gateway accepts loopback only.
- `AADI_MAX_CONCURRENT` (1 to 8, default 1) lets several analyses run at once; each still reserves its step cap from the daily budget.
- The beta plan: Biznet Gio server in Jakarta running the Docker image, Cloudflare Tunnel and Access (email allowlist of 10-20 invited clinicians) in front, `sentrapedia.com` (registered at Hostinger) with DNS moved to Cloudflare. Fictional cases only until the provider terms and KMK 951/2026 questions are settled.

### Public code, private data (2026-10-19)

- Private paths (`scripts/private-data.mjs`): `theoracle/ssot/`, `theoracle/index/`, `oracle/sentrapedia.json`, `oracle-ii/`, `docs/verification/`, `.agents/`. Never move their content into a file outside this list, and never paste database passages into public code, tests or docs.
- `npm run export:split -- <empty folder outside the capsule>` writes `public/` (code, with `oracle/sentrapedia.sample.json` as the catalogue) and `data/`. Daily work in the monorepo is unchanged.
- Without the data the app still builds: the library shows the fictional sample (`theOracleSample`), analyses answer "Database TheOracle belum terpasang di server ini", and tests that need real data use `withCatalog` / `withIndex` from `tests/private-data.ts`.
- `LICENSE` is the Sentrapedia Source-Available License 1.0 (draft): free to read, study and evaluate locally; any use with real patients (including government facilities), hosting, distribution or commercial use needs a paid licence. `aadi/` stays MIT. Licensor: SENTRA ARTIFICIAL INTELLIGENCE (Perseroan Perorangan, AHU-A119231.AH.01.30.Tahun 2026, Kota Kediri); licensing contact info@sentrapedia.com.

---

## 9. Safety and privacy boundary (do not weaken)

- **Fictional data only.** Real patient data (PHI) must never be entered, stored, logged or used in tests or fixtures.
- The engine refuses `AADI_SERVICE_ENV=production`. It has no production authentication and must stay on loopback.
- **PII parity:** the client (`src/lib/aadi/contract.ts`), the evidence filter (`theoracle-grounding.ts`) and the engine (`aadi/service/privacy.py`) share rules, and `tests/fixtures/pii-parity.json` is read by both Vitest and pytest. The direction is fixed: tighten the client, never loosen the engine. A titled name needs its dot (`Tn.`, `Ny.`, `Sdr.`, `Sdri.`, `Bpk.`, `Ibu.`). Add parity rows, red first, for any pattern change.
- Synthetic-only is a policy, not a guarantee: the patterns catch common formats only.
- **Dose safety:** never relax the evidence gate to raise coverage, never add a dose that is not in retrieved evidence, and never produce executable specialist protocols (for example chemotherapy) without a verified source. A valid number alone is never enough to call a dose verified.
- The Gemini key reaches the Next server process (the launcher passes its environment). Never print `.env.local` or key values.
- The Docker image is single-user with no login. Publish only as `-p 127.0.0.1:3000:3000`. CI builds the image but never runs it.

---

## 10. The AADI engine: ownership rules

- `aadi/SOURCE.json` records each file's origin. Files without `owner` are pinned (`packagedSha256`) and must stay byte-identical to upstream. Files with `owner: capsule` carry no pin and are edited normally.
- Capsule-owned files include most of `aadi/service/` (`app.py`, `engine.py`, `settings.py`, `audit.py`, `privacy.py`, `smoke_live.py`, ...) and `common/guard.py`. `common/providers.py` stays pinned forever.
- `aadi/service/tests/test_packaging.py` enforces these rules. Check `SOURCE.json` before editing any `aadi/` file.
- Model prices live in `common/guard.py` (`PRICES`). The engine refuses to start for a model without a price.
- Python dependencies are hash-pinned in `aadi/requirements.lock` and `aadi/requirements-test.lock` (openai 1.109.1, httpx 0.28.1, uvicorn 0.54.0). After changing a lock, run `node scripts/install-aadi.mjs`.
- Lint the capsule-owned Python with `uvx ruff@0.17.1 check aadi` (version pinned; config in `aadi/ruff.toml`).
- `sim_benchmark.py` runs only from the upstream `assist/` folder. Here only its pure functions are tested.

---

## 11. Frontend, design and motion

- **Next.js 16.4 has breaking changes.** Before writing Next code, read the relevant guide in `node_modules/next/dist/docs/`. `next dev` rewrites the Next agent-rules block in `AGENTS.md` and `next-env.d.ts`; restore `next-env.d.ts` if it changes and you did not mean it.
- Fonts (`src/app/layout.tsx`): **Plus Jakarta Sans** for titles (`--font-jakarta`) and **Geist** for everything else (`--font-geist`), via `next/font/google`. The brand wordmark uses Helvetica Neue/Arial with `text-shadow: var(--workspace-brand-shadow)` and `letter-spacing: -.45px`.
- Tokens: `src/app/sentra-tokens.css` is the Sentra base snapshot (ink palette, `--radius-control: 2px`, `--radius-structure: 0`). `src/app/globals.css` applies the workspace theme on top: action `#40e0d0` (tosca), hover `#2dccbd`, accent ink `#086b61`. Use tokens, not raw hex values.
- Plain CSS only. **No Tailwind.** No decorative shadows. Swiss/International Typographic Style. Light theme only (dark mode is out of scope).
- Motion: every click-driven change transitions with an opacity fade of 160 ms ease-out (`fade-in`, `@starting-style`, View Transitions via `src/components/smooth.ts`), with no movement, scale or springs. Approved exceptions: the headline transition; `SidebarSubmenu` (one section open at a time, a 320 ms `grid-template-rows` 0fr to 1fr unfold, inactive panels `inert` and `aria-hidden`); the diagnosis reveal; thinking steps; `PixelLoader` (4x4 matrix, tied only to real async work); the mobile drawer. `prefers-reduced-motion` disables motion everywhere.
- Copy: Indonesian sentence case, no numbering or claims in task headlines, chrome labels in Indonesian. Local drafts carry no closing disclaimer.
- Accessibility: keyboard reachable, `inert` for hidden panels, accessible dialogs (`dialog.tsx`).

---

## 12. Commands and verification

Run from the capsule root. Node 24+, npm 11, Python 3.11+, Git LFS (without LFS the vectors and media arrive as pointer files).

| Command | What it does |
| --- | --- |
| `npm ci --workspaces=false` | Install Node packages, build the AADI venv and download the 1.2 GB model. `SENTRAPEDIA_SKIP_AADI=1` and `SENTRAPEDIA_SKIP_MODEL=1` skip those steps; that is enough for lint and typecheck. |
| `npm run dev` / `npm start` | Launcher (section 4). `start` needs `npm run build` first. Local URL `http://127.0.0.1:3101`. |
| `npm run system:check` | Check the venv and the key without starting servers. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (src, tests, scripts) plus the site's syntax lint |
| `uvx ruff@0.17.1 check aadi` | Python lint |
| `npm test` | Vitest plus the site's `node --test` suite |
| `npm run test:system` | Launcher and script tests (`node --test`) |
| `npm run test:aadi` | AADI pytest with mocked providers (no cost) |
| `npm run test:all` | All test sets (the contract's test command) |
| `npm run build` | Next standalone, bundled engine and model, plus the site build |
| `npm run deploy:dry-run` | Checks the build is self-contained and reports native-binary platforms. Does not deploy. |
| `npm run site:verify`, `npm run site:docs` | Site integrity and SPDS document checks |
| `npm run benchmark:oracle` | Retrieval recall benchmark with the local model (no paid call) |

Last recorded green results (HANDOFF, 2026-10-19): Vitest 331/331; site tests 49/49; AADI pytest 235 passed, 1 skipped; ruff 0; typecheck 0; lint 0. CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm audit --omit=dev --audit-level=high`, lint, ruff, typecheck, `test:all`, `site:verify`, `site:docs`, build, `deploy:dry-run`, then a Docker build. No CI step calls a paid model.

Definition of done for a change:

1. Write the failing test first when behaviour changes ("red first").
2. Run the checks that cover the touched files, and report counts from this session's run.
3. For UI changes, check in a browser (preview config `sentrapedia` in `.claude/launch.json`) at desktop and mobile widths, with no console errors.
4. Update `.agents/HANDOFF.md`, and `.agents/DECISIONS.md` when Gaffer made a decision.

---

## 13. Conventions

- Folders: `src/app` for routes only, `src/components` for screens, `src/lib` for logic, `tests/` at the top. File names are lower-case with dashes.
- House style: dense code, many long single lines, and comments that cite owner decisions with dates. Match it; do not reformat files. Do not run automatic formatters or lint fixers on the site.
- Validation: hand-written checks and JSON schemas guard every boundary in both directions. The AADI schemas in `src/lib/aadi/` are hash-checked by `tests/theoracle-aadi.test.ts`, so a schema change needs a hash update.
- Commits: `type(scope): message (R1|R2|R3)` with the `Co-Authored-By` trailer. One commit per item when Gaffer asks for itemised work.
- Publishing: the monorepo is the working copy (`D:\DEV\monorepo\projects\healthcare\sentrapedia`); the product repository is `https://github.com/drferdi/Sentrapedia`. Publish with `git subtree split` to a new branch after three checks: (1) the split descends from the last published split; (2) its tree equals the capsule tree; (3) no LFS-filtered file changed, and it merges with `main` without conflict. Never force-push; never touch `main` directly. PRs and merges are Gaffer's.
- `HANDOFF.md` keeps the newest five entries, newest first. Move older ones verbatim to the top of `HANDOFF.archive.md`. When work is committed, replace "uncommitted" with the hash. Cite only evidence tracked in git, never `.runtime/`, `verify-report/` or a scratchpad.
- `docs/TECH-DEBT.md` was closed on 2026-10-19. New findings go to `docs/plans/` or a new dated audit document, not to that list.
- Gaffer's preference: AI working notes, plans and progress files stay out of Git unless essential.

---

## 14. The marketing site (`apps/site/`)

- A hand-built static site: Bootstrap 5 vendor files, GSAP with ScrollTrigger/SplitText/DrawSVG, and Inter fonts. No framework and no shared code with the clinical app. Read `apps/site/AGENTS.md`, `SITE_GENOME.yaml` and `docs/spds/read_first.md` first.
- Source: `source/` (pages), `assets/` (authored CSS/JS/media), `static/` (files with no source). `scripts/transform.mjs` builds `site/`, which is gitignored output.
- `docs/migration-manifest.json` hashes every tracked site file. Regenerate it with `npm --prefix apps/site run manifest` after changing a site file, or the tests fail.
- Pages: home, `/faq/`, `/ketentuan/`, `/privasi/`, `/penafian/`, `/ruang-kerja/` (clinical-workspace introduction), `/sejarah-sentra/` (history, sourced from ferdiiskandar.com/kisah-sentra).
- Hosting: Vercel project `sentrapedia` (team Sentraverse), production `https://sentrapedia.vercel.app`, not Git-linked; deploy is a CLI deploy from `apps/site` after the site gates, and only with Gaffer's go. The contact form (`api/contact.mjs`) sends through Resend and refuses requests without its settings.
- Public contact: +62 81330018882, info@sentrahai.com.
- No clinical claims (efficacy, mortality, safety performance) in marketing copy without separate review. The anatomy art is illustration, not a diagnostic reference.

---

## 15. Standing product direction from Gaffer

Recorded in `DECISIONS.md`:

- One sovereign capsule; the site in `apps/site/`; a demo would go in `apps/demo/` (2026-10-14).
- Gemini direct with `gemini-3.1-flash-lite`; OpenRouter rejected as the route but kept as a supported provider (2026-10-17, 2026-10-18).
- Dify is removed entirely. AADI with TheOracle grounding and the evidence gate is the only clinical answer path (2026-10-16).
- One strict therapy-gate rule: gateway, client and presentation all call `applyTherapyGate` (2026-10-17).
- The product publicly describes agentic, task-based use of at least three model families (Claude, OpenAI, Gemini) (2026-10-18).

Stated by Gaffer in chat and not all recorded in `DECISIONS.md` yet (confirm before acting on them in code):

- TheOracle retrieval is vector (semantic) only: "AI should match meaning, not exact words."
- TheOracle (his own AnythingLLM vector store) is the source of truth. Do not build hand-made dose tables or formularies alongside it ("itu namanya mesin kalkulator").
- Every disease should end up with its complete drug therapy, not "at least one drug".
- Published drug compendia (ISO, MIMS) count as references for filling missing doses.
- Therapy output should stay clean, without added disclaimer labels that would drive subscribers away.
- He wants a pipeline that turns any document format into ready-to-use TheOracle vectors.

---

## 16. Sharp edges and accepted risks

- Two consent models: the main composer always declares the case synthetic; the library's "Analisis kasus" form needs a checkbox.
- Saved AI documents can change when the gate changes, because doses are re-checked on every display.
- A bad `AADI_FAST_COPIES` value raises inside the engine rather than at startup.
- A standalone build carries the native binaries of the machine that built it; `deploy:dry-run` warns when they are not linux-x64.
- A hang-up during the first call of a step still charges the full step cap. Whether Gemini bills a dropped request is unknown.
- Accepted risks (TECH-DEBT "Closed 2026-10-19"): 15 of 20,465 chunks skipped by the "ibu." title rule; the contact form's own PII pattern; the UI does not act on error codes yet; no v2 migration code; historic media blobs; two unused images; the site's contact/serve stream handling; Gemini's invalid-key status unchecked; cut-off billing unknown.

---

## 17. Documentation drift found on 2026-10-19

Trust the code; fix these when you touch them.

- `.agents/DECISIONS.md` (2026-10-18) says the Vercel project has no build command; `vercel project inspect` shows `node scripts/transform.mjs` with output `site` (HANDOFF 2026-10-19).
- The claude.ai Project instructions for Sentrapedia are older than the code. They describe 14 modes (now 18), `app/` and `lib/` at the root (now `src/`), Arial as the base font (now Geist plus Plus Jakarta Sans), "zero-latency deterministic" generation only (5 modes now call AADI/Gemini), a 5-step gate with "Vitest 26/26" (now `test:all`, 331 Vitest tests), and the address "Chief" (Gaffer's current preference is "Gaffer").

---

## 18. Open questions for Gaffer

1. **Dose label versus clean output.** When the gate strips an unsupported dose, the UI shows "dosis tidak ditemukan di TheOracle, cek pedoman" (`presentation.ts`). That fits the 2026-10-17 gate decision, but Gaffer also said therapy output must not carry labels like "verifikasi dosis". Which wording does he want?
2. **ISO/MIMS doses.** Should doses from ISO/MIMS enter TheOracle as indexed reference documents, so the gate can verify them through retrieval and no separate table is needed? This needs an R3 decision and an index rebuild.

---

## 19. Reading order for a new agent

1. This file.
2. `AGENTS.md` (capsule) and the monorepo root `AGENTS.md`.
3. `.agents/CONTEXT.md`, then the top entries of `.agents/HANDOFF.md`.
4. `docs/architecture.md`, especially sections 8 ("The five files to understand first") and 11 ("Sharp edges").
5. The five files: `src/lib/aadi/gateway.ts`; `scripts/run-system.mjs` with `scripts/aadi-runtime.mjs`; `src/components/workspace.tsx`; `aadi/service/engine.py`; `src/lib/theoracle-grounding.ts`. Runner-up: `src/lib/aadi/presentation.ts`.
6. `.agents/DECISIONS.md` before changing anything Gaffer has already decided.
7. For site work: `apps/site/AGENTS.md`.

---

## 20. Glossary

| Term | Meaning |
| --- | --- |
| Capsule | A self-contained project folder in the monorepo with its own dependencies, config, tests and CI. |
| AADI | The bundled Python FastAPI diagnosis engine (`aadi/`). |
| TheOracle | The local vector index of 17,560 medical passages (SSOT plus guideline PDFs) that grounds AI answers. |
| Oracle catalog | `oracle/sentrapedia.json`, 330 disease records derived from the SSOT for the library. Never sent to the AI. |
| Evidence gate | `applyTherapyGate`: keeps a dose only if the retrieved evidence supports it. |
| PNPK / PPK | Indonesian national clinical practice guidelines / primary-care clinical guidelines. |
| SKDI 4A | Indonesian physician competency level: diseases a GP must manage independently. |
| FKTP / Puskesmas | First-level health facility / community health centre. |
| Fornas | National drug formulary. |
| SBAR | Situation, Background, Assessment, Recommendation (the handoff format). |
| SAFRS | The monorepo governance layer; R0 to R3 risk tiers. |
| Jev | The monorepo decision router (optional tool). |
| Subtree split | How the capsule history is published to the standalone repository. |
