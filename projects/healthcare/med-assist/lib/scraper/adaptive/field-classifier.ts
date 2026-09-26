// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Data Ascension System (DAS) - Field Classifier
 *
 * Clinical field classification and safety validation utilities.
 * Maps field signatures to clinical categories for safe AI mapping.
 *
 * @module lib/scraper/adaptive/field-classifier
 */

import type { ClinicalFieldCategory, FieldMappingHint, FieldSignature } from './types';

// ============================================================================
// CLINICAL FIELD PATTERNS
// ============================================================================

/**
 * Pattern matchers for vital sign fields
 * These fields require EXTRA CAUTION during AI mapping
 */
const VITAL_SIGN_PATTERNS = {
  bloodPressure: [
    /sistol/i,
    /diastol/i,
    /tekanan.*darah/i,
    /blood.*pressure/i,
    /bp.*sys/i,
    /bp.*dia/i,
    /td/i,
  ],
  heartRate: [/nadi/i, /heart.*rate/i, /pulse/i, /detak/i, /hr/i],
  respiratoryRate: [/nafas/i, /respiratory/i, /respiration/i, /rr/i, /pernafasan/i],
  temperature: [/suhu/i, /temp/i, /temperatur/i],
  oxygenSaturation: [/spo2/i, /saturasi/i, /oxygen/i, /o2/i],
  glucose: [/gula.*darah/i, /glucose/i, /gds/i, /gdp/i, /gd2pp/i, /blood.*sugar/i],
};

/**
 * Pattern matchers for medication fields
 * CRITICAL: Must never auto-fill without verification
 */
const MEDICATION_PATTERNS = {
  drugName: [/nama.*obat/i, /drug.*name/i, /obat/i, /medicine/i, /medication/i],
  dosage: [/dosis/i, /dose/i, /dosage/i, /takaran/i],
  frequency: [/frekuensi/i, /frequency/i, /aturan.*pakai/i, /signa/i],
  route: [/rute/i, /route/i, /cara.*pemberian/i],
  quantity: [/jumlah/i, /qty/i, /quantity/i, /kuantitas/i],
};

/**
 * Pattern matchers for allergy fields
 */
const ALLERGY_PATTERNS = [/alergi/i, /allergy/i, /allergi/i, /hipersensitif/i];

/**
 * Pattern matchers for patient identification
 */
const PATIENT_ID_PATTERNS = [
  /no.*rm/i,
  /rm.*number/i,
  /rekam.*medis/i,
  /medical.*record/i,
  /bpjs/i,
  /nik/i,
  /nomor.*pasien/i,
  /patient.*id/i,
];

/**
 * Pattern matchers for diagnosis fields
 */
const DIAGNOSIS_PATTERNS = [/icd/i, /diagnos/i, /diagnosis/i, /penyakit/i, /disease/i];

// ============================================================================
// CLASSIFIER FUNCTIONS
// ============================================================================

/**
 * Test if text matches any pattern in array
 */
function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Build searchable text from field signature
 */
function getSearchableText(signature: FieldSignature): string {
  const parts = [
    signature.label,
    signature.attributes.name,
    signature.attributes.id,
    signature.attributes.placeholder,
    signature.context.sectionHeader,
    ...signature.context.siblingLabels,
  ].filter(Boolean);

  return parts.join(' ').toLowerCase();
}

/**
 * Classify a field signature into clinical category
 *
 * @param signature - Field signature to classify
 * @returns FieldMappingHint with category, confidence, and reasoning
 */
export function classifyClinicalField(signature: FieldSignature): FieldMappingHint {
  const searchText = getSearchableText(signature);

  // Check Vital Signs (highest priority for safety)
  for (const [subType, patterns] of Object.entries(VITAL_SIGN_PATTERNS)) {
    if (matchesAny(searchText, patterns)) {
      return {
        category: 'vital_signs',
        confidence: 0.9,
        reasoning: `Matched vital sign pattern: ${subType}`,
      };
    }
  }

  // Check Medication fields
  for (const [subType, patterns] of Object.entries(MEDICATION_PATTERNS)) {
    if (matchesAny(searchText, patterns)) {
      return {
        category: 'medication',
        confidence: 0.9,
        reasoning: `Matched medication pattern: ${subType}`,
      };
    }
  }

  // Check Allergy fields
  if (matchesAny(searchText, ALLERGY_PATTERNS)) {
    return {
      category: 'allergy',
      confidence: 0.85,
      reasoning: 'Matched allergy pattern',
    };
  }

  // Check Patient ID fields
  if (matchesAny(searchText, PATIENT_ID_PATTERNS)) {
    return {
      category: 'patient_id',
      confidence: 0.9,
      reasoning: 'Matched patient identification pattern',
    };
  }

  // Check Diagnosis fields
  if (matchesAny(searchText, DIAGNOSIS_PATTERNS)) {
    return {
      category: 'diagnosis',
      confidence: 0.85,
      reasoning: 'Matched diagnosis pattern',
    };
  }

  // Default to general
  return {
    category: 'general',
    confidence: 0.7,
    reasoning: 'No clinical pattern matched',
  };
}

