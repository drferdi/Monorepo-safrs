<table width="100%">
<tr>
<td width="34%" align="center" valign="top">

<a href="https://github.com/drferdi/AsistenMedis">
  <img
    src="./public/brand/asisten-medis-cdss-white.png"
    alt="Asisten Medis CDSS official logo"
    width="220"
  />
</a>

<br />

<img src="https://img.shields.io/badge/PACKAGE-%40the--abyss%2Fmed--assist-0D1117?style=flat-square" alt="Package @the-abyss/med-assist" />
<img src="https://img.shields.io/badge/VERSION-1.0.1-8B5CF6?style=flat-square" alt="Package version 1.0.1" /><br />
<img src="https://img.shields.io/badge/MANIFEST-2.1.0-5B8CFF?style=flat-square" alt="Extension manifest version 2.1.0" />
<img src="https://img.shields.io/badge/RISK-R2%20%7C%20CLINICAL%20R3-F59E0B?style=flat-square" alt="Risk R2; clinical logic R3" /><br />
<img src="https://img.shields.io/badge/WXT-CHROME%20MV3-22D3EE?style=flat-square" alt="WXT Chrome Manifest V3" />
<img src="https://img.shields.io/badge/REPO-PRIVATE-14B8A6?style=flat-square" alt="Private repository" />

<br /><br />

<sub><code>FKTP · ePUSKESMAS · CLINICAL DECISION SUPPORT</code></sub>

</td>
<td width="66%" valign="top">

SENTRA / CLINICAL INTELLIGENCE

<a href="https://github.com/drferdi/AsistenMedis">
  <img
    src="https://readme-typing-svg.demolab.com?font=Archivo&amp;weight=600&amp;size=29&amp;duration=3400&amp;pause=1500&amp;color=EB5939&amp;vCenter=true&amp;width=720&amp;height=74&amp;lines=TRIAGE+%E2%86%92+DIFFERENTIAL+%E2%86%92+SAFETY+%E2%86%92+RME;DETERMINISTIC+FIRST+%C2%B7+CLINICIAN+FINAL+AUTHORITY"
    alt="Triage to differential to safety to RME. Deterministic first, clinician final authority."
  />
</a>

<b>Asisten Medis</b> is a clinician-facing browser extension for Indonesian primary healthcare. It embeds triage, differential-support, medication safety, longitudinal review, and governed RME transfer directly into the ePuskesmas workflow.

<br /><br />

<b>Operating position:</b> the extension assists clinical work; it does not replace clinical authority. Deterministic safety logic and the local clinical knowledge base remain the primary capsule truth, while model-assisted reasoning is optional and subordinate to review.

<p>
  <a href="#03--identity--naming"><b>Identity</b></a>&nbsp;&nbsp;
  <a href="#05--capability-map"><b>Capabilities</b></a>&nbsp;&nbsp;
  <a href="#07--clinical-intelligence-stack"><b>Clinical Engine</b></a>&nbsp;&nbsp;
  <a href="#12--build--verification"><b>Verification</b></a>&nbsp;&nbsp;
  <a href="./docs/clinical-rules.md"><b>Clinical Rules</b></a>
</p>

<sub><code>OBSERVE → NORMALIZE → GATE → REASON → REVIEW → TRANSFER → AUDIT</code></sub>

<br /><br />

<sub><b>Technology</b> · <code>Sentra Artificial Intelligence · Healthcare Technology</code></sub>

</td>
</tr>
</table>

---

## 01 / ORIGIN SIGNAL

Clinical software at the point of care fails when it asks clinicians to leave the record, retype data, trust an opaque model, or accept an automation that cannot explain what it changed. Asisten Medis is built around the opposite operating model: **stay inside the workflow, make safety gates explicit, preserve clinician control, and make automation observable**.

The current capsule is a **WXT browser extension** for ePuskesmas. It combines local deterministic clinical logic, a structured disease knowledge base, adaptive DOM extraction, governed form filling, longitudinal visit analysis, medication-safety checks, and optional model-assisted reranking.

> [!IMPORTANT]
> **This is clinical decision support.** Suggestions, classifications, alerts, and transfer automation remain subordinate to the clinician. R3 clinical logic requires explicit Chief approval before modification.

---

## 02 / DOCTRINE

<table width="100%">
<tr>
<td width="50%" valign="top">
<sub>
<b><code>DETERMINISTIC FIRST</code></b><br /><br />
The local knowledge base and deterministic clinical criteria are the primary capsule truth. Model-assisted output may enrich ranking or presentation, but it does not silently replace safety logic.
</sub>
</td>
<td width="50%" valign="top">
<sub>
<b><code>CLINICIAN FINAL AUTHORITY</code></b><br /><br />
The system may collect, structure, score, warn, draft, and fill. The clinician remains the terminal authority for diagnosis, treatment, referral, and final RME submission.
</sub>
</td>
</tr>
<tr>
<td valign="top">
<sub>
<b><code>FAIL CLOSED</code></b><br /><br />
Invalid, ambiguous, missing, mismatched, or unsafe input should move toward warning, referral, insufficient-data handling, or explicit failure rather than quiet success.
</sub>
</td>
<td valign="top">
<sub>
<b><code>NO DOUBLE ENTRY BY DEFAULT</code></b><br /><br />
The extension reads the active ePuskesmas context, keeps the clinician in the existing record, and uses controlled transfer paths to reduce retyping without hiding the write path.
</sub>
</td>
</tr>
</table>

