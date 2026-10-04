// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Red Flag Safety Rules
 * HARDCODED deterministic rules for life-threatening conditions
 *
 * @module lib/iskandar-diagnosis-engine/red-flags
 * @version 1.0.0
 *
 * CRITICAL: These rules do NOT depend on AI.
 * They are evidence-based, deterministic checks that MUST run
 * before any AI inference to catch emergencies.
 *
 * Sources:
 * - qSOFA: Singer M, et al. JAMA 2016;315:801-810
 * - ACS Guidelines: AHA/ACC 2021
 * - Preeclampsia: ACOG Practice Bulletin 222
 */

import type { AnonymizedClinicalContext } from '../api/ai-types';

import type { VitalSigns } from '@/types/api';

// =============================================================================
// RED FLAG TYPES
// =============================================================================

/**
 * Red flag alert structure
 */
export interface RedFlag {
  /** Unique identifier */
  id: string;

  /** Severity level */
  severity: 'emergency' | 'urgent' | 'warning';

  /** Condition name */
  condition: string;

  /** Required action */
  action: string;

  /** Related ICD-10 codes */
  icd_codes: string[];

  /** Clinical criteria met */
  criteria_met: string[];

  /** Evidence source */
  source?: string;
}

/**
 * Red flag check context
 */
export interface RedFlagContext {
  /** Chief complaint text */
  keluhan: string;

  /** Vital signs */
  vitals?: VitalSigns;

  /** Patient age in years */
  age?: number;

  /** Patient gender */
  gender?: 'L' | 'P';

  /** Pregnancy status */
  pregnant?: boolean;

  /** Known chronic diseases */
  chronic_diseases?: string[];

  /** Known allergies */
  allergies?: string[];
}

// =============================================================================
// SEPSIS CHECK (qSOFA)
// =============================================================================

/**
 * Check for sepsis using qSOFA criteria
 *
 * qSOFA Score (Quick Sequential Organ Failure Assessment):
 * - Respiratory rate >= 22/min (1 point)
 * - Systolic BP <= 100 mmHg (1 point)
 * - Altered mental status / GCS < 15 (1 point)
 *
 * Score >= 2: High suspicion of sepsis
 *
 * @reference Singer M, et al. JAMA 2016;315:801-810
 */
export function checkSepsis(vitals: VitalSigns | undefined): RedFlag | null {
  if (!vitals) return null;

  let score = 0;
  const criteria: string[] = [];

  // Check respiratory rate
  if (vitals.respiratory_rate && vitals.respiratory_rate >= 22) {
    score++;
    criteria.push(`RR ${vitals.respiratory_rate} x/menit (>=22)`);
  }

  // Check systolic blood pressure
  if (vitals.systolic && vitals.systolic <= 100) {
    score++;
    criteria.push(`Sistolik ${vitals.systolic} mmHg (<=100)`);
  }

  // Check altered mental status (GCS < 15)
  if (vitals.gcs && vitals.gcs < 15) {
    score++;
    criteria.push(`GCS ${vitals.gcs} (<15)`);
  }

  if (score >= 2) {
    return {
      id: 'RF-SEPSIS',
      severity: 'emergency',
      condition: `SUSPEK SEPSIS - qSOFA Score ${score}/3`,
      action:
        'RUJUK SEGERA ke IGD RS. Pasang IV line, ambil kultur darah, berikan antibiotik empiris.',
      icd_codes: ['A41.9', 'R65.1'],
      criteria_met: criteria,
      source: 'qSOFA (JAMA 2016)',
    };
  }

  return null;
}

// =============================================================================
// ACUTE CORONARY SYNDROME CHECK
// =============================================================================

/**
 * ACS warning keywords in Indonesian
 */
const ACS_KEYWORDS = [
  'nyeri dada',
  'dada terasa berat',
  'dada seperti ditekan',
  'dada seperti ditindih',
  'menjalar ke lengan',
  'menjalar ke rahang',
  'menjalar ke punggung',
  'keringat dingin',
  'sesak napas',
  'dada seperti terbakar',
];

