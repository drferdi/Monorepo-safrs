// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Mock Prescription Recommendations
 * Based on Formularium Nasional & Puskesmas formulary
 *
 * @module lib/api/mocks/prescription-mock
 */

import type { CDSSAlert, CDSSResponse, MedicationRecommendation } from '@/types/api';

// =============================================================================
// MEDICATION RECOMMENDATIONS BY DIAGNOSIS
// =============================================================================

/**
 * ISPA Treatment (J06.9)
 */
export const ISPA_MEDICATIONS: MedicationRecommendation[] = [
  {
    nama_obat: 'Paracetamol 500mg',
    dosis: '3x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '3 hari',
    rationale: 'Antipiretik untuk demam dan analgesik',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Ambroxol 30mg',
    dosis: '3x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '5 hari',
    rationale: 'Mukolitik untuk batuk produktif',
    safety_check: 'safe',
  },
  {
    nama_obat: 'CTM 4mg',
    dosis: '3x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '3 hari',
    rationale: 'Antihistamin untuk rinore',
    safety_check: 'caution',
    contraindications: ['Mengantuk - hindari berkendara'],
  },
  {
    nama_obat: 'Vitamin C 500mg',
    dosis: '1x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '5 hari',
    rationale: 'Suplementasi untuk daya tahan tubuh',
    safety_check: 'safe',
  },
];

/**
 * Gastroenteritis Treatment (A09)
 */
export const GE_MEDICATIONS: MedicationRecommendation[] = [
  {
    nama_obat: 'Oralit',
    dosis: 'Ad libitum',
    aturan_pakai: 'Jika diperlukan',
    durasi: 'Sampai diare berhenti',
    rationale: 'Rehidrasi oral untuk mencegah dehidrasi',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Zinc 20mg',
    dosis: '1x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '10 hari',
    rationale: 'Mengurangi durasi dan keparahan diare (WHO recommendation)',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Domperidone 10mg',
    dosis: '3x1',
    aturan_pakai: 'Sebelum makan',
    durasi: '3 hari',
    rationale: 'Antiemetik untuk mual/muntah',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Attapulgite 600mg',
    dosis: '3x2',
    aturan_pakai: 'Sesudah makan',
    durasi: '3 hari',
    rationale: 'Adsorben untuk diare non-infeksi',
    safety_check: 'safe',
  },
];

/**
 * Hypertension Treatment (I10)
 */
export const HYPERTENSION_MEDICATIONS: MedicationRecommendation[] = [
  {
    nama_obat: 'Amlodipine 5mg',
    dosis: '1x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '30 hari',
    rationale: 'First-line CCB untuk hipertensi',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Captopril 25mg',
    dosis: '2x1',
    aturan_pakai: 'Sebelum makan',
    durasi: '30 hari',
    rationale: 'ACE-I untuk proteksi target organ',
    safety_check: 'caution',
    contraindications: ['Batuk kering (efek samping umum)', 'Kontraindikasi pada kehamilan'],
  },
];

/**
 * Suspected Angina / ACS Initial FKTP Bridge Therapy (I20/I21/I22/I24)
 * This is initial stabilization support and does NOT replace definitive ACS protocol.
 */
export const ACS_INITIAL_MEDICATIONS: MedicationRecommendation[] = [
  {
    nama_obat: 'Aspirin 160-325mg',
    dosis: 'Loading dose tunggal',
    aturan_pakai: 'Saat makan',
    durasi: 'Sekali segera',
    rationale: 'Antiplatelet awal pada suspek ACS bila tidak ada kontraindikasi perdarahan/alergi.',
    safety_check: 'caution',
    contraindications: [
      'Alergi aspirin/salisilat',
      'Perdarahan aktif atau risiko perdarahan tinggi',
    ],
  },
  {
    nama_obat: 'Nitroglycerin SL 0.4mg',
    dosis: '1 tablet SL, ulang tiap 5 menit bila perlu (maks 3 dosis)',
    aturan_pakai: 'Jika diperlukan',
    durasi: 'Saat nyeri dada akut',
    rationale:
      'Pereda gejala nyeri dada iskemik sambil menyiapkan evaluasi EKG dan rujukan emergensi.',
    safety_check: 'caution',
    contraindications: [
      'SBP < 90 mmHg atau hipotensi',
      'Penggunaan PDE5 inhibitor dalam 24-48 jam',
      'Kecurigaan infark ventrikel kanan',
    ],
  },
];