---

## 03 / IDENTITY & NAMING

The repository contains several related names from the product's evolution. Current product identity and package identity should stay distinguishable.

<table width="100%">
<tr><td width="31%"><sub><b>GitHub repository</b></sub></td><td><sub><code>drferdi/AsistenMedis</code></sub></td></tr>
<tr><td><sub><b>Current product display</b></sub></td><td><sub><b>Asisten Medis</b> — current WXT manifest name.</sub></td></tr>
<tr><td><sub><b>Capsule / engineering name</b></sub></td><td><sub><b>Med Assist</b> — used in project contracts and architecture documents.</sub></td></tr>
<tr><td><sub><b>Historical product name</b></sub></td><td><sub><b>Sentra Assist</b> — retained in older architecture and UI references.</sub></td></tr>
<tr><td><sub><b>Package</b></sub></td><td><sub><code>@the-abyss/med-assist</code> · version <b>1.0.1</b>.</sub></td></tr>
<tr><td><sub><b>Extension manifest</b></sub></td><td><sub>Version <b>2.1.0</b> · version name <b>Prototype 0.7</b>.</sub></td></tr>
<tr><td><sub><b>Human owner</b></sub></td><td><sub><b>Chief · dr. Ferdi Iskandar</b>.</sub></td></tr>
<tr><td><sub><b>Technology organization</b></sub></td><td><sub><b>Sentra Artificial Intelligence</b>.</sub></td></tr>
<tr><td><sub><b>Default risk</b></sub></td><td><sub><b>R2</b>; protected clinical logic is <b>R3</b>.</sub></td></tr>
<tr><td><sub><b>Repository visibility</b></sub></td><td><sub><b>Private</b>.</sub></td></tr>
</table>

---

## 04 / SYSTEM CONSTELLATION

<details open>
<summary><b><code>CLINICIAN ↔ SIDEPANEL ↔ BACKGROUND ↔ ePUSKESMAS ↔ CLINICAL ENGINES</code></b></summary>

~~~mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "10px"}}}%%
flowchart TB
  HUMAN["CLINICIAN<br/>terminal authority"]
  UI["ASISTEN MEDIS SIDEPANEL<br/>React · WXT MV3"]
  BG["BACKGROUND SERVICE WORKER<br/>orchestration · auth · bridge"]
  CS["CONTENT + MAIN-WORLD BRIDGE<br/>scrape · fill · page helpers"]
  EMR["ePUSKESMAS<br/>active clinical record"]
  SAFE["CLINICAL SAFETY LAYER<br/>Emergency gates · Pattern Engine · guardrails"]
  DX["DIAGNOSIS LAYER<br/>Iskandar Engine · KB · ICD-10 · reranking"]
  DATA["LOCAL / GOVERNED DATA<br/>159-disease KB · epidemiology · DDI · stock"]
  DASH["SENTRA / CREW SERVICES<br/>auth · bridge · canonical endpoints"]
  MODEL["OPTIONAL MODEL PATH<br/>configured reranking / MIRA service"]

  HUMAN --> UI
  UI --> BG
  BG --> CS
  CS <--> EMR
  BG --> SAFE
  BG --> DX
  SAFE --> DX
  DATA --> SAFE
  DATA --> DX
  BG <--> DASH
  DX -. optional .-> MODEL
  DX --> UI
  UI --> HUMAN

  classDef authority fill:#0D1117,stroke:#F59E0B,color:#ffffff,stroke-width:2px;
  classDef core fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
  classDef control fill:#0D1117,stroke:#14B8A6,color:#ffffff,stroke-width:2px;
  classDef agent fill:#0D1117,stroke:#8B5CF6,color:#ffffff,stroke-width:2px;
  classDef surface fill:#0D1117,stroke:#22D3EE,color:#ffffff,stroke-width:1.5px;
  classDef critical fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;
  classDef shared fill:#0D1117,stroke:#64748B,color:#ffffff,stroke-width:1.5px;

  class HUMAN authority;
  class UI,BG core;
  class CS,EMR surface;
  class SAFE control;
  class DX agent;
  class DATA shared;
  class DASH shared;
  class MODEL critical;
~~~

</details>

The capsule is intentionally **standalone**. Its own workspace, lockfile, scripts, WXT configuration, and project contract define its lifecycle; it does not require a parent monorepo to build or verify.

---

## 05 / CAPABILITY MAP

