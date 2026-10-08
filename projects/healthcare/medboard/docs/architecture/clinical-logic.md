# Clinical Logic & Decision Support — MedBoard

Clinical rules, triage boundaries, early warning calculations, and automated diagnostic workflows in MedBoard.

> ⚠️ **Clinical Advisory Notice:** MedBoard provides decision support only. Final clinical assessment, diagnosis, and prescription authority remain strictly with the licensed attending clinician.

---

## Iskandar Diagnosis Engine V2 (IDE-V2)

**Implementation:** `src/lib/cdss/engine.ts`

IDE-V2 is a hybrid, LLM-first Clinical Decision Support System (CDSS) grounded in the Indonesian Medical Council (KKI) Compendium of 159 Primary Care Diagnoses.

### Execution Pipeline

```text
1. DETERMINISTIC VITAL SIGNS RED FLAGS (Executed locally — zero LLM dependency)
   ├── SpO2 < 90%              → Emergency: Severe Hypoxia
   ├── Systolic BP ≥ 180 mmHg  → Emergency: Hypertensive Crisis
   ├── Systolic BP < 90 mmHg   → Emergency: Hypotension / Shock
   ├── Heart Rate > 140 bpm    → Urgent: Severe Tachycardia
   ├── Heart Rate < 45 bpm     → Urgent: Severe Bradycardia
   ├── Body Temp ≥ 40°C        → Urgent: Hyperpyrexia
   ├── Resp Rate > 30 /min     → Urgent: Severe Tachypnea
   └── Resp Rate < 8 /min      → Emergency: Bradypnea / Respiratory Depression

2. CANDIDATE RETRIEVAL (Hybrid Strategy)
   ├── Keyword pre-filter against penyakit.json (159 KKI primary care diseases)
   └── Semantic embedding filter (when active)
       → Merged & deduplicated, capped at top 18 clinical candidates

3. LLM REASONING
   ├── Primary Engine: DeepSeek Reasoner (deepseek-reasoner, temperature 0.2, max 4096 tokens)
   │   Prompt persona: Clinical assistant calibrated for Indonesian community health centers (Puskesmas)
   │   Structured Output: Validated JSON containing 2 to 5 ranked suggestions
   └── Deterministic Fallback: Local deterministic rules
       Triggered automatically on API error, network timeout (30s), or offline operation

4. CLINICAL VALIDATION & CALIBRATION
   ├── validateLLMSuggestions: ICD-10 code verification, diagnostic nomenclature, and plausibility
   └── applyHybridDecisioning: Category assignment → recommended / review / must_not_miss / deferred

5. RESULT COMPOSITION (CDSSEngineResult)
   ├── suggestions[]: rank, icd10_code, diagnosis_name, confidence (0.0-1.0), reasoning,
   │   key_reasons[], missing_information[], red_flags[], recommended_actions[]
   ├── red_flags[]: severity (emergency/urgent/warning), condition, action, criteria_met[]
   ├── alerts[]: type (red_flag/vital_sign/low_confidence/guideline), severity
   ├── validation_summary: counts, unverified_codes, warnings
   └── next_best_questions[]: targeted follow-up inquiries to narrow differentials
```

### Clinical Knowledge Base

- **Path:** `src/lib/cdss/penyakit.json`
- **Scope:** 159 standard primary care conditions recognized by the Indonesian Medical Council (KKI).
- **Structure per entry:** `icd10`, `nama`, `definisi`, `gejala[]`, `red_flags[]`, `diagnosis_banding[]`.
- **Indexing:** Normalized ICD-10 codes, disease titles, and symptom strings used for rapid token matching.

### Confidence Calibration Scale

| Confidence Range | Clinical Interpretation | System Behavior |
|---|---|---|
| `0.0 – 0.2` | Very Low Probability | Excluded or tagged as low-confidence |
| `0.3 – 0.4` | Low Probability | Requires verification (`review`) |
| `0.5 – 0.6` | Moderate Probability | Plausible differential |
| `0.7 – 0.8` | High Probability | Strong diagnostic match (`recommended`) |
| `0.9 – 1.0` | Very High Probability | Definitive alignment with presentation |

