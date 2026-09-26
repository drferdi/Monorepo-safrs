// Designed and constructed by Drferdi.
/**
 * Gate 3: Blood Glucose Classification & Crisis Management
 *
 * Purpose: Screen, diagnose, and manage glucose disorders
 * Evidence Base: PERKENI 2024, ADA 2026
 *
 * @module lib/emergency-detector/glucose-classifier
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Glucose measurement types
 */
export type GlucoseMeasurementType = 'GDS' | 'GDP' | '2JTTGO' | 'HbA1c';

/**
 * Glucose data
 */
export interface GlucoseData {
  gds?: number; // Random plasma glucose (mg/dL)
  gdp?: number; // Fasting plasma glucose (mg/dL)
  ttgo_2h?: number; // 2h post-OGTT (mg/dL)
  hba1c?: number; // HbA1c (%)
  sample_type: 'capillary' | 'plasma_venous';
  has_classic_symptoms: boolean;
}

/**
 * Classic hyperglycemia symptoms
 */
export interface ClassicSymptoms {
  polyuria: boolean; // Frequent urination
  polydipsia: boolean; // Excessive thirst
  polyphagia: boolean; // Excessive hunger
  weight_loss: boolean; // Unexplained weight loss
  blurred_vision: boolean;
}

/**
 * Glucose categories
 */
export type GlucoseCategory =
  | 'HYPOGLYCEMIA_CRISIS' // <70 mg/dL
  | 'NORMAL' // Normal ranges
  | 'PREDIABETES' // GDPT/TGT
  | 'DIABETES_CONFIRMED' // Meets criteria
  | 'HYPERGLYCEMIA_CRISIS'; // ≥200 + crisis signs

/**
 * Crisis type for hyperglycemia
 */
export type HyperglycemiaCrisisType =
  'NOT_HYPERGLYCEMIA' | 'HYPERGLYCEMIA_NO_CRISIS' | 'HYPERGLYCEMIC_CRISIS'; // DKA/HHS suspected

/**
 * DKA/HHS red flags
 */
export interface DKAHHSRedFlags {
  kussmaul_breathing: boolean; // Deep, rapid breathing
  acetone_breath: boolean; // Fruity breath odor
  nausea_vomiting: boolean;
  abdominal_pain: boolean;
  altered_mental_status: boolean;
  severe_dehydration: boolean;
  extreme_hyperglycemia: boolean; // >600 mg/dL
  seizures: boolean;
}

/**
 * Hypoglycemia treatment step (15-15 rule)
 */
export interface HypoglycemiaTreatmentStep {
  step: number;
  timing: string;
  action: string;
  condition?: string;
}

/**
 * Glucose classification result
 */
