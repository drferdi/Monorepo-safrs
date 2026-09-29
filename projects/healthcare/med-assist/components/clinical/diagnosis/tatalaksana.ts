import { diseaseNoteFor, type DiseaseNote } from './useDiseaseNotes';

import { checkMockDDI } from '@/lib/api/mocks/ddi-mock';
import { parseTherapyHistoryText } from '@/lib/clinical/chronic-therapy-history';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { classifyRole, type TriadRole } from '@/lib/rme/payload-mapper';
import stockDatabase from '@/public/data/stok_obat.json';
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

/**
 * The follow-up interval the doctor picks under Tindak lanjut; it reaches the RME as "Kontrol <interval>"
 * (Chief, 2026-09-29: "Tindak lanjut simplified, cukup kontrol 3 hari atau sejenisnya"). The first is the default.
 */
export const CONTROL_AFTER_OPTIONS = ['3 hari', '1 minggu', '2 minggu', '1 bulan'] as const;

/** A medicine in the Puskesmas stock (public/data/stok_obat.json), as the name field offers it. */
export interface StockMatch {
  name: string;
  stock: number;
  unit: string;
  available: boolean;
}

const STOCK_MEDICINES: StockMatch[] = (
  stockDatabase.stok_obat as Array<{ nama_obat: string; kelompok: string; satuan: string; stok_tersedia: number; status: string }>
)
  .filter((item) => item.kelompok === 'OBAT')
  .map((item) => ({
    name: item.nama_obat.trim(),
    stock: item.stok_tersedia,
    unit: item.satuan,
    available: item.status === 'tersedia' && item.stok_tersedia > 0,
  }));

/**
 * Puskesmas medicines for what is typed in the name field (Chief, 2026-09-29: "ketik Am... keluar
 * lodipin"): every typed word begins a word of the name, from two letters on. Names that begin
 * with the first typed word come first, then those in stock; BMHP, reagents and devices are left out.
 */