*When all suggestions score below `0.3`, an automated `low_confidence` alert prompts the clinician to capture additional anamnesis or vital signs.*

### Engine Status Signature
```typescript
getCDSSEngineStatus() → {
  ready: boolean,             // Knowledge base loaded and active provider verified
  kb_disease_count: number,   // 159 KKI diseases
  model: string               // Active model signature and fallback mode
}
```

---

## Audrey Clinical Voice Assistant

**Files:** `server.ts` + `src/lib/audrey-persona.ts`

### Operational Status
External streaming voice runtimes are currently held in a disabled state during system re-baselining. Endpoints maintain backward compatibility and report `503 Service Unavailable`.

### Role-Based Interaction Design
| Professional Role | Honorific & Tone |
|---|---|
| General Practitioner / Dentist | `Dokter [FirstName]` |
| Midwife | `Bu Bidan [FirstName]` |
| Female Nurse | `Bu Nurse [FirstName]` |
| Male Nurse | `Pak Perawat [FirstName]` |

### Facility Context (Clinical System Persona)
- **Primary Setting:** UPTD Puskesmas PONED Balowerti, Kota Kediri.
- **Resource Constraints:** No on-site CT/MRI imaging, no resident subspecialists, no intensive care unit (ICU), no mechanical ventilators.
- **Available Diagnostics & Care:** Basic laboratory assays, point-of-care ultrasound, basic ECG, pulse oximetry, National Formulary (Fornas) essential medicines.

---

## EMR Auto-Fill Automation Engine

**Implementation:** `src/lib/emr/engine.ts`

### Execution Workflow
1. Re-use existing headless browser session (30-minute idle TTL).
2. Authenticate against municipal ePuskesmas instance if session expired.
3. Navigate to active encounter record.
4. Orchestrate data transfer through specialized sub-handlers:
   - `anamnesa.ts`: Anamnesis, chief complaint, vital signs, anthropometrics.
   - `diagnosa.ts`: Primary and secondary ICD-10 coding.
   - `resep.ts`: Structured prescription and medication dosage.
5. Stream progress updates via Socket.IO events (`emr:progress`).
6. Append transfer result to audit log.

### Triage Relay
Facilitates real-time patient handoff from nurse triage to the doctor's consultation desk:
- Socket.IO pipeline: `emr:triage-send` → `emr:triage-receive`.
- Identity verification is enforced strictly via server-side session cookies.

---

## Specialized Clinical Modules

| Module Path | Clinical Responsibility |
|---|---|
| `src/lib/clinical/trajectory-analyzer.ts` | Longitudinal chronic disease vital trend evaluation |
| `src/lib/clinical/chronic-disease-classifier.ts` | Chronic disease staging and surveillance |
| `src/lib/clinical/formulary-resolver.ts` | Medication alignment with the Indonesian National Formulary (FORNAS) |
| `src/lib/clinical/finalization-therapy-engine.ts` | Prescription recommendation matching clinical diagnoses |
| `src/lib/htn-classifier.ts` | JNC-8 and Indonesian Cardiology guidelines hypertension staging |
| `src/lib/glucose-classifier.ts` | Diabetes mellitus glycemic control and crisis detection (DKA/HHS) |
| `src/lib/occult-shock-detector.ts` | Subclinical shock, occult hemorrhage, and MAP deterioration |
| `src/lib/calculators/medical-calculators.ts` | Clinical formulas (eGFR, CHA₂DS₂-VASc, CURB-65, NEWS2) |
| `src/lib/lb1/` | Statutory Puskesmas epidemiological reporting engine (LB1) |

---

## Statutory Epidemiological Reporting (LB1 Engine)

**Directory:** `src/lib/lb1/`

- Automates monthly morbidity reporting (Laporan Bulanan 1 - LB1) required by the Ministry of Health and BPJS.
- Maps contemporary ICD-10 encounter codes to standard reporting disease categories (`icd10-2010.ts`, `icd-mapping.ts`).
- Generates compliant spreadsheet exports (`rme-export.ts`, `template-writer.ts`).
- Transformation pipeline: `io.ts` → `process.ts` → `transform.ts` → `template-writer.ts`.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
