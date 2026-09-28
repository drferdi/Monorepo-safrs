import { useEffect, useState } from 'react';

import { findRecurrentDiagnoses, type RecurrentDiagnosisCandidate } from '@/lib/clinical/recurrent-diagnosis';
import { getPatientVisits, type VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const EMPTY: RecurrentDiagnosisCandidate[] = [];
const VISITS_TO_READ = 12;

/** Recurrent diagnoses for the patient, read once per RM from the IndexedDB visit store. */
export function useRecurrentDiagnoses(
  patientRM: string,
  deps: { load?: (rm: string) => Promise<VisitRecord[]>; today?: () => Date } = {}
): RecurrentDiagnosisCandidate[] {
  // Tagged with the RM it was read for, so a patient switch never shows the previous list.
  const [read, setRead] = useState<{ rm: string; candidates: RecurrentDiagnosisCandidate[] }>({
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
        setRead({ rm, candidates: next.length > 0 ? next : EMPTY });
      })
      .catch(() => {
        // Another RM's list already reads as empty here; only an earlier list for this RM
        // needs clearing (same-state bail-out keeps a failing store from re-rendering).
        if (active) setRead((prev) => (prev.rm === rm ? { rm, candidates: EMPTY } : prev));
      });
    return () => {
      active = false;
    };
    // deps.load / deps.today are test seams; the RM is the only runtime input.
  }, [patientRM]);

  return read.rm === patientRM.trim() ? read.candidates : EMPTY;
}