/**
 * Check for Acute Coronary Syndrome (ACS)
 *
 * Warning signs:
 * - Chest pain with typical characteristics
 * - Associated symptoms (diaphoresis, dyspnea)
 * - Abnormal vital signs (tachycardia, hypertension)
 *
 * @reference AHA/ACC Guidelines 2021
 */
export function checkACS(keluhan: string, vitals: VitalSigns | undefined): RedFlag | null {
  const keluhanLower = keluhan.toLowerCase();
  const criteria: string[] = [];

  // Check for chest pain keywords
  const hasChestPainKeyword = ACS_KEYWORDS.some((keyword) => {
    if (keluhanLower.includes(keyword)) {
      criteria.push(`Keluhan: "${keyword}"`);
      return true;
    }
    return false;
  });

  if (!hasChestPainKeyword) return null;

  // Check for concerning vital signs
  let vitalConcern = false;

  if (vitals) {
    if (vitals.heart_rate && vitals.heart_rate > 100) {
      criteria.push(`Takikardia (HR ${vitals.heart_rate} bpm)`);
      vitalConcern = true;
    }
    if (vitals.systolic && vitals.systolic > 160) {
      criteria.push(`Hipertensi (TD ${vitals.systolic} mmHg)`);
      vitalConcern = true;
    }
    if (vitals.spo2 && vitals.spo2 < 94) {
      criteria.push(`Hipoksia (SpO2 ${vitals.spo2}%)`);
      vitalConcern = true;
    }
  }

  // Trigger if chest pain + vital concern, OR multiple chest pain keywords
  if (vitalConcern || criteria.length >= 2) {
    return {
      id: 'RF-ACS',
      severity: 'emergency',
      condition: 'SUSPEK SINDROM KORONER AKUT (ACS)',
      action:
        'EKG 12-lead SEGERA. Aspirin 320mg kunyah (jika tidak alergi). Oksigen jika SpO2 <94%. RUJUK RS dengan fasilitas kateterisasi.',
      icd_codes: ['I21.9', 'I20.0', 'I20.9'],
      criteria_met: criteria,
      source: 'AHA/ACC Guidelines 2021',
    };
  }

  return null;
}

// =============================================================================
// PREECLAMPSIA CHECK
// =============================================================================

/**
 * Preeclampsia warning symptoms in Indonesian
 */
const PREECLAMPSIA_SYMPTOMS = [
  'sakit kepala hebat',
  'sakit kepala berat',
  'nyeri kepala berat',
  'pandangan kabur',
  'penglihatan kabur',
  'melihat kilatan cahaya',
  'nyeri ulu hati',
  'nyeri epigastrium',
  'mual muntah hebat',
  'bengkak wajah',
  'bengkak tangan',
  'edema',
];

/**
 * Check for Preeclampsia
 *
 * Criteria:
 * - Pregnancy + Hypertension (BP >= 140/90)
 * - Plus one of: headache, visual disturbances, epigastric pain, edema
 *
 * @reference ACOG Practice Bulletin No. 222
 */
