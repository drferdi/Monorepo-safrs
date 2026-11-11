// Referral help under the chosen code (Chief 2026-10-07: "jika pasien ingin di rujuk maka otomatis
// mencarikan diagnosis yang berkaitan namun masuk kewenangan RS"). Data only, no AI:
// - the 144 diagnoses FKTP must manage (public/data/144_penyakit_puskesmas.json): referral of these
//   needs TACC (Time, Age, Complication, Comorbidity);
// - SKDI competence per disease (public/data/penyakit.json): 2, 3A and 3B are hospital work.
// A code in neither list is left neutral: not being among the 144 does not make it hospital work.
// Related codes (Chief 2026-10-07, Asma): first the categories of the same WHO block that hold no
// 144 diagnosis, so BPJS takes the referral without TACC, nearest first; then SKDI hospital-level
// diagnoses of the same organ system. Symptom, factor and external-cause chapters get no block
// neighbours.

import { whoBlockOf } from './who-blocks'

export interface FktpDisease {
  code: string
  name: string
  system: string
}

export interface SkdiDisease {
  code: string
  name: string
  competence: string
  system: string
}

export interface ReferralData {
  fktp: ReadonlyArray<FktpDisease>
  skdi: ReadonlyArray<SkdiDisease>
  /** True when the code is in the ICD-10 2010 catalogue. */
  known: (code: string) => boolean
  /** The three-character categories of the catalogue, with their names. */
  categories: ReadonlyArray<{ code: string; name: string }>
}

export interface ReferralAdvice {
  authority: 'fktp' | 'rs' | 'other'
  fktpMatch: { code: string; name: string } | null
  competence: string | null
  related: Array<{ code: string; name: string; competence: string | null }>
}

// SKDI organ systems (penyakit.json) named as in the 144 list.
const SYSTEM_OF: Record<string, string> = {
  'SISTEM KARDIOVASKULAR': 'Kardiovaskular',
  'SISTEM REPRODUKSI': 'Reproduksi',
  'SISTEM DIGESTIF': 'Gastrointestinal',
  'KESEHATAN JIWA / ZAT': 'Psikiatri',
  'SISTEM JIWA': 'Psikiatri',
  'SISTEM SARAF': 'Sistem Saraf',
  'SISTEM MUSKULOSKELETAL': 'Muskuloskeletal',
}

const HOSPITAL = new Set(['2', '3A', '3B'])
const MAX_RELATED = 8
const NO_NEIGHBOURS = /^[RUVWXYZ]/

// An entry covers its own code and, when it is a category, the subcodes under it (A09 covers A09.0).
// SKDI exclusions use this exact rule: K40.3 stays hospital work even if a K40 code is FKTP work.
const covers = (entry: string, code: string): boolean => code === entry || code.startsWith(`${entry}.`)

export function referralAdvice(rawCode: string, data: ReferralData): ReferralAdvice {
  const code = rawCode.trim().toUpperCase()
  // A 144 entry makes its whole category FKTP work (J45.9 Asma covers J45 and J45.0).
  const fktp =
    data.fktp.find((entry) => covers(entry.code, code)) ??
    data.fktp.find((entry) => entry.code.slice(0, 3) === code.slice(0, 3)) ??
    null
  const skdi = data.skdi.find((entry) => covers(entry.code, code) && HOSPITAL.has(entry.competence)) ?? null
  const system = fktp?.system ?? (skdi ? SYSTEM_OF[skdi.system] : undefined)

  const related: ReferralAdvice['related'] = []
  const block = NO_NEIGHBOURS.test(code) ? null : whoBlockOf(code)
  if (block) {
    const own = code.slice(0, 3)
    const distance = (category: string) => Math.abs(Number(category.slice(1)) - Number(own.slice(1)))
    const neighbours = data.categories
      .filter(({ code: category }) => category !== own && block[0] <= category && category <= block[1])
      .filter(({ code: category }) => !data.fktp.some((item) => item.code.slice(0, 3) === category))
      .sort((a, b) => distance(a.code) - distance(b.code) || a.code.localeCompare(b.code))
    for (const { code: category, name } of neighbours.slice(0, MAX_RELATED)) {
      const skdiEntry = data.skdi.find((entry) => entry.code === category)
      related.push({ code: category, name: skdiEntry?.name ?? name, competence: skdiEntry?.competence ?? null })
    }
  }
  if (system) {
    for (const entry of data.skdi) {
      if (related.length === MAX_RELATED) break
      if (!HOSPITAL.has(entry.competence) || SYSTEM_OF[entry.system] !== system) continue
      if (entry.code === code || related.some((item) => item.code === entry.code)) continue
      if (data.fktp.some((item) => covers(item.code, entry.code)) || !data.known(entry.code)) continue
      related.push({ code: entry.code, name: entry.name, competence: entry.competence })
    }
  }

  return {
    authority: fktp ? 'fktp' : skdi ? 'rs' : 'other',
    fktpMatch: fktp ? { code: fktp.code, name: fktp.name } : null,
    competence: skdi?.competence ?? null,
    related,
  }
}
