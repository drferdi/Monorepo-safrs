/**
 * Recurrent diagnoses from the patient's visit record: the same ICD recorded at least twice
 * in the last twelve months. Chronic codes (list below, Chief may edit it) are labelled
 * "Kronis", everything else "Berulang". Pure: no I/O, no engine calls, no selection.
 *
 * @module lib/clinical/recurrent-diagnosis
 */
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

export type RecurrentLabel = 'Kronis' | 'Berulang';

export interface RecurrentDiagnosisCandidate {
  icd: string;
  name: string;
  count: number;
  visitsConsidered: number;
  lastSeen: string;
  label: RecurrentLabel;
}

/** Three-character ICD-10 roots Chief treats as chronic conditions. */
export const CHRONIC_ICD_ROOTS: readonly string[] = [
  'I10', 'I11', 'I12', 'I13', 'I15', // hipertensi
  'E10', 'E11', 'E12', 'E13', 'E14', // diabetes
  'E78', // dislipidemia
  'I25', // PJK
  'I50', // gagal jantung
  'J44', // PPOK
  'J45', // asma
  'N18', // PGK
  'G40', // epilepsi
  'F20', // skizofrenia
  'E03', 'E05', // tiroid
  'M06', // artritis reumatoid
];

export function normalizeRecurrentIcd(value: string | undefined): string {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

function icdRoot(icd: string): string {
  return icd.slice(0, 3);
}

function labelFor(icd: string): RecurrentLabel {
  return CHRONIC_ICD_ROOTS.includes(icdRoot(icd)) ? 'Kronis' : 'Berulang';
}

export function findRecurrentDiagnoses(
  visits: VisitRecord[],
  today: Date,
  options: { minCount?: number; windowMonths?: number; currentEncounterId?: string } = {}
): RecurrentDiagnosisCandidate[] {
  const minCount = options.minCount ?? 2;
  const windowStart = new Date(today);
  windowStart.setMonth(windowStart.getMonth() - (options.windowMonths ?? 12));

  const inWindow = visits
    .filter((visit) => visit.encounter_id !== options.currentEncounterId)
    .filter((visit) => {
      const at = new Date(visit.timestamp).getTime();
      return Number.isFinite(at) && at >= windowStart.getTime() && at <= today.getTime();
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const seenEncounters = new Set<string>();
  const deduped = inWindow.filter((visit) => {
    if (seenEncounters.has(visit.encounter_id)) return false;
    seenEncounters.add(visit.encounter_id);
    return true;
  });

  const groups = new Map<string, { icd: string; name: string; count: number; lastSeen: string }>();
  for (const visit of deduped) {
    const icd = normalizeRecurrentIcd(visit.diagnosa?.icd_x);
    if (!icd) continue;
    const root = icdRoot(icd);
    const existing = groups.get(root);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(root, { icd, name: (visit.diagnosa?.nama ?? '').trim() || icd, count: 1, lastSeen: visit.timestamp });
    }
  }

  const rank = (label: RecurrentLabel) => (label === 'Kronis' ? 0 : 1);
  return [...groups.values()]
    .filter((group) => group.count >= minCount)
    .map((group) => ({ icd: group.icd, name: group.name, count: group.count, visitsConsidered: deduped.length, lastSeen: group.lastSeen, label: labelFor(group.icd) }))
    .sort((a, b) => rank(a.label) - rank(b.label) || b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));
}