/**
 * Check if a field category requires human confirmation
 *
 * @param category - Clinical field category
 * @returns true if human confirmation is required
 */
export function requiresHumanConfirmation(category: ClinicalFieldCategory): boolean {
  const criticalCategories: ClinicalFieldCategory[] = [
    'vital_signs',
    'medication',
    'allergy',
    'patient_id',
  ];

  return criticalCategories.includes(category);
}

/**
 * Check if a field should NEVER be AI-mapped
 * These fields must always use static mapping
 *
 * @param signature - Field signature to check
 * @returns true if field must use static mapping only
 */
export function requiresStaticMapping(signature: FieldSignature): boolean {
  const classification = classifyClinicalField(signature);

  // Critical fields with high confidence must use static mapping
  if (classification.confidence >= 0.9) {
    return classification.category === 'vital_signs' || classification.category === 'medication';
  }

  return false;
}

// ============================================================================
// ePUSKESMAS SPECIFIC PATTERNS
// ============================================================================

/**
 * Known ePuskesmas field name patterns
 * These map directly to payload keys
 */
export const EPUSKESMAS_FIELD_PATTERNS: Record<string, string[]> = {
  // Vital Signs (PeriksaFisik)
  'vital_signs.tekanan_darah_sistolik': ['PeriksaFisik[sistole]', 'sistole'],
  'vital_signs.tekanan_darah_diastolik': ['PeriksaFisik[diastole]', 'diastole'],
  'vital_signs.nadi': ['PeriksaFisik[detak_nadi]', 'detak_nadi', 'detak-nadi'],
  'vital_signs.respirasi': ['PeriksaFisik[nafas]', 'nafas'],
  'vital_signs.suhu': ['PeriksaFisik[suhu]', 'suhu'],
  'vital_signs.gula_darah': ['PeriksaFisik[gula_darah]', 'gula_darah', 'gula-darah'],

  // Anamnesa
  keluhan_utama: ['Anamnesa[keluhan_utama]', 'keluhan'],
  keluhan_tambahan: ['Anamnesa[keluhan_tambahan]', 'keluhan-tambahan'],
  'lama_sakit.hr': ['Anamnesa[lama_sakit_hari]', 'sakit_hari'],
  'lama_sakit.bln': ['Anamnesa[lama_sakit_bulan]', 'sakit_bulan'],
  'lama_sakit.thn': ['Anamnesa[lama_sakit_tahun]', 'sakit_tahun'],

  // Riwayat Penyakit
  'riwayat_penyakit.sekarang': ['MRiwayatPasien[Riwayat Penyakit Sekarang][value]', 'text_rps'],
  'riwayat_penyakit.dahulu': ['MRiwayatPasien[Riwayat Penyakit Dulu][value]', 'text_rpd'],
  'riwayat_penyakit.keluarga': ['MRiwayatPasien[Riwayat Penyakit Keluarga][value]', 'text_rpk'],

  // Alergi
  'alergi.obat': ['MAlergiPasien[Obat][value]', 'text_alergiobat'],
  'alergi.makanan': ['MAlergiPasien[Makanan][value]', 'text_alergimakanan'],
};

/**
 * Try to match a field to a known ePuskesmas pattern
 *
 * @param signature - Field signature
 * @returns Payload key if matched, null otherwise
 */
export function matchEpuskesmasField(signature: FieldSignature): string | null {
  const fieldName = signature.attributes.name;
  const fieldId = signature.attributes.id;

  for (const [payloadKey, patterns] of Object.entries(EPUSKESMAS_FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (fieldName === pattern || fieldId === pattern) {
        return payloadKey;
      }
    }
  }

  return null;
}

/**
 * Get all fields that match a specific payload key
 *
 * @param payloadKey - The payload key to find selectors for
 * @returns Array of possible field name/id patterns
 */
export function getSelectorsForPayloadKey(payloadKey: string): string[] {
  return EPUSKESMAS_FIELD_PATTERNS[payloadKey] || [];
}
