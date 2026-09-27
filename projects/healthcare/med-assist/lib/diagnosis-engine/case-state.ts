/**
 * Builds the engine-neutral `CaseState` from what the background has when the side panel asks
 * for diagnoses: the stored encounter and the panel's request.
 *
 * Only clinical content is copied. Encounter ids, patient ids, clinician names and timestamps
 * are left out. Free text is copied as typed; outbound engines must still screen it
 * (`lib/api/pii-guard.ts`) before it leaves the browser.
 *
 * @module lib/diagnosis-engine/case-state
 */

import type { CaseState } from './types';

import type { DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';

export function encounterToCaseState(
  encounter: Encounter,
  context: DiagnosisRequestContext
): CaseState {
  const vitals = context.vital_signs ?? {};
  const additional = context.keluhan_tambahan || encounter.anamnesa?.keluhan_tambahan || '';

  return {
    demographics: {
      ageYears:
        Number.isFinite(context.patient_age) && context.patient_age > 0
          ? context.patient_age
          : null,
      sex: context.patient_gender ?? 'unknown',
      ...(encounter.anamnesa?.is_pregnant !== undefined
        ? { pregnant: encounter.anamnesa.is_pregnant }
        : {}),
    },
    chiefComplaint: context.keluhan_utama || encounter.anamnesa?.keluhan_utama || '',
    anamnesis: additional ? { freeText: additional } : {},
    vitals: {
      systolic: vitals.systolic,
      diastolic: vitals.diastolic,
      heartRate: vitals.heart_rate,
      respiratoryRate: vitals.respiratory_rate,
      temperature: vitals.temperature,
      spo2: vitals.spo2,
      gcs: vitals.gcs,
    },
    physicalExam: [],
    results: [],
    currentMedications: [],
    knownConditions: [...(encounter.diagnosa?.penyakit_kronis ?? [])],
    allergies: [...(encounter.anamnesa?.alergi?.obat ?? [])],
    facilityCapabilities: [],
  };
}
