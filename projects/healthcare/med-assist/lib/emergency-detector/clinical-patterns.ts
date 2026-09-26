// Designed and constructed by Drferdi.
/**
 * Clinical Pattern Definitions — 70 patterns for the Pattern-Matching Engine (v2).
 *
 * ALL thresholds, severity levels, and recommendations are transcribed 1:1 from:
 *   docs/specs/assist-gate 2-detect-trigger-action.md
 *
 * DO NOT modify clinical content without dr. Ferdi Iskandar review.
 *
 * Pattern ID format: CP-NNN (001-070)
 * Tier A = vitals only, Tier B = vitals + keywords, Tier C = needs new UI inputs
 *
 * @module lib/emergency-detector/clinical-patterns
 */

import { CLINICAL_GATE } from './gate-registry';
import type { ClinicalPattern } from './pattern-types';

export const CLINICAL_PATTERNS: readonly ClinicalPattern[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_SEPSIS_EARLY — qSOFA-based sepsis detection
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-001: qSOFA 2/3 — vitals only (no infection keyword needed)
  {
    id: 'CP-001',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'high',
    title: 'Sepsis suspected — qSOFA {rr}/{sbp}',
    reasoning:
      'qSOFA >=2: RR >=22, SBP <=100, atau perubahan mental. Sejalan dengan kriteria qSOFA (JAMA 2016).',
    requiredCriteria: [],
    scoredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.sbp', op: 'lte', value: 100, label: 'SBP <= 100' },
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'AVPU != A' },
    ],
    minScore: 2,
    recommendations: [
      'Ulang vital sign dalam 15-30 menit',
      'Cari fokus infeksi',
      'Pertimbangkan cairan bila tidak kontraindikasi',
      'Lapor dokter segera',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'A',
    requiresVitals: ['rr', 'sbp'],
    source: 'qSOFA (Singer M, et al. JAMA 2016;315:801-810)',
    differentials: ['Nyeri, cemas, dehidrasi, perdarahan'],
    confidenceWeight: 0.85,
  },

  // CP-002: qSOFA + suspected infection keywords
  {
    id: 'CP-002',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'critical',
    title: 'Sepsis suspected + tanda infeksi — qSOFA {rr}/{sbp}',
    reasoning: 'qSOFA >=2 DENGAN dugaan infeksi aktif. Risiko mortalitas tinggi.',
    requiredCriteria: [
      { field: 'symptoms.suspectedInfection', op: 'true', value: true, label: 'Dugaan infeksi' },
    ],
    scoredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.sbp', op: 'lte', value: 100, label: 'SBP <= 100' },
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'AVPU != A' },
    ],
    minScore: 2,
    recommendations: [
      'Ulang vital sign dalam 15-30 menit',
      'Antibiotik awal sesuai protokol bila infeksi jelas',
      'Pertimbangkan cairan IV',
      'Rujuk cepat ke RS jika instabilitas atau fasilitas terbatas',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'B',
    requiresVitals: ['rr', 'sbp'],
    source: 'qSOFA (JAMA 2016), Surviving Sepsis Campaign 2021',
    differentials: ['Sepsis berat', 'Septic shock awal'],
  },

  // CP-003: Demam + tachycardia + tachypnea (pola #8 tabel)
  {
    id: 'CP-003',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Infeksi sistemik / sepsis awal — Demam + HR >90 + RR >=20',
    reasoning: 'Demam >=38 + HR >90 + RR >=20 mengarah ke infeksi sistemik / sepsis awal.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Temp >= 38.0' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.rr', op: 'gte', value: 20, label: 'RR >= 20' },
    ],
    recommendations: [
      'Cari fokus infeksi (paru, UTI, kulit, abdomen)',
      'O2 bila sesak; cairan bila dehidrasi',
      'Lapor dokter',
      'Bila SBP <=100 atau kesadaran turun: curiga sepsis berat, rujuk',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'A',
    requiresVitals: ['temp', 'hr', 'rr'],
    source: 'MSD Manuals, qSOFA criteria',
    differentials: ['Infeksi lokal', 'Demam non-infeksi'],
  },

  // CP-004: Lansia afebrile + RR & HR naik (pola #9 tabel)
  {
    id: 'CP-004',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Sepsis afebrile pada lansia — RR & HR meningkat tanpa demam',
    reasoning:
      'Lansia sering afebrile saat sepsis. RR dan HR naik tanpa demam tetap curiga infeksi berat.',
    requiredCriteria: [
      {
        field: 'patient.physiology.isOlderAdult',
        op: 'true',
        value: true,
        label: 'Lansia >=65 tahun',
      },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.temp', op: 'lt', value: 38.0, label: 'Temp < 38 (tidak demam)' },
    ],
    recommendations: [
      'Percaya vital sign, jangan tunggu demam',
      'Segera lapor dokter',
      'Evaluasi infeksi (paru, UTI, kulit)',
      'Pertimbangkan rujuk bila ada tanda instabilitas',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'A',
    requiresVitals: ['hr', 'rr', 'temp'],
    source: 'AAFP Sepsis in Elderly, qSOFA',
    differentials: ['Dehidrasi', 'Anemia', 'Heart failure'],
  },

  // CP-005: Hipotermia + vital sign abnormal (pola #10)
  {
    id: 'CP-005',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'high',
    title: 'Hipotermia + vital abnormal — curiga sepsis berat / syok',
    reasoning:
      'Suhu <35C dengan vital sign abnormal mengarah ke sepsis berat, paparan dingin, hipotiroid berat, atau syok.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'lt', value: 35.0, label: 'Temp < 35.0 (hipotermia)' },
    ],
    scoredCriteria: [
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.sbp', op: 'lte', value: 100, label: 'SBP <= 100' },
    ],
    minScore: 1,
    recommendations: [
      'O2 diberikan',
      'Hangatkan perlahan',
      'Pantau BP/HR/RR',
      'Lapor dokter; rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'A',
    requiresVitals: ['temp'],
    source: 'AAFP, Surviving Sepsis Campaign',
    differentials: ['Paparan dingin', 'Hipotiroid berat', 'Syok'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_SEPTIC_SHOCK_HIGH — Sepsis + persistent hypotension
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-006: Sepsis + SBP <90 persisten
  {
    id: 'CP-006',
    gate: CLINICAL_GATE.SEPTIC_SHOCK,
    severity: 'critical',
    title: 'Septic shock suspected — SBP {sbp}, MAP {map}',
    reasoning:
      'Sepsis criteria terpenuhi + SBP <90 atau MAP <65. Definisi syok: hipotensi persisten + disfungsi perfusi. Mortalitas tinggi.',
    requiredCriteria: [{ field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22 (qSOFA)' }],
    scoredCriteria: [
      { field: 'vitals.sbp', op: 'lt', value: 90, label: 'SBP < 90' },
      { field: 'derived.map', op: 'lt', value: 65, label: 'MAP < 65' },
    ],
    minScore: 1,
    recommendations: [
      'Aktifkan emergency flow PMK 47/2018: ABCDE',
      'O2 segera',
      'Cairan IV bolus',
      'Rujuk segera ke IGD RS (hubungi PSC/ambulans)',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'A',
    requiresVitals: ['sbp', 'rr'],
    source: 'Surviving Sepsis Campaign 2021, EMCrit',
    supersededBy: ['hypotension-alert'],
  },

  // CP-007: Bingung/lemah + RR tinggi + HR tinggi (pola #12)
  {
    id: 'CP-007',
    gate: CLINICAL_GATE.SEPTIC_SHOCK,
    severity: 'critical',
    title: 'Sepsis berat — bingung + RR tinggi + HR tinggi',
    reasoning:
      'Kombinasi perubahan mental + RR tinggi + HR tinggi mengarah ke sepsis berat, syok, atau hipoksia otak.',
    requiredCriteria: [
      { field: 'symptoms.alteredMentalStatus', op: 'true', value: true, label: 'Perubahan mental' },
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
    ],
    recommendations: [
      'Perlakukan sebagai sepsis berat',
      'O2, cairan bila indikasi',
      'Pantau ketat',
      'Rujuk segera',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'B',
    requiresVitals: ['rr', 'hr'],
    source: 'MSD Manuals, Surviving Sepsis Campaign',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_SHOCK_INDEX — Hemodynamic risk assessment
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-008: Shock Index 0.9-1.0 (warning)
  {
    id: 'CP-008',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'warning',
    title: 'Hemodynamic risk — Shock Index {shockIndex}',
    reasoning:
      'Shock Index (HR/SBP) = {shockIndex} >= 0.9. Terkait syok hipovolemia, perdarahan, sepsis.',
    requiredCriteria: [
      { field: 'derived.shockIndex', op: 'gte', value: 0.9, label: 'SI >= 0.9' },
      { field: 'derived.shockIndex', op: 'lt', value: 1.0, label: 'SI < 1.0' },
    ],
    recommendations: [
      'Cari sumber: trauma, perdarahan GI, dehidrasi, diare berat, demam tinggi',
      'Ulang vital sign',
      'Pertimbangkan cairan',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'A',
    requiresVitals: ['hr', 'sbp'],
    source: 'PLOS ONE Shock Index Studies',
    confidenceWeight: 0.95,
  },

  // CP-009: Shock Index 1.0-1.2 (high)
  {
    id: 'CP-009',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'high',
    title: 'Hemodynamic instability — Shock Index {shockIndex}',
    reasoning: 'Shock Index >= 1.0. Risiko mortalitas meningkat signifikan.',
    requiredCriteria: [
      { field: 'derived.shockIndex', op: 'gte', value: 1.0, label: 'SI >= 1.0' },
      { field: 'derived.shockIndex', op: 'lt', value: 1.2, label: 'SI < 1.2' },
    ],
    recommendations: [
      'Treat sebagai syok: baringkan, angkat kaki bila aman',
      'O2, hentikan perdarahan bila ada',
      'Pasang infus, mulai cairan',
      'Rujuk bila memburuk',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'A',
    requiresVitals: ['hr', 'sbp'],
    source: 'PLOS ONE, AAFP Shock Management',
    confidenceWeight: 0.95,
  },

  // CP-010: Shock Index >=1.2 (critical)
  {
    id: 'CP-010',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'critical',
    title: 'Syok hemodinamik — Shock Index {shockIndex}',
    reasoning: 'Shock Index >= 1.2. Risiko mortalitas sangat tinggi. Segera intervensi.',
    requiredCriteria: [{ field: 'derived.shockIndex', op: 'gte', value: 1.2, label: 'SI >= 1.2' }],
    recommendations: [
      'ABCDE segera',
      'O2, cairan IV bolus',
      'Rujuk emergensi ke IGD RS',
      'Hubungi PSC/ambulans',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'A',
    requiresVitals: ['hr', 'sbp'],
    source: 'PLOS ONE, EMCrit',
    confidenceWeight: 0.95,
  },

  // CP-011: HR >=120 + SBP 90-100 + kulit dingin (pola #5)
  {
    id: 'CP-011',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'critical',
    title: 'Syok — HR {hr} + SBP {sbp}',
    reasoning:
      'HR >=120 + SBP 90-100 mengarah ke syok hipovolemik (perdarahan, dehidrasi), sepsis berat, atau syok kardiogenik.',
    requiredCriteria: [
      { field: 'vitals.hr', op: 'gte', value: 120, label: 'HR >= 120' },
      { field: 'vitals.sbp', op: 'between', value: [60, 100], label: 'SBP 60-100' },
    ],
    recommendations: [
      'Anggap syok: baringkan, angkat kaki (bila aman)',
      'O2; hentikan perdarahan bila ada',
      'Pasang infus, mulai cairan sesuai SOP',
      'Panggil dokter; rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'A',
    requiresVitals: ['hr', 'sbp'],
    source: 'Medscape Emergency, MSF Guidelines',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_RESP_FAILURE — Acute respiratory failure
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-012: RR >=30 + SpO2 <90 (critical)
  {
    id: 'CP-012',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'critical',
    title: 'Gagal napas akut — RR {rr}, SpO2 {spo2}%',
    reasoning: 'RR >=30 + SpO2 <90% tanpa O2 suplementasi. Risiko gagal napas tinggi.',
    requiredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 30, label: 'RR >= 30' },
      { field: 'vitals.spo2', op: 'lt', value: 90, label: 'SpO2 < 90%' },
      {
        field: 'patient.supplementalO2',
        op: 'false',
        value: false,
        label: 'Tanpa O2 suplementasi',
      },
    ],
    recommendations: [
      'O2 segera: masker 6-10 L/menit',
      'Posisi duduk (semi-fowler)',
      'Bronkodilator bila asma/COPD',
      'Rujuk emergensi ke IGD RS',
    ],
    actionProtocolId: 'PROTO_RESP_FAILURE',
    tier: 'A',
    requiresVitals: ['rr', 'spo2'],
    source: 'WHO Emergency Triage, Neteera Clinical',
  },

  // CP-013: RR >=25 + SpO2 <94 (high)
  {
    id: 'CP-013',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'high',
    title: 'Distress respirasi — RR {rr}, SpO2 {spo2}%',
    reasoning:
      'RR >=25 + SpO2 <94%. Distress respirasi: pneumonia, asma/COPD, edema paru, PE, ARDS.',
    requiredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 25, label: 'RR >= 25' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
    ],
    recommendations: [
      'Posisi duduk; O2 6-10 L/menit',
      'Nebulizer bronkodilator bila asma/COPD sesuai SOP',
      'Pantau RR/SpO2',
      'Panggil dokter; siapkan rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_RESP_FAILURE',
    tier: 'A',
    requiresVitals: ['rr', 'spo2'],
    source: 'WHO Emergency Triage, Nurse Clinical Patterns',
  },

  // CP-014: RR tinggi + sulit bicara + otot bantu napas (pola #2)
  {
    id: 'CP-014',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'critical',
    title: 'Gagal napas berat — sulit bicara + otot bantu napas',
    reasoning: 'Sulit berbicara dan/atau penggunaan otot bantu napas menandakan gagal napas berat.',
    requiredCriteria: [{ field: 'vitals.rr', op: 'gte', value: 25, label: 'RR >= 25' }],
    scoredCriteria: [
      { field: 'symptoms.difficultySpeaking', op: 'true', value: true, label: 'Sulit bicara' },
      { field: 'symptoms.accessoryMuscles', op: 'true', value: true, label: 'Otot bantu napas' },
      { field: 'vitals.spo2', op: 'lt', value: 92, label: 'SpO2 < 92%' },
    ],
    minScore: 1,
    recommendations: [
      'O2 segera',
      'Posisi duduk tegak',
      'Jangan biarkan pasien berbaring datar',
      'Rujuk emergensi ke IGD RS',
    ],
    actionProtocolId: 'PROTO_RESP_FAILURE',
    tier: 'B',
    requiresVitals: ['rr'],
    source: 'Neteera, WHO Triage',
  },

  // CP-015: RR naik + SpO2 turun + kesadaran menurun — "tiga besar jelek" (pola #21)
  {
    id: 'CP-015',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'critical',
    title: 'Deteriorasi berat — RR naik + SpO2 turun + kesadaran menurun',
    reasoning:
      'Tiga indikator jelek bersamaan: RR naik, SpO2 turun, kesadaran menurun. Risiko henti jantung tinggi.',
    requiredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 24, label: 'RR >= 24' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'AVPU != A' },
    ],
    recommendations: [
      'Gawat darurat tertinggi: jaga jalan napas',
      'O2 tinggi',
      'Pantau nadi dan BP',
      'Siapkan RJP bila perlu',
      'Panggil dokter; rujuk emergensi secepat mungkin',
    ],
    actionProtocolId: 'PROTO_CARDIAC_ARREST',
    tier: 'A',
    requiresVitals: ['rr', 'spo2'],
    source: 'RPM Leadership Council, Early Warning Score',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_PE_SUSPECT — Pulmonary Embolism
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-016: Sesak mendadak + RR tinggi + HR tinggi + SpO2 turun + faktor risiko PE (pola #14)
  {
    id: 'CP-016',
    gate: CLINICAL_GATE.PE_SUSPECT,
    severity: 'high',
    title: 'PE suspected — sesak mendadak + SpO2 {spo2}%',
    reasoning:
      'Onset tiba-tiba sesak napas + RR >20 + HR >90 + SpO2 <94 + faktor risiko tromboemboli meningkatkan probabilitas PE.',
    requiredCriteria: [
      { field: 'symptoms.suddenDyspnea', op: 'true', value: true, label: 'Sesak mendadak' },
      { field: 'vitals.rr', op: 'gt', value: 20, label: 'RR > 20' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
    ],
    recommendations: [
      'O2; posisi semi-fowler',
      'Pantau vital sign',
      'Jangan pulangkan',
      'Rujuk segera ke RS dengan fasilitas penunjang',
    ],
    actionProtocolId: 'PROTO_PE_AORTIC_DISSECTION',
    tier: 'B',
    requiresVitals: ['rr', 'hr', 'spo2'],
    source: 'DrOracle PE Guidelines, Wells Criteria',
    differentials: ['Pneumonia', 'Pneumothorax', 'ACS'],
  },

  // CP-017: PE + faktor risiko tromboembolisme
  {
    id: 'CP-017',
    gate: CLINICAL_GATE.PE_SUSPECT,
    severity: 'critical',
    title: 'PE high probability — sesak mendadak + faktor risiko',
    reasoning:
      'Sesak mendadak + faktor risiko tromboemboli (imobilisasi, pasca operasi, kanker, DVT/PE, kehamilan).',
    requiredCriteria: [
      { field: 'symptoms.suddenDyspnea', op: 'true', value: true, label: 'Sesak mendadak' },
      { field: 'symptoms.thromboembolismRisk', op: 'true', value: true, label: 'Faktor risiko PE' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
    ],
    scoredCriteria: [
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
      { field: 'vitals.sbp', op: 'lt', value: 90, label: 'SBP < 90 (instabil)' },
    ],
    minScore: 1,
    recommendations: [
      'Treat sebagai EMERGENCY bila hipotensi/SpO2 sangat turun',
      'Aktifkan GATE_RESP_FAILURE dan GATE_SHOCK',
      'Rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_RESP_FAILURE',
    tier: 'B',
    requiresVitals: ['hr'],
    source: 'DrOracle PE, Wells Criteria',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_ACS — Acute Coronary Syndrome
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-018: Nyeri dada tipikal >=20min + vital sign abnormal
  {
    id: 'CP-018',
    gate: CLINICAL_GATE.ACS,
    severity: 'critical',
    title: 'ACS / MI suspected — nyeri dada tipikal + vital abnormal',
    reasoning:
      'Nyeri dada tipikal >=20 menit + setidaknya satu: HR abnormal, SBP <90 atau >=180, RR meningkat, diaphoresis.',
    requiredCriteria: [
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada tipikal' },
    ],
    scoredCriteria: [
      {
        field: 'symptoms.chestPainDuration20min',
        op: 'true',
        value: true,
        label: 'Durasi >= 20 menit',
      },
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100 (takikardia)' },
      { field: 'vitals.sbp', op: 'lt', value: 90, label: 'SBP < 90 (hipotensi)' },
      { field: 'symptoms.diaphoresis', op: 'true', value: true, label: 'Keringat dingin' },
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak napas' },
    ],
    minScore: 1,
    recommendations: [
      'Pasien TIDAK BOLEH berjalan/berdiri',
      'O2 bila saturasi rendah',
      'Aspirin sesuai protokol PPK bila tidak kontraindikasi',
      'Rujuk segera ke RS dengan fasilitas cath lab',
    ],
    actionProtocolId: 'PROTO_ACS',
    tier: 'B',
    requiresVitals: [],
    source: 'AHA/ACC Guidelines 2021, Nurse Clinical Patterns',
    differentials: ['GERD', 'Muskuloskeletal', 'PE', 'Aortic dissection'],
  },

  // CP-019: HR tinggi + SBP tinggi + nyeri dada/neurologis (pola #6)
  {
    id: 'CP-019',
    gate: CLINICAL_GATE.ACS,
    severity: 'critical',
    title: 'Hipertensi berat + nyeri dada — curiga ACS/Stroke',
    reasoning:
      'HR tinggi + SBP >=160 + nyeri dada atau defisit neurologis. Curiga ACS atau stroke.',
    requiredCriteria: [
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.sbp', op: 'gte', value: 160, label: 'SBP >= 160' },
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada' },
    ],
    recommendations: [
      'Jangan biarkan pasien berdiri/jalan',
      'O2 bila SpO2 rendah',
      'Lapor dokter',
      'Rujuk segera sebagai ACS/Stroke',
    ],
    actionProtocolId: 'PROTO_ACS',
    tier: 'B',
    requiresVitals: ['hr', 'sbp'],
    source: 'DrOracle, AHA/ACC',
    supersededBy: ['hypertensive-alert'],
  },

  // CP-020: Nyeri dada atipikal + faktor risiko (pola #52)
  {
    id: 'CP-020',
    gate: CLINICAL_GATE.ACS,
    severity: 'warning',
    title: 'ACS atipikal — nyeri dada + vital sign normal',
    reasoning:
      'Vital sign normal tapi nyeri dada atipikal pada pasien dengan faktor risiko (DM, hipertensi, riwayat jantung). Beberapa MI datang dengan vital awal normal.',
    requiredCriteria: [
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada' },
    ],
    recommendations: [
      'Tetap treat sebagai potensial ACS',
      'Istirahat, O2 bila perlu',
      'EKG/rujuk jika bisa',
      'Jangan dismiss hanya karena vital sign normal',
      'Konsultasi dokter',
    ],
    actionProtocolId: 'PROTO_ACS',
    tier: 'B',
    requiresVitals: [],
    source: 'Geeky Medics ED Presentations',
    differentials: ['GERD', 'Muskuloskeletal', 'Anxiety'],
    confidenceWeight: 0.6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_STROKE — Cerebrovascular accident
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-021: FAST criteria — focal neuro deficit mendadak
  {
    id: 'CP-021',
    gate: CLINICAL_GATE.STROKE,
    severity: 'critical',
    title: 'Stroke suspected — defisit neurologis fokal mendadak',
    reasoning:
      'Onset tiba-tiba: kelemahan wajah/anggota gerak satu sisi, gangguan bicara, atau gangguan penglihatan mendadak.',
    requiredCriteria: [
      {
        field: 'symptoms.focalNeuroDeficit',
        op: 'true',
        value: true,
        label: 'Defisit neurologis fokal',
      },
      { field: 'symptoms.suddenOnset', op: 'true', value: true, label: 'Onset mendadak' },
    ],
    recommendations: [
      'Catat waktu onset gejala (last known well)',
      'Jaga jalan napas; posisi kepala ~30 derajat bila kesadaran turun',
      'O2 bila hipoksia',
      'JANGAN turunkan BP agresif di FKTP',
      'Rujuk SEGERA (time critical — door-to-needle)',
      'BP tinggi BUKAN alasan menahan rujukan',
    ],
    actionProtocolId: 'PROTO_STROKE',
    tier: 'B',
    requiresVitals: [],
    source: 'AHA/ASA Stroke Guidelines, DrOracle',
    differentials: ['TIA', 'Hipoglikemia', 'Todd paralysis', 'Migraine with aura'],
  },

  // CP-022: Stroke + hipertensi berat
  {
    id: 'CP-022',
    gate: CLINICAL_GATE.STROKE,
    severity: 'critical',
    title: 'Stroke + hipertensi — SBP {sbp}',
    reasoning:
      'Defisit neurologis fokal + SBP >160. Sering menyertai stroke, BUKAN alasan tunda rujukan.',
    requiredCriteria: [
      { field: 'symptoms.focalNeuroDeficit', op: 'true', value: true, label: 'Defisit neurologis' },
      { field: 'vitals.sbp', op: 'gt', value: 160, label: 'SBP > 160' },
    ],
    recommendations: [
      'JANGAN turunkan BP agresif',
      'Catat onset waktu gejala',
      'Rujuk SEGERA — time critical',
    ],
    actionProtocolId: 'PROTO_STROKE',
    tier: 'B',
    requiresVitals: ['sbp'],
    source: 'AHA/ASA, PERDOSSI',
    supersededBy: ['hypertensive-alert'],
  },

  // CP-023: Nyeri kepala hebat mendadak "thunderclap" (pola #29)
  {
    id: 'CP-023',
    gate: CLINICAL_GATE.STROKE,
    severity: 'critical',
    title: 'Perdarahan subaraknoid — nyeri kepala thunderclap + BP tinggi',
    reasoning:
      'Nyeri kepala hebat mendadak (thunderclap) + muntah +/- penurunan kesadaran + BP tinggi mengarah ke SAH atau stroke hemoragik.',
    requiredCriteria: [
      { field: 'vitals.sbp', op: 'gt', value: 140, label: 'SBP > 140' },
      { field: 'symptoms.nausea', op: 'true', value: true, label: 'Mual/muntah' },
      { field: 'symptoms.suddenOnset', op: 'true', value: true, label: 'Onset mendadak' },
    ],
    recommendations: [
      'O2; jaga jalan napas',
      'Jangan turunkan BP agresif',
      'Rujuk emergensi (CT scan/neurologi)',
    ],
    actionProtocolId: 'PROTO_STROKE',
    tier: 'B',
    requiresVitals: ['sbp'],
    source: 'Geeky Medics, AHA/ASA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_ANAPHYLAXIS
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-024: Anafilaksis — paparan alergen + kulit/mukosa + respirasi/kardiovaskular
  {
    id: 'CP-024',
    gate: CLINICAL_GATE.ANAPHYLAXIS,
    severity: 'critical',
    title: 'Anafilaksis — EMERGENCY',
    reasoning:
      'Paparan alergen + gejala kulit/mukosa + kompromi respirasi atau kardiovaskular. Sesuai definisi klinis anafilaksis.',
    requiredCriteria: [
      { field: 'symptoms.allergenExposure', op: 'true', value: true, label: 'Paparan alergen' },
      {
        field: 'symptoms.skinMucosalSymptoms',
        op: 'true',
        value: true,
        label: 'Gejala kulit/mukosa',
      },
    ],
    scoredCriteria: [
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak napas' },
      { field: 'symptoms.wheezing', op: 'true', value: true, label: 'Wheezing/stridor' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
      { field: 'vitals.sbp', op: 'lt', value: 90, label: 'SBP < 90' },
      { field: 'vitals.hr', op: 'gt', value: 120, label: 'HR > 120' },
    ],
    minScore: 1,
    recommendations: [
      'Adrenalin IM SEGERA (0,3-0,5 mg IM dewasa)',
      'O2',
      'Posisi Trendelenburg jika hipotensi',
      'Pasang infus, cairan',
      'Rujuk emergensi ke RS',
    ],
    actionProtocolId: 'PROTO_ANAPHYLAXIS',
    tier: 'B',
    requiresVitals: [],
    source: 'WHO Anaphylaxis Guidelines, EAACI 2021, EMCrit',
  },

  // CP-025: Paparan alergen + gejala kulit saja (moderate — watch for escalation)
  {
    id: 'CP-025',
    gate: CLINICAL_GATE.ANAPHYLAXIS,
    severity: 'warning',
    title: 'Reaksi alergi — pantau eskalasi ke anafilaksis',
    reasoning:
      'Paparan alergen + gejala kulit/mukosa TANPA kompromi respirasi/kardiovaskular saat ini. Bisa eskalasi.',
    requiredCriteria: [
      { field: 'symptoms.allergenExposure', op: 'true', value: true, label: 'Paparan alergen' },
      {
        field: 'symptoms.skinMucosalSymptoms',
        op: 'true',
        value: true,
        label: 'Gejala kulit/mukosa',
      },
    ],
    recommendations: [
      'Pantau ketat — bisa eskalasi ke anafilaksis',
      'Siapkan adrenalin IM',
      'Ulang vital sign tiap 5-10 menit',
      'Konsultasi dokter',
    ],
    actionProtocolId: 'PROTO_ANAPHYLAXIS',
    tier: 'B',
    requiresVitals: [],
    source: 'WHO, EAACI 2021',
    confidenceWeight: 0.65,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_DKA_HHS — Diabetic Ketoacidosis / Hyperosmolar Hyperglycemic State
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-026: Glucose tinggi + napas Kussmaul + gejala GI
  {
    id: 'CP-026',
    gate: CLINICAL_GATE.DKA_HHS,
    severity: 'critical',
    title: 'DKA/HHS suspected — glucose {glucose}, RR {rr}',
    reasoning:
      'Glucose tinggi + RR tinggi (pola Kussmaul) + gejala GI (mual, muntah, nyeri perut). Cocok dengan DKA/HHS.',
    requiredCriteria: [
      { field: 'vitals.glucose', op: 'gte', value: 250, label: 'Glucose >= 250' },
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22 (napas cepat)' },
    ],
    scoredCriteria: [
      { field: 'symptoms.kussmaulBreathing', op: 'true', value: true, label: 'Napas Kussmaul' },
      { field: 'symptoms.giSymptoms', op: 'true', value: true, label: 'Mual/muntah/nyeri perut' },
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
    ],
    minScore: 1,
    recommendations: [
      'Cek gula darah segera',
      'O2 bila sesak',
      'Pasang infus, mulai cairan sesuai SOP',
      'JANGAN berikan insulin mandiri di FKTP',
      'Rujuk emergensi ke RS (jangan tunda)',
    ],
    actionProtocolId: 'PROTO_DKA_HHS',
    tier: 'B',
    requiresVitals: ['glucose', 'rr'],
    source: 'PERKENI 2024, ADA 2026, AAFP',
    supersededBy: ['hyperglycemia-crisis-alert'],
  },

  // CP-027: HHS pattern — glucose sangat tinggi + dehidrasi
  {
    id: 'CP-027',
    gate: CLINICAL_GATE.DKA_HHS,
    severity: 'critical',
    title: 'HHS suspected — glucose {glucose} (sangat tinggi)',
    reasoning: 'Glucose >=600 mg/dL mengarah ke HHS. Mortalitas tinggi tanpa penanganan.',
    requiredCriteria: [
      { field: 'vitals.glucose', op: 'gte', value: 600, label: 'Glucose >= 600 (HHS threshold)' },
    ],
    recommendations: [
      'Cairan IV segera (NaCl 0,9%)',
      'JANGAN berikan insulin di FKTP',
      'Rujuk emergensi ke RS ICU',
    ],
    actionProtocolId: 'PROTO_DKA_HHS',
    tier: 'A',
    requiresVitals: ['glucose'],
    source: 'PERKENI 2024, ADA 2026',
    supersededBy: ['hyperglycemia-crisis-alert'],
  },

  // CP-028: Early DKA — glucose moderate + gejala metabolik
  {
    id: 'CP-028',
    gate: CLINICAL_GATE.DKA_HHS,
    severity: 'high',
    title: 'Early DKA — glucose {glucose} + gejala metabolik',
    reasoning:
      'Glucose 200-250 + gejala metabolik (poliuria, polidipsia, mual, lemas). DKA bisa terjadi pada glucose tidak terlalu tinggi.',
    requiredCriteria: [{ field: 'vitals.glucose', op: 'gte', value: 200, label: 'Glucose >= 200' }],
    scoredCriteria: [
      { field: 'symptoms.kussmaulBreathing', op: 'true', value: true, label: 'Napas Kussmaul' },
      { field: 'symptoms.giSymptoms', op: 'true', value: true, label: 'Mual/muntah' },
      { field: 'symptoms.polyuria', op: 'true', value: true, label: 'Poliuria' },
      { field: 'symptoms.weakness', op: 'true', value: true, label: 'Lemas' },
    ],
    minScore: 2,
    recommendations: [
      'Cek gula darah ulang',
      'Cairan oral/IV',
      'Dokter review',
      'Pertimbangkan rujuk bila gejala memburuk',
    ],
    actionProtocolId: 'PROTO_DKA_HHS',
    tier: 'B',
    requiresVitals: ['glucose'],
    source: 'PERKENI 2024, ADA 2026',
    supersededBy: ['hyperglycemia-crisis-alert', 'diabetes-alert'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_RESP_ASTHMA_COPD — Acute exacerbation
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-029: Wheezing + sesak + RR tinggi + SpO2 turun
  {
    id: 'CP-029',
    gate: CLINICAL_GATE.RESP_ASTHMA_COPD,
    severity: 'high',
    title: 'Eksaserbasi asma/COPD — RR {rr}, SpO2 {spo2}%',
    reasoning:
      'Sesak memburuk + wheezing + RR >=24 + SpO2 <94. Eksaserbasi asma/COPD sedang-berat.',
    requiredCriteria: [
      { field: 'symptoms.wheezing', op: 'true', value: true, label: 'Wheezing' },
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak napas' },
    ],
    scoredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 24, label: 'RR >= 24' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
    ],
    minScore: 1,
    recommendations: [
      'Posisi duduk; O2',
      'Nebulizer bronkodilator',
      'Pantau RR/SpO2',
      'Bila tidak membaik atau SpO2 <92: treat sebagai gagal napas, rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_ASTHMA_COPD_EXACERBATION',
    tier: 'B',
    requiresVitals: [],
    source: 'Neteera Clinical, GINA Guidelines',
    differentials: ['Pneumonia', 'Heart failure', 'PE'],
  },

  // CP-030: Silent chest / sulit bicara — status asthmaticus
  {
    id: 'CP-030',
    gate: CLINICAL_GATE.RESP_ASTHMA_COPD,
    severity: 'critical',
    title: 'Status asthmaticus — sulit bicara / silent chest',
    reasoning:
      'Sulit bicara (hanya beberapa kata per napas) atau penurunan wheeze (silent chest) = eksaserbasi berat / near-fatal.',
    requiredCriteria: [{ field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak' }],
    scoredCriteria: [
      { field: 'symptoms.difficultySpeaking', op: 'true', value: true, label: 'Sulit bicara' },
      { field: 'symptoms.accessoryMuscles', op: 'true', value: true, label: 'Otot bantu napas' },
      { field: 'vitals.spo2', op: 'lt', value: 92, label: 'SpO2 < 92%' },
    ],
    minScore: 1,
    recommendations: [
      'Treat sebagai GAGAL NAPAS',
      'O2 segera; nebulizer',
      'Rujuk emergensi ke IGD RS',
    ],
    actionProtocolId: 'PROTO_ASTHMA_COPD_EXACERBATION',
    tier: 'B',
    requiresVitals: [],
    source: 'GINA Severe Exacerbation, Neteera',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE_ANEMIA_BLEED_CHRONIC
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-031: HR naik + pucat + RR naik + BP rendah (pola #20)
  {
    id: 'CP-031',
    gate: CLINICAL_GATE.ANEMIA_BLEED,
    severity: 'warning',
    title: 'Anemia sedang-berat / perdarahan kronis',
    reasoning:
      'HR meningkat saat aktivitas ringan + pucat + RR agak naik + BP normal/rendah. Mengarah ke anemia sedang-berat.',
    requiredCriteria: [{ field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' }],
    scoredCriteria: [
      { field: 'symptoms.pallor', op: 'true', value: true, label: 'Pucat' },
      { field: 'symptoms.fatigue', op: 'true', value: true, label: 'Lelah/capek' },
      { field: 'symptoms.bleedingHistory', op: 'true', value: true, label: 'Riwayat perdarahan' },
    ],
    minScore: 1,
    recommendations: [
      'Tidak selalu emergensi',
      'Atur rujukan cepat untuk pemeriksaan lab',
      'Bila sangat lemah, sesak, atau tanda syok: rujuk emergensi',
    ],
    tier: 'B',
    requiresVitals: ['hr'],
    source: 'PLOS ONE, AAFP Anemia',
    differentials: ['Dehidrasi', 'Tiroid', 'Heart failure'],
  },

  // CP-032: Anemia + tanda syok
  {
    id: 'CP-032',
    gate: CLINICAL_GATE.ANEMIA_BLEED,
    severity: 'critical',
    title: 'Anemia berat + tanda syok — HR {hr}, SBP {sbp}',
    reasoning:
      'Tanda anemia/perdarahan + hipotensi. Mengarah ke perdarahan akut atau anemia berat dekompensasi.',
    requiredCriteria: [
      { field: 'vitals.hr', op: 'gt', value: 110, label: 'HR > 110' },
      { field: 'vitals.sbp', op: 'lt', value: 100, label: 'SBP < 100' },
    ],
    scoredCriteria: [
      { field: 'symptoms.pallor', op: 'true', value: true, label: 'Pucat' },
      { field: 'symptoms.fatigue', op: 'true', value: true, label: 'Lemas' },
      { field: 'symptoms.bleedingHistory', op: 'true', value: true, label: 'Riwayat perdarahan' },
      { field: 'symptoms.syncope', op: 'true', value: true, label: 'Pingsan' },
    ],
    minScore: 1,
    recommendations: [
      'Treat sebagai syok: baringkan, angkat kaki',
      'O2, pasang infus, cairan',
      'Rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'B',
    requiresVitals: ['hr', 'sbp'],
    source: 'AAFP, MSF Shock Guidelines',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-GATE PATTERNS — Vital sign combinations (dari tabel pola #1-70)
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-033: RR naik ringan + SpO2 normal (pola #1 — warning)
  {
    id: 'CP-033',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'RR meningkat ringan — RR {rr}, SpO2 {spo2}% (normal)',
    reasoning:
      'RR >=22-24 + SpO2 normal (>=94). Bisa nyeri, cemas, demam; bisa juga awal infeksi/sepsis/asidosis.',
    requiredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.rr', op: 'lt', value: 25, label: 'RR < 25 (ringan)' },
      { field: 'vitals.spo2', op: 'gte', value: 94, label: 'SpO2 >= 94% (normal)' },
    ],
    recommendations: [
      'Tenangkan pasien; cari fokus infeksi/nyeri',
      'Ulang RR setelah tenang',
      'Bila RR tetap tinggi + dugaan infeksi: lapor dokter, jangan langsung pulang',
    ],
    tier: 'A',
    requiresVitals: ['rr', 'spo2'],
    source: 'MSD Manuals',
    confidenceWeight: 0.6,
  },

  // CP-034: HR 90-110 + BP normal + demam/nyeri (pola #4)
  {
    id: 'CP-034',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Takikardia ringan — HR {hr}, penyebab belum jelas',
    reasoning:
      'HR 90-110 + BP normal. Bisa nyeri, cemas, dehidrasi, infeksi lokal, awal sepsis, atau anemia.',
    requiredCriteria: [
      { field: 'vitals.hr', op: 'between', value: [90, 110], label: 'HR 90-110' },
      { field: 'vitals.sbp', op: 'gte', value: 100, label: 'SBP >= 100 (normal)' },
    ],
    recommendations: [
      'Obati nyeri, cairan oral',
      'Pantau ulang HR',
      'Bila tetap tinggi tanpa penyebab jelas atau disertai RR naik: lapor dokter',
    ],
    tier: 'A',
    requiresVitals: ['hr', 'sbp'],
    source: 'MSD Manuals',
    confidenceWeight: 0.5,
  },

  // CP-035: Bradikardia signifikan (pola #7)
  {
    id: 'CP-035',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'high',
    title: 'Bradikardia signifikan — HR {hr}',
    reasoning:
      'HR <50 (non-atlet). Curiga blok jantung, efek obat, gangguan konduksi, TIK meningkat.',
    requiredCriteria: [{ field: 'vitals.hr', op: 'lt', value: 50, label: 'HR < 50' }],
    scoredCriteria: [
      { field: 'symptoms.dizziness', op: 'true', value: true, label: 'Pusing' },
      { field: 'symptoms.weakness', op: 'true', value: true, label: 'Lemas' },
      { field: 'symptoms.syncope', op: 'true', value: true, label: 'Sinkop' },
      { field: 'vitals.sbp', op: 'lt', value: 100, label: 'SBP < 100' },
    ],
    minScore: 0,
    recommendations: [
      'Pantau BP, kesadaran',
      'Cek riwayat obat (beta-blocker, CCB, digoxin)',
      'O2 bila perlu',
      'Bila sinkop/lemas berat: treat sebagai gawat darurat, rujuk segera',
    ],
    tier: 'A',
    requiresVitals: ['hr'],
    source: 'ClinicalGate Bradycardia',
    differentials: ['Efek obat', 'Blok AV', 'Hipotiroid', 'Athlete heart'],
  },

  // CP-036: AVPU != A mendadak (pola #11)
  {
    id: 'CP-036',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'critical',
    title: 'Kode MERAH — AVPU != A mendadak',
    reasoning:
      'Penurunan kesadaran mendadak. Curiga hipoglikemia, hipoksia, syok, stroke, trauma kepala, sepsis berat, intoksikasi.',
    requiredCriteria: [{ field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'AVPU != A' }],
    recommendations: [
      'KODE MERAH: cek gula darah dan vital sign SEGERA',
      'Jaga jalan napas, posisi miring bila risiko muntah',
      'O2',
      'Panggil dokter; rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_SAFETY_NET_CLINICAL_CONCERN',
    tier: 'A',
    requiresVitals: [],
    source: 'DrOracle, WHO Emergency Triage',
    supersededBy: ['avpu-alert'],
  },

  // CP-037: Vital sign borderline tapi pasien sangat lemah (pola #51)
  {
    id: 'CP-037',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Borderline vitals — jangan tertipu angka "masih normal"',
    reasoning:
      'Vital sign hampir normal (SBP 95-100, HR 100-105, SpO2 92-94) tapi pasien sangat lemah. Studi tunjukkan risiko rawat inap 2x lipat dalam 7 hari.',
    requiredCriteria: [
      { field: 'vitals.sbp', op: 'between', value: [90, 100], label: 'SBP 90-100 (borderline)' },
      { field: 'vitals.hr', op: 'between', value: [100, 110], label: 'HR 100-110 (borderline)' },
    ],
    scoredCriteria: [
      { field: 'vitals.spo2', op: 'between', value: [90, 94], label: 'SpO2 90-94%' },
      { field: 'symptoms.weakness', op: 'true', value: true, label: 'Sangat lemah' },
      { field: 'patient.physiology.isOlderAdult', op: 'true', value: true, label: 'Lansia' },
    ],
    minScore: 1,
    recommendations: [
      'Jangan tertipu angka masih normal',
      'Dokumentasikan; ulang vital sign',
      'Lapor dokter',
      'Pertimbangkan observasi lebih lama atau rujuk bila komorbid berat/lansia',
    ],
    actionProtocolId: 'PROTO_SAFETY_NET_CLINICAL_CONCERN',
    tier: 'A',
    requiresVitals: ['sbp', 'hr'],
    source: 'PMC NCBI Borderline Vitals Study',
    confidenceWeight: 0.6,
  },

  // CP-038: Fluktuasi vital sign besar (pola #50) — warning dinamis
  {
    id: 'CP-038',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Deteriorasi progresif — tren vital memburuk',
    reasoning:
      'Fluktuasi vital sign besar dalam hitungan jam. Tren > titik tunggal. Warning dinamis.',
    requiredCriteria: [],
    scoredCriteria: [
      { field: 'vitals.rr', op: 'gte', value: 24, label: 'RR >= 24' },
      { field: 'vitals.hr', op: 'gte', value: 110, label: 'HR >= 110' },
      { field: 'vitals.sbp', op: 'lt', value: 100, label: 'SBP < 100' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
    ],
    minScore: 3,
    recommendations: [
      'Tingkatkan frekuensi monitoring',
      'Panggil dokter',
      'Pertimbangkan rujuk meski tiap angka belum ekstrem',
      'Tren lebih penting dari titik tunggal',
    ],
    actionProtocolId: 'PROTO_SAFETY_NET_CLINICAL_CONCERN',
    tier: 'A',
    requiresVitals: ['rr', 'hr', 'sbp'],
    source: 'PLOS ONE, Early Warning Score Systems',
    confidenceWeight: 0.7,
  },

  // CP-039: Demam + batuk produktif + RR ringan + SpO2 normal (pola #37 — non-emergency)
  {
    id: 'CP-039',
    gate: CLINICAL_GATE.RESP_ASTHMA_COPD,
    severity: 'warning',
    title: 'Pneumonia ringan/moderat — RR {rr}, SpO2 {spo2}%',
    reasoning:
      'Demam + batuk + RR 20-24 + SpO2 normal + HR sedikit naik. Tidak emergensi tapi butuh monitoring.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Temp >= 38' },
      { field: 'vitals.rr', op: 'between', value: [20, 24], label: 'RR 20-24' },
      { field: 'vitals.spo2', op: 'gte', value: 94, label: 'SpO2 >= 94%' },
    ],
    recommendations: [
      'Tidak emergensi',
      'Terapi antibiotik sesuai pedoman',
      'Edukasi red flag: sesak makin berat, saturasi turun, demam tak membaik',
      'Kontrol ulang',
    ],
    tier: 'A',
    requiresVitals: ['temp', 'rr', 'spo2'],
    source: 'FKTP Pneumonia Guidelines',
    confidenceWeight: 0.55,
  },

  // CP-040: Demam ringan + infeksi lokal tanpa red flag (pola #23 — non-emergency)
  {
    id: 'CP-040',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Infeksi ringan — demam tanpa red flag vital',
    reasoning: 'Demam >=38 + RR normal + HR normal + keluhan lokal. Tidak emergensi.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Temp >= 38' },
      { field: 'vitals.rr', op: 'lt', value: 22, label: 'RR < 22 (normal)' },
      { field: 'vitals.hr', op: 'lt', value: 100, label: 'HR < 100 (normal)' },
      { field: 'vitals.sbp', op: 'gte', value: 100, label: 'SBP >= 100' },
    ],
    recommendations: [
      'Tidak emergensi',
      'Tatalaksana sesuai pedoman FKTP',
      'Edukasi red flag: sesak, demam tak turun, lemas berat → segera kembali',
    ],
    tier: 'A',
    requiresVitals: ['temp', 'rr', 'hr', 'sbp'],
    source: 'FKTP Infection Guidelines',
    confidenceWeight: 0.5,
  },

  // CP-041: Demam sedang + HR/RR naik + komorbid (pola #24)
  {
    id: 'CP-041',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Infeksi sedang — RR {rr}, HR {hr}, demam',
    reasoning:
      'Demam >=38 + RR 20-24 + HR >90 tanpa hipotensi. Kemungkinan sepsis awal terutama bila komorbid.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Temp >= 38' },
      { field: 'vitals.rr', op: 'between', value: [20, 24], label: 'RR 20-24' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.sbp', op: 'gte', value: 100, label: 'SBP >= 100 (tidak hipotensi)' },
    ],
    recommendations: [
      'O2 bila sesak; cairan oral/IV',
      'Lapor dokter',
      'Follow-up lebih ketat',
      'Rujuk bila akses RS terbatas dan pasien berisiko tinggi',
    ],
    tier: 'A',
    requiresVitals: ['temp', 'rr', 'hr', 'sbp'],
    source: 'AAFP Sepsis, MSD Manuals',
  },

  // CP-042: Kejang demam (pola #48)
  {
    id: 'CP-042',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'high',
    title: 'Kejang demam — demam tinggi + kejang',
    reasoning:
      'Demam tinggi + kejang tanpa riwayat epilepsi. ABC stabil, kontrol suhu, rujuk bila lama/berulang.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.5, label: 'Temp >= 38.5 (demam tinggi)' },
      { field: 'symptoms.seizure', op: 'true', value: true, label: 'Kejang' },
    ],
    recommendations: [
      'ABC stabil; posisi miring',
      'O2; kontrol suhu',
      'Bila kejang lama atau berulang: Rujuk ke RS',
      'Edukasi orang tua',
    ],
    tier: 'B',
    requiresVitals: ['temp'],
    source: 'IDAI Febrile Seizure Guidelines',
  },

  // CP-043: Riwayat obat sedatif/opioid + RR rendah (pola #44)
  {
    id: 'CP-043',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'high',
    title: 'Depresi napas akibat obat — RR {rr}, SpO2 {spo2}%',
    reasoning:
      'RR rendah (<12) + SpO2 turun + kesadaran menurun. Curiga depresi napas akibat obat sedatif/opioid.',
    requiredCriteria: [{ field: 'vitals.rr', op: 'lt', value: 12, label: 'RR < 12 (bradypnea)' }],
    scoredCriteria: [
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'Kesadaran menurun' },
    ],
    minScore: 1,
    recommendations: [
      'Jaga jalan napas; O2; posisi miring',
      'Panggil dokter',
      'Rujuk emergensi',
      'Pertimbangkan antidotum di RS',
    ],
    actionProtocolId: 'PROTO_RESP_FAILURE',
    tier: 'A',
    requiresVitals: ['rr'],
    source: 'American Addiction Centers, WHO',
  },

  // CP-044: Pasien frailty — lemah + vital naik pelan (pola #49)
  {
    id: 'CP-044',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Frailty + vital naik pelan — high risk',
    reasoning:
      'Pasien sangat lemah, RR dan HR naik pelan, BP cenderung turun, terutama lansia/komorbid. Jangan pulang cepat.',
    requiredCriteria: [
      { field: 'symptoms.weakness', op: 'true', value: true, label: 'Sangat lemah' },
      { field: 'patient.physiology.isOlderAdult', op: 'true', value: true, label: 'Lansia' },
    ],
    scoredCriteria: [
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.rr', op: 'gte', value: 20, label: 'RR >= 20' },
      { field: 'vitals.sbp', op: 'lt', value: 110, label: 'SBP < 110' },
    ],
    minScore: 2,
    recommendations: [
      'Anggap high-risk; jangan pulang cepat',
      'Lapor dokter; evaluasi menyeluruh',
      'Rujuk bila sulit stabil di FKTP',
    ],
    actionProtocolId: 'PROTO_GERIATRIC_OCCULT_RISK',
    tier: 'B',
    requiresVitals: [],
    source: 'PMC NCBI Frailty Studies',
    confidenceWeight: 0.6,
  },

  // CP-045: Demam + nyeri kepala + kaku kuduk (pola #30 — meningitis)
  {
    id: 'CP-045',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'critical',
    title: 'Meningitis/ensefalitis suspected',
    reasoning: 'Demam + tanda meningeal. Hindari pungsi lumbal di FKTP; rujuk emergensi.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Demam >= 38' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
    ],
    recommendations: [
      'O2; pantau vital sign',
      'Hindari pungsi lumbal di FKTP',
      'Rujuk emergensi ke RS',
    ],
    actionProtocolId: 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS',
    tier: 'A',
    requiresVitals: ['temp', 'hr'],
    source: 'WHO Meningitis Guidelines',
    confidenceWeight: 0.65,
  },

  // CP-046: Demam + ruam petekie/purpura + tampak toksik (pola #34)
  {
    id: 'CP-046',
    gate: CLINICAL_GATE.SEPTIC_SHOCK,
    severity: 'critical',
    title: 'Sepsis meningokokus — demam + petekie + toksik',
    reasoning: 'Demam + ruam petekie/purpura + HR dan RR naik + BP turun. Sepsis berat.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Demam' },
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
      { field: 'vitals.sbp', op: 'lt', value: 100, label: 'SBP < 100' },
    ],
    recommendations: [
      'Perlakukan sebagai sepsis berat',
      'O2, cairan, pantau ketat',
      'Rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS',
    tier: 'A',
    requiresVitals: ['temp', 'hr', 'sbp'],
    source: 'WHO Sepsis, MSD Manuals',
  },

  // CP-047: Dengue berat / syok dengue (pola #35)
  {
    id: 'CP-047',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'critical',
    title: 'Dengue berat / syok dengue — HR {hr}, SBP {sbp}',
    reasoning: 'Demam + HR naik + RR naik + tanda perdarahan + tanda syok. Curiga dengue berat.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Demam' },
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
      { field: 'symptoms.bleedingHistory', op: 'true', value: true, label: 'Tanda perdarahan' },
    ],
    scoredCriteria: [
      { field: 'vitals.sbp', op: 'lt', value: 100, label: 'SBP < 100' },
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
    ],
    minScore: 1,
    recommendations: [
      'Pantau ketat HR, BP, CRT',
      'Cairan sesuai pedoman dengue',
      'Rujuk emergensi ke RS',
    ],
    actionProtocolId: 'PROTO_DENGUE_SHOCK',
    tier: 'B',
    requiresVitals: ['temp', 'hr'],
    source: 'WHO Dengue Guidelines',
  },

  // CP-048: Trauma kepala + penurunan kesadaran (pola #38)
  {
    id: 'CP-048',
    gate: CLINICAL_GATE.STROKE,
    severity: 'critical',
    title: 'Cedera kepala berat — peningkatan TIK',
    reasoning:
      'Trauma kepala + muntah berulang + penurunan kesadaran +/- bradikardia + hipertensi. Cushing triad.',
    requiredCriteria: [
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'AVPU != A' },
      { field: 'symptoms.nausea', op: 'true', value: true, label: 'Muntah' },
    ],
    scoredCriteria: [
      { field: 'vitals.hr', op: 'lt', value: 60, label: 'HR < 60 (bradikardia)' },
      { field: 'vitals.sbp', op: 'gt', value: 160, label: 'SBP > 160 (hipertensi)' },
    ],
    minScore: 0,
    recommendations: [
      'ABC stabil; O2',
      'Imobilisasi leher',
      'Pantau BP/HR/RR',
      'Jangan berikan obat penenang sembarangan',
      'Rujuk emergensi (neurotrauma)',
    ],
    actionProtocolId: 'PROTO_NEURO_RED_FLAG',
    tier: 'B',
    requiresVitals: [],
    source: 'Eprints UKH Gadar',
  },

  // CP-049: Nyeri dada pleuritik tanpa demam (pola #36)
  {
    id: 'CP-049',
    gate: CLINICAL_GATE.PE_SUSPECT,
    severity: 'warning',
    title: 'Nyeri dada pleuritik — curiga pneumonia/PE',
    reasoning:
      'Nyeri dada tajam saat tarik napas + RR naik + HR naik + SpO2 sedikit turun tanpa demam. Curiga PE kecil atau pleuritis.',
    requiredCriteria: [
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada' },
      { field: 'vitals.rr', op: 'gt', value: 20, label: 'RR > 20' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
      { field: 'vitals.temp', op: 'lt', value: 38.0, label: 'Tidak demam' },
    ],
    recommendations: [
      'O2 bila perlu',
      'Pantau RR/SpO2',
      'Bila faktor risiko PE kuat atau saturasi turun: rujuk',
      'Jika tidak: tatalaksana ISPA/pneumonia + follow-up ketat',
    ],
    actionProtocolId: 'PROTO_PE_AORTIC_DISSECTION',
    tier: 'B',
    requiresVitals: ['rr', 'hr', 'temp'],
    source: 'DrOracle, Nurse Clinical Patterns',
    differentials: ['PE', 'Pneumonia', 'Pleuritis', 'Muskuloskeletal'],
    confidenceWeight: 0.6,
  },

  // CP-050: Wanita hamil + sesak + nyeri dada (pola #60)
  {
    id: 'CP-050',
    gate: CLINICAL_GATE.PE_SUSPECT,
    severity: 'high',
    title: 'PE/kardiomiopati postpartum — wanita hamil + sesak + nyeri dada',
    reasoning:
      'Wanita hamil/post-partum + sesak + nyeri dada + palpitasi. Curiga PE postpartum atau kardiomiopati peripartum.',
    requiredCriteria: [
      { field: 'history.pregnancyStatus', op: 'eq', value: true, label: 'Hamil/postpartum' },
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak' },
    ],
    scoredCriteria: [
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada' },
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
      { field: 'vitals.rr', op: 'gt', value: 20, label: 'RR > 20' },
    ],
    minScore: 1,
    recommendations: [
      'Curiga tinggi: O2, pantau vital',
      'Rujuk emergensi',
      'Jangan anggap normal pasca melahirkan',
    ],
    actionProtocolId: 'PROTO_PE_AORTIC_DISSECTION',
    tier: 'B',
    requiresVitals: [],
    source: 'ACOG, DrOracle PE',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER C PATTERNS — Defined but gated until UI inputs exist
  // ═══════════════════════════════════════════════════════════════════════════

  // CP-051: Sepsis + known infection source (needs knownDM / chronicDiseases)
  {
    id: 'CP-051',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'high',
    title: 'Sepsis pada pasien DM — risiko tinggi',
    reasoning: 'qSOFA criteria + diketahui DM. Risiko sepsis dan mortalitas lebih tinggi pada DM.',
    requiredCriteria: [
      { field: 'history.knownDM', op: 'true', value: true, label: 'Riwayat DM' },
      { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22' },
      { field: 'vitals.hr', op: 'gt', value: 90, label: 'HR > 90' },
    ],
    recommendations: [
      'Risiko sepsis lebih tinggi pada DM',
      'Cek gula darah segera',
      'Evaluasi infeksi agresif',
      'Threshold rujuk lebih rendah',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'C',
    requiresVitals: ['rr', 'hr'],
    source: 'AAFP Sepsis, PERKENI 2024',
  },

  // CP-052: Asthma/COPD exacerbation — known asthma (needs knownAsthma)
  {
    id: 'CP-052',
    gate: CLINICAL_GATE.RESP_ASTHMA_COPD,
    severity: 'high',
    title: 'Eksaserbasi asma — riwayat asma + sesak + RR tinggi',
    reasoning: 'Riwayat asma + sesak napas memburuk + wheezing + RR >=24 dan/atau SpO2 <94.',
    requiredCriteria: [
      { field: 'history.knownAsthma', op: 'true', value: true, label: 'Riwayat asma' },
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak' },
      { field: 'vitals.rr', op: 'gte', value: 24, label: 'RR >= 24' },
    ],
    recommendations: [
      'Posisi duduk; O2; nebulizer bronkodilator',
      'Pantau; bila tidak membaik atau SpO2 <92 / silent chest: rujuk emergensi',
    ],
    actionProtocolId: 'PROTO_ASTHMA_COPD_EXACERBATION',
    tier: 'C',
    requiresVitals: ['rr'],
    source: 'GINA Guidelines, Neteera',
  },

  // CP-053: COPD exacerbation (needs knownCOPD)
  {
    id: 'CP-053',
    gate: CLINICAL_GATE.RESP_ASTHMA_COPD,
    severity: 'high',
    title: 'Eksaserbasi COPD — riwayat COPD + sesak + RR tinggi',
    reasoning: 'Riwayat COPD + sesak napas memburuk + RR naik.',
    requiredCriteria: [
      { field: 'history.knownCOPD', op: 'true', value: true, label: 'Riwayat COPD' },
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sesak' },
      { field: 'vitals.rr', op: 'gte', value: 24, label: 'RR >= 24' },
    ],
    recommendations: [
      'O2 hati-hati (target SpO2 88-92% pada COPD)',
      'Nebulizer bronkodilator',
      'Rujuk bila tidak membaik',
    ],
    actionProtocolId: 'PROTO_ASTHMA_COPD_EXACERBATION',
    tier: 'C',
    requiresVitals: ['rr'],
    source: 'GOLD Guidelines, Neteera',
  },

  // CP-054: DKA pada known DM (needs knownDM)
  {
    id: 'CP-054',
    gate: CLINICAL_GATE.DKA_HHS,
    severity: 'critical',
    title: 'DKA pada pasien DM — glucose {glucose} + Kussmaul',
    reasoning: 'Diketahui DM + glucose tinggi + napas Kussmaul + gejala GI. DKA confirmed context.',
    requiredCriteria: [
      { field: 'history.knownDM', op: 'true', value: true, label: 'Riwayat DM' },
      { field: 'vitals.glucose', op: 'gte', value: 250, label: 'Glucose >= 250' },
      { field: 'symptoms.kussmaulBreathing', op: 'true', value: true, label: 'Napas Kussmaul' },
    ],
    recommendations: ['Cairan IV segera', 'JANGAN insulin mandiri', 'Rujuk emergensi ke RS'],
    actionProtocolId: 'PROTO_DKA_HHS',
    tier: 'C',
    requiresVitals: ['glucose'],
    source: 'PERKENI 2024, ADA 2026',
    supersededBy: ['hyperglycemia-crisis-alert'],
  },

  // CP-055: Nyeri perut hebat + HR tinggi + hipotensi (pola #27 — abdomen akut)
  {
    id: 'CP-055',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'critical',
    title: 'Emergensi abdomen — nyeri perut hebat + hemodinamik tidak stabil',
    reasoning:
      'HR tinggi + nyeri perut + hipotensi. Curiga peritonitis, perdarahan intraabdomen, KET pada wanita usia subur.',
    requiredCriteria: [
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
      { field: 'symptoms.giSymptoms', op: 'true', value: true, label: 'Nyeri perut' },
    ],
    scoredCriteria: [
      { field: 'vitals.sbp', op: 'lt', value: 100, label: 'SBP < 100' },
      { field: 'symptoms.pallor', op: 'true', value: true, label: 'Pucat' },
    ],
    minScore: 1,
    recommendations: [
      'O2; pantau BP/HR',
      'Jangan berikan analgesik berlebihan sebelum dinilai dokter',
      'Rujuk segera ke RS bedah/OBGYN',
    ],
    actionProtocolId: 'PROTO_SHOCK',
    tier: 'B',
    requiresVitals: ['hr'],
    source: 'Geeky Medics, Surgical Emergency Guidelines',
  },

  // CP-056: Wanita hamil + nyeri perut + perdarahan (pola #28 — KET)
  {
    id: 'CP-056',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'critical',
    title: 'KET / abortus — hamil + nyeri perut + perdarahan',
    reasoning:
      'Wanita hamil + nyeri perut bawah + perdarahan + HR naik + BP turun. Curiga KET atau abortus.',
    requiredCriteria: [
      { field: 'history.pregnancyStatus', op: 'eq', value: true, label: 'Hamil' },
      { field: 'symptoms.giSymptoms', op: 'true', value: true, label: 'Nyeri perut' },
      { field: 'symptoms.bleedingHistory', op: 'true', value: true, label: 'Perdarahan' },
    ],
    recommendations: [
      'O2; pasang infus; pantau tanda vital',
      'Segera rujuk ke RS rujukan maternitas',
      'High suspicion walau fasilitas mini',
    ],
    actionProtocolId: 'PROTO_OBSTETRIC_ABDOMEN_BLEEDING',
    tier: 'B',
    requiresVitals: [],
    source: 'ACOG, Maternal Emergency Guidelines',
  },

  // CP-057: Anak RR tinggi + retraksi + SpO2 turun (pola #42)
  {
    id: 'CP-057',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'critical',
    title: 'Pneumonia berat anak — RR tinggi + retraksi + SpO2 turun',
    reasoning:
      'Anak: RR tinggi sesuai cutoff usia + retraksi dada + SpO2 turun. Anak sangat cepat memburuk.',
    requiredCriteria: [
      { field: 'patient.age', op: 'lt', value: 12, label: 'Anak < 12 tahun' },
      { field: 'vitals.spo2', op: 'lt', value: 94, label: 'SpO2 < 94%' },
      { field: 'symptoms.accessoryMuscles', op: 'true', value: true, label: 'Retraksi dada' },
    ],
    recommendations: [
      'O2; posisi nyaman',
      'Pantau',
      'Rujuk emergensi (anak sangat cepat memburuk)',
    ],
    actionProtocolId: 'PROTO_RESP_FAILURE',
    tier: 'B',
    requiresVitals: ['spo2'],
    source: 'WHO IMCI, IDAI',
  },

  // CP-058: Anak wheezing + sulit bicara/menangis (pola #43)
  {
    id: 'CP-058',
    gate: CLINICAL_GATE.RESP_ASTHMA_COPD,
    severity: 'high',
    title: 'Eksaserbasi asma anak',
    reasoning: 'Anak: RR tinggi + wheezing + kesulitan bicara/menangis.',
    requiredCriteria: [
      { field: 'patient.age', op: 'lt', value: 18, label: 'Anak/remaja' },
      { field: 'symptoms.wheezing', op: 'true', value: true, label: 'Wheezing' },
      {
        field: 'symptoms.difficultySpeaking',
        op: 'true',
        value: true,
        label: 'Sulit bicara/menangis',
      },
    ],
    recommendations: ['Nebulizer; O2', 'Pantau RR/SpO2', 'Bila tidak membaik: rujuk'],
    actionProtocolId: 'PROTO_ASTHMA_COPD_EXACERBATION',
    tier: 'B',
    requiresVitals: [],
    source: 'GINA Pediatric, IDAI',
  },

  // CP-059: Pasien kanker + demam ringan (pola #61 — neutropenic sepsis)
  {
    id: 'CP-059',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'high',
    title: 'Neutropenic sepsis — kanker + demam ringan',
    reasoning:
      'Pasien kanker/kemoterapi + demam sedikit (37,8-38,3). Bisa memburuk sangat cepat meski awal ringan.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 37.8, label: 'Temp >= 37.8' },
      { field: 'symptoms.fatigue', op: 'true', value: true, label: 'Lemas' },
    ],
    recommendations: [
      'Jangan remehkan demam ringan pada pasien kanker',
      'Dokter harus review',
      'Kemungkinan besar perlu rujuk ke RS',
      'Edukasi: demam apapun = tanda bahaya',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'C',
    requiresVitals: ['temp'],
    source: 'NICE Neutropenic Sepsis Guidelines',
    confidenceWeight: 0.55,
  },

  // CP-060: Nyeri punggung + retensi BAK + kelemahan tungkai (pola #66 — cauda equina)
  {
    id: 'CP-060',
    gate: CLINICAL_GATE.STROKE,
    severity: 'critical',
    title: 'Cauda equina syndrome — emergensi neurologis',
    reasoning:
      'Nyeri punggung bawah + retensi BAK/inkontinensia + kelemahan tungkai. Time-critical.',
    requiredCriteria: [
      { field: 'symptoms.weakness', op: 'true', value: true, label: 'Kelemahan tungkai' },
      { field: 'symptoms.suddenOnset', op: 'true', value: true, label: 'Onset akut' },
    ],
    recommendations: [
      'Bukan emergensi ABC, tapi emergensi neurologis/time-critical',
      'Rujuk cepat untuk evaluasi bedah saraf',
    ],
    actionProtocolId: 'PROTO_CAUDA_EQUINA',
    tier: 'B',
    requiresVitals: [],
    source: 'Geeky Medics, Spine Surgery Guidelines',
    confidenceWeight: 0.5,
  },

  // CP-061: Hipoglikemia + kesadaran menurun (pola #19)
  {
    id: 'CP-061',
    gate: CLINICAL_GATE.DKA_HHS,
    severity: 'critical',
    title: 'Hipoglikemia berat — glucose {glucose} + kesadaran menurun',
    reasoning: 'Gula darah rendah + perubahan kesadaran. Life-threatening.',
    requiredCriteria: [
      { field: 'vitals.glucose', op: 'lt', value: 70, label: 'Glucose < 70' },
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'AVPU != A' },
    ],
    recommendations: [
      'Cek gula darah',
      'Bila bisa minum: glukosa oral cepat serap',
      'Bila tidak bisa minum: glukosa IV sesuai PPK',
      'O2; observasi; rujuk bila tidak membaik',
    ],
    actionProtocolId: 'PROTO_HYPOGLYCEMIA',
    tier: 'A',
    requiresVitals: ['glucose'],
    source: 'PERKENI 2024, ADA 15-15 Rule',
    supersededBy: ['hypoglycemia-alert'],
  },

  // CP-062: HR >120 + tremor + berkeringat — tiroid storm (pola #26)
  {
    id: 'CP-062',
    gate: CLINICAL_GATE.SHOCK_INDEX,
    severity: 'critical',
    title: 'Hipertiroid / thyroid storm — HR {hr}',
    reasoning:
      'HR >120 + RR naik + tremor + berkeringat + BB turun + tidak demam + BP bisa tinggi.',
    requiredCriteria: [{ field: 'vitals.hr', op: 'gt', value: 120, label: 'HR > 120' }],
    recommendations: [
      'Tidak selalu emergensi',
      'Bila HR sangat tinggi, lemas, atau gangguan mental: konsultasi dokter, pertimbangkan rujuk',
      'Untuk kasus stabil: rujukan cepat ke spesialis',
    ],
    tier: 'A',
    requiresVitals: ['hr'],
    source: 'Thyroid Storm Clinical Patterns',
    confidenceWeight: 0.5,
  },

  // CP-063: Palpitasi berat + rasa mau pingsan (pola #56)
  {
    id: 'CP-063',
    gate: CLINICAL_GATE.ACS,
    severity: 'warning',
    title: 'Aritmia intermiten — palpitasi + near-syncope',
    reasoning:
      'Vital sign normal/sedikit abnormal + palpitasi berat + rasa mau pingsan + riwayat jantung. Risiko sinkop/sudden death.',
    requiredCriteria: [
      { field: 'symptoms.dizziness', op: 'true', value: true, label: 'Pusing / mau pingsan' },
    ],
    scoredCriteria: [
      { field: 'vitals.hr', op: 'gt', value: 100, label: 'HR > 100' },
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada' },
      { field: 'symptoms.syncope', op: 'true', value: true, label: 'Riwayat pingsan' },
    ],
    minScore: 1,
    recommendations: [
      'Jangan diabaikan',
      'EKG bila tersedia',
      'Rujuk ke RS untuk evaluasi',
      'Edukasi: segera datang bila pingsan/nyeri dada/sesak',
    ],
    tier: 'B',
    requiresVitals: [],
    source: 'PMC NCBI Arrhythmia, Geeky Medics',
    confidenceWeight: 0.55,
  },

  // CP-064: Delirium pada lansia (pola #58)
  {
    id: 'CP-064',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'critical',
    title: 'Delirium akut — lansia + bingung + vital hampir normal',
    reasoning:
      'Vital sign normal/nyaris normal tapi sangat bingung/disorientasi. Tanda gangguan akut otak. Mortalitas tinggi.',
    requiredCriteria: [
      { field: 'patient.physiology.isOlderAdult', op: 'true', value: true, label: 'Lansia' },
      {
        field: 'symptoms.alteredMentalStatus',
        op: 'true',
        value: true,
        label: 'Bingung/disorientasi',
      },
    ],
    recommendations: [
      'Anggap kondisi serius meski vital normal',
      'Cari pemicu: infeksi, obat, hipoglikemia',
      'Lapor dokter',
      'Pertimbangkan rujuk untuk evaluasi menyeluruh',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'B',
    requiresVitals: [],
    source: 'Cleveland Clinic Delirium, PMC NCBI',
  },

  // CP-065: Remaja pingsan saat olahraga (pola #64)
  {
    id: 'CP-065',
    gate: CLINICAL_GATE.ACS,
    severity: 'high',
    title: 'Red flag kardiak pada remaja — pingsan saat olahraga',
    reasoning:
      'Remaja + nyeri dada + palpitasi + pingsan saat olahraga. Curiga HCM, channelopathy. Vital sign bisa normal saat diperiksa.',
    requiredCriteria: [
      { field: 'patient.age', op: 'between', value: [10, 25], label: 'Remaja/dewasa muda' },
      { field: 'symptoms.syncope', op: 'true', value: true, label: 'Pingsan' },
    ],
    recommendations: [
      'RED FLAG BESAR',
      'Rujuk ke kardiolog/RS dengan EKG/USG jantung',
      'Jangan izinkan aktivitas berat sebelum dinyatakan aman',
    ],
    tier: 'B',
    requiresVitals: [],
    source: 'AHA Sudden Cardiac Death in Young Athletes',
  },

  // CP-066: Pasien DM + luka infeksi berat (pola #65)
  {
    id: 'CP-066',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'warning',
    title: 'Infeksi jaringan dalam pada DM — risiko gangren',
    reasoning:
      'DM + bukti luka/ulkus/gangren berisiko tinggi. Curiga infeksi jaringan dalam, osteomielitis, atau awal sepsis meski vital belum dramatis.',
    requiredCriteria: [
      { field: 'history.knownDM', op: 'true', value: true, label: 'Riwayat DM' },
      {
        field: 'symptoms.highRiskWoundInfection',
        op: 'true',
        value: true,
        label: 'Bukti luka/gangren berisiko tinggi',
      },
    ],
    recommendations: [
      'Jangan anggap infeksi kulit biasa',
      'Dokter harus review',
      'Pertimbangkan rujuk untuk debridement/rawat inap',
      'Kontrol gula ketat',
    ],
    tier: 'C',
    requiresVitals: [],
    source: 'PERKENI Diabetic Foot, ADA',
    confidenceWeight: 0.6,
  },

  // CP-067: Nyeri punggung hebat + BP berbeda antar lengan (pola #59 — aortic dissection)
  {
    id: 'CP-067',
    gate: CLINICAL_GATE.ACS,
    severity: 'critical',
    title: 'Diseksi aorta — nyeri punggung/dada hebat mendadak',
    reasoning:
      'Nyeri punggung/dada hebat mendadak + SBP tinggi. Sering miss di primer, sangat mematikan.',
    requiredCriteria: [
      { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada/punggung hebat' },
      { field: 'symptoms.suddenOnset', op: 'true', value: true, label: 'Onset mendadak' },
      { field: 'vitals.sbp', op: 'gt', value: 140, label: 'SBP > 140' },
    ],
    recommendations: [
      'Waspadai pada pasien hipertensi',
      'Jangan berikan manipulasi berat',
      'O2, pain control secukupnya',
      'Rujuk emergensi ke RS dengan fasilitas imaging',
    ],
    actionProtocolId: 'PROTO_PE_AORTIC_DISSECTION',
    tier: 'B',
    requiresVitals: ['sbp'],
    source: 'Geeky Medics ED, AHA Aortic Dissection',
  },

  // CP-068: Overdosis/keracunan obat — RR borderline + mengantuk (pola #55)
  {
    id: 'CP-068',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'high',
    title: 'Overdosis obat — RR borderline + mengantuk berat',
    reasoning:
      'RR borderline (10-12) + SpO2 borderline (92-94) + mengantuk berat. Vital bisa masih borderline sebelum drop.',
    requiredCriteria: [
      { field: 'vitals.rr', op: 'between', value: [8, 12], label: 'RR 8-12 (rendah)' },
      { field: 'patient.avpuManual', op: 'neq', value: 'A', label: 'Kesadaran turun' },
    ],
    recommendations: [
      'Pantau ketat RR/SpO2; jangan biarkan sendirian',
      'Jaga jalan napas (posisi miring)',
      'O2',
      'Lapor dokter; rujuk emergensi sebelum RR turun lebih jauh',
    ],
    actionProtocolId: 'PROTO_TOX_RESP_DEPRESSION',
    tier: 'A',
    requiresVitals: ['rr'],
    source: 'American Addiction Centers',
  },

  // CP-069: Epiglotitis / obstruksi laring (pola #41)
  {
    id: 'CP-069',
    gate: CLINICAL_GATE.RESP_FAILURE,
    severity: 'critical',
    title: 'Epiglotitis / obstruksi laring — sulit napas + suara serak',
    reasoning:
      'Demam + nyeri tenggorok + air liur menetes + suara serak + RR naik + sulit napas. Airway risk tinggi.',
    requiredCriteria: [
      { field: 'vitals.temp', op: 'gte', value: 38.0, label: 'Demam' },
      { field: 'symptoms.dyspnea', op: 'true', value: true, label: 'Sulit napas' },
      { field: 'vitals.rr', op: 'gt', value: 20, label: 'RR > 20' },
    ],
    recommendations: [
      'JANGAN memaksa membuka mulut/menekan lidah',
      'O2; jangan membuat pasien menangis',
      'Rujuk emergensi segera (airway risk tinggi)',
    ],
    actionProtocolId: 'PROTO_UPPER_AIRWAY_OBSTRUCTION',
    tier: 'B',
    requiresVitals: ['temp', 'rr'],
    source: 'ENT Emergency Guidelines',
  },

  // CP-070: Clinical concern — "gut feeling" perawat (pola #70)
  {
    id: 'CP-070',
    gate: CLINICAL_GATE.SEPSIS_EARLY,
    severity: 'critical',
    title: 'Kekhawatiran klinis — pasien tampak lebih sakit dari angka',
    reasoning:
      'Vital sign hampir normal tapi ada gut feeling perawat/dokter bahwa pasien tampak lebih sakit. Literatur EWS mendukung intuisi klinisi sebagai red flag tambahan.',
    requiredCriteria: [
      { field: 'symptoms.clinicalConcern', op: 'true', value: true, label: 'Concern klinis aktif' },
    ],
    recommendations: [
      'Tingkatkan level pemantauan',
      'Anjurkan review dokter',
      'Observasi lebih lama meski skor vital rendah',
    ],
    actionProtocolId: 'PROTO_SAFETY_NET_CLINICAL_CONCERN',
    tier: 'C',
    requiresVitals: [],
    source: 'PLOS ONE EWS, RPM Leadership Council',
    confidenceWeight: 0.7,
  },
];
