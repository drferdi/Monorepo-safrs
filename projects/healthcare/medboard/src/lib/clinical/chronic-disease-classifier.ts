/**
 * Chronic Disease Classifier
 *
 * Auto-recognizes 11 chronic diseases from ICD-10 codes
 * and provides severity-based badge configuration.
 */

// ============================================================================
// TYPES
// ============================================================================

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

export type ChronicDiseaseSeverity = 'critical' | 'moderate'

export interface ChronicDiseaseClassification {
  type: ChronicDiseaseType
  shortLabel: string
  fullName: string
  severity: ChronicDiseaseSeverity
  icdCode: string
}

export interface BadgeConfig {
  color: string
  bgColor: string
  borderColor: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ICD_DISEASE_MAP: Record<string, ChronicDiseaseType> = {
  I10: ChronicDiseaseType.HYPERTENSION,
  I11: ChronicDiseaseType.HYPERTENSION,
  I12: ChronicDiseaseType.HYPERTENSION,
  I13: ChronicDiseaseType.HYPERTENSION,
  I15: ChronicDiseaseType.HYPERTENSION,
  E10: ChronicDiseaseType.DIABETES,
  E11: ChronicDiseaseType.DIABETES,
  E13: ChronicDiseaseType.DIABETES,
  E14: ChronicDiseaseType.DIABETES,
  I50: ChronicDiseaseType.HEART_FAILURE,
  I20: ChronicDiseaseType.CORONARY_HEART,
  I25: ChronicDiseaseType.CORONARY_HEART,
  I60: ChronicDiseaseType.STROKE,
  I61: ChronicDiseaseType.STROKE,
  I63: ChronicDiseaseType.STROKE,
  I64: ChronicDiseaseType.STROKE,
  N18: ChronicDiseaseType.CHRONIC_KIDNEY,
  J45: ChronicDiseaseType.CHRONIC_ASTHMA,
  J44: ChronicDiseaseType.COPD,
  K21: ChronicDiseaseType.GERD,
  E03: ChronicDiseaseType.THYROID,
  E05: ChronicDiseaseType.THYROID,
}

const CANCER_CODE_PATTERN = /^C[0-8][0-9]|^C9[0-7]/

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
}

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
}

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
}

// ============================================================================
// FUNCTIONS
// ============================================================================

export function classifyChronicDisease(icdCode: string): ChronicDiseaseClassification | null {
  if (!icdCode || typeof icdCode !== 'string') return null

  const normalizedCode = icdCode.toUpperCase().trim()
  const baseCode = normalizedCode.split('.')[0]

  if (CANCER_CODE_PATTERN.test(baseCode)) {
    return {
      type: ChronicDiseaseType.CANCER,
      shortLabel: ChronicDiseaseType.CANCER,
      fullName: DISEASE_FULL_NAMES[ChronicDiseaseType.CANCER],
      severity: DISEASE_SEVERITY[ChronicDiseaseType.CANCER],
      icdCode: normalizedCode,
    }
  }

  const diseaseType = ICD_DISEASE_MAP[baseCode]
  if (!diseaseType) return null

  return {
    type: diseaseType,
    shortLabel: diseaseType,
    fullName: DISEASE_FULL_NAMES[diseaseType],
    severity: DISEASE_SEVERITY[diseaseType],
    icdCode: normalizedCode,
  }
}

export function getBadgeConfig(severity: ChronicDiseaseSeverity): BadgeConfig {
  return BADGE_COLORS[severity]
}

export function getBadgeConfigForDisease(diseaseType: ChronicDiseaseType): BadgeConfig {
  return BADGE_COLORS[DISEASE_SEVERITY[diseaseType]]
}

export function isChronicDisease(icdCode: string): boolean {
  return classifyChronicDisease(icdCode) !== null
}

export function getSupportedDiseaseTypes(): ChronicDiseaseType[] {
  return Object.values(ChronicDiseaseType)
}

export function getDiseaseFullName(diseaseType: ChronicDiseaseType): string {
  return DISEASE_FULL_NAMES[diseaseType]
}
