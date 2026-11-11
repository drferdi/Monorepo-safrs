// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Mock CDSS Alerts
 * Generic clinical alerts for various scenarios
 *
 * @module lib/api/mocks/alerts-mock
 */

import type { AlertSeverity, CDSSAlert, CDSSAlertType, VitalSigns } from '@/types/api';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

let alertIdCounter = 0;

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${++alertIdCounter}`;
}

/**
 * Create a properly typed CDSSAlert
 */
function createAlert(
  type: CDSSAlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  action?: string,
  icd_codes?: string[]
): CDSSAlert {
  return {
    id: generateAlertId(),
    type,
    severity,
    title,
    message,
    action,
    icd_codes,
  };
}

// =============================================================================
// VITAL SIGN THRESHOLDS
// Evidence-based thresholds for alert generation
// =============================================================================

interface VitalThreshold {
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

const VITAL_THRESHOLDS: Record<keyof VitalSigns, VitalThreshold> = {
  systolic: { low: 90, high: 140, criticalLow: 80, criticalHigh: 180 },
  diastolic: { low: 60, high: 90, criticalLow: 50, criticalHigh: 120 },
  heart_rate: { low: 60, high: 100, criticalLow: 40, criticalHigh: 150 },
  respiratory_rate: { low: 12, high: 20, criticalLow: 8, criticalHigh: 30 },
  temperature: { low: 36.0, high: 37.5, criticalLow: 35.0, criticalHigh: 40.0 },
  spo2: { low: 95, criticalLow: 90 },
  gcs: { low: 15, criticalLow: 8 },
};

// =============================================================================
// ALERT GENERATORS
// =============================================================================

/**
 * Generate vital sign alerts based on measurements
 */
export function generateVitalSignAlerts(vitals: VitalSigns): CDSSAlert[] {
  const alerts: CDSSAlert[] = [];

  // Blood Pressure
  if (vitals.systolic !== undefined) {
    const threshold = VITAL_THRESHOLDS.systolic;
    if (vitals.systolic >= threshold.criticalHigh!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Hipertensi Krisis',
          `HIPERTENSI KRISIS: Sistolik ${vitals.systolic} mmHg`,
          'Rujuk segera ke IGD',
          ['I10']
        )
      );
    } else if (vitals.systolic >= threshold.high!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'medium',
          'Tekanan Darah Tinggi',
          `Tekanan darah sistolik tinggi: ${vitals.systolic} mmHg`
        )
      );
    } else if (vitals.systolic <= threshold.criticalLow!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Hipotensi Berat',
          `HIPOTENSI BERAT: Sistolik ${vitals.systolic} mmHg - evaluasi syok`,
          'Evaluasi tanda syok segera'
        )
      );
    }
  }

  // Heart Rate
  if (vitals.heart_rate !== undefined) {
    const threshold = VITAL_THRESHOLDS.heart_rate;
    if (vitals.heart_rate >= threshold.criticalHigh!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Takikardia Berat',
          `TAKIKARDIA BERAT: HR ${vitals.heart_rate} bpm - evaluasi aritmia`,
          'EKG segera, evaluasi aritmia'
        )
      );
    } else if (vitals.heart_rate >= threshold.high!) {
      alerts.push(
        createAlert('vital_sign', 'medium', 'Takikardia', `Takikardia: HR ${vitals.heart_rate} bpm`)
      );
    } else if (vitals.heart_rate <= threshold.criticalLow!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Bradikardia Berat',
          `BRADIKARDIA BERAT: HR ${vitals.heart_rate} bpm - evaluasi konduksi`,
          'EKG segera, evaluasi blok jantung'
        )
      );
    }
  }

  // SpO2
  if (vitals.spo2 !== undefined) {
    const threshold = VITAL_THRESHOLDS.spo2;
    if (vitals.spo2 <= threshold.criticalLow!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Hipoksia Berat',
          `HIPOKSIA BERAT: SpO2 ${vitals.spo2}% - berikan oksigen segera`,
          'Oksigen high flow, evaluasi jalan napas'
        )
      );
    } else if (vitals.spo2 <= threshold.low!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'medium',
          'Hipoksia Ringan',
          `Hipoksia ringan: SpO2 ${vitals.spo2}%`
        )
      );
    }
  }

  // Temperature
  if (vitals.temperature !== undefined) {
    const threshold = VITAL_THRESHOLDS.temperature;
    if (vitals.temperature >= threshold.criticalHigh!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Hipertermia',
          `HIPERTERMIA: Suhu ${vitals.temperature}°C - cooling segera`,
          'Kompres dingin, antipiretik IV'
        )
      );
    } else if (vitals.temperature >= threshold.high!) {
      alerts.push(
        createAlert('vital_sign', 'info', 'Demam', `Demam: Suhu ${vitals.temperature}°C`)
      );
    } else if (vitals.temperature <= threshold.criticalLow!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Hipotermia',
          `HIPOTERMIA: Suhu ${vitals.temperature}°C - rewarming diperlukan`,
          'Active rewarming, evaluasi penyebab'
        )
      );
    }
  }

  // GCS
  if (vitals.gcs !== undefined) {
    const threshold = VITAL_THRESHOLDS.gcs;
    if (vitals.gcs <= threshold.criticalLow!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'emergency',
          'Penurunan Kesadaran Berat',
          `PENURUNAN KESADARAN: GCS ${vitals.gcs} - evaluasi neurologis segera`,
          'CT Scan kepala, konsul neurologi'
        )
      );
    } else if (vitals.gcs < threshold.low!) {
      alerts.push(
        createAlert(
          'vital_sign',
          'medium',
          'Kesadaran Menurun',
          `Kesadaran menurun: GCS ${vitals.gcs}`
        )
      );
    }
  }

  return alerts;
}

/**
 * Generate qSOFA sepsis warning alerts
 * qSOFA criteria: RR >= 22, SBP <= 100, altered mental status
 */
export function generateSepsisAlert(vitals: VitalSigns): CDSSAlert | null {
  let qsofaScore = 0;

  if (vitals.respiratory_rate && vitals.respiratory_rate >= 22) qsofaScore++;
  if (vitals.systolic && vitals.systolic <= 100) qsofaScore++;
  if (vitals.gcs && vitals.gcs < 15) qsofaScore++;

  if (qsofaScore >= 2) {
    return createAlert(
      'sepsis_warning',
      'emergency',
      'Peringatan Sepsis',
      `PERINGATAN SEPSIS: qSOFA Score ${qsofaScore}/3 - evaluasi infeksi dan pertimbangkan rujukan`,
      'Kultur darah, antibiotik empiris, rujuk RS',
      ['A41.9', 'R65.1']
    );
  }

  return null;
}

/**
 * Generate chronic disease management alerts
 */
export function generateChronicDiseaseAlerts(diseases: string[]): CDSSAlert[] {
  const alerts: CDSSAlert[] = [];

  diseases.forEach((disease) => {
    const diseaseLower = disease.toLowerCase();

    if (diseaseLower.includes('diabetes') || diseaseLower.includes('dm')) {
      alerts.push(
        createAlert(
          'chronic_disease',
          'info',
          'Pasien Diabetes',
          'Pasien DM - periksa GDS dan evaluasi komplikasi secara berkala',
          'Cek HbA1c, fungsi ginjal, funduskopi',
          ['E11.9']
        )
      );
    }

    if (diseaseLower.includes('hipertensi') || diseaseLower.includes('htn')) {
      alerts.push(
        createAlert(
          'chronic_disease',
          'info',
          'Pasien Hipertensi',
          'Pasien Hipertensi - monitor TD dan evaluasi kepatuhan minum obat',
          undefined,
          ['I10']
        )
      );
    }

    if (
      diseaseLower.includes('asma') ||
      diseaseLower.includes('ppok') ||
      diseaseLower.includes('copd')
    ) {
      alerts.push(
        createAlert(
          'chronic_disease',
          'info',
          'Pasien Respiratori Kronik',
          'Pasien penyakit respiratori kronik - hindari beta blocker non-selektif'
        )
      );
    }

    if (
      diseaseLower.includes('ginjal') ||
      diseaseLower.includes('ckd') ||
      diseaseLower.includes('renal')
    ) {
      alerts.push(
        createAlert(
          'chronic_disease',
          'medium',
          'Pasien CKD',
          'Pasien CKD - sesuaikan dosis obat yang dieliminasi ginjal',
          'Hitung eGFR untuk penyesuaian dosis'
        )
      );
    }

    if (
      diseaseLower.includes('hati') ||
      diseaseLower.includes('hepar') ||
      diseaseLower.includes('liver')
    ) {
      alerts.push(
        createAlert(
          'chronic_disease',
          'medium',
          'Pasien Gangguan Hati',
          'Pasien gangguan hati - hindari obat hepatotoksik',
          'Cek fungsi hati sebelum obat hepatotoksik'
        )
      );
    }
  });

  return alerts;
}

/**
 * Generate pediatric dosing alert for children
 */
export function generatePediatricAlert(ageYears: number): CDSSAlert | null {
  if (ageYears < 12) {
    return createAlert(
      'dosing',
      'medium',
      'Pasien Pediatrik',
      `Pasien pediatrik (${ageYears} tahun) - gunakan kalkulator dosis pediatrik`,
      'Hitung dosis berdasarkan BB atau BSA'
    );
  }
  return null;
}

/**
 * Generate elderly patient alert
 */
export function generateGeriatricAlert(ageYears: number): CDSSAlert | null {
  if (ageYears >= 65) {
    return createAlert(
      'dosing',
      'info',
      'Pasien Geriatri',
      `Pasien geriatri (${ageYears} tahun) - pertimbangkan penurunan dosis dan polifarmasi`,
      'Evaluasi interaksi obat dan fungsi ginjal'
    );
  }
  return null;
}

/**
 * Combine all alerts and sort by severity
 */
export function combineAndSortAlerts(alerts: CDSSAlert[]): CDSSAlert[] {
  const severityOrder: Record<AlertSeverity, number> = {
    emergency: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
