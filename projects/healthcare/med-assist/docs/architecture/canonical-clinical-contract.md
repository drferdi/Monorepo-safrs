# Canonical Clinical Contract

Tanggal: 2026-04-06

## Tujuan

Dokumen ini mengunci kontrak canonical antara `sentra-assist` sebagai
workflow-first UI dan `dashboard` sebagai canonical clinical engine.

Target utamanya:

- `Assist` mengirim payload yang konsisten, lengkap, dan tidak ambigu
- `Dashboard` mengembalikan output scoring klinis yang bisa langsung dirender di
  sidebar
- tidak ada drift semantics antara hasil yang tampil di `Assist` dan hasil yang
  dihitung engine canonical

## Prinsip Kontrak

- kontrak mengikuti field nyata yang sudah hidup di `Assist`
- kontrak selaras dengan `dashboard/src/lib/cdss/types.ts`
- `Assist` boleh menambah context bedside, tetapi tidak mendefinisikan scoring
  final sendiri
- field yang belum tersedia di `Assist` tetap ditandai optional agar rollout
  fase 1 tidak memblokir UX bedside

## Source Mapping Saat Ini

### Dari Assist

- `components/clinical/TTVInferenceUI.tsx`
  - `TTVInferenceData`
  - `anamnesaDraft`
  - `disabilityType`
  - `obesityConfirmation`
  - `pregnancyStatus`
- `entrypoints/sidepanel/main.tsx`
  - `patientData`
  - `prefilledHistoryFlags`
  - `clinicalContext`
  - `prefetchedVisitHistory`

### Dari Dashboard

- `dashboard/src/lib/cdss/types.ts`
  - `CDSSEngineInput`
  - `CDSSEngineResult`
  - `CDSSTrajectoryContext`
- `dashboard/src/lib/vitals/unified-vitals.ts`
  - `TriageVitalSigns`
- `dashboard/src/lib/clinical/trajectory-analyzer.ts`
  - `TrajectoryAnalysis`

## Canonical Request: `TriageInput`

```ts
interface TriageInput {
  request_id: string;
  request_time: string;
  source: {
    app: 'sentra-assist';
    app_version?: string;
    engine_mode: 'preview' | 'canonical';
  };
  patient: {
    patient_id: string;
    rm: string;
    name?: string;
    gender: 'L' | 'P';
    age: number;
    dob?: string;
    payer_label?: string;
    bpjs_status?: 'aktif' | 'nonaktif' | 'mandiri' | null;
    kelurahan?: string;
    facility_name?: string;
  };
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    glucose?: {
      value: number;
      type: 'GDS';
    };
    avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
    supplemental_o2?: boolean;
    pain_score?: number;
    has_copd?: boolean;
    weight_kg?: number;
    height_cm?: number;
    measurement_time?: string;
  };
  narrative: {
    symptom_text_raw: string;
    keluhan_utama: string;
    keluhan_tambahan?: string;
    autocomplete_summary?: string;
    autosen_preset?:
      | 'hypertension'
      | 'hyperglycemia'
      | 'hypoglycemia'
      | 'glucose_tolerance'
      | 'adl';
  };
  context: {
    chronic_diseases: string[];
    allergies: string[];
    pregnancy_status: 'hamil' | 'tidak_hamil' | 'tidak_relevan' | 'tidak_diisi';
    pregnancy_risk?: string;
    special_conditions: string[];
    disability_type?: string;
    obesity_confirmation?: 'confirmed' | 'not_confirmed';
  };
  bedside_signs?: {
    structured_signs_text?: string;
    deterioration_summary_text?: string;
  };
  history?: {
    visits_used?: number;
    prefetched_visits?: Array<{
      encounter_id: string;
      timestamp: string;
      keluhan_utama: string;
      source: 'scrape';
      vitals: {
        sbp: number;
        dbp: number;
        hr: number;
        rr: number;
        temp: number;
        glucose: number;
        spo2: number;
      };
      diagnosa?: {
        icd_x: string;
        nama: string;
      };
    }>;
  };
}
```

## Canonical Response: `ClinicalEngineOutput`

```ts
interface ClinicalEngineOutput {
  request_id: string;
  processed_at: string;
  source: {
    engine: 'dashboard-clinical-engine';
    engine_version: string;
    mode: 'canonical';
  };
  scoring: {
    news2?: {
      score: number;
      risk_level: 'low' | 'low-medium' | 'medium' | 'high';
      drivers: string[];
    };
    map?: {
      value: number;
      interpretation: string;
    };
    occult_shock?: {
      risk_level: 'low' | 'moderate' | 'high' | 'critical';
      suspected: boolean;
      reasoning: string[];
    };
  };
  alerts: Array<{
    id: string;
    family: 'red_flag' | 'news2' | 'early_warning' | 'trajectory' | 'governance';
    severity: 'emergency' | 'urgent' | 'warning' | 'info';
    title: string;
    message: string;
    action?: string;
    criteria_met?: string[];
  }>;
  early_warning_patterns?: Array<{
    id: string;
    label: string;
    severity: 'high' | 'medium' | 'low';
    reasoning: string[];
    recommendations: string[];
  }>;
  trajectory?: {
    available: boolean;
    visit_count: number;
    overall_trend?: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    overall_risk?: 'low' | 'moderate' | 'high' | 'critical';
    momentum_level?: string;
    deterioration_state?: 'improving' | 'stable' | 'deteriorating' | 'critical';
    narrative?: string;
    recommendations?: Array<{
      category: 'improvement' | 'concern' | 'action' | 'monitoring';
      priority: 'high' | 'medium' | 'low';
      text: string;
    }>;
    raw_context?: {
      trajectory_context?: {
        momentumLevel: string;
        convergencePattern: string;
        convergenceScore: number;
        worseningParams: string[];
        isAccelerating: boolean;
        timeToCriticalDays: number | null;
        treatmentResponseNote: string;
        narrative: string;
        visitCount?: number;
      };
      deterioration_summary_text?: string;
    };
  };
  recommendations: {
    immediate_actions: string[];
    monitoring_actions: string[];
    referral_actions: string[];
    next_best_questions: string[];
  };
  governance: {
    disclaimer: string;
    review_required: boolean;
    authoritative_engine: 'dashboard';
  };
}
```

