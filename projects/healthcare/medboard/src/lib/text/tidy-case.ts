// Chief 2026-10-07: text in all caps or all lower case is tidied to standard Indonesian
// capitalisation (a capital at the start of each sentence, every word of a name capitalised);
// acronyms keep their capitals. Text already in mixed case is the writer's and stays as written.

export type TidyMode = 'sentence' | 'name'

// Clinical acronyms written in capitals. Words that are also ordinary Indonesian words in
// lower case (oma, map, ok, id, tan, sep) are left out on purpose; BAB and BAK stay because in
// clinical notes they are almost always the acronyms.
const ACRONYMS = new Set([
  'ACS', 'AKI', 'ANC', 'AVPU', 'BAB', 'BAK', 'BB', 'BMI', 'BPJS', 'CDSS', 'CHF', 'CKD', 'CRP', 'CRT',
  'CT', 'DBD', 'DHF', 'DM', 'ECG', 'EKG', 'EMR', 'GCS', 'GDP', 'GDS', 'GERD', 'HDL', 'HIV', 'HPHT',
  'HR', 'HT', 'ICD', 'ICU', 'IGD', 'IMT', 'ISK', 'ISPA', 'JVP', 'KGB', 'KIA', 'LDL', 'MIRA', 'MRI',
  'NEWS', 'NIK', 'NRS', 'NSAID', 'PCR', 'PJK', 'PPK', 'PPOK', 'RM', 'RME', 'RPD', 'RPK', 'RPS', 'RR',
  'SGOT', 'SGPT', 'SKDI', 'SOAP', 'TB', 'TBC', 'TD', 'TTV', 'UGD', 'USG', 'VAS', 'WBC', 'WHO',
])

// Terms with their own mixed spelling.
const SPELLING: Record<string, string> = { spo2: 'SpO2', hba1c: 'HbA1c', mmhg: 'mmHg' }

function letterCase(text: string): 'upper' | 'lower' | 'mixed' | 'none' {
  const letters = text.replace(/[^\p{L}]/gu, '')
  if (!letters) return 'none'
  if (letters === letters.toLowerCase()) return 'lower'
  if (letters === letters.toUpperCase()) return 'upper'
  return 'mixed'
}

function restoreWord(word: string): string {
  if (word in SPELLING) return SPELLING[word]
  return ACRONYMS.has(word.toUpperCase()) ? word.toUpperCase() : word
}

function tidySentence(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, restoreWord)
    .replace(/(^\s*|[.!?]\s+|\n\s*)(\p{Ll})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase())
}

function tidyNameWord(word: string): string {
  if (/^drg?\.?,?$/.test(word)) return word
  if (word.startsWith('sp.')) return `Sp.${word.slice(3).toUpperCase()}`
  return word.replace(/(^|[.\-'])(\p{Ll})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase())
}

export function tidyCase(text: string, mode: TidyMode = 'sentence'): string {
  const kind = letterCase(text)
  if (kind === 'none' || kind === 'mixed') return text

  if (mode === 'name') return text.toLowerCase().replace(/\S+/g, tidyNameWord)

  // A single token is often a code or an acronym (PCT, J06.9): tidy it only when it is a word.
  const trimmed = text.trim()
  if (!/\s/.test(trimmed)) {
    const letters = trimmed.replace(/[^\p{L}]/gu, '')
    if (/\d/.test(trimmed) || letters.length < 4 || ACRONYMS.has(letters.toUpperCase())) return text
  }
  return tidySentence(text)
}