export function checkPreeclampsia(
  keluhan: string,
  vitals: VitalSigns | undefined,
  isPregnant: boolean
): RedFlag | null {
  // Only applicable to pregnant patients
  if (!isPregnant) return null;

  const keluhanLower = keluhan.toLowerCase();
  const criteria: string[] = ['Status: Hamil'];

  // Check for hypertension
  let hasHTN = false;
  if (vitals) {
    if (vitals.systolic && vitals.systolic >= 140) {
      criteria.push(`Hipertensi sistolik (${vitals.systolic} mmHg)`);
      hasHTN = true;
    }
    if (vitals.diastolic && vitals.diastolic >= 90) {
      criteria.push(`Hipertensi diastolik (${vitals.diastolic} mmHg)`);
      hasHTN = true;
    }
  }

  // Check for warning symptoms
  const symptoms = PREECLAMPSIA_SYMPTOMS.filter((symptom) => keluhanLower.includes(symptom));

  if (symptoms.length > 0) {
    symptoms.forEach((s) => criteria.push(`Gejala: ${s}`));
  }

  // Trigger if pregnant + HTN + symptoms
  if (hasHTN && symptoms.length > 0) {
    return {
      id: 'RF-PREEC',
      severity: 'emergency',
      condition: 'SUSPEK PREEKLAMPSIA',
      action:
        'Pasang IV line. Cek proteinuria. Berikan MgSO4 loading dose jika tersedia. RUJUK SEGERA ke RS dengan fasilitas obstetri.',
      icd_codes: ['O14.9', 'O14.1', 'O15.0'],
      criteria_met: criteria,
      source: 'ACOG Practice Bulletin No. 222',
    };
  }

  // Also flag severe hypertension in pregnancy even without symptoms
  if (
    (vitals && vitals.systolic && vitals.systolic >= 160) ||
    (vitals?.diastolic && vitals.diastolic >= 110)
  ) {
    criteria.push('Hipertensi berat dalam kehamilan');
    return {
      id: 'RF-PREEC-HTN',
      severity: 'emergency',
      condition: 'HIPERTENSI BERAT DALAM KEHAMILAN',
      action:
        'Berikan antihipertensi (Nifedipine 10mg oral atau Labetalol IV). Monitor ketat. RUJUK SEGERA.',
      icd_codes: ['O14.1', 'O13'],
      criteria_met: criteria,
      source: 'ACOG Practice Bulletin No. 222',
    };
  }

  return null;
}

// =============================================================================
// STROKE CHECK (FAST)
// =============================================================================

/**
 * Stroke warning signs (FAST) in Indonesian
 */
const STROKE_KEYWORDS = {
  face: ['wajah merot', 'mulut mencong', 'senyum tidak simetris', 'wajah tidak simetris'],
  arm: ['lengan lemah', 'tangan lemah', 'tidak bisa angkat tangan', 'kelemahan satu sisi'],
  speech: ['bicara pelo', 'bicara tidak jelas', 'sulit bicara', 'cadel mendadak'],
  time: ['mendadak', 'tiba-tiba', 'secara tiba-tiba'],
};

/**
 * Check for Stroke using FAST criteria
 */
export function checkStroke(keluhan: string): RedFlag | null {
  const keluhanLower = keluhan.toLowerCase();
  const criteria: string[] = [];

  // Check each FAST component
  let fastScore = 0;

  for (const [component, keywords] of Object.entries(STROKE_KEYWORDS)) {
    const matched = keywords.filter((k) => keluhanLower.includes(k));
    if (matched.length > 0) {
      fastScore++;
      criteria.push(`${component.toUpperCase()}: ${matched.join(', ')}`);
    }
  }

  // Trigger if 2+ FAST criteria met
  if (fastScore >= 2) {
    return {
      id: 'RF-STROKE',
      severity: 'emergency',
      condition: 'SUSPEK STROKE AKUT',
      action:
        'Catat waktu onset gejala (PENTING untuk trombolisis). JANGAN berikan makan/minum. RUJUK SEGERA ke RS Stroke Center.',
      icd_codes: ['I63.9', 'I64', 'I61.9'],
      criteria_met: criteria,
      source: 'AHA/ASA Stroke Guidelines',
    };
  }

  return null;
}

// =============================================================================
// SEVERE HYPOGLYCEMIA CHECK
// =============================================================================

/**
 * Hypoglycemia warning signs
 */
const HYPOGLYCEMIA_KEYWORDS = [
  'keringat dingin',
  'gemetar',
  'lemas mendadak',
  'pusing',
  'bingung',
  'tidak sadar',
  'kejang',
];

/**
 * Check for Severe Hypoglycemia
 */
