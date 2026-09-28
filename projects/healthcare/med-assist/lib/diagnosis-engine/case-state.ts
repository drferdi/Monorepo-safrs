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
  // Next best step results the doctor ticked, each where the engine contract expects it.
  const bedside = context.bedside_findings ?? [];
  const answers = (kind: 'question' | 'exam' | 'test') => bedside.filter((entry) => entry.kind === kind);
  const qa = answers('question').map((entry) => ({ question: entry.item, answer: entry.findings.join(', ') }));

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
    anamnesis: { ...(additional ? { freeText: additional } : {}), ...(qa.length > 0 ? { qa } : {}) },
    vitals: {
      systolic: vitals.systolic,
      diastolic: vitals.diastolic,
      heartRate: vitals.heart_rate,
      respiratoryRate: vitals.respiratory_rate,
      temperature: vitals.temperature,
      spo2: vitals.spo2,
      gcs: vitals.gcs,
    },
    physicalExam: answers('exam').map((entry) => `${entry.item}: ${entry.findings.join(', ')}`),
    results: answers('test').map((entry) => ({
      name: entry.item,
      value: entry.findings.join(', '),
      flag: entry.findings.every((finding) => finding === 'Normal') ? ('normal' as const) : ('abnormal' as const),
    })),
    currentMedications: [],
    knownConditions: mergeKnownConditions(
      encounter.diagnosa?.penyakit_kronis ?? [],
      context.recurrent_diagnoses ?? []
    ),
    allergies: [...(encounter.anamnesa?.alergi?.obat ?? [])],
    facilityCapabilities: [],
  };
}

function mergeKnownConditions(
  chronic: string[],
  recurrent: Array<{ icd: string; name: string }>
): string[] {
  const merged = [...chronic];
  const seen = new Set(merged.map((item) => item.trim().toLowerCase()));
  for (const item of recurrent) {
    const label = `${item.name} (${item.icd})`;
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    merged.push(label);
  }
  return merged;
}
