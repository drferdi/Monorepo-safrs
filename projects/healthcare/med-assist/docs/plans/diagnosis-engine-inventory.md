# Diagnosis engine inventory (Step A)

This inventory covers Step A of "Isolate the legacy diagnosis engine behind an interface and
add a MIRA engine slot". Step A is read-only: no code was changed.

- **Status:** waiting for Chief's approval before Step B.
- **Date:** 2026-09-27. **Branch:** `feat/diagnosis-engine-interface`, cut from
  `migrate/healthcare`.
- **Scope:** every file in `lib/iskandar-diagnosis-engine/`: 38 source files (15,778 lines) and
  29 test files (21,915 lines in total). It also covers every caller outside the folder.

**Labels.** Each finding is labelled with one of these:

- **verified**: read in source, or produced by a command whose output I saw.
- **inferred**: a conclusion from the code that was not observed at runtime.
- **assumption**: a working choice that still needs confirmation.

**How importers were found (verified).** A resolver script read every static import, dynamic
import and `vi.mock` import in the capsule. It resolved relative, `@/` and `~/` paths. A second
pass started from every file in `entrypoints/`, followed production imports only, and resolved
barrel imports from `index.ts` to the modules that actually export each imported symbol. That
pass produced the "runtime-reachable" findings. Both scripts live in the session scratchpad,
not in the repository.

## 1. Categories

| Category | Meaning                                         | Fate in this task                                       |
| -------- | ----------------------------------------------- | ------------------------------------------------------- |
| A        | Diagnostic ranking core                         | Wrapped as the `legacy` engine; code unchanged          |
| B        | Safety and deterministic rules                  | Engine-independent; must run whichever engine is active |
| C        | Shared infrastructure                           | Kept; reused by both engines                            |
| D        | Dead code (no importers, no tests)              | Proposed for deletion only                              |
| E        | Out of scope (trajectory, pharmacotherapy, ...) | Untouched                                               |

**Totals:** A = 9, B = 6, C = 9, D = 1 (a candidate; see §6), E = 13.

## 2. Per-file table

- **Path.** All paths are under `lib/iskandar-diagnosis-engine/`.
- **Importer shorthands.** "CD" is `components/clinical/ClinicalDifferential.tsx`, "bg" is
  `entrypoints/background.ts`, and "flow" is `get-suggestions-flow.ts`.
- **Tests column.** It lists direct test importers only. Engine files are also exercised
  indirectly through the `get-suggestions-flow.*.test.ts` suites.
- **Categories.** A `?` after a category marks it as ambiguous; see §5.

