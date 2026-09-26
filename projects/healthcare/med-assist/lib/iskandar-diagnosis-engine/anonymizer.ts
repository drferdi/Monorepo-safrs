// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * PII Anonymizer Module
 * Strips personally identifiable information before API transmission
 *
 * @module lib/iskandar-diagnosis-engine/anonymizer
 * @version 1.0.0
 *
 * CRITICAL: This module is the primary privacy safeguard.
 * All patient data MUST pass through this module before external transmission.
 * 100% test coverage is REQUIRED.
 */

import type { AnonymizedClinicalContext } from '../api/ai-types';

import type { VitalSigns } from '@/types/api';
import type { Encounter } from '@/utils/types';

// =============================================================================
// PII PATTERNS
// =============================================================================

/**
 * Regular expression patterns for PII detection
 */
const PII_PATTERNS = {
  // NIK (16 consecutive digits)
  NIK: /\b\d{16}\b/g,

  // Phone numbers (Indonesian format)
  PHONE_08: /\b08\d{8,11}\b/g,
  PHONE_62: /\+?62\d{9,12}\b/g,
  PHONE_GENERAL: /\b(?:\+62|62|0)[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,

  // Names with Indonesian honorifics
  HONORIFIC_NAME:
    /\b(?:Tn\.|Ny\.|Nn\.|An\.|dr\.|Dr\.|Bpk\.|Ibu)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}/gi,

  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Address patterns (Indonesian)
  ADDRESS_JL: /\b(?:Jl\.|Jalan)\s+[A-Za-z0-9\s]+(?:No\.?\s*\d+)?/gi,
  ADDRESS_RT_RW: /\bRT\s*\.?\s*\d+\s*\/?\s*RW\s*\.?\s*\d+/gi,
  ADDRESS_KEL: /\b(?:Kel\.|Kelurahan|Desa)\s+[A-Za-z]+/gi,
  ADDRESS_KEC: /\b(?:Kec\.|Kecamatan)\s+[A-Za-z]+/gi,

  // BPJS number (13 digits)
  BPJS: /\b\d{13}\b/g,

  // Rekam Medis number (various formats)
  RM_NUMBER: /\b(?:RM|No\.?\s*RM)\s*:?\s*[A-Z0-9-]+\b/gi,
};

/**
 * Placeholder text for redacted content
 */
const REDACTION_PLACEHOLDERS = {
  NIK: '[NIK_DIHAPUS]',
  PHONE: '[TELEPON_DIHAPUS]',
  NAME: '[NAMA_DIHAPUS]',
  EMAIL: '[EMAIL_DIHAPUS]',
  ADDRESS: '[ALAMAT_DIHAPUS]',
  BPJS: '[BPJS_DIHAPUS]',
  RM: '[RM_DIHAPUS]',
  GENERAL: '[REDACTED]',
};

// =============================================================================
// ANONYMIZATION FUNCTIONS
// =============================================================================

/**
 * Redact PII from free-text string
 * Replaces detected PII with placeholders
 */
export function redactPII(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;

  // Apply each pattern
  result = result.replace(PII_PATTERNS.NIK, REDACTION_PLACEHOLDERS.NIK);
  result = result.replace(PII_PATTERNS.PHONE_62, REDACTION_PLACEHOLDERS.PHONE);
  result = result.replace(PII_PATTERNS.PHONE_08, REDACTION_PLACEHOLDERS.PHONE);
  result = result.replace(PII_PATTERNS.PHONE_GENERAL, REDACTION_PLACEHOLDERS.PHONE);
  result = result.replace(PII_PATTERNS.EMAIL, REDACTION_PLACEHOLDERS.EMAIL);
  result = result.replace(PII_PATTERNS.HONORIFIC_NAME, REDACTION_PLACEHOLDERS.NAME);
  result = result.replace(PII_PATTERNS.ADDRESS_JL, REDACTION_PLACEHOLDERS.ADDRESS);
  result = result.replace(PII_PATTERNS.ADDRESS_RT_RW, REDACTION_PLACEHOLDERS.ADDRESS);
  result = result.replace(PII_PATTERNS.ADDRESS_KEL, REDACTION_PLACEHOLDERS.ADDRESS);
  result = result.replace(PII_PATTERNS.ADDRESS_KEC, REDACTION_PLACEHOLDERS.ADDRESS);
  result = result.replace(PII_PATTERNS.BPJS, REDACTION_PLACEHOLDERS.BPJS);
  result = result.replace(PII_PATTERNS.RM_NUMBER, REDACTION_PLACEHOLDERS.RM);

  return result;
}