<table width="100%">
<tr><td width="25%"><sub><b><code>TRIAGE</code></b></sub></td><td width="34%"><sub>TTV inference · HTN crisis · glucose crisis · occult shock · Pattern Engine v2.</sub></td><td><sub>Emergency-first safety screening before diagnostic presentation.</sub></td></tr>
<tr><td><sub><b><code>DIAGNOSIS</code></b></sub></td><td><sub>Iskandar Diagnosis Engine · 159-disease KB · ICD-10 · epidemiology weighting.</sub></td><td><sub>Deterministic-first differential support with optional constrained reranking.</sub></td></tr>
<tr><td><sub><b><code>MEDICATION</code></b></sub></td><td><sub>DDI (fails closed) · therapy reasoning · pediatric/geriatric dose support · stock-aware prescription fill · one chronic card per drug through the RME synonym table · PPK/PIONAS standard start when no visit wrote a signa.</sub></td><td><sub>Medication safety and prescription workflow support.</sub></td></tr>
<tr><td><sub><b><code>DAS</code></b></sub></td><td><sub>Adaptive scanning · semantic mapping · cache · page bridge.</sub></td><td><sub>Reads active ePuskesmas clinical context without depending only on brittle selectors.</sub></td></tr>
<tr><td><sub><b><code>RME TRANSFER</code></b></sub></td><td><sub>Anamnesa → Diagnosa → Resep · tab targeting · retries · result classification.</sub></td><td><sub>Governed form filling back into the correct encounter tab.</sub></td></tr>
<tr><td><sub><b><code>TRAJECTORY</code></b></sub></td><td><sub>Longitudinal visits · TTV trends · deterioration signals · SYMPHONY alert bridge.</sub></td><td><sub>Turns visit history into reviewable trend context.</sub></td></tr>
<tr><td><sub><b><code>STATS</code></b></sub></td><td><sub>Daily statistics · diagnosis ranking · DPJP / room / insurance / age / service-time views.</sub></td><td><sub>Identity-free operational summaries from the ePuskesmas daily report.</sub></td></tr>
<tr><td><sub><b><code>MEDLENS + REPORT</code></b></sub></td><td><sub>ECG-oriented development harness · visit-summary PDF · verification block.</sub></td><td><sub>Supporting clinical review and export surfaces.</sub></td></tr>
<tr><td><sub><b><code>AUTH + AUDIT</code></b></sub></td><td><sub>Crew login · passkey path · Mode Lokal · bridge audit · masked identity handling.</sub></td><td><sub>Controlled session, synchronization, and accountability boundaries.</sub></td></tr>
</table>

---

## 06 / EMERGENCY & TRIAGE LAYERS

The clinical safety architecture intentionally keeps multiple layers rather than collapsing them into one generalized model.

<table width="100%">
<tr><td width="22%"><sub><b><code>GATE 1</code></b></sub></td><td width="28%"><sub><b>TTV / vital context</b></sub></td><td><sub>Normalizes and interprets available vital-sign context and surfaces missing or unsafe measurements.</sub></td></tr>
<tr><td><sub><b><code>GATE 2</code></b></sub></td><td><sub><b>Hypertension</b></sub></td><td><sub>Separates hypertensive urgency/emergency context and organ-damage warning paths.</sub></td></tr>
<tr><td><sub><b><code>GATE 3</code></b></sub></td><td><sub><b>Glucose</b></sub></td><td><sub>Handles hypoglycemia and high-glucose alert paths; recent project work explicitly tightened the GDS alert path.</sub></td></tr>
<tr><td><sub><b><code>GATE 4</code></b></sub></td><td><sub><b>Occult shock</b></sub></td><td><sub>Uses absolute and relative hemodynamic context rather than a single universal threshold.</sub></td></tr>
<tr><td><sub><b><code>PATTERN V2</code></b></sub></td><td><sub><b>Extended emergency patterns</b></sub></td><td><sub>Architecture documentation records 70 patterns across 11 extended clinical gates.</sub></td></tr>
<tr><td><sub><b><code>TRIAGE TREE</code></b></sub></td><td><sub><b>Referral decision</b></sub></td><td><sub>Emergency → urgent review → refer → insufficient → treat locally, with fail-closed ordering.</sub></td></tr>
</table>

The active deterministic triage/referral specification is [docs/clinical-rules.md](./docs/clinical-rules.md). It explicitly preserves clinician authority and does not reorder the diagnosis shown to clinicians without separate sign-off.

---

## 07 / CLINICAL INTELLIGENCE STACK

### Iskandar Diagnosis Engine

The current capsule documents an eight-stage decision-support path:

~~~mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 18}, "themeVariables": {"fontFamily": "monospace", "fontSize": "10px"}}}%%
flowchart TB
  A["CLINICAL INPUT"]
  B["01 · PII / PAYLOAD NORMALIZATION"]
  C["02 · EMERGENCY + RED-FLAG CHECKS"]
  D["03 · SYMPTOM MATCHER<br/>159-disease local KB"]
  E["04 · EPIDEMIOLOGY WEIGHTS<br/>45,030 documented cases"]
  F["05 · OPTIONAL RERANKER / KB FALLBACK"]
  G["06 · TRAFFIC-LIGHT + PRESENTATION SAFETY"]
  H["07 · ICD-10 + MEDICATION ENRICHMENT"]
  I["08 · AUDIT / SHADOW COMPARISON"]
  J["CLINICIAN REVIEW SURFACE"]

  A --> B --> C --> D --> E --> F --> G --> H --> I --> J

  classDef critical fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;
  classDef control fill:#0D1117,stroke:#14B8A6,color:#ffffff,stroke-width:2px;
  classDef core fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
  classDef agent fill:#0D1117,stroke:#8B5CF6,color:#ffffff,stroke-width:2px;
  classDef authority fill:#0D1117,stroke:#F59E0B,color:#ffffff,stroke-width:2px;

  class C critical;
  class B,G,I control;
  class D,E,H core;
  class F agent;
  class A,J authority;
~~~

The capsule rule is explicit: **the local clinical knowledge base wins; an LLM is a reranker only**. Optional remote/canonical engine paths may enrich the workbench, but they do not erase the local safety boundary.

### Clinical data surfaces

<table width="100%">
<tr><td width="31%"><sub><b><code>public/data/penyakit.json</code></b></sub></td><td><sub>Primary disease knowledge base used by the diagnosis engine and deterministic triage/referral logic.</sub></td></tr>
<tr><td><sub><b><code>epidemiology_weights_v2.json</code></b></sub></td><td><sub>Local epidemiology weighting surface documented against 45,030 Indonesian clinical cases.</sub></td></tr>
<tr><td><sub><b>DDI data</b></sub></td><td><sub>Project documentation describes a 173,071+ interaction corpus used for drug-interaction checking.</sub></td></tr>
<tr><td><sub><b>Drug stock</b></sub></td><td><sub>Local medication stock data is used to make prescription suggestions aware of availability.</sub></td></tr>
</table>

---

## 08 / DAS · DATA ASCENSION SYSTEM

DAS surfaces the active clinical context from ePuskesmas into the intelligence pipeline.

<details open>
<summary><b><code>ACTIVE PAGE → SCAN → CLASSIFY → MAP → CACHE → NORMALIZE</code></b></summary>

~~~mermaid
sequenceDiagram
    participant Page as ePuskesmas
    participant CS as Content Script
    participant Scan as Adaptive Scanner
    participant Map as Local Mapper
    participant Cache as Mapping Store
    participant BG as Background
    participant UI as Sidepanel

    Page->>CS: active record / DOM
    CS->>Scan: enumerate fields + page context
    Scan->>Map: classify uncertain fields
    Map-->>Scan: candidate mapping
    Scan->>Cache: persist accepted mapping
    Scan->>BG: normalized encounter context
    BG-->>UI: clinical payload
~~~

</details>

<table width="100%">
<tr><td width="27%"><sub><b>Anamnesa</b></sub></td><td><sub>Complaint context, TTV, physical-exam elements, pain-scale and related encounter data.</sub></td></tr>
<tr><td><sub><b>Diagnosa</b></sub></td><td><sub>ICD-10 diagnosis context, case type and visit context.</sub></td></tr>
<tr><td><sub><b>Resep</b></sub></td><td><sub>Medication, signa, dosage, duration and autocomplete-bound page state.</sub></td></tr>
<tr><td><sub><b>Visit history</b></sub></td><td><sub>Longitudinal visit context retained for the active patient workflow; recent governance work moved retention to memory-only handling.</sub></td></tr>
</table>

---

## 09 / RME TRANSFER & FORM FILLING

The transfer path is ordered and encounter-aware:

<sub><code>ANAMNESA → DIAGNOSA → RESEP</code></sub>

<table width="100%">
<tr><td width="28%"><sub><b><code>TAB TARGETING</code></b></sub></td><td><sub>URL patterns, page signals and encounter identifiers are used to select the intended RME tab.</sub></td></tr>
<tr><td><sub><b><code>PATIENT MATCH</code></b></sub></td><td><sub>Recent bridge hardening records patient-tab mismatch as an explicit failure rather than filling another patient's tab.</sub></td></tr>
<tr><td><sub><b><code>AUTOCOMPLETE</code></b></sub></td><td><sub>Medication and signa filling follows the page's own suggestion flow so hidden IDs are populated correctly.</sub></td></tr>
<tr><td><sub><b><code>SIGNA</code></b></sub></td><td><sub>Every riwayat signa form is read (<code>3x sehari</code> becomes <code>3x1</code>); half and decimal units a take are kept into the resep.</sub></td></tr>
<tr><td><sub><b><code>PARTIAL SUCCESS</code></b></sub></td><td><sub>Out-of-stock medications may be reported without blocking unrelated medications; real failures retain their own retry reason.</sub></td></tr>
<tr><td><sub><b><code>AUDIT</code></b></sub></td><td><sub>Transfer steps report state and result rather than silently writing into the record.</sub></td></tr>
</table>

> [!CAUTION]
> Auto-fill is workflow assistance, not autonomous RME authorship. The clinician must remain able to inspect and confirm what is being entered.

---

## 10 / TRAJECTORY · STATS · REPORTING