| File                                        | Lines | Purpose                                                                                                                                                                                                                               | Production importers                                                                                                                                  | Direct tests                                                                                        | Cat. |
| ------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | :--: |
| `get-suggestions-flow.ts`                   |   517 | **Entry point** `runGetSuggestionsFlow`. Runs the engine and maps the result to `CDSSResponse`. Adds pharmacotherapy, the trajectory bridge and the v2 shadow comparison                                                              | bg                                                                                                                                                    | flow.{integration,fallback,error,pharmacology}.test, `tests/runtime/background.exec-scrape.test.ts` |  A?  |
| `engine.ts`                                 |   651 | `runDiagnosisEngine`, an 8-stage orchestrator. Also `initCDSSEngine` and `getCDSSEngineStatus`                                                                                                                                        | flow, index, `utils/messaging.ts` (type only)                                                                                                         | via flow tests only                                                                                 |  A?  |
| `symptom-matcher.ts`                        |   417 | Deterministic IDF + coverage + Jaccard matching against the 159-disease KB. Also the KB loader and ICD lookup                                                                                                                         | engine, CD, banding-penalty, epidemiology-weights, llm-reasoner, traffic-light, index                                                                 | symptom-matcher.by-icd, diagnosis-quality, llm-reasoner, banding-penalty, 3 CD tests                |  A?  |
| `epidemiology-weights.ts`                   |   223 | Local prevalence prior (45,030 cases), capped at ×1.35                                                                                                                                                                                | engine, index                                                                                                                                         | epidemiology-weights.test                                                                           |  A   |
| `diagnosis-banding-penalty.ts`              |    73 | ×0.85 soft penalty for candidates listed as another candidate's differential                                                                                                                                                          | engine                                                                                                                                                | diagnosis-banding-penalty.test                                                                      |  A   |
| `llm-reasoner.ts`                           |   357 | Constrained OpenAI rerank of KB candidates. Falls back to KB-only                                                                                                                                                                     | engine, index, `OperationalSettingsConsole.tsx`                                                                                                       | llm-reasoner.test, OperationalSettingsConsole.test                                                  |  A   |
| `diagnosis-v2.ts`                           |   221 | Shadow v2 ranking comparison. Off unless `SENTRA_DIAGNOSIS_V2_SHADOW` is set                                                                                                                                                          | flow, index                                                                                                                                           | diagnosis-v2.test                                                                                   |  A   |
| `diagnosis-algorithm.ts`                    |   365 | Panel-side weighted composite re-score. The engine's order is kept                                                                                                                                                                    | CD, `ClinicalImpressionPanel.tsx`, diagnosis-v2, triage tree                                                                                          | diagnosis-algorithm.test, 3 CD tests                                                                |  A?  |
| `differential-diagnosis.ts`                 |   421 | Panel-side differential insight: complaint signals, vital drivers, supporting-exam plan, against-signals                                                                                                                              | CD, diagnosis-algorithm, diagnosis-v2, triage tree                                                                                                    | differential-diagnosis.test                                                                         |  A?  |
| `red-flags.ts`                              |   540 | Deterministic red flags: qSOFA, ACS, pre-eclampsia, FAST, hypoglycaemia, anaphylaxis                                                                                                                                                  | engine, traffic-light, triage tree, validation, index                                                                                                 | validation/red-flag-alert-only.test                                                                 |  B   |
| `traffic-light.ts`                          |   265 | Escalation-only green/yellow/red gate (8 rules)                                                                                                                                                                                       | engine, index                                                                                                                                         | **none**                                                                                            |  B   |
| `triage-referral-decision-tree.ts`          |   258 | Five-node treat-or-refer tree over the KB (`docs/clinical-rules.md`)                                                                                                                                                                  | CD                                                                                                                                                    | triage-referral-decision-tree.test                                                                  |  B   |
| `ddi-checker.ts`                            |   371 | DDInter drug-interaction lookup (`data/ddi-clinical.json`)                                                                                                                                                                            | `lib/api/sentra-api.ts`, pharmacotherapy-reasoner, index                                                                                              | **none**                                                                                            |  B   |
| `presentation-safety.ts`                    |   151 | Blocks unsafe wording in trajectory text shown to physicians                                                                                                                                                                          | `ClinicalTrajectory.tsx`, trajectory v2 header and panel, hybrid-trajectory, view-model, index                                                        | presentation-safety.test + 7 UI tests                                                               |  B?  |
| `trajectory-safety-bridge.ts`               |    55 | Converts high or critical trajectory red flags into diagnosis alerts                                                                                                                                                                  | flow                                                                                                                                                  | trajectory-safety-bridge.test                                                                       |  B?  |
| `anonymizer.ts`                             |   431 | PII redaction (`redactPII`) and detection (`validateAnonymization`, `containsPII`)                                                                                                                                                    | engine, index, `lib/api/pii-guard.ts`                                                                                                                 | none direct                                                                                         |  C   |
| `audit-logger.ts`                           |   469 | Append-only CDSS audit log in `storage.local`                                                                                                                                                                                         | engine, flow, index                                                                                                                                   | flow.integration.test                                                                               |  C   |
| `validation/index.ts`                       |   522 | Five-layer validation of engine suggestions; confidence cap on failure                                                                                                                                                                | engine, index                                                                                                                                         | flow.integration, validation/red-flag-alert-only                                                    |  C?  |
| `validation/types.ts`                       |   163 | Types for the validation pipeline                                                                                                                                                                                                     | engine, index, validation/index                                                                                                                       | none (types)                                                                                        |  C   |
| `feature-flags.ts`                          |    23 | `getDiagnosisEngineConfig()`: env-driven engine config                                                                                                                                                                                | engine, flow, llm-reasoner                                                                                                                            | feature-flags.test                                                                                  |  C   |
| `openai-key-store.ts`                       |    79 | OpenAI key and model kept in `storage.local` (`sentra:openai:config`)                                                                                                                                                                 | llm-reasoner, `OperationalSettingsConsole.tsx`                                                                                                        | llm-reasoner.test, OperationalSettingsConsole.test                                                  |  C   |
| `chronic-disease-classifier.ts`             |   265 | ICD-10 to 11 chronic diseases, plus badge config                                                                                                                                                                                      | CD, `diagnosis-ui-contract.ts`, diagnosis-algorithm, flow, hybrid-trajectory, trajectory-analyzer, `lib/rme/payload-mapper.ts`, index                 | diagnosis-algorithm.test                                                                            |  C   |
| `math-utils.ts`                             |    15 | clamp/round helpers                                                                                                                                                                                                                   | diagnosis-algorithm, hybrid-trajectory, symphony core, trajectory-analyzer, view-model                                                                | none                                                                                                |  C   |
| `index.ts`                                  |   305 | Barrel. At runtime only 4 symbols are consumed: `initCDSSEngine`, `getCDSSEngineStatus` (bg) and `buildClinicalReasoningWorkflowFromTrajectoryV2`, `persistClinicalReasoningWorkflowAudit` (`ClinicalReasoningDifferentialPanel.tsx`) | bg, `ClinicalReasoningDifferentialPanel.tsx`                                                                                                          | CD autoselect test, background.exec-scrape test                                                     |  C   |
| `clinical-reasoning-workflow-evaluation.ts` |   168 | Scores the V2 reasoning workflow against fixtures                                                                                                                                                                                     | index only; **not runtime-reachable**                                                                                                                 | clinical-reasoning-workflow-evaluation.test                                                         |  D?  |
| `pharmacotherapy-reasoner.ts`               |  1220 | Local pharmacotherapy plan (min-3 rule, DDI prefilter)                                                                                                                                                                                | flow, `lib/api/sentra-api.ts`                                                                                                                         | pharmacotherapy-reasoner.test, diagnosis-quality, DosageCalculator.test                             |  E   |
| `hybrid-trajectory.ts`                      |  1386 | Hybrid trajectory engine, always on (`ClinicalTrajectory.tsx:361`)                                                                                                                                                                    | `ClinicalTrajectory.tsx`, 6 trajectory v2 components, flow, evidence, workflow, bridge, view-model, index                                             | hybrid-trajectory.test + 11 others                                                                  |  E   |
| `symphony-trajectory-core.ts`               |   993 | Physiology core used by hybrid trajectory                                                                                                                                                                                             | hybrid-trajectory, clinical-trajectory-intelligence, view-model, index                                                                                | none direct                                                                                         |  E   |
| `clinical-trajectory-intelligence.ts`       |  1115 | NEWS2 and trajectory signals                                                                                                                                                                                                          | hybrid-trajectory, clinical-reasoning-evidence                                                                                                        | none direct                                                                                         |  E   |
| `trajectory-analyzer.ts`                    |  1079 | V1 trajectory analyser. Its types are still widely imported                                                                                                                                                                           | CD, `ClinicalTrajectory.tsx`, diagnosis-algorithm, hybrid-trajectory, presentation-safety, `lib/rme/payload-mapper.ts`, `lib/rme/prognosis-mapper.ts` | trajectory-analyzer.enhanced, diagnosis-algorithm, presentation-safety                              |  E   |
| `trajectory-visualization-view-model.ts`    |  1050 | View model for trajectory charts                                                                                                                                                                                                      | 21 trajectory components, evidence, workflow, index                                                                                                   | view-model.test + 9 UI tests                                                                        |  E   |
| `visit-history-store.ts`                    |   196 | IndexedDB visit history (`sentra-visit-history`)                                                                                                                                                                                      | 11 files, **all type-only** at runtime                                                                                                                | hybrid-trajectory, trajectory-analyzer.enhanced, view-model + 8 UI tests                            |  E?  |
| `clinical-reasoning-evidence.ts`            |   289 | Evidence pack from trajectory V2                                                                                                                                                                                                      | arbiter, cr-differential, therapy, workflow, index                                                                                                    | cr-evidence.test + 5                                                                                |  E   |
| `clinical-reasoning-differential.ts`        |   254 | Differential candidates built from the trajectory V2 evidence pack                                                                                                                                                                    | arbiter, therapy, workflow, index                                                                                                                     | cr-differential.test + 4                                                                            |  E?  |
| `clinical-reasoning-arbiter.ts`             |   192 | Picks the working diagnosis in the V2 workbench                                                                                                                                                                                       | therapy, workflow, index                                                                                                                              | arbiter.test + 2                                                                                    |  E   |
| `clinical-reasoning-therapy.ts`             |   312 | Therapy reasoning pack from the arbiter                                                                                                                                                                                               | workflow, workflow-audit, workflow-evaluation, index                                                                                                  | therapy.test + 1                                                                                    |  E   |
| `clinical-reasoning-workflow.ts`            |   192 | Composes evidence, differential, arbiter and therapy for the trajectory V2 panel                                                                                                                                                      | workflow-audit, workflow-evaluation, index                                                                                                            | workflow.test + 2                                                                                   |  E   |
| `clinical-reasoning-workflow-audit.ts`      |   175 | Stores V2 workflow audit records (100)                                                                                                                                                                                                | index (used by the V2 panel)                                                                                                                          | workflow-audit.test                                                                                 |  E   |