## Field Mapping Assist -> Canonical

| Assist field                             | Canonical field                    | Notes                                     |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------- |
| `patientData.rm`                         | `patient.rm`, `patient.patient_id` | `patient_id` boleh memakai RM pada fase 1 |
| `patientData.gender`                     | `patient.gender`                   | direct                                    |
| `patientData.age`                        | `patient.age`                      | direct                                    |
| `patientData.dob`                        | `patient.dob`                      | optional                                  |
| `patientData.bpjsStatus`                 | `patient.bpjs_status`              | direct                                    |
| `clinicalContext.payerLabel`             | `patient.payer_label`              | prefer extractor direct                   |
| `clinicalContext.facilityName`           | `patient.facility_name`            | direct                                    |
| `ttvState.sbp` dst                       | `vitals.*`                         | parse ke number                           |
| `ttvState.glucose`                       | `vitals.glucose.value`             | fase 1 default type `GDS`                 |
| `state.symptomText`                      | `narrative.symptom_text_raw`       | raw bedside text                          |
| `anamnesaDraft.payload.keluhan_utama`    | `narrative.keluhan_utama`          | canonical                                 |
| `anamnesaDraft.payload.keluhan_tambahan` | `narrative.keluhan_tambahan`       | canonical                                 |
| `ttvState.autosenPreset`                 | `narrative.autosen_preset`         | UI helper context                         |
| `prefilledHistoryFlags`                  | `context.chronic_diseases`         | map ke label klinis                       |
| `ttvState.allergies` + extractor         | `context.allergies`                | merge + dedupe                            |
| `ttvState.pregnancyStatus`               | `context.pregnancy_status`         | map ke enum                               |
| `clinicalContext.pregnancyRisk`          | `context.pregnancy_risk`           | optional                                  |
| `clinicalContext.specialConditions`      | `context.special_conditions`       | optional                                  |
| `ttvState.disabilityType`                | `context.disability_type`          | optional                                  |
| `ttvState.obesityConfirmation`           | `context.obesity_confirmation`     | optional                                  |
| `prefetchedVisitHistory.visits`          | `history.prefetched_visits`        | optional fase 1                           |

## Preview-only Logic Yang Masih Boleh Lokal di Assist

- `AutoComplete+`
- validasi form ringan
- parser extractor RME
- doctor ranking UI
- preview `MAP` untuk visual bedside

Field berikut tidak boleh menjadi semantics final lokal:

- severity label final
- NEWS2 score final
- occult shock final
- trajectory final
- disease-specific early warning semantics

## Gap Fase 1 Yang Masih Ada

- `Assist` belum mengirim `avpu`, `supplemental_o2`, `pain_score`, `has_copd`
- `Assist` belum punya `structured_signs_text` canonical
- `Assist` belum punya `deterioration_summary_text` canonical
- `Assist` belum punya request client untuk memanggil engine canonical

## Recommended Implementation Order

1. bentuk mapper `TriageInput` di `sentra-assist`
2. tambah endpoint canonical di server
3. render `ClinicalEngineOutput` di `Assist`
4. turunkan logic lokal menjadi preview/fallback

## Related Files

- `docs/architecture/assist-ui-dashboard-engine-architecture.md`
- `docs/architecture/assist-dashboard-migration-blueprint.md`
- `docs/adr/ADR-004-dashboard-canonical-clinical-engine.md`

## Runtime Contract Guards (2026-04-08)

Untuk menurunkan risiko drift kontrak saat runtime, `bridge-client` sekarang
menjalankan guard sebelum output canonical diterima UI:

- `isCanonicalClinicalEngineOutput()`
- `isCanonicalDifferentialOutput()`

Guard ini digunakan di:

- `evaluateCanonicalClinicalEngine()`
- `evaluateCanonicalDifferential()`

Artifact schema minimal yang dipakai:

- `CANONICAL_CLINICAL_ENGINE_OUTPUT_SCHEMA`
- `CANONICAL_DIFFERENTIAL_OUTPUT_SCHEMA`

Jika payload backend tidak sesuai shape minimal, client akan melempar error
`contract mismatch` agar kegagalan terlihat eksplisit (fail-fast), bukan
menyebabkan state UI diam-diam korup.

## Contract Parity Test (awal)

Test parity dasar sudah ditambahkan di `lib/api/bridge-client.test.ts` untuk
memastikan guard menerima payload valid dan menolak payload invalid.

Perintah verifikasi cepat:

```powershell
pnpm exec vitest run lib/api/bridge-client.test.ts
```