/**
 * Diabetes Treatment (E11.9)
 */
export const DIABETES_MEDICATIONS: MedicationRecommendation[] = [
  {
    nama_obat: 'Metformin 500mg',
    dosis: '3x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '30 hari',
    rationale: 'First-line OAD untuk DM tipe 2',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Glimepiride 2mg',
    dosis: '1x1',
    aturan_pakai: 'Sebelum makan',
    durasi: '30 hari',
    rationale: 'Sulfonylurea untuk kontrol glikemik',
    safety_check: 'caution',
    contraindications: ['Risiko hipoglikemia - makan teratur'],
  },
];

/**
 * Skin Infection Treatment (L30.9)
 */
export const SKIN_MEDICATIONS: MedicationRecommendation[] = [
  {
    nama_obat: 'Cetirizine 10mg',
    dosis: '1x1',
    aturan_pakai: 'Sesudah makan',
    durasi: '7 hari',
    rationale: 'Antihistamin non-sedatif untuk pruritus',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Hydrocortisone 1% cream',
    dosis: '2x aplikasi',
    aturan_pakai: 'Pemakaian luar',
    durasi: '7 hari',
    rationale: 'Kortikosteroid topikal untuk inflamasi',
    safety_check: 'safe',
  },
  {
    nama_obat: 'Miconazole 2% cream',
    dosis: '2x aplikasi',
    aturan_pakai: 'Pemakaian luar',
    durasi: '14 hari',
    rationale: 'Antifungal topikal untuk suspek tinea',
    safety_check: 'safe',
  },
];

// =============================================================================
// MOCK RESPONSE BUILDER
// =============================================================================

/**
 * Get medication recommendations based on ICD-10 code
 */