**Callers outside the folder (verified).**

- `entrypoints/background.ts` uses the flow (the entry point) and the barrel.
- `utils/messaging.ts` imports a type only.
- `lib/api/pii-guard.ts` uses the anonymizer.
- `lib/api/sentra-api.ts` uses `ddi-checker` and `pharmacotherapy-reasoner`.
- `lib/rme/payload-mapper.ts` and `lib/rme/prognosis-mapper.ts` use trajectory and chronic
  types.
- `lib/clinical/canonical-triage-builder.ts` and `lib/clinical/visit-history-format.ts` import
  visit-history types.
- 30 React component and helper files under `components/**` and `entrypoints/sidepanel/**`
  import engine modules. So does one fixtures file,
  `components/clinical/trajectory/trajectory-visualization.fixtures.ts`.
- **Nothing in `lib/handlers/` imports the engine.**

## 3. The current diagnosis entry point and its output (verified)

1. **The panel sends a request.** `components/clinical/ClinicalDifferential.tsx:694-706` sends
   `sendMessage('getSuggestions', DiagnosisRequestContext)`. The request carries the chief
   complaint, additional complaint, age, gender (M/F) and five vitals. It does **not** send
   allergies or chronic diseases. This is the only production sender.
2. **The background forwards it.** The handler is `entrypoints/background.ts:1642`. It calls
   `runGetSuggestionsFlow(encounter, context)` at `:1728` without a trajectory argument, so the
   trajectory bridge always receives `null`.
