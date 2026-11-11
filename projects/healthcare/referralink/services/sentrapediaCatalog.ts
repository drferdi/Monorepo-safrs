import catalog from '../data/sentrapediaCatalog.json'

export interface SentrapediaDisease {
  id: number
  name: string
  category: string
  code: string
  definition: string
  symptoms: string[]
  diagnosis: string
  therapy: string
  referralCriteria: string
}

export interface SentrapediaCategory {
  id: string
  name: string
  code: string
  description: string
}

export const SENTRAPEDIA_CATEGORIES: SentrapediaCategory[] = catalog.categories
export const SENTRAPEDIA_CATALOG: SentrapediaDisease[] = catalog.diseases.map((disease) => ({
  id: disease.id,
  name: disease.nama,
  category: disease.kategori,
  code: disease.kode,
  definition: disease.definisi,
  symptoms: disease.gejala,
  diagnosis: disease.diagnosis,
  therapy: disease.terapi,
  referralCriteria: disease.rujukan,
}))

export function searchSentrapedia(query = '', category = 'all') {
  const normalized = query.trim().toLocaleLowerCase()
  return SENTRAPEDIA_CATALOG.filter((disease) => {
    const matchesCategory = category === 'all' || disease.category === category
    if (!matchesCategory) return false
    if (!normalized) return true
    return [
      disease.name,
      disease.category,
      disease.code,
      disease.definition,
      ...disease.symptoms,
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized)
  })
}
