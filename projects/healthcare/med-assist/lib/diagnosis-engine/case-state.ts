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

import type {
  BedsideFindingRecord,
  DiagnosisRequestContext,
  LegacyBedsideFindingRecord,
} from '@/types/api';
import type { Encounter } from '~/utils/types';

export function encounterToCaseState(
  encounter: Encounter,
  context: DiagnosisRequestContext
): CaseState {
  const vitals = context.vital_signs ?? {};
  const additional = context.keluhan_tambahan || encounter.anamnesa?.keluhan_tambahan || '';
  // Next best step results the doctor recorded, each where the engine contract expects it.
  // Only findings marked present or absent are sent; "belum diperiksa" is left out, so it can
  // never read as negative evidence.
  const bedside = (context.bedside_findings ?? []).map(normalizeBedsideFinding);
  const answers = (kind: 'question' | 'exam' | 'test') =>
    bedside
      .filter((entry) => entry.kind === kind)
      .map((entry) => ({
        item: entry.item,
        recorded: entry.findings.filter((f): f is { name: string; state: 'present' | 'absent' } => f.state !== 'unknown'),
      }))
      .filter((entry) => entry.recorded.length > 0);
  const qa = answers('question').flatMap(({ item, recorded }) =>
    recorded.map((f) => ({
      question: item,
      // A yes/no step records the question itself; a legacy record holds the ticked answer.
      answer: f.name === item ? (f.state === 'present' ? 'Ya' : 'Tidak') : f.name,
    }))
  );

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
    physicalExam: answers('exam').flatMap(({ item, recorded }) =>
      recorded.map((f) => (f.name === item ? `${item} — ${MARK[f.state]}` : `${item}: ${f.name} — ${MARK[f.state]}`))
    ),
    results: answers('test').map(({ item, recorded }) => ({
      name: item,
      value: recorded.map((f) => `${f.name} — ${MARK[f.state]}`).join('; '),
      // "Normal" ticked in a legacy record is a normal result, not an abnormal finding.
      flag: recorded.every((f) => f.state === 'absent' || f.name === 'Normal')
        ? ('normal' as const)
        : ('abnormal' as const),
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

/**
 * The words MIRA reads for a recorded finding (`assist/service/prompts.py` states what they
 * mean): present, or examined and absent. There is no word for "belum diperiksa" because such a
 * finding is not sent.
 */
export const MARK = { present: 'DITEMUKAN', absent: 'TIDAK DITEMUKAN' } as const;

/**
 * A recorded finding in the three-state form. An earlier checkbox record holds only the ticked
 * names: each becomes present, and nothing is assumed about the names it does not hold (they
 * stay "belum diperiksa", never absent).
 */
export function normalizeBedsideFinding(
  record: BedsideFindingRecord | LegacyBedsideFindingRecord
): BedsideFindingRecord {
  return {
    kind: record.kind,
    item: record.item,
    findings: record.findings.map((finding) =>
      typeof finding === 'string' ? { name: finding, state: 'present' as const } : finding
    ),
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