3. **The flow returns its result.** The signature is
   `runGetSuggestionsFlow(encounter: Encounter, context: DiagnosisRequestContext, trajectoryResult?)`
   and it returns `Promise<APIResponse<CDSSResponse>>` (`get-suggestions-flow.ts:334-338`).
   - `APIResponse<T>` is `{ success, data?, error?, fallback? }` (`types/api.ts:381`).
   - `CDSSResponse` is `{ diagnosis_suggestions, medication_recommendations, alerts, clinical_guidelines?, drug_interactions?, pharmacotherapy_explainability?, validation_summary?, meta?, clinical_reasoning? }`
     (`types/api.ts:208`).
   - Each `DiagnosisSuggestion` is `{ rank, icd_x, nama, diagnosis_name?, icd10_code?, confidence, rationale, reasoning?, red_flags?, recommended_actions? }`
     (`types/api.ts:22`).
4. **What the panel actually uses:**
   - `data.diagnosis_suggestions`, first five only (`ClinicalDifferential.tsx:717`);
   - `data.meta.processing_time_ms` (`:724`);
   - `success`: on failure or an empty list, the panel shows `buildUiFallbackDiagnoses`
     (`:709-720`).
5. **What the panel ignores.** It does **not** read `alerts`, `validation_summary`,
   `clinical_reasoning` or `medication_recommendations` from this response. Its therapy data
   comes from a separate message, `getRecommendations`, which goes to the Sentra API
   (`:1071,1101`).

The panel then works on these suggestions locally:

- It re-scores them with `runDiagnosisAlgorithm` (`:800`), keeping the engine's order.
- It builds the differential insight with `differential-diagnosis.ts`.
- It runs the triage/referral tree for the active diagnosis (`:939-964`).

**There is no second diagnosis source in production (verified).**

- **The crew-side canonical engine returns triage, not diagnoses.** It is called as
  `evaluateCanonicalClinicalEngine` at `POST /api/clinical/engine/evaluate`
  (`lib/api/bridge-client.ts:1188`) from `TTVInferenceUI.tsx:2989` and
  `ClinicalTrajectory.tsx:413`. Its output (`CanonicalClinicalEngineOutput`,
  `bridge-client.ts:574`) has scoring (NEWS2, MAP, occult shock), alerts, early-warning
  patterns, trajectory, recommendations and governance. It has **no differential**.
- **The panel's canonical re-scoring branch never runs.** `ClinicalDifferential` accepts a
  `canonicalOutput` prop and would re-score with it (`:811-854`). `entrypoints/sidepanel/main.tsx`
  never passes that prop, so the branch is inactive.