export function searchStock(query: string, limit = 6): StockMatch[] {
  const typed = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (typed.join('').length < 2) return [];
  const words = (name: string) => name.toLowerCase().split(/[\s/(),.-]+/);
  const leads = (name: string) => Number(name.toLowerCase().startsWith(typed[0]));
  return STOCK_MEDICINES.filter((medicine) => typed.every((part) => words(medicine.name).some((word) => word.startsWith(part))))
    .sort((a, b) => leads(b.name) - leads(a.name) || Number(b.available) - Number(a.available) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// A thousands dot ("100.000 IU") comes first, so it is not read as a decimal (100).
const STRENGTH = /(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|g|ml|iu|%)(?![a-z])/i;

/** The strength a name carries, compact ("Amlodipin 10 mg" → { value: 10, unit: 'mg' }). */
export function strengthOf(name: string): { value: number; unit: string } | null {
  const match = STRENGTH.exec(name);
  if (!match) return null;
  const digits = /^\d{1,3}(\.\d{3})+$/.test(match[1]) ? match[1].replace(/\./g, '') : match[1].replace(',', '.');
  return { value: Number(digits), unit: match[2].toLowerCase() };
}

/**
 * Chief's dose notation (2026-09-29): frequency x strength per take, "1x10mg". A dose that
 * already names its strength is only compacted ("2x500 mg" → "2x500mg"); "3x1" takes the
 * strength from the name, times the amount per take ("3x2" of 500 mg → "3x1000mg"); anything
 * else stays as written, and so does a percentage (a concentration, not an amount per take).
 */
export function formatDose(name: string, dosis: string): string {
  const written = dosis.trim();
  if (STRENGTH.test(written)) return written.replace(/(\d)\s+(?=(mg|mcg|µg|g|ml|iu|%)(?![a-z]))/gi, '$1');
  const frequency = /^(\d+)\s*[x×]\s*(\d+)?$/i.exec(written);
  const strength = strengthOf(name);
  if (!frequency || !strength || strength.unit === '%') return written;
  const perTake = strength.value * Number(frequency[2] ?? 1);
  return `${frequency[1]}x${Number(perTake.toFixed(3))}${strength.unit}`;
}

/** The name without its strength when the dose line already carries it (one telling per card). */
export function nameBesideDose(name: string, doseLine: string): string {
  const strength = strengthOf(name);
  if (!strength) return name;
  const compactDose = doseLine.toLowerCase().replace(/\s+/g, '');
  if (!compactDose.includes(`${strength.value}${strength.unit}`)) return name;
  return name.replace(STRENGTH, '').replace(/\s+/g, ' ').trim() || name;
}

const NOT_THE_DRUG = /^(blud|tablet|tab|kaplet|kapsul|sirup|syrup|suspensi|drops?|tetes|salep|krim|cream|lotion|bedak|injeksi|inj|infus|serbuk|gel|forte|hcl|hidroklorida|besilat|maleat)$/;

/** One spelling for Indonesian and English names: amoxicillin = amoksisilin, amlodipine = amlodipin. */
const spell = (word: string): string =>
  word.length < 4
    ? word
    : word
        .replace(/x/g, 'ks')
        .replace(/ph/g, 'f')
        .replace(/c(?=[ei])/g, 's')
        .replace(/c/g, 'k')
        .replace(/(.)\1+/g, '$1')
        .replace(/e$/, '');

/**
 * The generic name: the words before the form or strength, spelled one way ("BLUD Amlodipin tablet
 * 5 mg" = "Amlodipine 10mg" = amlodipin; "Asam mefenamat" ≠ "Asam folat"). Audit 2026-09-29: the
 * first word alone made every "Asam …" and "Vitamin …" one drug.
 */
export function drugKey(name: string): string {
  const words = name.toLowerCase().replace(/\(.*?\)/g, ' ').split(/[\s/]+/).filter(Boolean);
  const generic: string[] = [];
  for (const word of words) {
    if (/^\d/.test(word)) break;
    if (NOT_THE_DRUG.test(word)) {
      if (generic.length > 0) break;
      continue;
    }
    generic.push(spell(word));
  }
  return generic.join(' ') || (words[0] ?? '');
}

/** The other entries of the plan that are the same drug; `inPlan` leaves the card's own entry out. */
export function sameDrugIn(name: string, plan: string[], inPlan: boolean): string[] {
  const same = plan.filter((other) => drugKey(other) === drugKey(name));
  if (inPlan) same.splice(same.indexOf(name), 1);
  return same;
}

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
        ? [{ date: visit.timestamp, dose: `${formatDose(name, medication.doseLabel)} · ${medication.aturanPakai}`, diagnosis: visit.diagnosa?.nama?.trim() ?? '' }]
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

export interface InteractionReason {
  /** Why the pair interacts; null when no source here names a mechanism. */
  reason: string | null;
  /** What to do about it. */
  advice: string;
}

/**
 * Why two drugs interact (Chief, 2026-09-29: "DDI : beri penjelasan kenapa"). DDInter gives the
 * severity only, with one generic sentence per severity, so the mechanism comes from the curated
 * pair table in `lib/api/mocks/ddi-mock.ts` (Lexicomp / Micromedex based) when it lists the pair;
 * otherwise nothing is composed and DDInter's own advice stands. The severity is DDInter's.
 */
export function explainInteraction(interaction: DrugInteraction): InteractionReason {
  const known = checkMockDDI([interaction.drug_a, interaction.drug_b])[0];
  if (known) return { reason: known.description, advice: known.recommendation ?? interaction.recommendation ?? '' };
  return { reason: null, advice: interaction.recommendation ?? '' };
}

/** The interactions one medication takes part in. */
export function interactionsFor(name: string, interactions: DrugInteraction[]): DrugInteraction[] {
  return interactions.filter((interaction) => interaction.drug_a === name || interaction.drug_b === name);
}

/** Words spelled one way, so "Amoxicillin" is found in "Amoksisilin kapsul". */
const spelled = (text: string): string => text.toLowerCase().split(/\s+/).filter(Boolean).map(spell).join(' ');

/** Allergies (other than "tidak ada") the medication's name contains, whichever way either is spelled. */
export function allergyMatches(name: string, allergies: string[]): string[] {
  const written = spelled(name);
  return allergies
    .map((allergy) => allergy.trim())
    .filter((allergy) => allergy.length >= 4 && allergy.toLowerCase() !== 'tidak ada' && written.includes(spelled(allergy)));
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

/** The chosen diagnoses' red flags from the knowledge base, verbatim, each once. */
export function buildSafetyNet(chosen: string[], notes: Map<string, DiseaseNote>): string[] {
  return Array.from(new Set(chosen.flatMap((code) => diseaseNoteFor(notes, code)?.redFlags ?? [])));
}