export function checkHypoglycemia(
  keluhan: string,
  chronicDiseases: string[] | undefined
): RedFlag | null {
  // Only concern if diabetic patient
  const isDiabetic = chronicDiseases?.some(
    (d) => d.toLowerCase().includes('diabetes') || d.toLowerCase().includes('dm')
  );

  if (!isDiabetic) return null;

  const keluhanLower = keluhan.toLowerCase();
  const criteria: string[] = ['Riwayat: Diabetes'];

  const matchedSymptoms = HYPOGLYCEMIA_KEYWORDS.filter((k) => keluhanLower.includes(k));

  if (matchedSymptoms.length >= 2) {
    matchedSymptoms.forEach((s) => criteria.push(`Gejala: ${s}`));

    return {
      id: 'RF-HYPOGLYCEMIA',
      severity: 'emergency',
      condition: 'SUSPEK HIPOGLIKEMIA BERAT',
      action:
        'Cek GDS SEGERA. Jika GDS <70 mg/dL: berikan D40% 25mL IV atau glukosa oral jika sadar. Jika tidak sadar: Glucagon 1mg IM.',
      icd_codes: ['E16.2', 'E11.65'],
      criteria_met: criteria,
      source: 'ADA Diabetes Care 2024',
    };
  }

  return null;
}

// =============================================================================
// ANAPHYLAXIS CHECK
// =============================================================================

// WAO Anaphylaxis Guidance 2020 (Cardona V, et al. World Allergy Organ J 2020;13:100472).
const ANAPHYLAXIS_SKIN_MUCOSA = [
  'biduran',
  'urtikaria',
  'kaligata',
  'angioedema',
  'bengkak bibir',
  'bengkak wajah',
  'bengkak lidah',
  'bengkak kelopak mata',
  'gatal seluruh',
  'ruam seluruh',
  'kemerahan seluruh',
];

const ANAPHYLAXIS_RESPIRATORY = [
  'sesak',
  'mengi',
  'wheezing',
  'stridor',
  'suara serak',
  'tercekik',
  'tidak bisa bernapas',
];

/** Bronchospasm or laryngeal involvement (WAO criterion 2): plain "sesak" is not enough. */
const ANAPHYLAXIS_BRONCHOSPASM_LARYNGEAL = [
  'mengi',
  'wheezing',
  'stridor',
  'suara serak',
  'tercekik',
  'sulit menelan',
  'tidak bisa bernapas',
];

/** Severe gastrointestinal symptoms only: plain "muntah" or "mual" is not a WAO criterion. */
const ANAPHYLAXIS_SEVERE_GI = [
  'muntah berulang',
  'muntah terus',
  'nyeri perut hebat',
  'kram perut hebat',
];

const ANAPHYLAXIS_END_ORGAN = ['pingsan', 'sinkop', 'tidak sadar', 'inkontinensia'];

const ALLERGEN_EXPOSURE = [
  'setelah makan',
  'setelah minum obat',
  'setelah disuntik',
  'setelah suntik',
  'setelah imunisasi',
  'disengat',
  'sengatan',
];