- **A dormant client already exists for a crew-side differential endpoint.** The client is
  `evaluateCanonicalDifferential` at `POST /api/clinical/differential/evaluate`
  (`bridge-client.ts:1212`). It has **no production caller**.
- _Inferred:_ Step C and the ADR should say whether the MIRA service extends this existing
  endpoint or replaces it.

## 4. Findings on the OpenAI key and the LLM payload

1. **Key storage (verified).** The key never comes from build variables.
   - `openai-key-store.ts` reads it from `browser.storage.local`, key `sentra:openai:config`. The
     physician types it into `OperationalSettingsConsole.tsx`. A missing value or any error
     returns an empty key.
   - `feature-flags.ts` reads only the model name and the timeout from env.
   - `llm-reasoner.ts:124-135` sends the key as a Bearer header straight from the extension to
     the hard-coded `https://api.openai.com/v1/chat/completions`.
   - **The OpenAI key therefore sits in plain text on every device where it is entered, and is
     used from the browser.**
2. **The key can reach the built bundle by a side path (verified mechanism; inferred
   consequence).** No code reads an OpenAI key from env. However:
   - `diagnosis-v2.ts:47` and `hybrid-trajectory.ts:243` read `import.meta.env` as a whole
     object.
   - The existing build shows that the whole object is inlined into `background.js`
     (`{BASE_URL:"/",BROWSER:"chrome",…,MODE:"production",…}`).
   - `wxt.config.ts:73` sets `envPrefix: ['VITE_', 'SENTRA_']`.
   - _Inferred:_ if anyone puts a `SENTRA_*` or `VITE_*` key in a `.env` file, it is compiled
     into the extension even though no code uses it. The old README tells developers to set
     `SENTRA_OPENAI_API_KEY`, which would trigger exactly this.
   - The current build had no `.env` file, so no such variables are in it today (verified: none
     are present).
3. **What is sent to the model (verified, `llm-reasoner.ts:75-106`, `engine.ts:294,347-354`):**
   - the chief complaint and additional complaint;
   - age, sex and chronic diseases;
   - the top five KB candidates, with ICD code, name, match score and matched symptoms;
   - the KB treatment and red-alert guideline text for those candidates.

   The complaint is the **raw text from the panel**, not the redacted copy: `mergeRequestContext`
   (`engine.ts:566-567`) replaces the anonymised complaint with the request's own complaint.

4. **Screening (verified).** `lib/api/pii-guard.ts` is **not** called on this path.
   - The only check is `validateAnonymization` (`engine.ts:259-266`). It is a pattern
     detector covering ID numbers, phone numbers, email, title plus name, address, 13-digit
     BPJS numbers and numbers after an `RM` / `No. RM` label.
   - A match makes the engine throw, so the request fails closed and nothing is sent.
   - _Inferred:_ a bare patient name, or a record number without an `RM` label, would pass the check
     and be sent. `pii-guard` wraps the same detector (`containsPII`), so using it here would add
     no protection on its own.

## 5. Files whose category is ambiguous

