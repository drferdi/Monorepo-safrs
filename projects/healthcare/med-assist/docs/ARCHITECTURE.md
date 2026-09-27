# Med Assist architecture

A map of how Med Assist is built, written for a new owner. The early sections are for
product owners who don't write code. The later sections add the detail a maintainer needs.

- **Written:** 2026-09-27, from branch `migrate/healthcare`. The capsule's latest commit is
  `af00cb96`.
- **Method:** five read-only investigations covered entry points, data flow, the clinical core,
  build and test, and conventions. Each finding was checked against source code and cited by
  file and line. I re-read the highest-impact findings myself. **No code was run.** Test counts
  quoted here come from `.agents/HANDOFF.md`; I did not re-run them.
- **More detail:** [`architecture/`](./architecture/README.md) holds design documents and
  [`adr/`](./adr/README.md) holds decision records. Several of them are out of date; see
  [section 11](#11-where-the-existing-documentation-is-wrong).

## How to read the evidence labels

Every factual statement carries one of three labels:

| Label          | Meaning                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------- |
| **[Verified]** | Confirmed by reading source code or configuration. A `file:line` reference usually follows. |
| **[Inferred]** | A conclusion drawn from the code but not observed running. Treat it as a strong hypothesis. |
| **[Doc only]** | Stated in existing documentation and not confirmed in code.                                 |

If a section has no label, it explains or summarises labelled facts from elsewhere in this
document.

---

## 1. What Med Assist is, in one paragraph

Med Assist (formerly "Sentra Assist") is a **Google Chrome extension** for doctors and nurses
in Indonesian primary-care clinics (FKTP) that use the government's web-based medical-record
system, **ePuskesmas**. It opens as a side panel next to the ePuskesmas page:

- It reads the patient's details, history and vital signs from that page.
- It flags emergencies from the vital signs.
- It suggests likely diagnoses from a built-in library of 159 diseases.
- It shows a trend of the patient's past visits.
- It can **type the clinician's confirmed notes, diagnosis and prescription back into the
  ePuskesmas forms**, which saves re-typing.

It also talks to Chief's own "crew" dashboard server, and it can optionally ask an OpenAI model
to re-order its diagnosis suggestions.

## 2. Glossary

| Term                            | Plain meaning                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Extension / MV3**             | A Chrome add-on. "Manifest V3" is Chrome's current rulebook for add-ons.                                                                                            |
| **Side panel**                  | The panel the extension opens beside a web page. This is Med Assist's screen.                                                                                       |
| **Background service worker**   | The extension's invisible "switchboard". It routes messages between the parts and does work that has no screen. Chrome can put it to sleep and wake it at any time. |
| **Content script**              | Extension code that Chrome runs _inside_ the ePuskesmas web page, so it can read and fill that page.                                                                |
| **MAIN world**                  | A special content script that runs with the web page's own code, so it can use the page's built-in tools (for example jQuery).                                      |
| **RME**                         | _Rekam Medis Elektronik_: the electronic medical record in ePuskesmas.                                                                                              |
| **Anamnesa / Diagnosa / Resep** | The ePuskesmas pages for history-taking, diagnosis and prescription.                                                                                                |
| **TTV**                         | _Tanda-Tanda Vital_: vital signs (blood pressure, pulse, breathing rate, temperature, oxygen, glucose).                                                             |
| **KB**                          | Knowledge base: the disease library in `public/data/penyakit.json`.                                                                                                 |
| **ICD-10**                      | The international code for each diagnosis.                                                                                                                          |
| **Crew dashboard / bridge**     | Chief's own server (`crew.puskesmasbalowerti.com`). It handles login and receives patient syncs, and it can send fill jobs back to the extension.                   |
| **R2 / R3**                     | Risk tiers from the repository rules. R3 means "clinical logic": changes need Chief's approval.                                                                     |
| **Capsule**                     | This project folder. It must build and run on its own, without the surrounding monorepo.                                                                            |

---

## 3. The big picture

```
 ┌──────────────────────────────┐        ┌──────────────────────────────────┐
 │  SIDE PANEL (the screen)     │◄──────►│  BACKGROUND SERVICE WORKER       │
 │  entrypoints/sidepanel/      │ typed  │  entrypoints/background.ts       │
 │  React UI, clinical screens  │ msgs   │  switchboard, diagnosis engine,  │
 └──────────────┬───────────────┘        │  form-fill orchestration,        │
                │ (one shortcut:         │  crew-dashboard sync + poller    │
                │  getPatientInfo)       └───────┬──────────────┬───────────┘
                ▼                                │ tab messages │ HTTPS
 ┌──────────────────────────────┐                ▼              ▼
 │  CONTENT SCRIPT (isolated)   │◄───────────────┘     Crew dashboard, Sentra API,
 │  entrypoints/content.ts      │                      OpenAI (optional)
 │  reads + fills ePuskesmas    │
 └──────────────┬───────────────┘
                │ window.postMessage
 ┌──────────────▼───────────────┐
 │  MAIN-WORLD SCRIPT           │   uses the page's own jQuery and functions
 │  entrypoints/inject.content.ts│
 └──────────────────────────────┘
        all running on *.epuskesmas.id pages
```

The pieces, from the running code:

- **[Verified]** Four pieces run in a normal session: the side panel
  (`entrypoints/sidepanel/main.tsx:1356`), the background service worker
  (`entrypoints/background.ts:1140`), a content script on `*://*.epuskesmas.id/*`
  (`entrypoints/content.ts:67-69`) and a MAIN-world script on the same pages
  (`entrypoints/inject.content.ts:19-22`).
- **[Verified]** A small, hidden **offscreen page** (`public/offscreen-audio.html`) exists only
  to play sounds (`utils/offscreen-audio.ts:84-114`).
- **[Verified]** Two more pages are built: a **login page** (`entrypoints/login/`) and a
  **trajectory preview** test page (`entrypoints/clinical-trajectory-preview/`).
- **[Inferred]** Nothing in the extension opens the login page; only end-to-end tests
  reference it. The side panel has its own login screen (`ConsoleLogin`). The preview test page
  appears to ship in every build, because no filter excludes it.
- **[Verified]** Clicking the toolbar icon opens the side panel; there is no popup
  (`background.ts:1229-1233`, `wxt.config.ts:40-50`).
- **[Verified]** What the extension may access (`wxt.config.ts:21-39`):
  - Permissions: `activeTab`, `storage`, `sidePanel`, `identity`, `scripting`, `alarms`,
    `offscreen`.
  - Sites: `*.epuskesmas.id`, the crew dashboard, `localhost`/`127.0.0.1` and `*.googleapis.com`.

### What the side panel shows

- **[Verified]** Screen order: Credits, then the login check, then `ConsoleLogin` if signed out,
  then `DashboardView`, then the main console (`main.tsx:834-1135`).
- **[Verified]** The console has three tabs (`main.tsx:53`, `:242-246`):
  - **START** (vital signs) has four sub-screens: vital-sign triage (`TTVInferenceUI`), a
    reasoning workbench, statistics, and the differential diagnosis (`ClinicalDifferential`).
  - **CODE RED** (emergency).
  - **MEDLENS** (ECG reading).
- **[Verified]** Screen state lives in about 20 React `useState` hooks inside one component
  (`main.tsx:389-416`). There is no router and no central store. The only shared store in use
  is the colour theme (`lib/theme-store.ts`).
- **[Verified]** The side-panel folder is under a **refactor freeze**
  (`entrypoints/sidepanel/AGENTS.md`):
  - Protected files: `main.tsx`, `TTVInferenceUI.tsx`, `style.css`, `SentraAssistPanel.tsx`
    and `ApprovedSentraAssistApp.tsx`. Nothing in them may be restructured without Chief's
    written approval.
  - The approved design is `clinical-trajectory-v2`.

---

## 4. One patient visit, end to end

This is the main journey. Each step is **[Verified]** in code unless marked otherwise.

1. **The clinician opens a patient in ePuskesmas.** The content script works out which page is
   showing (anamnesa, diagnosa, resep and so on). It tells the background "page ready" and
   passes the visit ID taken from the address bar (`content.ts:80-112`).
2. **The background creates or reloads a visit record** in browser storage under
   `sentra:encounter` (`background.ts:1257-1265`). On anamnesa and diagnosa pages it asks the
   content script to **read the form** (`background.ts:965-969`, `:1088-1138`). If the
   content script isn't responding, the background re-injects it (`:670-699`).
3. **On the anamnesa page, the background sends a copy of the patient to the crew dashboard**
   (`/api/emr/patient-sync`, `background.ts:1033-1084`). A two-minute guard stops duplicate
   sends (`:175-176`).
   - **[Verified]** The payload carries the patient's name, age, record number (RM) and BPJS
     insurance number exactly as read from the page (`background.ts:1050-1056`). The payload
     builder passes them through unchanged (`lib/api/patient-sync-payload.ts:349-361`).
4. **The side panel gathers everything in parallel:**
   - patient info, history, vital signs and clinical context;
   - up to five past visits, fetched through the page's own jQuery via the MAIN-world script
     (`main.tsx:622-693`, `content.ts:603-693`, `inject.content.ts:223-340`).

   If the patient data is incomplete, the panel stops rather than guessing (`main.tsx:622-693`).

5. **Vital-sign triage runs in the panel** (`TTVInferenceUI.tsx`, `buildAlerts`, roughly lines
   860-1426). It combines emergency rules into a red, yellow or green verdict (see
   [section 5](#5-the-clinical-brain-r3-chief-approval-needed-to-change)).
6. **Diagnosis suggestions:**
   - The panel asks the background for suggestions (`ClinicalDifferential.tsx:694-706` →
     `background.ts:1728`). The background passes the request to the engine registry
     (`lib/diagnosis-engine/run-diagnosis.ts`; see §5.6).
   - The **Iskandar Diagnosis Engine** runs inside the background and returns up to five
     ranked diagnoses with ICD-10 codes.
   - The panel then re-scores them locally, but keeps the engine's order and confidence
     (`ClinicalDifferential.tsx:800`, `diagnosis-algorithm.ts:309-354`).
7. **The clinician confirms** the diagnosis and therapy. The panel builds a "transfer" payload
   (`lib/rme/payload-mapper.ts:1377`) and sends `transferRME`.
8. **The background fills ePuskesmas in order: anamnesa, then diagnosa, then resep**
   (`lib/rme/transfer-orchestrator.ts:71`). For each step it:
   - finds the right tab;
   - fills in the clinician names, using live values or a cache (`background.ts:253-362`);
   - checks the page is ready and sends the fill command.

   Each step allows one retry, has a timeout (45 s, 18 s, 30 s) and writes an audit-log entry
   (`background.ts:1494-1527`). The panel shows live progress (`RME_TRANSFER_PROGRESS`).

9. **The content script types the values into the page** (`lib/handlers/page-*.ts`). It uses
   normal browser events (`lib/filler/filler-core.ts`) or, for jQuery-driven widgets, the
   MAIN-world script (`lib/filler/main-world-bridge.ts`).

**A second, server-driven path also exists.** **[Verified]** When the user is signed in, the
background polls the crew dashboard at least every 30 seconds for pending fill jobs
(`lib/api/bridge-poller.ts:60-89`). It claims a job, runs the same fill process from step 8 and
reports the result back (`bridge-poller.ts:169-208`). In plain terms, **the crew server can ask
the extension to fill forms in the clinician's open ePuskesmas tab.**

**[Verified]** If a form arrives without clinician names, fallback doctor and nurse names that
are hard-coded in `lib/clinical/tenaga-medis.ts` are typed in (`page-anamnesa.ts:1501-1502`).

---

## 5. The clinical brain (R3: Chief approval needed to change)

This section describes what the code does. It does **not** judge whether the clinical rules are
correct.

### 5.1 Diagnosis engine: `lib/iskandar-diagnosis-engine/engine.ts:234-492`

**[Verified]** The stages, in order:

1. **Anonymise** the visit data (`anonymizer.ts:148-151`). The side panel's own complaint text
   then replaces the redacted copy (`engine.ts:566-567`), so the check that matters is the leak
   detector: the engine stops if it finds an identifier pattern (`engine.ts:259-266`).
2. **Red flags:** sepsis (qSOFA), heart attack, pre-eclampsia, stroke (FAST), low blood sugar
   and anaphylaxis (`red-flags.ts:494-540`). These produce **warnings only**.
3. **Symptom matching** against the 159-disease library (`symptom-matcher.ts:249-333`). The
   score is a weighted blend of word rarity, coverage and overlap (0.5 / 0.3 / 0.2). The ten
   best candidates are kept.
4. **Local epidemiology adjustment** from 45,030 Indonesian cases
   (`epidemiology_weights_v2.json`, `epidemiology-weights.ts:146-188`). The boost is capped at
   ×1.35.
5. **Differential penalty:** a candidate listed as a "differential" of a stronger candidate is
   scored down ×0.85 (`diagnosis-banding-penalty.ts:61-69`).
6. **Optional AI re-ordering (OpenAI).** See "The AI rule" below.
7. **Traffic-light alert.** It never changes the suggestions (`traffic-light.ts`).
8. **Five-layer validation** (`validation/index.ts:380-515`). If validation itself fails,
   confidence is capped at 0.5 (`engine.ts:494-542`). Weak results are dropped, at most five
   are returned, the run is audit-logged, and a mandatory disclaimer is attached.

**[Verified]** The AI rule: "the local library wins; AI only re-orders"
(`llm-reasoner.ts:298-356`). It holds in code:

- The AI may only reorder diseases the library already proposed. Any code the AI invents is
  dropped.
- The AI's confidence is capped at the library score + 0.1.
- The AI call is skipped when the library is already confident: top score ≥ 0.65 and no
  chronic disease (`engine.ts:331-346`).
- If there is no API key, or the call times out or fails, the engine falls back to library-only
  results.
- **[Verified]** The call goes to a fixed address, `api.openai.com` (`llm-reasoner.ts:131`).
  The key is entered in Settings and kept in browser storage (`openai-key-store.ts:26`).

### 5.2 Emergency detection: `lib/emergency-detector/`

**[Verified]** The code has two layers, and both feed the vital-signs screen
(`TTVInferenceUI.tsx`):

- **The "4-Gate" classifiers:**
  - Gate 1: vital-sign inference.
  - Gate 2: hypertension, per FKTP 2024 (`classifyHypertension`, `TTVInferenceUI.tsx:1111`).
  - Gate 3: blood glucose, per PERKENI/ADA (`classifyBloodGlucose`, `:1154`).
  - Gate 4: hidden shock (`detectOccultShock`, `:1050`).
- **Pattern-Engine v2:** 70 data-defined emergency patterns in three tiers
  (`pattern-engine.ts:231-308`). The screen calls it with tiers A and B only
  (`TTVInferenceUI.tsx:1415-1420`).
- **The final verdict:** any critical finding is red; any high or warning finding is yellow;
  otherwise green; "standby" if no vitals were entered (`triage-verdict.ts:81-112`).

**[Verified]** Gate 1 (auto-filling unmeasured vitals with random normal values,
`ttv-inference.ts:191`) has **no caller outside tests**. The README's
"TTV inference → HTN → glucose → shock" chain is therefore not wired as a chain.

**[Verified]** Tier C patterns can never fire: the tier filter excludes them, and the
chronic-disease inputs they need are hard-coded empty (`clinical-snapshot.ts:223-228`).

### 5.3 Visit trajectory: `components/clinical/ClinicalTrajectory.tsx`, `lib/clinical/`

- **[Verified]** The "hybrid" trajectory engine is always on (`ClinicalTrajectory.tsx:361`,
  `useHybridTrajectory = true`), so the older V1 analysis branch can't be reached.
- **[Verified]** The trajectory needs **at least two visits** (`:345`). The capsule's
  `AGENTS.md` says "from one visit onward".

### 5.4 Prescriptions and drug interactions

- **[Verified]** The prescription the panel shows comes **only from the remote Sentra API**
  (`/v1/cdss/prescribe`, `lib/api/sentra-api.ts:1175-1180`). In mock mode it is deliberately
  blocked (`sentra-api.ts:936`).
- **[Verified]** The local prescription pipeline in the same function (knowledge, then plan,
  then safety filter, then the "at least three medications: main, adjuvant, vitamin" rule,
  lines 410-498) sits behind a second mock check at `:944`. **That check can never be
  reached.**
- **[Verified]** The "at least three medications" rule is still active in
  `pharmacotherapy-reasoner.ts:989,1100-1111`, but the panel never displays that output.
- **[Inferred]** Whether the remote endpoint applies the three-medication rule can't be seen
  from this repository.
- **[Verified]** The drug-interaction checker (`ddi-checker.ts`, data in
  `data/ddi-clinical.json`) only knows "moderate" and "major" severities. Its "contraindicated"
  branches are unreachable (lines 144-147). A failed check lets the drug through (line 870).

### 5.5 Triage and referral decision tree

**[Verified]** `triage-referral-decision-tree.ts:161-258` matches `docs/clinical-rules.md`, with
two small differences:

- Competency levels other than 1/2/3A/3B are treated as "treat locally", where the document says
  "= 4A". This has no effect today, because the library has no other levels.
- Out-of-range vitals count as "measured".

The panel shows the tree's result for the active diagnosis but doesn't re-order anything
(`ClinicalDifferential.tsx:939-964`).

### 5.6 Pluggable diagnosis engine: `lib/diagnosis-engine/` (added 2026-09-27)

The diagnosis step can now be served by more than one engine. By default physicians see only the
legacy engine; the `mira` flag value (development, added 2026-09-27) shows MIRA's list instead.
The decision to use MIRA for physicians is proposed in
[ADR-005](adr/ADR-005-pluggable-diagnosis-engine-mira-candidate.md) and has not been accepted.

**[Verified]** How the parts fit:

```
side panel ──getSuggestions──► background.ts:1728 ──► run-diagnosis.ts
                                                        │
               ┌────────────────────────────────────────┴───────────────────────────┐
               ▼ always                                                             ▼ only if flag = 'shadow' or 'mira'
     legacy-engine.ts ─► runGetSuggestionsFlow (unchanged)             mira-engine.ts ─► pii-guard ─► Sentra
     alerts and all other fields always come from here;                reasoning service (VITE_MIRA_SERVICE_URL);
     diagnosis list too, unless flag = 'mira' and MIRA answered        outcome always goes to the audit log
```

- **Contract** (`types.ts`): every engine takes a de-identified `CaseState` and returns an
  `EngineResult`. The result holds the differential (`likely`, `alternatives`, `cannotMiss`),
  evidence, missing information, next best actions, a treat-or-refer suggestion and `meta`.
  Anything an engine cannot fill is left empty and listed in `unfilled`.
- **Flag:** `SENTRA_DIAGNOSIS_ENGINE` (`feature-flags.ts`, `run-diagnosis.ts`); only the exact
  values below switch, anything else is `legacy`. MIRA is capped at 20 s, and only its status,
  ICD codes and latency are written to the audit log.
  - `legacy` (default): the legacy result only.
  - `shadow`: the legacy result, returned without waiting for MIRA, which runs in the background.
  - `mira`: MIRA's `likely`, `alternatives`, then `cannotMiss` replace `diagnosis_suggestions`,
    each tagged "MIRA" (cannot-miss: "MIRA · jangan terlewat") next to the name. ICD codes stay as
    MIRA sent them, even when the local knowledge base lacks them; cannot-miss entries always get
    one of the five places. Alerts and every other field stay the legacy engine's. When MIRA
    fails, times out or returns no diagnosis, the panel shows the legacy list and the note
    "MIRA tidak tersedia".
  - **[Verified]** Confirmed chronic diagnoses are merged in ahead of the engine list and share
    the five places (`ClinicalDifferential.tsx`), so a patient with several of them can push a
    MIRA entry, including a cannot-miss one, out of view.
  - Development token: `VITE_MIRA_DEV_TOKEN` is sent as `Authorization: Bearer`. It is inlined
    into the build, so it must stay a throwaway local value.
- **Where safety sits:** outside every engine. Red flags, the emergency gates (4-Gate and
  Pattern-Engine v2), the triage verdict and the triage/referral tree import nothing from the
  diagnosis pipeline. They produce their full output while an engine throws, hangs or is broken
  (`safety-independence.test.ts`).
  - Note: the legacy engine also computes red-flag and traffic-light alerts internally, but the
    panel does not display them (§5.1).
- **Proof of no behaviour change:** `legacy-golden.test.ts` compares 12 synthetic cases against
  outputs recorded _before_ the caller was switched (`__golden__/legacy-outputs.json`). Only
  timestamps, durations and generated alert ids are masked.
- **MIRA contract** for the future Python service: JSON Schema plus examples in `contract/`.
- **Planning-model choice (added 2026-09-27):** a developer or admin may pick the MIRA planning
  model in the side panel footer (`components/sidepanel/MiraPlanModelPicker.tsx`; options from
  `VITE_MIRA_PLAN_MODELS`, choice in `browser.storage.local`). The client sends it as the header
  `X-MIRA-Plan-Model`, outside the JSON contract; the service accepts only its own allowlist.
  The picker is hidden from physicians and when the MIRA engine is off.
- **Benchmark (Gate 1):** `scripts/benchmark/run-legacy-engine.mjs` exports legacy results for
  case files in the MIRA case format.
  - **[Verified]** The legacy knowledge base matches Indonesian terms only, so cases must be
    written in Indonesian to be compared fairly. The English synthetic case gets an empty
    differential.

---

## 6. Where data is kept and where it goes

### 6.1 Kept inside the browser

**[Verified]** Stored in `chrome.storage.local` unless noted:

| What                                              | Key / place                                                                                                               | Lifetime                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Current visit (anamnesa, diagnosis, prescription) | `sentra:encounter`                                                                                                        | 24 hours (`utils/storage.ts:12-14`) |
| Sign-in session and settings                      | `sentra:persisted-session`, `sentra:active-session`, `sentra:auth-config`, `sentra:bridge-config`, `sentra:local-account` | until sign-out                      |
| OpenAI key and settings                           | `sentra:openai:config`                                                                                                    | until changed                       |
| Audit logs                                        | `local:sentra_audit_log` (1000 entries), `sentra:cdss:audit` (1000), `sentra:clinical-reasoning:workflow-audit` (100)     | rolling                             |
| Caches                                            | `sentra:tenaga-medis-cache`, `sentra:statistic:shift-overview`, `das:cache:*`                                             | varies                              |
| Panel preferences (page storage)                  | `med-assist:settings`, `med-assist:workspaceUrl`, `med-assist-theme`                                                      | permanent                           |
| Local databases (IndexedDB)                       | `sentra-icd10-rag`, `DASLearningStore`, `sentra-visit-history`                                                            | permanent                           |

**[Inferred]** The 24-hour visit record outlives the browser session, so patient details stay on
the machine after Chrome is closed.

### 6.2 Reference data shipped with the extension

**[Verified]**

| File                                       | Size   | Contents                                   |
| ------------------------------------------ | ------ | ------------------------------------------ |
| `public/data/penyakit.json`                | 1.3 MB | 159 diseases: the clinical source of truth |
| `public/data/epidemiology_weights_v2.json` | 434 KB | local disease frequencies                  |
| `data/ddi-clinical.json`                   | 3.4 MB | drug-interaction pairs, loaded on demand   |
| `public/data/stok_obat.json`               | 77 KB  | drug stock list                            |

**[Verified]** The `data/*` files are exposed to every website (`wxt.config.ts:58-62`).

### 6.3 Data that leaves the browser

**[Verified]**

| Destination                                                            | When                                                                    | What is sent                                                                                    | Screening                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Crew dashboard `/api/emr/patient-sync`                                 | automatically, on the anamnesa page                                     | name, age, RM, BPJS number, vitals, complaint                                                   | `assertNoPII` (`bridge-client.ts:231-233`)                            |
| Crew dashboard (bridge jobs, online doctors, consult, clinical engine) | polling and panel actions                                               | clinical context and results                                                                    | `assertNoPII`                                                         |
| Crew dashboard login                                                   | sign-in                                                                 | password or passkey                                                                             | none                                                                  |
| Sentra API `/v1/cdss/*` (address from `VITE_SENTRA_API_URL`)           | prescription, allergy and paediatric-dose checks when not in mock mode  | clinical context plus an API key                                                                | `assertNoPII`                                                         |
| `api.openai.com`                                                       | diagnosis re-ordering, only when a key is set and the library is unsure | the complaint as typed, age, sex, chronic diseases, candidate diseases and their guideline text | the engine's leak detector (`validateAnonymization`), not `pii-guard` |
| Sentra reasoning service for MIRA (`VITE_MIRA_SERVICE_URL`)            | only when `SENTRA_DIAGNOSIS_ENGINE` is `shadow` or `mira` (off by default) | de-identified `CaseState` (§5.6)                                                                | `assertNoPII`; a blocked payload is not sent                          |

- **[Inferred]** `assertNoPII` is a pattern check (`anonymizer.ts:31-61`): it looks for ID
  numbers, phone numbers, "title + name" and 13-digit BPJS numbers. A bare name would pass. A
  real 13-digit BPJS number in the patient-sync payload would make the sync **fail**. The
  design intent here is unclear; **please confirm with the crew-dashboard side.**
- **[Verified]** The Sentra API key (`VITE_SENTRA_API_KEY`) and **every** `SENTRA_*`
  variable are compiled into the extension (`wxt.config.ts:73`,
  `envPrefix: ['VITE_', 'SENTRA_']`). **[Inferred]** Anyone with the installed extension can
  read them.

---

## 7. Build, test and run

All commands run from this folder. **[Verified]** The official commands live in
`project.contract.json:15-23`. Each goes through `scripts/pnpm.mjs`, a small wrapper that makes
`pnpm` work on Windows.

| Goal              | Command                                                                  | What it does                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install           | `node scripts/pnpm.mjs install --frozen-lockfile`                        | installs packages, then `wxt prepare` generates `.wxt/tsconfig.json`, which type-checking needs                                                                      |
| Develop           | `node scripts/pnpm.mjs run dev`                                          | live rebuild into `.output/chrome-mv3-dev`. **No browser opens** (`wxt.config.ts:66-68`); load that folder in `chrome://extensions` → Developer mode → Load unpacked |
| Build             | `node scripts/pnpm.mjs run build`                                        | production build into the same `.output/chrome-mv3-dev` folder                                                                                                       |
| "Run" check       | `node scripts/pnpm.mjs run run:check`                                    | checks the built manifest and that every referenced file exists (`scripts/check-extension.mjs:13-44`). It does **not** start anything                                |
| Test              | `node scripts/pnpm.mjs run test`                                         | full Vitest suite (`vitest.config.ts`, browser-like jsdom setup)                                                                                                     |
| Type-check / lint | `… run typecheck` / `… run lint`                                         | `tsc --noEmit` / ESLint                                                                                                                                              |
| Package (dry run) | `node scripts/pnpm.mjs run deploy:dry-run`                               | `wxt zip`, which creates the store zip without uploading                                                                                                             |
| Browser tests     | `… run test:e2e`                                                         | Playwright with a visible Chromium. Needs a build first (`playwright.config.ts`)                                                                                     |
| Benchmark export  | `node scripts/benchmark/run-legacy-engine.mjs --cases <dir> --out <dir>` | writes one legacy `EngineResult` per case (Gate 1, §5.6). Both folders stay outside the repository; the runner refuses an output folder inside the capsule           |

Details:

- **[Verified]** Requirements: Node 24 and pnpm 11.21.0 (`package.json:90-93`). This capsule is
  its own pnpm workspace with a "hoisted" install layout (`pnpm-workspace.yaml:2,6`).
- **[Verified]** There are 140 test files: 82 in `lib/`, 38 in `components/`, 10 in `tests/`,
  6 in `entrypoints/`, 3 in `utils/` and 1 in `data/`. Most sit next to the code they test.
- **[Doc only]** Latest reported result: 961 passing, 16 skipped (`.agents/HANDOFF.md`).
- **[Verified]** There is **no CI** inside this capsule (no `.github/`). The monorepo's CI
  excludes it.
- **[Verified]** Environment variables are listed by name in `.env.example`. Copy it to
  `.env.local`. They cover the backend address and key, debug switches, message timeouts,
  feature flags (AI diagnosis, AI prescription, drug checks, paediatric dose) and the OpenAI
  model.

**Commands to avoid** (see [section 10](#10-fragile-undocumented-or-surprising)):
`pnpm commit`, `commit:push`, `commit:watch`, `docs:auto*` and `docs:all`.

---

## 8. Folder map and conventions

### 8.1 Where things live

**[Verified]**

| Folder                    | Status                                       | Contents                                                                                                                                                                                                                                                                               |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entrypoints/`            | live                                         | the four running pieces, plus the login and preview pages                                                                                                                                                                                                                              |
| `lib/`                    | live, the core (218 files before 2026-09-27) | `iskandar-diagnosis-engine/`, `diagnosis-engine/` (engine contract, registry, legacy and MIRA adapters, since 2026-09-27), `emergency-detector/`, `clinical/`, `api/` (servers), `handlers/` + `scraper/` + `filler/` + `rme/` (reading and filling ePuskesmas), `rag/`, `statistics/` |
| `components/`             | live (105 files)                             | React screens, mostly `components/clinical/`                                                                                                                                                                                                                                           |
| `utils/`                  | live                                         | logger, message contract, storage, sound                                                                                                                                                                                                                                               |
| `types/`                  | partly live                                  | `api.ts` is used; `shared-types.ts` is not                                                                                                                                                                                                                                             |
| `public/`, `data/`        | live                                         | icons, sounds, reference JSON                                                                                                                                                                                                                                                          |
| `tests/`                  | live                                         | shared test setup, Playwright specs, test helpers                                                                                                                                                                                                                                      |
| `services/medlens-local/` | development only                             | a local Node server for ECG OCR testing; the extension never imports it                                                                                                                                                                                                                |
| `src/`                    | empty                                        | contains only a README saying it is intentionally empty                                                                                                                                                                                                                                |
| `scripts/`                | mixed                                        | the build wrapper and check script, plus risky developer scripts                                                                                                                                                                                                                       |
| `.agents/`                | live                                         | handoff, context and decision notes; public                                                                                                                                                                                                                                            |
| `docs/`                   | mixed                                        | real references alongside stale plans and agent prompts                                                                                                                                                                                                                                |

### 8.2 Conventions observed

- **[Verified]** File names are `kebab-case.ts` in `lib/` and `PascalCase.tsx` for React
  components. Tests sit next to the code as `*.test.ts(x)`; browser tests are `*.spec.ts`.
- **[Verified]** Code and comments are in English. Clinical field names, prompts and on-screen
  messages are Indonesian (`nama_obat`, `penyakit_kronis`, `keluhanUtama`).
- **[Verified]** Errors:
  - Most functions return `{ success: false, error }` rather than throwing.
  - Four named error types exist: `AuthRequiredError`, `BridgeApiError`,
    `BridgeResponseFormatError` and `PIILeakError`.
  - One `ErrorBoundary` wraps the whole panel (`main.tsx:1316`).
  - About 35 `catch` blocks only contain a comment, and about 7 silently swallow errors.
- **[Verified]** Logging:
  - `utils/logger.ts` has a sanitiser that hides patient fields, but only 22 files use it.
  - The lint rule allows only `console.warn` and `console.error`, so many files use
    `console.warn` as a general log, bypassing the sanitiser.
- **[Verified]** Type safety is good overall. `strict` mode is on. Loose types (`any`,
  `as unknown as`, lint suppressions) are rare and concentrated in the MAIN-world jQuery bridge
  (`inject.content.ts`).
- **[Verified]** 213 of the 215 `TODO` comments are boilerplate added by
  `scripts/dev/auto-document.js`. There are no `FIXME` or `HACK` comments.
- **[Verified]** The old name is everywhere: "Sentra" appears about 1,190 times against 9 for
  "Med Assist". Storage keys use `sentra:*`. The manifest says "Asisten Medis" v2.1.0
  "Prototype 0.7", `package.json` says 1.0.1, and the background start-up log says 1.0.5.

---

## 9. The five files to understand first

| #   | File                                                                     | Why                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `entrypoints/background.ts` (2,595 lines)                                | The switchboard: every message route, form-fill orchestration, patient sync, the crew-server poller and content-script re-injection. Most cross-part bugs surface here. |
| 2   | `utils/messaging.ts`                                                     | The contract between panel, background and page scripts: every message name, its data shape and its timeout.                                                            |
| 3   | `entrypoints/sidepanel/main.tsx`, with `entrypoints/sidepanel/AGENTS.md` | What the clinician sees and the order of screens. It holds all panel state. **Frozen**: read the AGENTS file before touching anything.                                  |
| 4   | `lib/iskandar-diagnosis-engine/engine.ts`                                | The diagnosis pipeline: where the disease library, local epidemiology, OpenAI, safety rules and validation meet. R3.                                                    |
| 5   | `lib/api/bridge-client.ts`                                               | All traffic to and from the crew dashboard, and where the outbound privacy check runs.                                                                                  |

**Read next:**

- `wxt.config.ts`: what the extension is allowed to do and which settings get compiled in.
- `components/clinical/TTVInferenceUI.tsx`: the emergency verdict (`buildAlerts`).
- `components/clinical/ClinicalDifferential.tsx`: diagnosis display, prescription fetch and RME
  transfer.
- `project.contract.json`: the official commands.

---

## 10. Fragile, undocumented or surprising

Ranked by how likely each item is to hurt a new owner. All are **[Verified]** unless marked.

1. **`pnpm commit` / `commit:push` / `commit:watch` act on the whole monorepo.**
   - `scripts/dev/auto-commit.js:156` runs `git add -A` with no folder limit, then commits
     (`:164`) and can push (`:185`). The git root is `D:\DEV\monorepo`.
   - Running it would sweep up other projects' unfinished work, and in watch mode it keeps doing
     so on a timer.
   - `docs:auto*` and `docs:all` **rewrite source files** (`auto-document.js:211`), and
     `docs:all` also downloads a tool with `npx` and opens a browser.
2. **The side panel's recovery instructions point at the wrong thing.**
   - `entrypoints/sidepanel/AGENTS.md:63-64` says to restore from commit `42be8f0` and
     `git stash apply stash@{0}`.
   - `42be8f0` does not exist here (`fatal: Not a valid object name`), and `stash@{0}` is an
     unrelated monorepo stash.
   - **Following those instructions would apply the wrong changes.**
3. **Patient details can appear in the ePuskesmas page's console.** Content-script
   `console.warn` calls print chronic diseases (`lib/handlers/page-diagnosa.ts:920`), drug names
   (`page-resep.ts:1141`) and clinician names (`page-diagnosa.ts:1335-1421`), bypassing the log
   sanitiser.
4. **Two background listeners answer the same messages.**
   - `scanMedicalHistory`, `scanClinicalContext`, `scanFields` and `fillAnamnesa` each have a
     typed handler and a plain handler (`background.ts:1843/1877/1941/1339` and
     `:2335/2365/2443/2499`).
   - **[Inferred]** Whichever answers first wins. If the plain one wins, the panel receives
     `undefined` and quietly drops the medical history (`main.tsx:695`).
5. **Secrets compiled into the extension.** `VITE_SENTRA_API_KEY` and all `SENTRA_*` variables
   ship inside the bundle (see 6.3).
6. **The README describes a different system in places.**
   - It names DeepSeek/Ollama as the AI; the code only calls OpenAI.
   - It describes "magic-link" sign-in; the code uses password and passkey.
   - It mentions `ApprovedSentraAssistPanel.tsx`, which does not exist.
   - It gives Node ≥22 with npm; the code requires Node 24 with pnpm 11.
   - It uses an old `apps/healthcare/...` path.
   - Its license badge points to a LICENSE file that doesn't exist.
7. **Clinical logic that looks active but isn't** (R3, so ask Chief before touching any of it):
   - the local prescription pipeline (§5.4);
   - Gate 1 vital-sign inference and the Tier C patterns (§5.2);
   - trajectory V1 (§5.3);
   - the traffic-light drug-interaction rule. The engine never passes the input it needs.
   - The traffic-light comments say "RED if…", but the code only escalates to yellow
     (`traffic-light.ts:94-143`).
8. **Frozen but unused UI.** `ApprovedSentraAssistApp.tsx` and
   `components/SentraAssistPanel.tsx` are protected by the freeze, but nothing mounts them, so
   editing them changes nothing on screen. Other files with no importers:
   - `lib/store.ts`
   - `utils/name-masking.ts`
   - `lib/api/platform-api-client.ts`
   - several `components/clinical/*` files
9. **Over-broad permissions and unused packages.**
   - The `identity` permission, the Google `oauth2` block and `*.googleapis.com` access are
     never used in code.
   - `@pieces.app/pieces-os-client`, `apexcharts` and `react-apexcharts` are never imported.
   - `tesseract.js` is a runtime dependency, but only the development ECG server uses it.
   - **[Inferred]** These may cause friction in a Chrome Web Store review.
10. **Background timing risks** (all **[Inferred]**, from how Chrome runs background workers):
    - The crew-poller alarm listener is registered only after two asynchronous checks
      (`bridge-poller.ts:66-89`), so an alarm that wakes a sleeping worker may be missed.
    - The icon-click sound (`background.ts:1146`) may never play, because clicking opens the
      side panel instead.
11. **Broken alternative test configurations.**
    - `vitest.clinical.config.ts` hard-codes package paths that don't exist under the hoisted
      layout.
    - `vitest.unit.config.ts` runs browser-dependent tests without a browser environment.
    - Neither is used by any script.
    - `.agents/DECISIONS.md` says the cause is "no `tests/setup.ts`", but that file exists; the
      configs just don't load it.
12. **Smaller surprises:**
    - `package.json`'s top-level `"overrides"` is ignored by pnpm. The lockfile has
      `@vitejs/plugin-react` 5.2.0, not the pinned 5.0.4; this is harmless today.
    - Dev and production builds both write to the one `.output/chrome-mv3-dev` folder.
    - `tests/e2e/auth.json` would be loaded automatically if created, and it is not
      git-ignored.
    - `eng.traineddata` (5 MB) at the capsule root is a git-ignored OCR cache from the ECG dev
      server.
    - The capsule's git history has only two commits (the 2026-09-26 migration and the
      2026-09-27 upstream update); earlier history lives in the old repository.

---

## 11. Where the existing documentation is wrong

**[Verified]** by comparing each document with the code:

| Document                                                                     | Says                                                                                                      | Code says                                                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Former `docs/architecture.md` (replaced by this file)                        | the background does orchestration via `lib/handlers/`                                                     | only the content script imports `lib/handlers/`; orchestration is in `background.ts` and `lib/rme/`                          |
| Former `docs/architecture.md`                                                | the reranker lives in `lib/api/`                                                                          | it lives in `lib/iskandar-diagnosis-engine/llm-reasoner.ts` and is fixed to OpenAI                                           |
| `AGENTS.md` (capsule)                                                        | the trajectory works from one visit; V1/V2 are intentional layers; browser code never reads `process.env` | it needs at least two visits; V1 can't run; `hybrid-trajectory.ts` and `diagnosis-v2.ts` read `process.env` via `globalThis` |
| `entrypoints/sidepanel/AGENTS.md`                                            | recovery from `42be8f0` / `stash@{0}`                                                                     | the commit does not exist; the stash is unrelated                                                                            |
| `docs/architecture/refactor-message-contract-map.md`                         | message list                                                                                              | 5 typed and 4 plain messages are missing; 2 listed as live have no sender; the duplicate listeners go unmentioned            |
| `docs/architecture/refactor-storage-key-map.md`                              | `sentra-assist:*` keys, `lib/settings-store.ts`                                                           | the keys are now `med-assist:*`; that file doesn't exist; audit, OpenAI and IndexedDB keys are missing                       |
| `docs/architecture/canonical-clinical-contract.md`                           | `app: 'sentra-assist'`; "no request client yet"                                                           | `APP_SLUG='med-assist'`; the client exists (`bridge-client.ts:1188`)                                                         |
| `docs/architecture/refactor-*-spec.md`                                       | a split-up background                                                                                     | these describe a target state; `background.ts` is still one file                                                             |
| `docs/CRITICAL_DEIGN_LOCK.md`, `docs/SENTRA ASSIST — END-TO-END FACTORY.txt` | a "golden build" and `_recovery/` folders                                                                 | these are AI-agent prompts from an older setup, and none of the paths they name exist                                        |
| `README.md`                                                                  | see item 6 in section 10                                                                                  |                                                                                                                              |

---

## 12. Open questions (inferred, please confirm)

These are the **[Inferred]** points above that most need a decision from the owner:

1. Should patient identifiers (name, RM, BPJS) go to the crew dashboard at all? And should the
   PII check block that sync or allow it? (§6.3)
2. Is sending prescriptions only through the remote Sentra API intentional, with the local
   pipeline deliberately retired? (§5.4)
3. Can the unused manifest permissions and packages be removed? (§10, item 9)
4. Should `pnpm commit*` and `docs:auto*` be removed or limited to this folder? (§10, item 1)
5. Should the frozen-but-unmounted panel files stay protected? (§10, item 8)
6. Is the login page still needed, given that nothing opens it? (§3)
