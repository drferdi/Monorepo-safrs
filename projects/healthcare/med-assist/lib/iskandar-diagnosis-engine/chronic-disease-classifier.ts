// Designed and constructed by Drferdi.
/**
 * Chronic Disease Classifier
 *
 * Auto-recognizes 11 chronic diseases from ICD-10 codes
 * and provides severity-based badge configuration.
 *
 * @module lib/iskandar-diagnosis-engine/chronic-disease-classifier
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Chronic Disease Types - 11 recognized conditions
 */
export enum ChronicDiseaseType {
  HYPERTENSION = 'HT',
  DIABETES = 'DM',
  HEART_FAILURE = 'HF',
  CORONARY_HEART = 'CHD',
  STROKE = 'STROKE',
  CHRONIC_KIDNEY = 'CKD',
  CANCER = 'CA',
  CHRONIC_ASTHMA = 'ASTHMA',
  COPD = 'PPOK',
  GERD = 'GERD',
  THYROID = 'THYROID',
}

/**
 * Severity levels for badge coloring
 * - critical: Red (#EF4444) - life-threatening, immediate attention
 * - moderate: Orange (#F59E0B) - chronic management required
 */
export type ChronicDiseaseSeverity = 'critical' | 'moderate';

/**
 * Classification result for a chronic disease
 */
export interface ChronicDiseaseClassification {
  type: ChronicDiseaseType;
  shortLabel: string;
  fullName: string;
  severity: ChronicDiseaseSeverity;
  icdCode: string;
}

/**
 * Badge styling configuration
 */
