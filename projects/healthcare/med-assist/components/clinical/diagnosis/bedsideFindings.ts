/**
 * What a doctor records after a next best step instead of typing (Chief, 2026-09-28: "dokter
 * cukup centang apa temuannya, system provide misal Ronki, Wheezing"). This is input
 * vocabulary, not diagnostic logic: the recorded findings go back to the engine as they are, and
 * the engine interprets them. Clinical wording is for Chief's review.
 *
 * Every finding has three states: ditemukan (present), tidak ditemukan (examined and absent) and
 * belum diperiksa (unknown, the start). An untouched finding stays unknown; it is never read as
 * absent.
 *
 * Algorithm for one step ({kind, item} as MIRA sends it, in Indonesian or English):
 * 1. a question is answered Ya or Tidak, a named clinical sign (Rovsing, Murphy, ...) Positif or
 *    Negatif: one finding, the step itself;
 * 2. an exam or test that matches the catalogue lists its typical findings, each set on its own;
 * 3. anything else is one finding, "Kelainan", answered Abnormal or Normal.
 */

import type { BedsideFindingRecord, BedsideFindingState } from '@/types/api';

export type BedsideKind = BedsideFindingRecord['kind'];

export type FindingChoice =
  /** Several findings, each set to ditemukan, tidak ditemukan or belum diperiksa. */
  | { type: 'list'; findings: string[] }
  /** One finding answered with two words: `present` means ditemukan, `absent` tidak ditemukan. */
  | { type: 'answer'; finding: string; present: string; absent: string };

export const STATE_LABEL: Record<BedsideFindingState, string> = {
  present: 'Ditemukan',
  absent: 'Tidak ditemukan',
  unknown: 'Belum diperiksa',
};

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
  if (step.kind === 'question') return { type: 'answer', finding: step.item, present: 'Ya', absent: 'Tidak' };
  const catalogue = step.kind === 'test' ? TESTS : EXAMS;
  if (step.kind === 'exam' && SIGNS.test(step.item)) {
    return { type: 'answer', finding: step.item, present: 'Positif', absent: 'Negatif' };
  }
  const entry = catalogue.find((candidate) => candidate.match.test(step.item));
  if (entry) return { type: 'list', findings: entry.findings };
  return { type: 'answer', finding: 'Kelainan', present: 'Abnormal', absent: 'Normal' };
}

/** A list finding's state after a tap: belum diperiksa, then ditemukan, then tidak ditemukan. */
export function nextState(state: BedsideFindingState): BedsideFindingState {
  if (state === 'unknown') return 'present';
  if (state === 'present') return 'absent';
  return 'unknown';
}

const recorded = (record: BedsideFindingRecord) => record.findings.filter((f) => f.state !== 'unknown');

// The finding as a doctor reads it: a one-finding answer that is not the step itself names the step.
function findingName(record: BedsideFindingRecord, name: string): string {
  return name !== record.item && record.findings.length === 1 ? `${record.item}: ${name}` : name;
}

/** One line per recorded step, as the Temuan receipt shows it: "+" ditemukan, "−" tidak ditemukan. */
export function bedsideFindingLine(record: BedsideFindingRecord): string {
  const sign = (state: BedsideFindingState) => (state === 'present' ? '+' : '−');
  if (record.findings.length === 1) {
    return recorded(record).map((f) => `${sign(f.state)} ${findingName(record, f.name)}`).join('');
  }
  return `${record.item}: ${recorded(record).map((f) => `${sign(f.state)} ${f.name}`).join(', ')}`;
}

/** The recorded findings, one line each, as "Berubah setelah" lists them. */
export function recordedFindingLines(record: BedsideFindingRecord): string[] {
  return recorded(record).map((f) =>
    f.state === 'present' ? `✓ ${findingName(record, f.name)} ditemukan` : `− ${findingName(record, f.name)} tidak ditemukan`
  );
}