export function getMockMedicationsByDiagnosis(icd_x: string): MedicationRecommendation[] {
  const code = icd_x.toUpperCase();

  // ISPA codes
  if (code.startsWith('J0') || code.startsWith('J1')) {
    return ISPA_MEDICATIONS;
  }

  // GI codes
  if (code.startsWith('A09') || code.startsWith('K5')) {
    return GE_MEDICATIONS;
  }

  // Hypertension
  if (
    code.startsWith('I10') ||
    code.startsWith('I11') ||
    code.startsWith('I12') ||
    code.startsWith('I13') ||
    code.startsWith('I15') ||
    code.startsWith('I16')
  ) {
    return HYPERTENSION_MEDICATIONS;
  }

  // Suspected angina / acute coronary syndrome family
  if (
    code.startsWith('I20') ||
    code.startsWith('I21') ||
    code.startsWith('I22') ||
    code.startsWith('I24')
  ) {
    return ACS_INITIAL_MEDICATIONS;
  }

  // Diabetes
  if (
    code.startsWith('E10') ||
    code.startsWith('E11') ||
    code.startsWith('E13') ||
    code.startsWith('E14')
  ) {
    return DIABETES_MEDICATIONS;
  }

  // Skin
  if (code.startsWith('L') || code.startsWith('B35')) {
    return SKIN_MEDICATIONS;
  }

  // Unknown diagnosis code: do not force generic medication package.
  // Returning empty array is safer than an unrelated fallback regimen.
  return [];
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate allergy alerts based on patient allergies
 */
export function generateAllergyAlerts(
  medications: MedicationRecommendation[],
  allergies: string[]
): CDSSAlert[] {
  const alerts: CDSSAlert[] = [];

  // Common allergy patterns
  const allergyPatterns: Record<string, string[]> = {
    penisilin: ['amoxicillin', 'ampicillin', 'penicillin'],
    sulfa: ['sulfamethoxazole', 'cotrimoxazole', 'bactrim'],
    nsaid: ['ibuprofen', 'aspirin', 'meloxicam', 'piroxicam'],
  };

  allergies.forEach((allergy) => {
    const allergyLower = allergy.toLowerCase();
    const relatedDrugs = allergyPatterns[allergyLower] || [];

    medications.forEach((med) => {
      const medLower = med.nama_obat.toLowerCase();
      if (relatedDrugs.some((drug) => medLower.includes(drug))) {
        alerts.push({
          id: generateAlertId(),
          type: 'allergy',
          severity: 'emergency',
          title: 'Alergi Obat Terdeteksi',
          message: `ALERGI: ${med.nama_obat} mengandung komponen yang berkaitan dengan alergi ${allergy}`,
          action: 'Ganti obat dengan alternatif yang aman',
        });
      }
    });
  });

  return alerts;
}

/**
 * Build full mock CDSS response for prescription
 */
export function buildMockPrescriptionResponse(
  icd_x: string,
  allergies: string[] = [],
  chronicDiseases: string[] = []
): CDSSResponse {
  const medications = getMockMedicationsByDiagnosis(icd_x);
  const alerts = generateAllergyAlerts(medications, allergies);
  const normalizedCode = icd_x.toUpperCase().trim();
  const isAcsLikeCode =
    normalizedCode.startsWith('I20') ||
    normalizedCode.startsWith('I21') ||
    normalizedCode.startsWith('I22') ||
    normalizedCode.startsWith('I24');

  if (isAcsLikeCode) {
    alerts.push({
      id: generateAlertId(),
      type: 'red_flag',
      severity: 'emergency',
      title: 'Suspek ACS: Stabilize and Refer',
      message:
        'Terapi farmakologi di FKTP bersifat stabilisasi awal. Evaluasi EKG 12 sadapan dan rujukan emergensi tetap prioritas.',
      action:
        'Lakukan monitoring serial TTV, pertimbangkan serial EKG, dan eskalasi rujukan segera bila nyeri menetap atau ada instabilitas.',
    });
  }

  if (medications.length === 0) {
    if (isAcsLikeCode) {
      alerts.push({
        id: generateAlertId(),
        type: 'red_flag',
        severity: 'emergency',
        title: 'Kode Kardiak Risiko Tinggi',
        message:
          'Diagnosis kardiak akut/suspek ACS tidak diberikan paket farmakoterapi otomatis untuk mencegah rekomendasi yang tidak aman.',
        action:
          'Lakukan EKG 12 sadapan, monitoring serial TTV, dan rujuk emergensi bila nyeri dada menetap atau kondisi hemodinamik tidak stabil.',
      });
    } else {
      alerts.push({
        id: generateAlertId(),
        type: 'validation_warning',
        severity: 'info',
        title: 'Paket Terapi Tidak Tersedia',
        message:
          'Belum ada paket terapi farmakologi terstruktur untuk kode ICD ini pada knowledge database aktif.',
        action:
          'Gunakan keputusan klinis dokter + formularium FKTP lokal, atau pilih diagnosis dengan paket terapi yang tersedia.',
      });
    }
  }

  // Add chronic disease alerts
  if (chronicDiseases.includes('Hipertensi') && icd_x.startsWith('J')) {
    alerts.push({
      id: generateAlertId(),
      type: 'chronic_disease',
      severity: 'info',
      title: 'Perhatian Hipertensi',
      message: 'Pasien memiliki riwayat Hipertensi - hindari dekongestan sistemik',
    });
  }

  if (chronicDiseases.includes('Diabetes') && icd_x.startsWith('J')) {
    alerts.push({
      id: generateAlertId(),
      type: 'chronic_disease',
      severity: 'medium',
      title: 'Perhatian Diabetes',
      message: 'Pasien DM - hindari sirup dengan kandungan gula tinggi',
    });
  }

  return {
    diagnosis_suggestions: [],
    medication_recommendations: medications,
    alerts,
    clinical_guidelines: [
      'Minum obat sesuai jadwal yang ditentukan',
      'Kembali kontrol jika tidak ada perbaikan dalam 3 hari',
      'Segera ke IGD jika gejala memburuk',
    ],
    meta: {
      processing_time_ms: 200,
      model_version: 'mock-v1.0',
      timestamp: new Date().toISOString(),
      is_mock: true,
    },
  };
}
