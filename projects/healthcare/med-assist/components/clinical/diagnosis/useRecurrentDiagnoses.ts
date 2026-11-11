import { useEffect, useMemo, useState } from 'react';

import { findRecurrentDiagnoses, type RecurrentDiagnosisCandidate } from '@/lib/clinical/recurrent-diagnosis';
import { latestVisitBloodPressure } from '@/lib/diagnosis-engine/request-context';
import { getPatientVisits, type VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const EMPTY: RecurrentDiagnosisCandidate[] = [];
const VISITS_TO_READ = 12;

export interface RecurrentDiagnosesState {
  candidates: RecurrentDiagnosisCandidate[];
  /** True once the store has answered (or failed) for this RM; true for an empty RM. */
  loaded: boolean;
  /** The latest visit's blood pressure, for a request made before today's is measured. */
  previousBloodPressure?: ReturnType<typeof latestVisitBloodPressure>;
}

/** Recurrent diagnoses for the patient, read once per RM from the IndexedDB visit store. */
export function useRecurrentDiagnoses(
  patientRM: string,
  deps: { load?: (rm: string) => Promise<VisitRecord[]>; today?: () => Date } = {}
): RecurrentDiagnosesState {
  // Tagged with the RM it was read for, so a patient switch never shows the previous list
  // and reads as not loaded until the next RM's answer arrives.
  const [read, setRead] = useState<{
    rm: string;
    candidates: RecurrentDiagnosisCandidate[];
    previousBloodPressure?: ReturnType<typeof latestVisitBloodPressure>;
  }>({
    rm: '',
    candidates: EMPTY,
  });
  const load = deps.load ?? ((rm: string) => getPatientVisits(rm, VISITS_TO_READ));
  const today = deps.today ?? (() => new Date());

  useEffect(() => {
    const rm = patientRM.trim();
    if (!rm) return;
    let active = true;
    // Deferred so a loader that throws synchronously still lands in the catch below.
    Promise.resolve()
      .then(() => load(rm))
      .then((visits) => {
        if (!active) return;
        const next = findRecurrentDiagnoses(visits, today());
        const previousBloodPressure = latestVisitBloodPressure(visits, today());
        setRead({ rm, candidates: next.length > 0 ? next : EMPTY, ...(previousBloodPressure ? { previousBloodPressure } : {}) });
      })
      .catch(() => {
        // A failing store still answers: no history, and the page may stop waiting.
        if (active) setRead({ rm, candidates: EMPTY });
      });
    return () => {
      active = false;
    };
    // deps.load / deps.today are test seams; the RM is the only runtime input.
  }, [patientRM]);

  const rm = patientRM.trim();
  const loaded = !rm || read.rm === rm;
  const candidates = read.rm === rm ? read.candidates : EMPTY;
  const previousBloodPressure = read.rm === rm ? read.previousBloodPressure : undefined;
  return useMemo(
    () => ({ candidates, loaded, ...(previousBloodPressure ? { previousBloodPressure } : {}) }),
    [candidates, loaded, previousBloodPressure]
  );
}
