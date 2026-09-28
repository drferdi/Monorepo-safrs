import { useEffect, useMemo, useState } from 'react';

import { findRecurrentDiagnoses, type RecurrentDiagnosisCandidate } from '@/lib/clinical/recurrent-diagnosis';
import { getPatientVisits, type VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const EMPTY: RecurrentDiagnosisCandidate[] = [];
const VISITS_TO_READ = 12;

export interface RecurrentDiagnosesState {
  candidates: RecurrentDiagnosisCandidate[];
  /** True once the store has answered (or failed) for this RM; true for an empty RM. */
  loaded: boolean;
}

/** Recurrent diagnoses for the patient, read once per RM from the IndexedDB visit store. */
export function useRecurrentDiagnoses(
  patientRM: string,
  deps: { load?: (rm: string) => Promise<VisitRecord[]>; today?: () => Date } = {}
): RecurrentDiagnosesState {
  // Tagged with the RM it was read for, so a patient switch never shows the previous list
  // and reads as not loaded until the next RM's answer arrives.
  const [read, setRead] = useState<{ rm: string; candidates: RecurrentDiagnosisCandidate[] }>({
    rm: '',
    candidates: EMPTY,
  });
  const load = deps.load ?? ((rm: string) => getPatientVisits(rm, VISITS_TO_READ));
  const today = deps.today ?? (() => new Date());

  // Without IndexedDB (and no injected loader) the store can never answer: nothing to wait for.
  const storeMissing = !deps.load && typeof indexedDB === 'undefined';

  useEffect(() => {
    const rm = patientRM.trim();
    if (!rm || storeMissing) return;
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
        // A failing store still answers: no history, and the page may stop waiting.
        if (active) setRead({ rm, candidates: EMPTY });
      });
    return () => {
      active = false;
    };
    // deps.load / deps.today are test seams; the RM is the only runtime input.
  }, [patientRM]);

  const rm = patientRM.trim();
  const loaded = !rm || storeMissing || read.rm === rm;
  const candidates = read.rm === rm ? read.candidates : EMPTY;
  return useMemo(() => ({ candidates, loaded }), [candidates, loaded]);
}