### Clinical Trajectory

The project includes longitudinal vital-sign and visit-history visualization, deterioration cues, and a SYMPHONY bridge that converts high-severity trajectory findings into the alert surface.

### STATS

The current statistics surface reads the ePuskesmas daily service report in a hidden tab and keeps **identity-free columns** for local aggregation. Current documented views include daily volume, diagnosis ranking, DPJP, poli/ruangan, insurance, age group, and service-time breakdown.

### Visit Summary PDF

"Unduh PDF" on the RME Terapi step saves a one-page A4 summary drawn to Chief's approved <i>Clinical Visit Summary</i> template:

<table width="100%">
<tr><td width="31%"><sub><b>Identity posture</b></sub></td><td><sub>No patient name; report is scoped to the active RM and visit context.</sub></td></tr>
<tr><td><sub><b>Clinical content</b></sub></td><td><sub>Ten numbered blocks: complaint and key findings, vitals and triage, allergy, diagnosis (ICD), medications with STATUS (continued / new) and INTERAKSI (DDInter pairs within the resep, matched allergy) plus the check's result, education, follow-up, the last four visits' diagnosis and vitals with a sparkline and arrow, return-if signs, verification.</sub></td></tr>
<tr><td><sub><b>Verification</b></sub></td><td><sub>DPJP follows the signed-in user and the form. The verifier is dr. Ferdi Iskandar; when he is the DPJP, the verifier is dr. Dibya Arfianda, Sp.OG or dr. Boyong Baskoro, Sp.OG, alternating by RM and day.</sub></td></tr>
<tr><td><sub><b>Rendering</b></sub></td><td><sub>pdf-lib + fontkit, IBM Plex Sans Bold embedded as a subset (the template's weight), the Sentra logomark in the title block; a long prescription continues on a second page.</sub></td></tr>
</table>

---

## 11 / HUMAN AUTHORITY · SAFETY · PRIVACY

<table width="100%">
<tr>
<td width="50%" valign="top">
<sub>
<b><code>THE SYSTEM MAY</code></b><br /><br />
Read governed page context.<br />
Run deterministic safety logic.<br />
Rank and present differential suggestions.<br />
Check medication interactions and availability.<br />
Draft and transfer bounded RME fields.<br />
Show longitudinal trends and operational statistics.
</sub>
</td>
<td width="50%" valign="top">
<sub>
<b><code>THE SYSTEM MAY NOT</code></b><br /><br />
Replace clinician judgment.<br />
Silently invent missing clinical facts.<br />
Write to another patient's encounter.<br />
Treat model output as higher authority than clinical safety rules.<br />
Commit patient data, production credentials, or secrets into source control.<br />
Modify protected R3 logic without required approval.
</sub>
</td>
</tr>
</table>

### Privacy and security posture

<table width="100%">
<tr><td width="29%"><sub><b><code>REPOSITORY</code></b></sub></td><td><sub>Private GitHub repository.</sub></td></tr>
<tr><td><sub><b><code>PII / PHI</code></b></sub></td><td><sub>Project rules prohibit patient data in fixtures, tests, commits, and source-controlled secrets.</sub></td></tr>
<tr><td><sub><b><code>WEB ACCESS</code></b></sub></td><td><sub>Current WXT configuration restricts web-accessible extension resources to ePuskesmas pages.</sub></td></tr>
<tr><td><sub><b><code>REINJECTION</code></b></sub></td><td><sub>Recent audit hardening restricts reinjection to ePuskesmas tabs.</sub></td></tr>
<tr><td><sub><b><code>IDENTITY SYNC</code></b></sub></td><td><sub>Recent governance work masks patient identity sent to the crew portal rather than forwarding the full name.</sub></td></tr>
<tr><td><sub><b><code>SECRETS</code></b></sub></td><td><sub><code>.env.local</code>, API keys, production credentials and patient data must never be committed.</sub></td></tr>
</table>

---

## 12 / BUILD & VERIFICATION

### Runtime contract

<table width="100%">
<tr><td width="28%"><sub><b>Node.js</b></sub></td><td><sub><b>24.x</b> · package engine <code>&gt;=24 &lt;25</code>.</sub></td></tr>
<tr><td><sub><b>Package manager</b></sub></td><td><sub><b>pnpm 11.21.0</b> through <code>node scripts/pnpm.mjs</code>.</sub></td></tr>
<tr><td><sub><b>Extension framework</b></sub></td><td><sub><b>WXT 0.20.x</b> · Manifest V3.</sub></td></tr>
<tr><td><sub><b>UI</b></sub></td><td><sub>React 18 · TypeScript · Sentra design-token constrained sidepanel.</sub></td></tr>
<tr><td><sub><b>Primary output</b></sub></td><td><sub><code>.output/chrome-mv3-dev/manifest.json</code>.</sub></td></tr>
</table>

### Install

~~~bash
node scripts/pnpm.mjs install --frozen-lockfile
~~~

### Development

~~~bash
node scripts/pnpm.mjs run dev
node scripts/pnpm.mjs run dev:firefox
~~~

### Required engineering checks

~~~bash
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run test:contract
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run run:check
node scripts/pnpm.mjs run test:e2e
~~~

### Latest documented verification snapshot

<sub><code>2026-10-04 · RE-RUN WITH THIS README EDIT</code></sub>

<table width="100%">
<tr><td width="30%"><sub><b>Build</b></sub></td><td><sub><b>PASS</b> · exit 0.</sub></td></tr>
<tr><td><sub><b>Typecheck</b></sub></td><td><sub><b>PASS</b> · exit 0.</sub></td></tr>
<tr><td><sub><b>Vitest</b></sub></td><td><sub><b>PASS</b> · 198 files · <b>1708 passed</b> · 17 skipped. Fewer than 2026-10-03 because tests of archived, unreachable code moved out with it.</sub></td></tr>
<tr><td><sub><b>ESLint on source</b></sub></td><td><sub><b>PASS</b> · <code>components lib entrypoints utils types</code> exit 0.</sub></td></tr>
<tr><td><sub><b>Full lint</b></sub></td><td><sub><b>KNOWN FAILURE</b> · four <code>no-console</code> errors in <code>tests/e2e/zz-verify-kb-rx.spec.ts</code>, an uncommitted file of another session.</sub></td></tr>
<tr><td><sub><b>Run check</b></sub></td><td><sub><b>PASS</b> · extension reference check exit 0.</sub></td></tr>
<tr><td><sub><b>E2E</b></sub></td><td><sub><b>PASS</b> · 21 passed (Playwright, installed Chrome).</sub></td></tr>
</table>

---

## 13 / OPERATING STANDARD

1. **Clinical logic stays reviewable.** R3 changes require explicit approval.
2. **The local KB is the clinical source of truth.** Model output is subordinate.
3. **Missing input is not permission to guess.**
4. **Emergency signals outrank workflow convenience.**
5. **A fill operation must target the correct encounter.**
6. **Out-of-stock is a clinical-operational state, not a generic retry error.**
7. **Visit history is patient-scoped and current-session oriented.**
8. **UI authority is preserved.** Protected sidepanel files are not refactored without written approval.
9. **Every release path is capsule-local.** No hidden monorepo dependency.
10. **Verification is evidence, not decoration.** A passing test suite does not erase a known lint, live-integration, or governance gap.
11. **Secrets and patient data stay out of Git.**
12. **Automation remains visible to the clinician.**

---

## 14 / PROJECT STRUCTURE

<table width="100%">
<tr><td width="31%"><sub><b><code>entrypoints/</code></b></sub></td><td><sub>Sidepanel, background service worker, login, content scripts and main-world helper entrypoints.</sub></td></tr>
<tr><td><sub><b><code>components/clinical/</code></b></sub></td><td><sub>TTV, trajectory, MedLens, settings and clinician-facing clinical components.</sub></td></tr>
<tr><td><sub><b><code>components/sidepanel/</code></b></sub></td><td><sub>Dashboard, header/footer, workbench and sidepanel presentation components.</sub></td></tr>
<tr><td><sub><b><code>lib/iskandar-diagnosis-engine/</code></b></sub></td><td><sub>Diagnosis, red-flag, trajectory-safety, workflow and optional reranking logic.</sub></td></tr>
<tr><td><sub><b><code>lib/emergency-detector/</code></b></sub></td><td><sub>TTV, hypertension, glucose, shock and emergency-detection layers.</sub></td></tr>
<tr><td><sub><b><code>lib/clinical/</code></b></sub></td><td><sub>Guardrails, patient context, anamnesis composition, staff resolution and clinical helpers.</sub></td></tr>
<tr><td><sub><b><code>lib/rme/</code></b></sub></td><td><sub>Transfer orchestration, targeting, mapping, truncation and RME workflow support.</sub></td></tr>
<tr><td><sub><b><code>lib/scraper/</code></b></sub></td><td><sub>DAS adaptive scanner, mapper, caches and extraction safety.</sub></td></tr>
<tr><td><sub><b><code>lib/api/</code></b></sub></td><td><sub>Auth, bridge, audit and Sentra service clients.</sub></td></tr>
<tr><td><sub><b><code>public/data/</code></b></sub></td><td><sub>Clinical knowledge, epidemiology, medication stock and other static data surfaces.</sub></td></tr>
<tr><td><sub><b><code>services/medlens-local/</code></b></sub></td><td><sub>Internal ECG OCR/analyzer development harness.</sub></td></tr>
<tr><td><sub><b><code>tests/</code></b></sub></td><td><sub>Runtime and end-to-end verification surfaces; repository tree currently contains more than 200 test/spec paths.</sub></td></tr>
</table>

---

## 15 / SOURCE-OF-TRUTH MAP

<table width="100%">
<tr><td width="34%"><sub><b>Capsule authority</b></sub></td><td><sub><a href="./AGENTS.md"><code>AGENTS.md</code></a> · risk, ownership, lifecycle and protected clinical areas.</sub></td></tr>
<tr><td><sub><b>Project contract</b></sub></td><td><sub><a href="./project.contract.json"><code>project.contract.json</code></a> · runtime, package manager, commands, artifacts and external dependencies.</sub></td></tr>
<tr><td><sub><b>Current work state</b></sub></td><td><sub><a href="./.agents/HANDOFF.md"><code>.agents/HANDOFF.md</code></a> · latest operational state, verification and open items.</sub></td></tr>
<tr><td><sub><b>Durable decisions</b></sub></td><td><sub><a href="./.agents/DECISIONS.md"><code>.agents/DECISIONS.md</code></a> · accepted project decisions.</sub></td></tr>
<tr><td><sub><b>System architecture</b></sub></td><td><sub><a href="./docs/architecture.md"><code>docs/architecture.md</code></a> · canonical architecture; ADRs in <a href="./docs/adr/readme.md"><code>docs/adr/</code></a>.</sub></td></tr>
<tr><td><sub><b>Clinical rules</b></sub></td><td><sub><a href="./docs/clinical-rules.md"><code>docs/clinical-rules.md</code></a> · deterministic triage/referral SSOT.</sub></td></tr>
<tr><td><sub><b>Testing</b></sub></td><td><sub><a href="./docs/testing.md"><code>docs/testing.md</code></a> · test and verification commands.</sub></td></tr>
<tr><td><sub><b>Data reference</b></sub></td><td><sub><a href="./docs/data.md"><code>docs/data.md</code></a> · data surfaces and project data notes.</sub></td></tr>
<tr><td><sub><b>UI authority</b></sub></td><td><sub><a href="./entrypoints/sidepanel/AGENTS.md">Sidepanel UI Authority</a> · protected design and refactor freeze.</sub></td></tr>
<tr><td><sub><b>Repository standards</b></sub></td><td><sub><a href="./LICENSE"><code>LICENSE</code></a> · <a href="./CHANGELOG.md"><code>CHANGELOG.md</code></a> · <a href="./CONTRIBUTING.md"><code>CONTRIBUTING.md</code></a> · <a href="./SECURITY.md"><code>SECURITY.md</code></a> · <a href="./CODE_OF_CONDUCT.md"><code>CODE_OF_CONDUCT.md</code></a>.</sub></td></tr>
</table>

---

## 16 / KNOWN OPEN WORK

The README should not hide current project limitations.

<table width="100%">
<tr><td width="10%"><sub><b>01</b></sub></td><td width="31%"><sub><b>Full lint</b></sub></td><td><sub>Latest handoff still records a full-lint failure in <code>zz-verify-kb-rx.spec.ts</code>.</sub></td></tr>
<tr><td><sub><b>02</b></sub></td><td><sub><b>KB prescription DDI path</b></sub></td><td><sub>Latest handoff records an open prescription path that does not yet call DDI and can fall back to a small mock set when its table throws.</sub></td></tr>
<tr><td><sub><b>03</b></sub></td><td><sub><b>MIRA token design</b></sub></td><td><sub>A safer per-session token design remains open because simply gating the current dev token would stop the production MIRA path.</sub></td></tr>
<tr><td><sub><b>04</b></sub></td><td><sub><b>Dependency prune</b></sub></td><td><sub>Deferred because it changes the lockfile and some tests mock <code>react-apexcharts</code>.</sub></td></tr>
<tr><td><sub><b>05</b></sub></td><td><sub><b>MedLens test typing</b></sub></td><td><sub>Known <code>any</code> suppressions remain in MedLens tests.</sub></td></tr>
<tr><td><sub><b>06</b></sub></td><td><sub><b>Live ePuskesmas fill</b></sub></td><td><sub>A complete live fill of every step on Chief's actual form is still recorded as pending.</sub></td></tr>
<tr><td><sub><b>07</b></sub></td><td><sub><b>Chronic quantity rule</b></sub></td><td><sub>Current mapper behavior can produce a 10-unit quantity where a 30-day PRB-style quantity may be desired; decision remains open.</sub></td></tr>
<tr><td><sub><b>08</b></sub></td><td><sub><b>Standard-start references</b></sub></td><td><sub>Vitamin B complex, thiamine, zinc, iron supplement, nystatin and griseofulvin have no standard-start rule yet; they need references.</sub></td></tr>
<tr><td><sub><b>09</b></sub></td><td><sub><b>Dependabot</b></sub></td><td><sub>GitHub reports two high-severity dependency alerts on this repository; not yet reviewed.</sub></td></tr>
</table>

---

## 17 / LICENSE & GOVERNANCE NOTE

<code>package.json</code> says <code>SEE LICENSE IN LICENSE</code>, and the root <a href="./LICENSE"><code>LICENSE</code></a> now states the terms: proprietary, all rights reserved by dr. Ferdi Iskandar, with a clinical decision-support disclaimer. The previous README's Community / Enterprise licensing table is not repeated here.

> [!NOTE]
> Any other distribution or commercial-use terms are Chief's decision and belong in <code>LICENSE</code>, not in this README.

---

## 18 / ACTIVE STACK

<table width="100%">
<tr>
<td width="50%" valign="top">
<sub>
<b><code>WXT + WEBEXTENSION</code></b><br /><br />
WXT 0.20.x · Chrome Manifest V3 · Firefox build path · sidePanel · storage · scripting · alarms · offscreen · nativeMessaging.
</sub>
</td>
<td width="50%" valign="top">
<sub>
<b><code>REACT + TYPESCRIPT</code></b><br /><br />
React 18 · React DOM 18 · TypeScript 5.8 · strict typecheck path · clinician-facing sidepanel surfaces.
</sub>
</td>
</tr>
<tr>
<td valign="top">
<sub>
<b><code>TESTING</code></b><br /><br />
Vitest 4 · Playwright · Testing Library · contract tests · runtime checks · local harnesses.
</sub>
</td>
<td valign="top">
<sub>
<b><code>VISUALIZATION</code></b><br /><br />
Recharts · ApexCharts · Framer Motion · trajectory, TTV and statistics visual surfaces.
</sub>
</td>
</tr>
<tr>
<td valign="top">
<sub>
<b><code>DOCUMENT / VISION</code></b><br /><br />
pdf-lib · fontkit · IBM Plex Sans · Tesseract.js · internal MedLens OCR/analyzer harness.
</sub>
</td>
<td valign="top">
<sub>
<b><code>STATE + MESSAGING</code></b><br /><br />
Zustand · WebExtension messaging · WXT storage · browser local/session state.
</sub>
</td>
</tr>
<tr>
<td valign="top">
<sub>
<b><code>CLINICAL DATA</code></b><br /><br />
Local disease KB · epidemiology weights · medication stock · DDI corpus · ICD-10/RAG support.
</sub>
</td>
<td valign="top">
<sub>
<b><code>EXTERNAL SERVICES</code></b><br /><br />
ePuskesmas · Sentra / Crew endpoints · optional configured model services. Availability is not inferred from static configuration.
</sub>
</td>
</tr>
</table>

---

## 19 / TROUBLESHOOTING

<table width="100%">
<tr><td width="33%"><sub><b>Extension does not load</b></sub></td><td><sub>Enable Developer Mode and load <code>.output/chrome-mv3-dev/</code> after a successful build.</sub></td></tr>
<tr><td><sub><b>Install fails</b></sub></td><td><sub>Confirm Node 24 and use <code>node scripts/pnpm.mjs install --frozen-lockfile</code>, not plain npm.</sub></td></tr>
<tr><td><sub><b>Auth / bridge failure</b></sub></td><td><sub>Check configured Crew/Dashboard base URL, session state and required auth path.</sub></td></tr>
<tr><td><sub><b>Mode Lokal expected</b></sub></td><td><sub>An empty Dashboard base URL is the documented device-local path.</sub></td></tr>
<tr><td><sub><b>Page not filling</b></sub></td><td><sub>Confirm the intended ePuskesmas tab is active and matched; reinjection is intentionally limited to ePuskesmas.</sub></td></tr>
<tr><td><sub><b>Medication not added</b></sub></td><td><sub>The page autocomplete must resolve both medication and signa so hidden IDs are populated.</sub></td></tr>
<tr><td><sub><b>Out of stock</b></sub></td><td><sub>The transfer layer may continue other medications and report the unavailable item rather than retrying indefinitely.</sub></td></tr>
<tr><td><sub><b>TypeScript error</b></sub></td><td><sub>Run <code>node scripts/pnpm.mjs run typecheck</code>.</sub></td></tr>
<tr><td><sub><b>Clinical tests</b></sub></td><td><sub>Run the full Vitest suite; protected clinical logic is intentionally covered by capsule-local tests.</sub></td></tr>
</table>

---

## 20 / LET'S CONNECT

<p align="center">
  <a href="https://ferdiiskandar.com" title="Website"><img src="https://cdn.simpleicons.org/vercel/8B949E" width="22" height="22" alt="ferdiiskandar.com" /></a>&nbsp;&nbsp;
  <a href="https://github.com/drferdi" title="GitHub"><img src="https://cdn.simpleicons.org/github/8B949E" width="22" height="22" alt="GitHub" /></a>&nbsp;&nbsp;
  <a href="https://orcid.org/my-orcid?orcid=0009-0003-3788-1307" title="ORCID"><img src="https://cdn.simpleicons.org/orcid/8B949E" width="22" height="22" alt="ORCID" /></a>&nbsp;&nbsp;
  <a href="https://linkedin.com/in/dr-ferdi-iskandar-1b620a3b5" title="LinkedIn"><img src="https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg" width="22" height="22" alt="LinkedIn" /></a>
</p>

---

<p align="center">
  <b>Designed and built by Drferdi · Maintained by Sentra Artificial Intelligence</b><br />
  <sub><code>clinical intelligence should assist the clinician — never erase the clinician</code></sub><br /><br />
  <b>Dedicated to Aldebaran, Aimee, Audrey, and Del — &amp; the Indonesia Healthcare Ecosystem.</b>
</p>
