import { useMemo } from 'react';

import { ClinicalTrajectory } from '@/components/clinical/ClinicalTrajectory';
import type { ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import type { ComposedAnamnesaDraft } from '@/lib/clinical/anamnesa-composer';
import type {
  AutosenPreset,
  DisabilityType,
  ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

export interface ClinicalReasoningWorkbenchVitals {
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
}

export interface ClinicalReasoningWorkbenchPatient {
  name: string;
  gender: 'L' | 'P';
  age: number;
  rm: string;
  dob: string;
  bpjsStatus: 'aktif' | 'nonaktif' | 'mandiri' | null;
  kelurahan: string;
}

export interface ClinicalReasoningWorkbenchContext {
  facilityName: string;
  payerLabel: string;
  specialConditions: string[];
  pregnancyRisk: string;
}

export interface ClinicalReasoningWorkbenchVisitHistory {
  visits: VisitRecord[];
  diagnostics: string[];
  status: 'ready' | 'insufficient';
}

export interface ClinicalReasoningWorkbenchProps {
  vitals: ClinicalReasoningWorkbenchVitals;
  symptomText: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
  disabilityType: DisabilityType;
  obesityConfirmation: ObesityConfirmation;
  autosenPreset: AutosenPreset;
  patient: ClinicalReasoningWorkbenchPatient;
  clinicalContext: ClinicalReasoningWorkbenchContext;
  chronicHistorySummary: string;
  anamnesaDraft: ComposedAnamnesaDraft | null;
  emergencyAlerts: ScreeningAlert[];
  prefetchedVisitHistory: ClinicalReasoningWorkbenchVisitHistory | null;
  onOpenDifferential?: () => void;
}

function toInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFloat(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ClinicalReasoningWorkbench({
  vitals,
  symptomText,
  allergies,
  pregnancyStatus,
  disabilityType,
  obesityConfirmation,
  autosenPreset,
  patient,
  clinicalContext,
  chronicHistorySummary,
  anamnesaDraft,
  emergencyAlerts,
  prefetchedVisitHistory,
  onOpenDifferential,
}: ClinicalReasoningWorkbenchProps): JSX.Element {
  const keluhanUtama = anamnesaDraft?.payload.keluhan_utama || symptomText || '-';
  const keluhanTambahan = anamnesaDraft?.payload.keluhan_tambahan || '';
  const durationLabel = anamnesaDraft?.metadata.durationLabel || '';
  // The trajectory reloads whenever this object changes identity, and the side panel
  // re-renders on every storage write, so it must change only when a vital changes.
  const { sbp, dbp, hr, rr, temp, spo2, glucose } = vitals;
  const trajectoryVitals = useMemo(
    () => ({
      sbp: toInt(sbp),
      dbp: toInt(dbp),
      hr: toInt(hr),
      rr: toInt(rr),
      temp: toFloat(temp),
      spo2: toInt(spo2),
      glucose: toInt(glucose),
    }),
    [sbp, dbp, hr, rr, temp, spo2, glucose]
  );

  return (
    <ClinicalTrajectory
      shellMode="embedded"
      vitals={trajectoryVitals}
      keluhanUtama={keluhanUtama}
      keluhanTambahan={keluhanTambahan}
      narrative={{
        keluhan_utama: keluhanUtama,
        lama_sakit: durationLabel,
        is_akut: !durationLabel || !/(bulan|tahun|kronik)/i.test(durationLabel),
        confidence: anamnesaDraft ? 0.9 : 0.5,
      }}
      alerts={emergencyAlerts}
      patientName={patient.name}
      patientGender={patient.gender}
      patientAge={patient.age}
      patientRM={patient.rm}
      patientDOB={patient.dob}
      patientBPJSStatus={patient.bpjsStatus}
      patientKelurahan={patient.kelurahan}
      patientFacilityName={clinicalContext.facilityName}
      patientPayerLabel={clinicalContext.payerLabel}
      allergies={allergies}
      pregnancyStatus={patient.gender === 'L' ? false : pregnancyStatus}
      chronicHistorySummary={chronicHistorySummary}
      extractedPregnancyRisk={clinicalContext.pregnancyRisk}
      extractedSpecialConditions={clinicalContext.specialConditions}
      disabilityType={disabilityType}
      obesityConfirmation={obesityConfirmation}
      autosenPreset={autosenPreset}
      symptomTextRaw={symptomText}
      prefetchedVisits={prefetchedVisitHistory?.visits}
      prefetchedDiagnostics={prefetchedVisitHistory?.diagnostics}
      prefetchedVisitStatus={prefetchedVisitHistory?.status}
      onNextDifferential={onOpenDifferential}
    />
  );
}
