import { useEffect, useMemo, useState } from 'react';

import { ClinicalTrajectory } from '@/components/clinical/ClinicalTrajectory';
import { useRecurrentDiagnoses } from '@/components/clinical/diagnosis/useRecurrentDiagnoses';
import type { ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import type { ComposedAnamnesaDraft } from '@/lib/clinical/anamnesa-composer';
import type {
  AutosenPreset,
  DisabilityType,
  ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import { buildDiagnosisRequestContext } from '@/lib/diagnosis-engine/request-context';
import {
  saveScrapedVisits,
  type VisitRecord,
} from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { sendMessage } from '@/utils/messaging';

export interface ClinicalReasoningWorkbenchVitals {
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
  /** Observed ACVPU and oxygen from the TTV form; absent on surfaces that do not record them. */
  avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
  supplemental_o2?: boolean;
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

const NO_VISITS: VisitRecord[] = [];

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
  const { sbp, dbp, hr, rr, temp, spo2, glucose, avpu, supplemental_o2 } = vitals;
  const trajectoryVitals = useMemo(
    () => ({
      sbp: toInt(sbp),
      dbp: toInt(dbp),
      hr: toInt(hr),
      rr: toInt(rr),
      temp: toFloat(temp),
      spo2: toInt(spo2),
      glucose: toInt(glucose),
      avpu,
      supplementalO2: supplemental_o2,
    }),
    [sbp, dbp, hr, rr, temp, spo2, glucose, avpu, supplemental_o2]
  );
  // The scanned rows go into the visit store the recurrent-diagnosis read (here and on the
  // diagnosis page) uses. Written once per patient and scan result, not on every render.
  const scannedVisits =
    prefetchedVisitHistory?.status === 'ready' ? prefetchedVisitHistory.visits : NO_VISITS;
  const [persistedFor, setPersistedFor] = useState<{ rm: string; visits: VisitRecord[] } | null>(
    null
  );
  useEffect(() => {
    const rm = patient.rm;
    if (scannedVisits.length === 0) {
      setPersistedFor({ rm, visits: scannedVisits });
      return;
    }
    let active = true;
    saveScrapedVisits(scannedVisits)
      // A failed write leaves the store as it was; the read below still answers.
      .catch(() => 0)
      .then(() => {
        if (active) setPersistedFor({ rm, visits: scannedVisits });
      });
    return () => {
      active = false;
    };
  }, [patient.rm, scannedVisits]);
  const persisted = persistedFor?.rm === patient.rm && persistedFor.visits === scannedVisits;

  // Read only after the write lands (an empty RM reads nothing and counts as loaded), so the
  // prefetch carries the same history as the diagnosis page's request. The hook keeps one array
  // identity per RM, so this memo (and the request below) changes only when the history does.
  const { candidates: recurrentCandidates, loaded: recurrentLoaded, previousBloodPressure } = useRecurrentDiagnoses(
    persisted ? patient.rm : ''
  );
  const recurrent = useMemo(
    () => recurrentCandidates.map((candidate) => ({ icd: candidate.icd, name: candidate.name })),
    [recurrentCandidates]
  );

  // Start the MIRA step while the doctor is still here, so the diagnosis page has it ready.
  const requestContext = useMemo(
    () =>
      buildDiagnosisRequestContext({
        keluhanUtama,
        keluhanTambahan,
        patientAge: patient.age,
        patientGender: patient.gender,
        vitals: {
          sbp: trajectoryVitals.sbp,
          dbp: trajectoryVitals.dbp,
          hr: trajectoryVitals.hr,
          rr: trajectoryVitals.rr,
          temp: trajectoryVitals.temp,
        },
        recurrent,
        previousBloodPressure,
      }),
    [keluhanUtama, keluhanTambahan, patient.age, patient.gender, trajectoryVitals, recurrent, previousBloodPressure]
  );
  useEffect(() => {
    if (!requestContext.keluhan_utama || requestContext.keluhan_utama === '-' || !patient.rm) return;
    // Only prefetch once the history is written and read, so the prefetch has the page's case key.
    if (!persisted || !recurrentLoaded) return;
    const timer = setTimeout(() => {
      sendMessage('prefetchDiagnosis', requestContext).catch(() => undefined);
    }, 2000);
    return () => clearTimeout(timer);
  }, [requestContext, patient.rm, persisted, recurrentLoaded]);

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