/**
 * Check if text contains potential PII
 */
export function containsPII(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  for (const pattern of Object.values(PII_PATTERNS)) {
    if (pattern.test(text)) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      return true;
    }
    // Reset regex lastIndex for next iteration
    pattern.lastIndex = 0;
  }

  return false;
}

/**
 * Calculate patient age from birth date
 */
export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Anonymize full encounter data
 * Returns only clinical data needed for diagnosis
 */
export function anonymize(encounter: Encounter): AnonymizedClinicalContext {
  // Extract and redact clinical text fields
  const keluhan_utama = redactPII(encounter.anamnesa?.keluhan_utama || '');
  const keluhan_tambahan = redactPII(encounter.anamnesa?.keluhan_tambahan || '');

  // Calculate age from timestamp or use default
  // Note: In production, we would have patient birth date
  // For now, we'll need age to be provided separately
  const usia_tahun = 30; // Default age if not available

  // Extract gender (default to unknown)
  // Note: This should come from patient data
  const jenis_kelamin: 'L' | 'P' = 'L';

  // Extract vital signs (these are clinical, not PII)
  const vital_signs = extractVitalSigns(encounter);

  // Extract duration
  const lama_sakit = encounter.anamnesa?.lama_sakit
    ? {
        hari: encounter.anamnesa.lama_sakit.hr || 0,
        bulan: encounter.anamnesa.lama_sakit.bln || 0,
        tahun: encounter.anamnesa.lama_sakit.thn || 0,
      }
    : undefined;

  // Extract chronic diseases (clinical data, keep as-is but validate)
  const chronic_diseases =
    encounter.diagnosa?.penyakit_kronis?.filter(Boolean)?.map((d) => redactPII(d)) || [];

  // Extract allergies (clinical data, keep as-is but validate)
  const allergies = extractAllergies(encounter);

  // Check pregnancy status based on diagnosis codes
  const is_pregnant = checkPregnancyStatus(encounter);

  return {
    keluhan_utama,
    keluhan_tambahan: keluhan_tambahan || undefined,
    usia_tahun,
    jenis_kelamin,
    vital_signs: vital_signs || undefined,
    lama_sakit,
    chronic_diseases: chronic_diseases.length > 0 ? chronic_diseases : undefined,
    allergies: allergies.length > 0 ? allergies : undefined,
    is_pregnant,
  };
}

/**
 * Anonymize with explicit patient demographics
 */
export function anonymizeWithDemographics(
  encounter: Encounter,
  demographics: {
    birth_date?: string;
    age?: number;
    gender: 'L' | 'P';
  }
): AnonymizedClinicalContext {
  const base = anonymize(encounter);

  // Override with provided demographics
  if (demographics.age !== undefined) {
    base.usia_tahun = demographics.age;
  } else if (demographics.birth_date) {
    base.usia_tahun = calculateAge(demographics.birth_date);
  }

  base.jenis_kelamin = demographics.gender;

  // Pregnancy only applicable to female patients
  if (demographics.gender === 'L') {
    base.is_pregnant = false;
  }

  return base;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract vital signs from encounter
 */
function extractVitalSigns(_encounter: Encounter): VitalSigns | null {
  const encounter = _encounter as unknown as {
    vital_signs?: {
      tekanan_darah_sistolik?: number;
      tekanan_darah_diastolik?: number;
      nadi?: number;
      respirasi?: number;
      suhu?: number;
      saturasi?: number;
      kesadaran?: string;
      gcs?: number;
      gula_darah?: number;
    };
    anamnesa?: {
      vital_signs?: {
        tekanan_darah_sistolik?: number;
        tekanan_darah_diastolik?: number;
        nadi?: number;
        respirasi?: number;
        suhu?: number;
        saturasi?: number;
        kesadaran?: string;
        gcs?: number;
        gula_darah?: number;
      };
      periksa_fisik?: {
        saturasi?: number;
        gcs_membuka_mata?: string;
        gcs_respon_verbal?: string;
        gcs_respon_motorik?: string;
      };
    };
  };

  const vs = encounter.vital_signs ?? encounter.anamnesa?.vital_signs;
  const pf = encounter.anamnesa?.periksa_fisik;

  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };

  const gcsFromPF =
    toNumber(pf?.gcs_membuka_mata) &&
    toNumber(pf?.gcs_respon_verbal) &&
    toNumber(pf?.gcs_respon_motorik)
      ? (toNumber(pf?.gcs_membuka_mata) || 0) +
        (toNumber(pf?.gcs_respon_verbal) || 0) +
        (toNumber(pf?.gcs_respon_motorik) || 0)
      : undefined;

  const vitalSigns: VitalSigns = {
    systolic: toNumber(vs?.tekanan_darah_sistolik),
    diastolic: toNumber(vs?.tekanan_darah_diastolik),
    heart_rate: toNumber(vs?.nadi),
    respiratory_rate: toNumber(vs?.respirasi),
    temperature: toNumber(vs?.suhu),
    spo2: toNumber(vs?.saturasi) ?? toNumber(pf?.saturasi),
    gcs: toNumber(vs?.gcs) ?? gcsFromPF,
  };

  const hasAnyVital = Object.values(vitalSigns).some((value) => value !== undefined);
  return hasAnyVital ? vitalSigns : null;
}