| File                                                  | Chosen | Why it's ambiguous                                                                                                                                                                                                     |
| ----------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.ts`                                           | A      | It holds the ranking pipeline but also runs **B** (red flags at stage 2, traffic light at stage 7) and **C** (anonymise, audit, validate) internally. The safety rules only run when the legacy engine runs. See §7.1. |
| `get-suggestions-flow.ts`                             | A      | It is the entry point, but it also calls pharmacotherapy (E), the trajectory bridge (B) and the v2 shadow. It is the natural place for the legacy adapter to wrap.                                                     |
| `symptom-matcher.ts`                                  | A      | It is the ranking core, but it also serves as the KB loader and ICD lookup for the panel, traffic-light and llm-reasoner.                                                                                              |
| `diagnosis-algorithm.ts`, `differential-diagnosis.ts` | A      | They rank and explain, but they run **in the panel** after the engine, not behind `getSuggestions`. Wrapping only the background call leaves them in place.                                                            |
| `validation/index.ts`                                 | C      | It is shared infrastructure by name, but it filters and caps the differential, so it changes ranking output.                                                                                                           |
| `presentation-safety.ts`                              | B      | It is a safety rule, but it only guards trajectory text.                                                                                                                                                               |
| `trajectory-safety-bridge.ts`                         | B      | It is a safety rule, but in production it always receives `null` (`background.ts:1728`), so it is a no-op today.                                                                                                       |
| `clinical-reasoning-differential.ts`                  | E      | It is a **second differential producer** inside the trajectory V2 workbench. Chief must decide whether MIRA should eventually cover that panel too.                                                                    |
| `visit-history-store.ts`                              | E      | It belongs to trajectory, but its runtime functions (IndexedDB read and write) are unreachable; only its types are used. It is a partial D candidate.                                                                  |
| `chronic-disease-classifier.ts`                       | C      | It is used by ranking, trajectory, RME mapping and UI badges alike.                                                                                                                                                    |

## 6. Dead code: proposal only, nothing deleted

**No file meets the strict D definition** of no importers and no tests (verified).

**Candidates, with evidence:**

1. **`clinical-reasoning-workflow-evaluation.ts` (whole file).**
   - It is imported only by `index.ts` and is not reachable from any entry point.
   - It has one test (`clinical-reasoning-workflow-evaluation.test.ts`).
   - Proposal: delete the file and its test after Step B, if Chief agrees.
2. **`visit-history-store.ts` runtime functions.**
   - `initVisitHistoryStore`, `saveVisit`, `getPatientVisits` and `saveScrapedVisits` have no
     runtime caller; only the types are used.
   - Proposal: keep the types and remove the IndexedDB code.
3. **Unused symbols (verified by grep):**
   - `EngineConfig.enableAI` (`engine.ts:111,131`) is never read.
   - `fallbackToKBOnly` (`feature-flags.ts:9,20`) is never read.
   - `getLocalEpidemiologyContext` (`epidemiology-weights.ts:193`) is exported through the
     barrel but never called.

## 7. Implications for Step B (for Chief's decision)

1. **Safety is not engine-independent today (verified).**
   - Red flags and the traffic light run _inside_ `runDiagnosisEngine`.
   - Their alerts land in `CDSSResponse.alerts`, but **the panel doesn't display them** (§3).
   - Physician-visible safety comes from two other places:
     - the emergency detector in `TTVInferenceUI.tsx` (`lib/emergency-detector/**`), which is
       already independent of the diagnosis engine;
     - the triage/referral tree, which runs for the _selected_ diagnosis, so it depends on the
       engine's suggestions.
   - _Inferred:_ if the diagnosis engine fails, the panel falls back to
     `buildUiFallbackDiagnoses`.
   - Step B's "safety independence" test can therefore prove the emergency detector and the
     triage tree without touching `engine.ts`. Making red-flags and traffic-light run outside the
     engine would require editing `engine.ts` (R3) and could change `alerts`. **Recommended:**
     don't do that in this task; record it as a follow-up.
2. **The panel consumes `CDSSResponse`, not the new `EngineResult`.**
   - To keep output identical with no UI change, the background should keep returning the
     legacy `CDSSResponse` unchanged.
   - The legacy adapter would return an `EngineResult` built from it (for the benchmark and for
     MIRA comparison), plus the original response for the caller.
   - **assumption:** this is acceptable. MIRA results would not be shown in the panel until a
     later UI task.
3. **There is no clinical fixture corpus (verified).**
   - The "existing clinical fixtures" are about 17 inline cases in `diagnosis-quality.test.ts`
     (9) and the four `get-suggestions-flow.*.test.ts` files (8).
   - **assumption:** the golden set will use those inputs plus
     `mira-system/assist/cases/synthetic_appendicitis_001.json`, run with the LLM off (no key),
     so that the output is deterministic.
   - `meta.timestamp`, `processing_time_ms` and audit session ids change on every run. "Byte-for-
     byte identical" will compare everything **except** these volatile fields.
4. **R3 files Step B would touch (for approval):**
   - Only `lib/iskandar-diagnosis-engine/feature-flags.ts` (+ `feature-flags.test.ts`), to add
     `diagnosisEngine: 'legacy' | 'mira'` with default `'legacy'`.
   - Everything else is new code in `lib/diagnosis-engine/` or the non-R3 caller
     `entrypoints/background.ts:1728`.
   - **Default (as the brief asks):** add the field to the existing `getDiagnosisEngineConfig()`.
     This is one field plus one test, with no other R3 edit.
   - Alternative: keep the flag in `lib/diagnosis-engine/` and touch no R3 file.
     - Downside: engine configuration would then live in two places.
     - Both places read the same env variables, so a future change could update one and miss
       the other.
5. **Other things to know:**
   - `docs/architecture.md` is now `docs/ARCHITECTURE.md`. It was renamed earlier today and the
     rename is staged, not committed.
   - `lib/api/pii-guard.ts` exists and is suitable for the MIRA client (Step C).
