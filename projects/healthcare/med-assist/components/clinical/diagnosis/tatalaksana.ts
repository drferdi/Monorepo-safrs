import { diseaseNoteFor, type DiseaseNote } from './useDiseaseNotes';

import { parseTherapyHistoryText } from '@/lib/clinical/chronic-therapy-history';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { classifyRole, type TriadRole } from '@/lib/rme/payload-mapper';
import type { DrugInteraction } from '@/types/api';

/** One earlier visit that prescribed a chronic medication. */
export interface ChronicVisitView {
  date: string;
  dose: string;
  diagnosis: string;
}

export interface ChronicMedicationView {
  key: string;
  name: string;
  /** From the latest visit that prescribed it; empty when no visit text could be read. */
  doseLine: string;
  /** The diagnosis most often recorded in the visits that prescribed it; empty when none. */
  indication: string;
  visits: ChronicVisitView[];
}

export interface InteractionCheckView {
  state: 'checking' | 'done' | 'unavailable';
  interactions: DrugInteraction[];
}

export interface FollowUpView {
  /** Follow-up for the diagnoses chosen at this visit. */
  visit: string[];
  /** Routine follow-up for the patient's chronic conditions. */
  routine: Array<{ name: string; text: string }>;
}

/** Same drug when the first word matches ("Amlodipin 10 mg" and "Amlodipin 5mg"). */
export const drugKey = (name: string): string => name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

/**
 * The chronic medications named by the visit history, each with its latest dose and the diagnosis
 * the visits that prescribed it recorded most often. `visits` is newest first, as the store
 * returns it. Nothing is inferred beyond those visits.
 */
export function buildChronicMedications(names: string[], visits: VisitRecord[]): ChronicMedicationView[] {
  return names.map((name) => {
    const key = drugKey(name);
    const seen = visits.flatMap((visit) => {
      const medication = parseTherapyHistoryText(visit.terapi_obat).medications.find(
        (entry) => drugKey(entry.displayName) === key
      );
      return medication
        ? [{ date: visit.timestamp, dose: `${medication.doseLabel} · ${medication.aturanPakai}`, diagnosis: visit.diagnosa?.nama?.trim() ?? '' }]
        : [];
    });
    const counts = new Map<string, number>();
    for (const entry of seen) {
      if (entry.diagnosis) counts.set(entry.diagnosis, (counts.get(entry.diagnosis) ?? 0) + 1);
    }
    const indication = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return { key, name, doseLine: seen[0]?.dose ?? '', indication, visits: seen };
  });
}

export const ROLE_ORDER: TriadRole[] = ['utama', 'adjuvant', 'vitamin'];

/** The engine's role when it sent one, else the RME mapper's own keyword rule. */
export const roleOf = (name: string, role?: TriadRole): TriadRole => role ?? classifyRole(name);

/** The interactions one medication takes part in. */
export function interactionsFor(name: string, interactions: DrugInteraction[]): DrugInteraction[] {
  return interactions.filter((interaction) => interaction.drug_a === name || interaction.drug_b === name);
}

/** Allergies (other than "tidak ada") the medication's name contains. */
export function allergyMatches(name: string, allergies: string[]): string[] {
  const lowered = name.toLowerCase();
  return allergies
    .map((allergy) => allergy.trim())
    .filter((allergy) => allergy.length >= 4 && allergy.toLowerCase() !== 'tidak ada' && lowered.includes(allergy.toLowerCase()));
}

export interface SafetyReview {
  duplicates: string[];
  interactions: DrugInteraction[];
  contraindications: Array<{ drug: string; reason: string }>;
}

/**
 * The checks the Tatalaksana page states, over the chronic medications and the visit medications
 * chosen: the same drug twice, a major or contraindicated interaction between two of them, and a
 * contraindication detected for this patient (a named allergy, or one the prescription service
 * listed).
 */
export function reviewSafety(input: {
  chronic: string[];
  visit: Array<{ name: string; contraindications: string[] }>;
  interactions: DrugInteraction[];
  allergies: string[];
}): SafetyReview {
  const names = [...input.chronic, ...input.visit.map((medication) => medication.name)];
  const byKey = new Map<string, string[]>();
  for (const name of names) byKey.set(drugKey(name), [...(byKey.get(drugKey(name)) ?? []), name]);
  const inPlan = new Set(names);
  return {
    duplicates: [...byKey.values()].filter((group) => group.length > 1).map((group) => group.join(' + ')),
    interactions: input.interactions.filter(
      (interaction) =>
        (interaction.severity === 'major' || interaction.severity === 'contraindicated') &&
        inPlan.has(interaction.drug_a) &&
        inPlan.has(interaction.drug_b)
    ),
    contraindications: [
      ...names.flatMap((drug) => allergyMatches(drug, input.allergies).map((allergy) => ({ drug, reason: `Alergi ${allergy}` }))),
      ...input.visit.flatMap((medication) => medication.contraindications.map((reason) => ({ drug: medication.name, reason }))),
    ],
  };
}

/**
 * Follow-up from the knowledge base (`tindak_lanjut.kontrol`): for the chosen diagnoses, and as
 * routine control for each chronic condition not already chosen. Verbatim; nothing is composed.
 */
export function buildFollowUp(
  chosen: string[],
  chronic: Array<{ code: string; name: string }>,
  notes: Map<string, DiseaseNote>
): FollowUpView {
  const root = (code: string) => code.trim().toUpperCase().slice(0, 3);
  const chosenRoots = new Set(chosen.map(root));
  const visit = Array.from(new Set(chosen.flatMap((code) => diseaseNoteFor(notes, code)?.followUp ?? [])));
  const routine = chronic
    .filter((condition) => !chosenRoots.has(root(condition.code)))
    .flatMap((condition) => {
      const text = diseaseNoteFor(notes, condition.code)?.followUp;
      return text && !visit.includes(text) ? [{ name: condition.name, text }] : [];
    });
  return { visit, routine };
}

/** The chosen diagnoses' red flags from the knowledge base, verbatim, each once. */
export function buildSafetyNet(chosen: string[], notes: Map<string, DiseaseNote>): string[] {
  return Array.from(new Set(chosen.flatMap((code) => diseaseNoteFor(notes, code)?.redFlags ?? [])));
}