function findKeywords(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

/** PALS hypotension: < 70 mmHg under 1 year, < 70 + 2 x age to 10 years, < 90 from 11 years. */
function hypotensionFloor(age: number | undefined): number {
  if (age === undefined || age > 10) return 90;
  if (age < 1) return 70;
  return 70 + 2 * Math.floor(age);
}

/**
 * Check for anaphylaxis with the two WAO 2020 criteria.
 * 1. Skin or mucosa involvement plus respiratory compromise, reduced blood pressure or end-organ
 *    dysfunction, or severe gastrointestinal symptoms.
 * 2. Exposure to a probable allergen plus hypotension, bronchospasm or laryngeal involvement,
 *    even without skin signs.
 * Acute onset cannot be read from free text; the clinician confirms it.
 */
export function checkAnaphylaxis(
  keluhan: string,
  vitals: VitalSigns | undefined,
  allergies: string[] | undefined,
  age?: number
): RedFlag | null {
  const keluhanLower = keluhan.toLowerCase();
  const floor = hypotensionFloor(age);
  const hypotension =
    vitals?.systolic !== undefined && vitals.systolic > 0 && vitals.systolic < floor;
  const lowSpo2 = vitals?.spo2 !== undefined && vitals.spo2 > 0 && vitals.spo2 < 94;

  const skin = findKeywords(keluhanLower, ANAPHYLAXIS_SKIN_MUCOSA);
  const respiratory = findKeywords(keluhanLower, ANAPHYLAXIS_RESPIRATORY);
  const airway = findKeywords(keluhanLower, ANAPHYLAXIS_BRONCHOSPASM_LARYNGEAL);
  const severeGi = findKeywords(keluhanLower, ANAPHYLAXIS_SEVERE_GI);
  const endOrgan = findKeywords(keluhanLower, ANAPHYLAXIS_END_ORGAN);
  const exposure = findKeywords(keluhanLower, ALLERGEN_EXPOSURE);

  const criteria: string[] = [];
  const hypotensionLabel = `Hipotensi (TD sistolik ${vitals?.systolic} mmHg, ambang < ${floor})`;

  if (
    skin.length > 0 &&
    (respiratory.length > 0 || lowSpo2 || hypotension || endOrgan.length > 0 || severeGi.length > 0)
  ) {
    criteria.push(`Kriteria 1 WAO: kulit/mukosa (${skin.join(', ')})`);
    if (respiratory.length > 0) criteria.push(`Respirasi: ${respiratory.join(', ')}`);
    if (lowSpo2) criteria.push(`SpO2 ${vitals?.spo2}% (< 94)`);
    if (hypotension) criteria.push(hypotensionLabel);
    if (endOrgan.length > 0) criteria.push(`Disfungsi organ: ${endOrgan.join(', ')}`);
    if (severeGi.length > 0) criteria.push(`Gastrointestinal berat: ${severeGi.join(', ')}`);
  } else if (exposure.length > 0 && (hypotension || airway.length > 0)) {
    criteria.push(`Kriteria 2 WAO: paparan alergen (${exposure.join(', ')})`);
    if (airway.length > 0) criteria.push(`Bronkospasme/laring: ${airway.join(', ')}`);
    if (hypotension) criteria.push(hypotensionLabel);
  } else {
    return null;
  }

  if (allergies && allergies.length > 0) {
    criteria.push(`Riwayat alergi: ${allergies.slice(0, 3).join(', ')}`);
  }

  return {
    id: 'RF-ANAPHYLAXIS',
    severity: 'emergency',
    condition: 'SUSPEK REAKSI ANAFILAKSIS',
    action:
      'Epinefrin 0.3-0.5mg IM (paha lateral) SEGERA. Posisi trendelenburg. Oksigen. Pasang IV line. Siapkan resusitasi.',
    icd_codes: ['T78.2', 'T88.6'],
    criteria_met: criteria,
    source: 'WAO 2020 Anaphylaxis Guidance (Cardona et al.)',
  };
}

// =============================================================================
// MAIN CHECKER FUNCTION
// =============================================================================

/**
 * Run all red flag checks
 * Returns array of triggered red flags, sorted by severity
 */
export function runRedFlagChecks(context: RedFlagContext): RedFlag[] {
  const flags: RedFlag[] = [];

  // Run all checks
  const sepsis = checkSepsis(context.vitals);
  if (sepsis) flags.push(sepsis);

  const acs = checkACS(context.keluhan, context.vitals);
  if (acs) flags.push(acs);

  const preeclampsia = checkPreeclampsia(
    context.keluhan,
    context.vitals,
    context.pregnant || false
  );
  if (preeclampsia) flags.push(preeclampsia);

  const stroke = checkStroke(context.keluhan);
  if (stroke) flags.push(stroke);

  const hypoglycemia = checkHypoglycemia(context.keluhan, context.chronic_diseases);
  if (hypoglycemia) flags.push(hypoglycemia);

  const anaphylaxis = checkAnaphylaxis(
    context.keluhan,
    context.vitals,
    context.allergies,
    context.age
  );
  if (anaphylaxis) flags.push(anaphylaxis);

  // Sort by severity (emergency first)
  const severityOrder = { emergency: 0, urgent: 1, warning: 2 };
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return flags;
}

/**
 * Run red flag checks from anonymized context
 */
export function runRedFlagChecksFromContext(context: AnonymizedClinicalContext): RedFlag[] {
  return runRedFlagChecks({
    keluhan: context.keluhan_utama + ' ' + (context.keluhan_tambahan || ''),
    vitals: context.vital_signs,
    age: context.usia_tahun,
    gender: context.jenis_kelamin,
    pregnant: context.is_pregnant,
    chronic_diseases: context.chronic_diseases,
    allergies: context.allergies,
  });
}
