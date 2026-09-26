import type { CanonicalPregnancyStatus, CanonicalTriageInput } from '@/lib/api/bridge-client';
import { APP_SLUG } from '@/lib/app-identity';
import {
  type AutosenPreset,
  type DisabilityType,
  type ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

/**
 * BuildCanonicalTriageInputArgs interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface BuildCanonicalTriageInputArgs {
  requestId: string;
  requestTime: string;
  patientName: string;
  patientGender: 'L' | 'P';
  patientAge: number;
  patientRM: string;
  patientDOB?: string;
  patientBPJSStatus?: 'aktif' | 'nonaktif' | 'mandiri' | null;
  patientKelurahan?: string;
  patientFacilityName?: string;
  patientPayerLabel?: string;
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    glucose: number;
    avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
    supplemental_o2?: boolean;
    pain_score?: number;
  };
  symptomTextRaw?: string;
  keluhanUtama: string;
  keluhanTambahan?: string;
  chronicHistorySummary?: string;
  allergies?: string[];
  pregnancyStatus?: boolean | null;
  extractedPregnancyRisk?: string;
  extractedSpecialConditions?: string[];
  disabilityType?: DisabilityType;
  obesityConfirmation?: ObesityConfirmation;
  autosenPreset?: AutosenPreset;
  prefetchedVisits?: VisitRecord[];
  hasCopd?: boolean;
  structuredSignsText?: string;
}

function clampHistoryText(text?: string): string[] {
  const normalized = text?.trim();
  if (!normalized || normalized === 'Menunggu Input') {
    return [];
  }

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapPregnancyStatus(
  patientGender: 'L' | 'P',
  pregnancyStatus?: boolean | null
): CanonicalPregnancyStatus {
  if (patientGender === 'L') {
    return 'tidak_relevan';
  }

  if (pregnancyStatus === true) {
    return 'hamil';
  }

  if (pregnancyStatus === false) {
    return 'tidak_hamil';
  }

  return 'tidak_diisi';
}

function composeStructuredSignsText(args: BuildCanonicalTriageInputArgs): string | undefined {
  const parts: string[] = [];
  if (args.keluhanUtama) parts.push(`KU: ${args.keluhanUtama}`);
  if (args.symptomTextRaw && args.symptomTextRaw !== args.keluhanUtama)
    parts.push(args.symptomTextRaw);
  if (args.vitals.avpu && args.vitals.avpu !== 'A') parts.push(`AVPU: ${args.vitals.avpu}`);
  if (args.vitals.pain_score !== undefined) parts.push(`Nyeri: ${args.vitals.pain_score}/10`);
  if (args.vitals.supplemental_o2) parts.push('O2 Suplemen: Ya');
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

/**
 * buildCanonicalRequestId
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildCanonicalRequestId(patientRM: string): string {
  return `assist-${patientRM || 'unknown'}-${Date.now()}`;
}

/**
 * buildCanonicalTriageInput
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildCanonicalTriageInput(
  args: BuildCanonicalTriageInputArgs
): CanonicalTriageInput {
  const chronicDiseases = clampHistoryText(args.chronicHistorySummary);
  const pregnancyStatus = mapPregnancyStatus(args.patientGender, args.pregnancyStatus);

  return {
    request_id: args.requestId,
    request_time: args.requestTime,
    source: {
      app: APP_SLUG,
      engine_mode: 'canonical',
    },
    patient: {
      patient_id: args.patientRM || args.patientName || 'unknown-patient',
      rm: args.patientRM,
      name: args.patientName,
      gender: args.patientGender,
      age: args.patientAge,
      dob: args.patientDOB,
      payer_label: args.patientPayerLabel,
      bpjs_status: args.patientBPJSStatus,
      kelurahan: args.patientKelurahan,
      facility_name: args.patientFacilityName,
    },
    vitals: {
      sbp: args.vitals.sbp,
      dbp: args.vitals.dbp,
      hr: args.vitals.hr,
      rr: args.vitals.rr,
      temp: args.vitals.temp,
      spo2: args.vitals.spo2,
      ...(args.vitals.glucose > 0
        ? {
            glucose: {
              value: args.vitals.glucose,
              type: 'GDS' as const,
            },
          }
        : {}),
      ...(args.vitals.avpu !== undefined ? { avpu: args.vitals.avpu } : {}),
      ...(args.vitals.supplemental_o2 !== undefined
        ? { supplemental_o2: args.vitals.supplemental_o2 }
        : {}),
      ...(args.vitals.pain_score !== undefined ? { pain_score: args.vitals.pain_score } : {}),
      has_copd: args.hasCopd ?? false,
    },
    narrative: {
      symptom_text_raw: args.symptomTextRaw || args.keluhanTambahan || args.keluhanUtama,
      keluhan_utama: args.keluhanUtama,
      keluhan_tambahan: args.keluhanTambahan,
      autosen_preset: args.autosenPreset,
    },
    ...(() => {
      const text = args.structuredSignsText ?? composeStructuredSignsText(args);
      return text ? { bedside_signs: { structured_signs_text: text } } : {};
    })(),
    context: {
      chronic_diseases: chronicDiseases,
      allergies: args.allergies || [],
      pregnancy_status: pregnancyStatus,
      pregnancy_risk: args.extractedPregnancyRisk,
      special_conditions: args.extractedSpecialConditions || [],
      disability_type: args.disabilityType || undefined,
      obesity_confirmation:
        args.obesityConfirmation === 'confirmed' || args.obesityConfirmation === 'morbid_obesity'
          ? 'confirmed'
          : args.obesityConfirmation === 'not_confirmed'
            ? 'not_confirmed'
            : undefined,
    },
    history: {
      visits_used: args.prefetchedVisits?.length || 0,
      prefetched_visits: (args.prefetchedVisits || []).map((visit) => ({
        encounter_id: visit.encounter_id,
        timestamp: visit.timestamp,
        keluhan_utama: visit.keluhan_utama,
        source: 'scrape' as const,
        vitals: {
          sbp: visit.vitals.sbp,
          dbp: visit.vitals.dbp,
          hr: visit.vitals.hr,
          rr: visit.vitals.rr,
          temp: visit.vitals.temp,
          glucose: visit.vitals.glucose,
          spo2: 0,
        },
        diagnosa: visit.diagnosa,
      })),
    },
  };
}
