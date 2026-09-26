import diseaseDatabase from '../../../public/data/144_penyakit_puskesmas.json'
import { resolveDrug } from './formulary-resolver'

type RawDiseaseDrug = {
  drug: string
  dose?: string
  route?: string
  frequency?: string
  duration?: string
}

type RawDiseaseEntry = {
  pharmacotherapy?: {
    first_line?: RawDiseaseDrug[]
    second_line?: RawDiseaseDrug[]
    prophylaxis?: RawDiseaseDrug[]
  }
}

export interface ManualMedicationSuggestion {
  id: string
  name: string
  canonicalName: string | null
  aliases: string[]
  dose: string
  frequency: string
  route: string
  duration?: string
  timingHint: string
  stockLabel: string
}

type SuggestionAggregate = ManualMedicationSuggestion & {
  count: number
  searchTerms: string[]
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTimingHint(frequency: string): string {
  const source = normalize(frequency)
  const hints: string[] = []

  if (source.includes('1 2x hari') || source.includes('1 2 x hari')) {
    hints.push('pagi atau malam')
  } else if (source.includes('1x hari') || source.includes('1 x hari')) {
    hints.push('1 kali per hari')
  } else if (source.includes('2x hari') || source.includes('2 x hari')) {
    hints.push('pagi + malam')
  } else if (source.includes('3x hari') || source.includes('3 x hari')) {
    hints.push('pagi + siang + malam')
  } else if (source.includes('4x hari') || source.includes('4 x hari')) {
    hints.push('pagi + siang + sore + malam')
  }

  if (source.includes('sebelum makan')) {
    hints.push('sebelum makan')
  }
  if (source.includes('setelah makan')) {
    hints.push('setelah makan')
  }
  if (source.includes('sebelum tidur')) {
    hints.push('sebelum tidur')
  }
  if (source.includes('sesuai kebutuhan')) {
    hints.push('sesuai kebutuhan')
  }

  return hints.join(' • ') || frequency || 'sesuai resep'
}

function upsertSuggestion(target: Map<string, SuggestionAggregate>, raw: RawDiseaseDrug) {
  const resolved = resolveDrug(raw.drug)
  if (!resolved.is_puskesmas_formulary || !resolved.canonical_name) {
    return
  }
  const canonicalName = resolved.canonical_name
  const name = resolved.canonical_name
  const dose = raw.dose?.trim() || '-'
  const frequency = raw.frequency?.trim() || '-'
  const route = raw.route?.trim() || 'oral'
  const duration = raw.duration?.trim()
  const key = normalize([canonicalName ?? raw.drug, dose, frequency, route].join(' '))
  const aliases = [...new Set([...(resolved.aliases ?? []), raw.drug].filter(Boolean))]
  const searchTerms = [
    ...new Set([name, canonicalName, ...aliases].filter(Boolean).map(item => normalize(item!))),
  ]

  const existing = target.get(key)
  if (existing) {
    existing.count += 1
    existing.aliases = [...new Set([...existing.aliases, ...aliases])]
    existing.searchTerms = [...new Set([...existing.searchTerms, ...searchTerms])]
    return
  }

  target.set(key, {
    id: key,
    name,
    canonicalName,
    aliases,
    dose,
    frequency,
    route,
    duration,
    timingHint: buildTimingHint(frequency),
    stockLabel: resolved.display_label,
    count: 1,
    searchTerms,
  })
}

const suggestionCatalog = (() => {
  const catalog = new Map<string, SuggestionAggregate>()
  const diseases = (diseaseDatabase as { diseases?: RawDiseaseEntry[] }).diseases ?? []

  diseases.forEach(disease => {
    disease.pharmacotherapy?.first_line?.forEach(item => upsertSuggestion(catalog, item))
    disease.pharmacotherapy?.second_line?.forEach(item => upsertSuggestion(catalog, item))
    disease.pharmacotherapy?.prophylaxis?.forEach(item => upsertSuggestion(catalog, item))
  })

  return Array.from(catalog.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )
})()

export function searchManualMedicationSuggestions(
  query: string,
  limit = 6
): ManualMedicationSuggestion[] {
  const normalizedQuery = normalize(query)
  if (normalizedQuery.length < 2) return []

  const scored = suggestionCatalog
    .map(item => {
      let score = 0
      if (
        normalize(item.name) === normalizedQuery ||
        normalize(item.canonicalName ?? '') === normalizedQuery
      ) {
        score += 200
      } else if (item.searchTerms.some(term => term.startsWith(normalizedQuery))) {
        score += 120
      } else if (item.searchTerms.some(term => term.includes(normalizedQuery))) {
        score += 80
      } else {
        return null
      }

      score += Math.min(item.count * 4, 36)
      return { item, score }
    })
    .filter((entry): entry is { item: SuggestionAggregate; score: number } => entry !== null)
    .sort(
      (a, b) =>
        b.score - a.score || b.item.count - a.item.count || a.item.name.localeCompare(b.item.name)
    )
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id,
      name: item.name,
      canonicalName: item.canonicalName,
      aliases: item.aliases,
      dose: item.dose,
      frequency: item.frequency,
      route: item.route,
      duration: item.duration,
      timingHint: item.timingHint,
      stockLabel: item.stockLabel,
    }))

  return scored
}