export interface GlucoseClassification {
  category: GlucoseCategory;
  severity: 'critical' | 'high' | 'moderate' | 'normal';
  value: number;
  measurement_type: GlucoseMeasurementType;
  recommendations: string[];
  reasoning: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Diagnostic thresholds (PERKENI 2024)
 */
export const GLUCOSE_THRESHOLDS = {
  HYPOGLYCEMIA: 70,

  NORMAL: {
    GDP: { min: 70, max: 99 },
    TTGO_2H: { min: 70, max: 139 },
    HbA1c: { min: 0, max: 5.6 },
  },

  PREDIABETES: {
    GDP: { min: 100, max: 125 }, // GDPT
    TTGO_2H: { min: 140, max: 199 }, // TGT
    HbA1c: { min: 5.7, max: 6.4 },
  },

  DIABETES: {
    GDS: 200, // + symptoms
    GDP: 126,
    TTGO_2H: 200,
    HbA1c: 6.5,
  },

  EXTREME_HYPERGLYCEMIA: 600, // HHS threshold
} as const;

/**
 * 15-15 Rule for hypoglycemia treatment
 */
export const HYPOGLYCEMIA_15_15_RULE: HypoglycemiaTreatmentStep[] = [
  {
    step: 1,
    timing: 'Immediately',
    action: 'Give 15g fast-acting carbohydrate',
    condition: 'Glucose <70 AND patient conscious AND can swallow',
  },
  {
    step: 2,
    timing: '15 minutes after step 1',
    action: 'Recheck glucose',
  },
  {
    step: 3,
    timing: 'If still <70 mg/dL',
    action: 'Repeat 15g carbohydrate (max 3 cycles)',
  },
  {
    step: 4,
    timing: 'Once >70 mg/dL',
    action: 'Give meal/snack to prevent recurrence',
  },
];

/**
 * Fast-acting carbohydrate examples (15g)
 */
export const FAST_CARBS_15G = [
  '3-4 glucose tablets',
  '120 mL fruit juice',
  '1 tablespoon honey or sugar',
  '150 mL regular soda (not diet)',
];

// ============================================================================
// GLUCOSE CLASSIFICATION
// ============================================================================

/**
 * Classify glucose level
 *
 * @param data - Glucose data
 * @returns Glucose category
 */
export function classifyGlucose(data: GlucoseData): GlucoseCategory {
  // Step 1: Crisis detection (highest priority)
  if (data.gds && data.gds < GLUCOSE_THRESHOLDS.HYPOGLYCEMIA) {
    return 'HYPOGLYCEMIA_CRISIS';
  }

  if (data.gds && data.gds >= GLUCOSE_THRESHOLDS.DIABETES.GDS && data.has_classic_symptoms) {
    return 'DIABETES_CONFIRMED';
  }

  // Step 2: Diabetes diagnosis
  if (data.gdp && data.gdp >= GLUCOSE_THRESHOLDS.DIABETES.GDP) {
    return 'DIABETES_CONFIRMED';
  }

  if (data.ttgo_2h && data.ttgo_2h >= GLUCOSE_THRESHOLDS.DIABETES.TTGO_2H) {
    return 'DIABETES_CONFIRMED';
  }

  if (data.hba1c && data.hba1c >= GLUCOSE_THRESHOLDS.DIABETES.HbA1c) {
    // Note: HbA1c alone needs confirmation
    return 'DIABETES_CONFIRMED';
  }

  // Step 3: Prediabetes
  if (
    data.gdp &&
    data.gdp >= GLUCOSE_THRESHOLDS.PREDIABETES.GDP.min &&
    data.gdp <= GLUCOSE_THRESHOLDS.PREDIABETES.GDP.max
  ) {
    return 'PREDIABETES';
  }

  if (
    data.ttgo_2h &&
    data.ttgo_2h >= GLUCOSE_THRESHOLDS.PREDIABETES.TTGO_2H.min &&
    data.ttgo_2h <= GLUCOSE_THRESHOLDS.PREDIABETES.TTGO_2H.max
  ) {
    return 'PREDIABETES';
  }

  if (
    data.hba1c &&
    data.hba1c >= GLUCOSE_THRESHOLDS.PREDIABETES.HbA1c.min &&
    data.hba1c <= GLUCOSE_THRESHOLDS.PREDIABETES.HbA1c.max
  ) {
    return 'PREDIABETES';
  }

  // Step 4: Normal
  return 'NORMAL';
}

// ============================================================================
// CRISIS MANAGEMENT
// ============================================================================

/**
 * Treat hypoglycemia using 15-15 rule
 *
 * @param glucose - Current glucose level
 * @param canSwallow - Patient can swallow safely
 * @returns Treatment protocol
 */
export function treatHypoglycemia(
  glucose: number,
  canSwallow: boolean
): {
  action: 'MONITOR' | 'TREAT' | 'EMERGENCY';
  treatment?: string;
  steps?: HypoglycemiaTreatmentStep[];
  alert?: string;
} {
  if (glucose >= GLUCOSE_THRESHOLDS.HYPOGLYCEMIA) {
    return {
      action: 'MONITOR',
      treatment: 'No immediate treatment needed',
    };
  }

  if (!canSwallow) {
    return {
      action: 'EMERGENCY',
      treatment: 'IV Dextrose 10-25g OR Glucagon 1mg IM/SC',
      alert: 'Severe hypoglycemia - activate emergency protocol',
    };
  }

  // 15-15 Rule
  return {
    action: 'TREAT',
    steps: HYPOGLYCEMIA_15_15_RULE,
  };
}

/**
 * Triage hyperglycemia crisis (DKA/HHS)
 *
 * @param glucose - Glucose level
 * @param symptoms - Clinical symptoms
 * @returns Crisis type
 */
export function triageHyperglycemia(
  glucose: number,
  symptoms: Partial<DKAHHSRedFlags>
): HyperglycemiaCrisisType {
  // Not hyperglycemia
  if (glucose < GLUCOSE_THRESHOLDS.DIABETES.GDS) {
    return 'NOT_HYPERGLYCEMIA';
  }

  // Check for crisis signs
  const hasCrisisSigns =
    symptoms.severe_dehydration ||
    symptoms.nausea_vomiting ||
    symptoms.kussmaul_breathing ||
    symptoms.acetone_breath ||
    symptoms.altered_mental_status ||
    symptoms.abdominal_pain ||
    symptoms.seizures;

  if (hasCrisisSigns) {
    return 'HYPERGLYCEMIC_CRISIS'; // Suspect DKA/HHS
  }

  // Hyperglycemia without crisis
  return 'HYPERGLYCEMIA_NO_CRISIS';
}

/**
 * Check for DKA red flags
 *
 * @param redFlags - DKA/HHS red flags
 * @returns True if DKA suspected
 */
export function checkDKARedFlags(redFlags: DKAHHSRedFlags): boolean {
  return (
    redFlags.kussmaul_breathing ||
    redFlags.acetone_breath ||
    redFlags.nausea_vomiting ||
    redFlags.abdominal_pain
  );
}

/**
 * Check for HHS red flags
 *
 * @param redFlags - DKA/HHS red flags
 * @returns True if HHS suspected
 */
export function checkHHSRedFlags(redFlags: DKAHHSRedFlags): boolean {
  return (
    redFlags.extreme_hyperglycemia ||
    redFlags.altered_mental_status ||
    redFlags.seizures ||
    redFlags.severe_dehydration
  );
}

// ============================================================================
// SCREENING
// ============================================================================

/**
 * Determine if patient should be screened for DM
 * Based on PERKENI 2024 guidelines
 *
 * @param patient - Patient data
 * @returns True if screening recommended
 */
export function shouldScreenForDM(patient: {
  age: number;
  weight_kg: number;
  height_m: number;
  family_history_dm_first_degree?: boolean;
  history_cvd?: boolean;
  hypertension?: boolean;
  hdl_low?: boolean;
  triglycerides_high?: boolean;
  pcos?: boolean;
  physical_inactivity?: boolean;
  history_gestational_dm?: boolean;
}): boolean {
  const bmi = patient.weight_kg / patient.height_m ** 2;

  // Asian BMI threshold
  if (bmi < 23) {
    return false; // Screen only if BMI ≥23
  }

  // Check risk factors (need at least 1)
  const riskFactors = [
    patient.family_history_dm_first_degree,
    patient.history_cvd,
    patient.hypertension,
    patient.hdl_low || patient.triglycerides_high,
    patient.pcos,
    patient.physical_inactivity,
    patient.age > 35,
    patient.history_gestational_dm,
  ];

  return riskFactors.some((factor) => factor === true);
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * Get recommendations based on glucose classification
 *
 * @param category - Glucose category
 * @param value - Glucose value
 * @returns Array of recommendations
 */
export function getGlucoseRecommendations(category: GlucoseCategory, _value: number): string[] {
  switch (category) {
    case 'HYPOGLYCEMIA_CRISIS':
      return [
        '⚡ TREAT IMMEDIATELY (15-15 rule)',
        '15g fast-acting carbohydrate NOW',
        'Recheck glucose in 15 min',
        'Repeat if still <70 mg/dL',
        'Give meal/snack after recovery',
        'Evaluate cause (insulin/OAD dose, missed meal, exercise)',
      ];

    case 'NORMAL':
      return ['Gula darah normal', 'Maintain healthy lifestyle', 'Rescreen per risk factors'];

    case 'PREDIABETES':
      return [
        '⚡ Intensive Lifestyle Intervention:',
        'Target: ↓7% body weight in 6 months',
        'Exercise 150 min/week (moderate intensity)',
        'Nutrition counseling (high fiber, low GI)',
        'Recheck glucose 3-6 months',
        'Consider metformin if high risk (BMI ≥35, age <60, gestational DM history)',
      ];

    case 'DIABETES_CONFIRMED':
      return [
        '📋 Start DM Management:',
        'Comprehensive DM education',
        'Lifestyle counseling (diet, exercise)',
        'Pharmacotherapy per PERKENI 2024 algorithm',
        'Screen for complications (retinopathy, nephropathy, neuropathy)',
        'HbA1c target: <7% (individualize)',
        'Follow-up 2-4 weeks',
      ];

    case 'HYPERGLYCEMIA_CRISIS':
      return [
        '🚑 IMMEDIATE ICU REFERRAL',
        'Suspect DKA/HHS - EMERGENCY',
        'IV access (2 large-bore lines)',
        'Fluid resuscitation (NS 1L/hr initial)',
        'Labs: VBG/ABG, ketones, electrolytes, osmolality',
        'Continuous monitoring',
        'Call ambulance',
        'Do NOT give oral antidiabetics',
      ];

    default:
      return ['Evaluate per PERKENI 2024 guidelines'];
  }
}

/**
 * Get clinical reasoning for glucose classification
 *
 * @param category - Glucose category
 * @param value - Glucose value
 * @param measurementType - Type of measurement
 * @returns Reasoning explanation
 */
export function getGlucoseReasoning(
  category: GlucoseCategory,
  value: number,
  measurementType: GlucoseMeasurementType
): string {
  switch (category) {
    case 'HYPOGLYCEMIA_CRISIS':
      return `Gula darah ${value} mg/dL <${GLUCOSE_THRESHOLDS.HYPOGLYCEMIA} (threshold hipoglikemia). TANGANI SEGERA dengan 15-15 rule.`;

    case 'NORMAL':
      return `${measurementType} ${value} dalam batas normal. Tidak ada tanda diabetes atau prediabetes.`;

    case 'PREDIABETES':
      return `${measurementType} ${value} memenuhi kriteria prediabetes (GDPT/TGT). Intervensi gaya hidup intensif dapat mencegah progresi ke DM (5-10% per tahun tanpa intervensi).`;

    case 'DIABETES_CONFIRMED':
      if (measurementType === 'GDS') {
        return `GDS ${value} ≥${GLUCOSE_THRESHOLDS.DIABETES.GDS} + gejala klasik = Diabetes Melitus TEGAK (tidak perlu tes ulang).`;
      }
      return `${measurementType} ${value} memenuhi kriteria Diabetes Melitus per PERKENI 2024. Mulai management komprehensif.`;

    case 'HYPERGLYCEMIA_CRISIS':
      return `Gula darah ${value} + tanda krisis (DKA/HHS) = EMERGENSI. Rujuk ICU SEGERA untuk fluid resuscitation + insulin therapy.`;

    default:
      return `${measurementType} ${value} mg/dL`;
  }
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Complete glucose classification workflow
 *
 * @param data - Glucose data
 * @returns Complete glucose classification
 */
export function classifyBloodGlucose(data: GlucoseData): GlucoseClassification {
  const category = classifyGlucose(data);

  // Determine measurement type and value
  let measurementType: GlucoseMeasurementType;
  let value: number;

  if (data.gds !== undefined) {
    measurementType = 'GDS';
    value = data.gds;
  } else if (data.gdp !== undefined) {
    measurementType = 'GDP';
    value = data.gdp;
  } else if (data.ttgo_2h !== undefined) {
    measurementType = '2JTTGO';
    value = data.ttgo_2h;
  } else if (data.hba1c !== undefined) {
    measurementType = 'HbA1c';
    value = data.hba1c;
  } else {
    throw new Error('No glucose measurement provided');
  }

  // Determine severity
  let severity: 'critical' | 'high' | 'moderate' | 'normal';
  if (category === 'HYPOGLYCEMIA_CRISIS' || category === 'HYPERGLYCEMIA_CRISIS') {
    severity = 'critical';
  } else if (category === 'DIABETES_CONFIRMED') {
    severity = 'high';
  } else if (category === 'PREDIABETES') {
    severity = 'moderate';
  } else {
    severity = 'normal';
  }

  const recommendations = getGlucoseRecommendations(category, value);
  const reasoning = getGlucoseReasoning(category, value, measurementType);

  return {
    category,
    severity,
    value,
    measurement_type: measurementType,
    recommendations,
    reasoning,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  GLUCOSE_THRESHOLDS,
  HYPOGLYCEMIA_15_15_RULE,
  FAST_CARBS_15G,
  classifyGlucose,
  treatHypoglycemia,
  triageHyperglycemia,
  checkDKARedFlags,
  checkHHSRedFlags,
  shouldScreenForDM,
  getGlucoseRecommendations,
  getGlucoseReasoning,
  classifyBloodGlucose,
};
