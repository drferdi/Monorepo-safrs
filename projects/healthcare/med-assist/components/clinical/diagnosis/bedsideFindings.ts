/**
 * What a doctor can tick after a next best step instead of typing (Chief, 2026-09-28: "dokter
 * cukup centang apa temuannya, system provide misal Ronki, Wheezing"). This is input
 * vocabulary for the checklist, not diagnostic logic: the ticked findings go back to the engine
 * as they are, and the engine interprets them. Clinical wording is for Chief's review.
 *
 * Algorithm for one step ({kind, item} as MIRA sends it, in Indonesian or English):
 * 1. a named clinical sign (Rovsing, Murphy, ...) is answered Positif or Negatif;
 * 2. an exam or test that matches the catalogue offers its typical findings, with "Normal"
 *    first, which clears the others when ticked;
 * 3. anything else falls back by kind: exam or test "Normal" or "Abnormal", question "Ya" or
 *    "Tidak".
 */

import type { BedsideFindingRecord } from '@/types/api';

export type BedsideKind = BedsideFindingRecord['kind'];

export interface FindingChoice {
  options: string[];
  /** The option that means "nothing found"; ticking it clears the others. */
  normal: string | null;
  /** Exactly one option may be ticked. */
  single: boolean;
}

const NORMAL = 'Normal';

const SIGNS =
  /\b(rovsing|mcburney|mc burney|psoas|obturator|murphy|blumberg|kernig|brudzinski|homan|lasegue|tinel|phalen)\b|\w+ sign\b/i;

const EXAMS: Array<{ match: RegExp; findings: string[] }> = [
  {
    match: /auskultasi paru|lung|chest auscultation|breath sound|suara (nafas|napas)|pulmo/i,
    findings: ['Ronki basah halus', 'Ronki basah kasar', 'Wheezing', 'Suara napas menurun', 'Stridor'],
  },
  {
    match: /auskultasi jantung|heart sound|cardiac auscultation|bunyi jantung|murmur/i,
    findings: ['Murmur', 'Gallop', 'Bunyi jantung menjauh', 'Irama tidak teratur'],
  },
  {
    match: /bising usus|bowel sound/i,
    findings: ['Bising usus meningkat', 'Bising usus menurun', 'Bising usus tidak terdengar'],
  },
  // Before the abdomen entry: "flank tenderness" would otherwise match "tenderness".
  {
    match: /costovertebral|\bcva\b|ketok ginjal|flank/i,
    findings: ['Nyeri ketok CVA kanan', 'Nyeri ketok CVA kiri'],
  },
  {
    match: /abdom|perut|palpasi|nyeri tekan|tenderness|rebound|guarding/i,
    findings: ['Nyeri tekan lokal', 'Nyeri tekan difus', 'Defans muskular', 'Nyeri lepas', 'Distensi', 'Massa teraba'],
  },
  {
    match: /faring|tonsil|throat|pharyn|tenggorok/i,
    findings: ['Faring hiperemis', 'Eksudat tonsil', 'Tonsil membesar', 'Limfadenopati servikal'],
  },
  {
    match: /kaku kuduk|meningeal|meningism|neck stiffness/i,
    findings: ['Kaku kuduk', 'Kernig positif', 'Brudzinski positif'],
  },
  {
    match: /hidrasi|dehidrasi|hydration|turgor/i,
    findings: ['Turgor kulit menurun', 'Mukosa kering', 'Mata cekung', 'CRT > 2 detik'],
  },
  {
    match: /jvp|jugular|edema|oedema/i,
    findings: ['JVP meningkat', 'Edema pitting tungkai', 'Hepatomegali'],
  },
  {
    match: /neurolog|motorik|motor|refleks|reflex|pupil|kesadaran|gcs/i,
    findings: ['Hemiparesis', 'Pupil anisokor', 'Refleks patologis', 'Penurunan kesadaran'],
  },
  {
    match: /kulit|ruam|rash|skin|lesi/i,
    findings: ['Ruam makulopapular', 'Petekie', 'Vesikel', 'Ikterik'],
  },
  {
    match: /otoskop|otoscop|telinga|\bear\b|timpani|tympan/i,
    findings: ['Membran timpani hiperemis', 'Membran timpani bulging', 'Perforasi', 'Sekret telinga'],
  },
  {
    match: /sinus|hidung|nasal|rhino/i,
    findings: ['Sekret purulen', 'Mukosa hidung hiperemis', 'Nyeri tekan sinus'],
  },
];

const TESTS: Array<{ match: RegExp; findings: string[] }> = [
  {
    match: /darah (lengkap|rutin)|complete blood|\bcbc\b|hematolog|leuko|white (blood|cell)/i,
    findings: ['Leukositosis', 'Leukopenia', 'Anemia', 'Trombositopenia'],
  },
  { match: /\bcrp\b|c-reactive/i, findings: ['CRP meningkat'] },
  { match: /gula darah|glukosa|glucose|\bgd[sp]\b|hba1c/i, findings: ['Hiperglikemia', 'Hipoglikemia'] },
  { match: /urin/i, findings: ['Leukosituria', 'Nitrit positif', 'Hematuria', 'Proteinuria'] },
  { match: /\be[ck]g\b|elektrokardiogra|electrocardiogra/i, findings: ['ST elevasi', 'ST depresi', 'Gelombang T inversi', 'Aritmia'] },
  { match: /rontgen|x-ray|xray|foto (toraks|thorax|dada)|\bcxr\b/i, findings: ['Infiltrat', 'Kardiomegali', 'Efusi pleura'] },
  { match: /spo2|saturasi|saturation|oksimetri|oximetr/i, findings: ['SpO2 90–94%', 'SpO2 < 90%'] },
  { match: /malaria|plasmodium|apusan darah|blood smear/i, findings: ['Plasmodium positif'] },
  { match: /\bns1\b|dengue/i, findings: ['NS1 positif', 'IgM dengue positif'] },
  { match: /widal|tubex|tifoid|typhoid/i, findings: ['Tes tifoid positif'] },
  { match: /kehamilan|pregnan|\bhcg\b/i, findings: ['Tes kehamilan positif'] },
];

export function findingChoicesFor(step: { kind: BedsideKind; item: string }): FindingChoice {
  if (step.kind === 'question') return { options: ['Ya', 'Tidak'], normal: null, single: true };
  const catalogue = step.kind === 'test' ? TESTS : EXAMS;
  if (step.kind === 'exam' && SIGNS.test(step.item)) return { options: ['Positif', 'Negatif'], normal: null, single: true };
  const entry = catalogue.find((candidate) => candidate.match.test(step.item));
  if (entry) return { options: [NORMAL, ...entry.findings], normal: NORMAL, single: false };
  return { options: [NORMAL, 'Abnormal'], normal: null, single: true };
}

/** The ticked options after the doctor taps `option`. */
export function toggleFinding(choice: FindingChoice, selected: string[], option: string): string[] {
  if (selected.includes(option)) return selected.filter((item) => item !== option);
  if (choice.single) return [option];
  if (option === choice.normal) return [option];
  return [...selected.filter((item) => item !== choice.normal), option];
}

/** One line per recorded step, as the Temuan receipt shows it. */
export function bedsideFindingLine(finding: BedsideFindingRecord): string {
  return `${finding.item}: ${finding.findings.join(', ')}`;
}