export interface BadgeConfig {
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * ICD-10 code prefix to chronic disease type mapping
 * Based on WHO ICD-10 classification
 */
const ICD_DISEASE_MAP: Record<string, ChronicDiseaseType> = {
  // Hipertensi (I10.x, I11.x, I12.x, I13.x, I15.x)
  I10: ChronicDiseaseType.HYPERTENSION,
  I11: ChronicDiseaseType.HYPERTENSION,
  I12: ChronicDiseaseType.HYPERTENSION,
  I13: ChronicDiseaseType.HYPERTENSION,
  I15: ChronicDiseaseType.HYPERTENSION,

  // Diabetes Mellitus (E10.x, E11.x, E13.x, E14.x)
  E10: ChronicDiseaseType.DIABETES,
  E11: ChronicDiseaseType.DIABETES,
  E13: ChronicDiseaseType.DIABETES,
  E14: ChronicDiseaseType.DIABETES,

  // Gagal Jantung (I50.x)
  I50: ChronicDiseaseType.HEART_FAILURE,

  // Penyakit Jantung Koroner (I20.x, I25.x)
  I20: ChronicDiseaseType.CORONARY_HEART,
  I25: ChronicDiseaseType.CORONARY_HEART,

  // Stroke (I60.x, I61.x, I63.x, I64.x)
  I60: ChronicDiseaseType.STROKE,
  I61: ChronicDiseaseType.STROKE,
  I63: ChronicDiseaseType.STROKE,
  I64: ChronicDiseaseType.STROKE,

  // Gagal Ginjal Kronik (N18.x)
  N18: ChronicDiseaseType.CHRONIC_KIDNEY,

  // Asma Kronis (J45.x)
  J45: ChronicDiseaseType.CHRONIC_ASTHMA,

  // PPOK (J44.x)
  J44: ChronicDiseaseType.COPD,

  // GERD (K21.x)
  K21: ChronicDiseaseType.GERD,

  // Hipotiroidisme/Hipertiroidisme (E03.x, E05.x)
  E03: ChronicDiseaseType.THYROID,
  E05: ChronicDiseaseType.THYROID,
};

/**
 * Cancer code pattern (C00-C97)
 */
const CANCER_CODE_PATTERN = /^C[0-8][0-9]|^C9[0-7]/;

/**
 * Disease severity classification
 * Based on clinical urgency and intervention requirements
 */
const DISEASE_SEVERITY: Record<ChronicDiseaseType, ChronicDiseaseSeverity> = {
  [ChronicDiseaseType.HYPERTENSION]: 'critical',
  [ChronicDiseaseType.DIABETES]: 'critical',
  [ChronicDiseaseType.HEART_FAILURE]: 'critical',
  [ChronicDiseaseType.CORONARY_HEART]: 'critical',
  [ChronicDiseaseType.STROKE]: 'critical',
  [ChronicDiseaseType.CHRONIC_KIDNEY]: 'critical',
  [ChronicDiseaseType.CANCER]: 'critical',
  [ChronicDiseaseType.CHRONIC_ASTHMA]: 'moderate',
  [ChronicDiseaseType.COPD]: 'moderate',
  [ChronicDiseaseType.GERD]: 'moderate',
  [ChronicDiseaseType.THYROID]: 'moderate',
};

/**
 * Full Indonesian disease names for tooltips
 */
const DISEASE_FULL_NAMES: Record<ChronicDiseaseType, string> = {
  [ChronicDiseaseType.HYPERTENSION]: 'Hipertensi',
  [ChronicDiseaseType.DIABETES]: 'Diabetes Mellitus',
  [ChronicDiseaseType.HEART_FAILURE]: 'Gagal Jantung',
  [ChronicDiseaseType.CORONARY_HEART]: 'Penyakit Jantung Koroner',
  [ChronicDiseaseType.STROKE]: 'Stroke',
  [ChronicDiseaseType.CHRONIC_KIDNEY]: 'Gagal Ginjal Kronik',
  [ChronicDiseaseType.CANCER]: 'Kanker',
  [ChronicDiseaseType.CHRONIC_ASTHMA]: 'Asma Kronis',
  [ChronicDiseaseType.COPD]: 'PPOK',
  [ChronicDiseaseType.GERD]: 'GERD',
  [ChronicDiseaseType.THYROID]: 'Gangguan Tiroid',
};

/**
 * Badge color configurations by severity
 * Uses Sentra Design System tokens
 */
const BADGE_COLORS: Record<ChronicDiseaseSeverity, BadgeConfig> = {
  critical: {
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  moderate: {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
};

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Classify an ICD-10 code to chronic disease type
 *
 * @param icdCode - ICD-10 code (e.g., 'I10', 'E11.9', 'C34.1')
 * @returns Classification result or null if not a recognized chronic disease
 *
 * @example
 * classifyChronicDisease('I10')    // { type: 'HT', severity: 'critical', ... }
 * classifyChronicDisease('E11.9')  // { type: 'DM', severity: 'critical', ... }
 * classifyChronicDisease('J06.9')  // null (not chronic)
 */
export function classifyChronicDisease(icdCode: string): ChronicDiseaseClassification | null {
  if (!icdCode || typeof icdCode !== 'string') {
    return null;
  }

  const normalizedCode = icdCode.toUpperCase().trim();
  const baseCode = normalizedCode.split('.')[0]; // Extract base code (e.g., 'I10' from 'I10.0')

  // Check cancer range first (C00-C97)
  if (CANCER_CODE_PATTERN.test(baseCode)) {
    return {
      type: ChronicDiseaseType.CANCER,
      shortLabel: ChronicDiseaseType.CANCER,
      fullName: DISEASE_FULL_NAMES[ChronicDiseaseType.CANCER],
      severity: DISEASE_SEVERITY[ChronicDiseaseType.CANCER],
      icdCode: normalizedCode,
    };
  }

  // Check standard mapping
  const diseaseType = ICD_DISEASE_MAP[baseCode];
  if (!diseaseType) {
    return null;
  }

  return {
    type: diseaseType,
    shortLabel: diseaseType,
    fullName: DISEASE_FULL_NAMES[diseaseType],
    severity: DISEASE_SEVERITY[diseaseType],
    icdCode: normalizedCode,
  };
}

/**
 * Get badge styling configuration for a severity level
 *
 * @param severity - Disease severity ('critical' | 'moderate')
 * @returns Badge color configuration
 */
export function getBadgeConfig(severity: ChronicDiseaseSeverity): BadgeConfig {
  return BADGE_COLORS[severity];
}

/**
 * Get badge styling for a specific disease type
 *
 * @param diseaseType - Chronic disease type
 * @returns Badge color configuration
 */
export function getBadgeConfigForDisease(diseaseType: ChronicDiseaseType): BadgeConfig {
  const severity = DISEASE_SEVERITY[diseaseType];
  return BADGE_COLORS[severity];
}

/**
 * Check if an ICD-10 code represents a chronic disease
 *
 * @param icdCode - ICD-10 code to check
 * @returns true if the code is a recognized chronic disease
 */
export function isChronicDisease(icdCode: string): boolean {
  return classifyChronicDisease(icdCode) !== null;
}

/**
 * Get all supported chronic disease types
 *
 * @returns Array of all ChronicDiseaseType values
 */
export function getSupportedDiseaseTypes(): ChronicDiseaseType[] {
  return Object.values(ChronicDiseaseType);
}

/**
 * Get full name for a disease type (Indonesian)
 *
 * @param diseaseType - Chronic disease type
 * @returns Full Indonesian name
 */
export function getDiseaseFullName(diseaseType: ChronicDiseaseType): string {
  return DISEASE_FULL_NAMES[diseaseType];
}
