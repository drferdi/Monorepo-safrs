import { useEffect, useState } from 'react';

import { getPatientVisits, type VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const EMPTY: VisitRecord[] = [];
const VISITS_TO_READ = 12;

/**
 * The patient's stored visits (newest first), read once per RM, for the chronic medications on
 * the Tatalaksana page. A store that fails or is missing answers with no visits.
 */
export function usePatientVisits(
  patientRM: string,
  load: (rm: string) => Promise<VisitRecord[]> = (rm) => getPatientVisits(rm, VISITS_TO_READ)
): VisitRecord[] {
  const [read, setRead] = useState<{ rm: string; visits: VisitRecord[] }>({ rm: '', visits: EMPTY });

  useEffect(() => {
    const rm = patientRM.trim();
    if (!rm) return;
    let active = true;
    Promise.resolve()
      .then(() => load(rm))
      .then((visits) => {
        if (active) setRead({ rm, visits });
      })
      .catch(() => {
        if (active) setRead({ rm, visits: EMPTY });
      });
    return () => {
      active = false;
    };
    // `load` is a test seam; the RM is the only runtime input.
  }, [patientRM]);

  return read.rm === patientRM.trim() ? read.visits : EMPTY;
}