/**
 * Extract and merge allergies from encounter
 */
function extractAllergies(encounter: Encounter): string[] {
  const allergies: string[] = [];
  const alergi = encounter.anamnesa?.alergi;

  if (alergi) {
    if (Array.isArray(alergi.obat)) {
      allergies.push(...alergi.obat.filter(Boolean).map((a) => redactPII(a)));
    }
    if (Array.isArray(alergi.makanan)) {
      allergies.push(...alergi.makanan.filter(Boolean).map((a) => redactPII(a)));
    }
    if (Array.isArray(alergi.lainnya)) {
      allergies.push(...alergi.lainnya.filter(Boolean).map((a) => redactPII(a)));
    }
  }

  return [...new Set(allergies)]; // Remove duplicates
}

/**
 * Check pregnancy status from diagnosis codes
 */
function checkPregnancyStatus(encounter: Encounter): boolean {
  if (typeof encounter.anamnesa?.is_pregnant === 'boolean') {
    return encounter.anamnesa.is_pregnant;
  }

  const diagnosisCode = encounter.diagnosa?.icd_x || '';

  // Pregnancy-related ICD-10 codes start with O
  if (diagnosisCode.startsWith('O')) {
    return true;
  }

  // Check if any chronic disease mentions pregnancy
  const chronicDiseases = encounter.diagnosa?.penyakit_kronis || [];
  const pregnancyKeywords = ['hamil', 'kehamilan', 'pregnant', 'pregnancy'];

  for (const disease of chronicDiseases) {
    if (pregnancyKeywords.some((k) => disease.toLowerCase().includes(k))) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate that anonymized context contains no PII
 * Used for testing and audit
 */
export function validateAnonymization(context: AnonymizedClinicalContext): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check text fields for remaining PII
  const textFields = [
    { name: 'keluhan_utama', value: context.keluhan_utama },
    { name: 'keluhan_tambahan', value: context.keluhan_tambahan },
  ];

  for (const field of textFields) {
    if (field.value && containsPII(field.value)) {
      violations.push(`PII detected in ${field.name}`);
    }
  }

  // Check arrays
  if (context.chronic_diseases) {
    for (const disease of context.chronic_diseases) {
      if (containsPII(disease)) {
        violations.push(`PII detected in chronic_diseases: ${disease.substring(0, 20)}...`);
      }
    }
  }

  if (context.allergies) {
    for (const allergy of context.allergies) {
      if (containsPII(allergy)) {
        violations.push(`PII detected in allergies: ${allergy.substring(0, 20)}...`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Create a hash of anonymized context for audit logging
 * Does not include any PII in the hash
 */
export function hashAnonymizedContext(context: AnonymizedClinicalContext): string {
  // Create a deterministic string representation
  const parts = [
    context.keluhan_utama.substring(0, 100), // Truncate for hash
    context.usia_tahun,
    context.jenis_kelamin,
    context.is_pregnant ? 'P' : 'N',
  ];

  // Simple hash function (for non-cryptographic use)
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { AnonymizedClinicalContext };
