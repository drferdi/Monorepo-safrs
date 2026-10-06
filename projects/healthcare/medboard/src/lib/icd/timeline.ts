// ICD versions under a chosen code (Chief 2026-10-07: "cukup timeline ICD yang di gunakan di
// Indonesia, pcare, dan ICD reference yang paling banyak di gunakan dunia"). `systems` lists where
// Indonesia uses that version; the 2010 entry follows the catalogue this page searches
// (database/icd10.json: "ICD-10 e-Klaim BPJS Kesehatan", version ICD10_2010) and the
// PCare/ePuskesmas note this page already carried.

export interface IcdTimelineStop {
  year: string
  label: string
  systems: string[]
}

export const ICD_TIMELINE: IcdTimelineStop[] = [
  { year: '2010', label: 'ICD Indonesia', systems: ['PCare BPJS', 'ePuskesmas', 'E-Claim'] },
  // WHO ICD-10, 2019 edition: the reference most used worldwide (Chief: "Worldwide ICD").
  { year: '2019', label: 'Worldwide ICD', systems: [] },
]
