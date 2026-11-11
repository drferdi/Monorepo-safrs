/**
 * Reads a case in the format of `mira-system/assist/cases/*.json` and converts it to the
 * engine-neutral `CaseState`, so the legacy engine and MIRA are scored on identical input.
 *
 * Conversions:
 * - temperature: MIRA cases use Fahrenheit (MIMIC convention); `CaseState` uses Celsius;
 * - labs, radiology and microbiology become `results` entries;
 * - an admission medication text that starts with "no"/"none" means no current medication.
 *
 * The case's own history of present illness stays free text; nothing is extracted from it.
 *
 * @module lib/diagnosis-engine/benchmark/mira-case
 */

import type { CaseState } from '../types';

interface MiraLab {
  label: string;
  value?: number | string;
  value_text?: string;
  unit?: string;
  flag?: string | null;
}

interface MiraReport {
  modality?: string;
  region?: string;
  report?: string;
  test?: string;
  result?: string;
}

export interface MiraCase {
  case_id: string;
  expected_diagnosis?: string;
  demographics: { sex: string; age: number };
  chief_complaint: string;
  hpi?: string;
  admission_medication?: string;
  physical_exam?: string;
  triage_vitals?: {
    temperature?: number;
    heartrate?: number;
    resprate?: number;
    o2sat?: number;
    sbp?: number;
    dbp?: number;
  };
  labs_blood?: MiraLab[];
  labs_urine?: MiraLab[];
  radiology?: MiraReport[];
  microbiology?: MiraReport[];
}

export function isMiraCase(value: unknown): value is MiraCase {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const demographics = record.demographics as Record<string, unknown> | undefined;
  return (
    typeof record.case_id === 'string' &&
    typeof record.chief_complaint === 'string' &&
    typeof demographics?.age === 'number' &&
    typeof demographics?.sex === 'string'
  );
}

function fahrenheitToCelsius(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Math.round((((value - 32) * 5) / 9) * 10) / 10;
}

function labToResult(lab: MiraLab): CaseState['results'][number] {
  const unit = lab.unit?.trim();
  return {
    name: lab.label,
    value: lab.value ?? lab.value_text ?? '',
    ...(unit ? { unit } : {}),
    ...(lab.flag === 'abnormal' ? { flag: 'abnormal' as const } : {}),
  };
}

function reportToResult(report: MiraReport): CaseState['results'][number] {
  const name = [report.modality, report.region, report.test].filter(Boolean).join(' ');
  return { name: name || 'report', value: report.report ?? report.result ?? '' };
}

export function miraCaseToCaseState(miraCase: MiraCase): CaseState {
  const vitals = miraCase.triage_vitals ?? {};
  const sex = miraCase.demographics.sex.toUpperCase();
  const medication = miraCase.admission_medication?.trim() ?? '';

  return {
    demographics: {
      ageYears: miraCase.demographics.age,
      sex: sex === 'M' || sex === 'F' ? sex : 'unknown',
    },
    chiefComplaint: miraCase.chief_complaint,
    anamnesis: miraCase.hpi ? { freeText: miraCase.hpi } : {},
    vitals: {
      systolic: vitals.sbp,
      diastolic: vitals.dbp,
      heartRate: vitals.heartrate,
      respiratoryRate: vitals.resprate,
      temperature: fahrenheitToCelsius(vitals.temperature),
      spo2: vitals.o2sat,
    },
    physicalExam: (miraCase.physical_exam ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    results: [
      ...(miraCase.labs_blood ?? []).map(labToResult),
      ...(miraCase.labs_urine ?? []).map(labToResult),
      ...(miraCase.radiology ?? []).map(reportToResult),
      ...(miraCase.microbiology ?? []).map(reportToResult),
    ],
    currentMedications: !medication || /^(no|none)\b/i.test(medication) ? [] : [medication],
    knownConditions: [],
    allergies: [],
    facilityCapabilities: [],
  };
}
