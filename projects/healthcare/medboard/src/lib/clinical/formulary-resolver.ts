
import drugMappingDatabase from '../../../public/data/drug_mapping.json'
import activeFormularyDatabase from '../../../public/data/obat_data.json'

import type {
  DrugAvailabilityStatus,
  DrugContraindicationProfile,
  DrugMappingEntry,
  ResolvedDrug,
} from './types/formulary.types'

type LegacyDrugMappingEntry = {
  generik?: string
  alias?: string[]
  stok_match?: string[]
  kategori?: string
  kontraindikasi?: DrugContraindicationProfile
  contraindications?: DrugContraindicationProfile
}

type DrugMappingSource = {
  entries?: DrugMappingEntry[]
  mappings?: LegacyDrugMappingEntry[]
}

type RawActiveFormularyItem = {
  kode_obat?: string
  nama_obat?: string
  bentuk_sediaan?: string | null
  kekuatan_dosis?: string | null
  rute?: string | null
  status_aktif?: boolean
}

type ActiveFormularyItem = {
  code: string
  name: string
  dosage_form: string | null
  strength: string | null
  route: string | null
  is_active: boolean
  normalized_name: string
  normalized_base_name: string
}

const MIN_PARTIAL_MATCH_LENGTH = 4
const FORMULARY_DOSAGE_WORDS = [
  'tablet',
  'tab',
  'kaplet',
  'kapsul',
  'sirup',
  'suspensi',
  'salep',
  'krim',
  'gel',
  'suppositoria',
  'supositoria',
  'injeksi',
  'injection',
  'serbuk',
  'salut',
  'kunyah',
  'kering',
  'forte',
  'kombinasi',
  'cairan',
  'drop',
  'tetes',
  'ampul',
  'vial',
  'doen',
  'program',
  'oral',
  'sublingual',
  'im',
  'iv',
  'i m',
  'i v',
  'hcl',
] as const

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-/().,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toBaseDrugName(text: string): string {
  return normalize(text)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:[.,/]\d+)*(?:\s*[a-z%]+)?\b/g, ' ')
    .replace(new RegExp(`\\b(?:${FORMULARY_DOSAGE_WORDS.join('|')})\\b`, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCategory(value?: string): DrugMappingEntry['category'] {
  const source = normalize(value ?? '')
  if (source.includes('kardiovaskular') || source.includes('cardio')) return 'cardiovascular'
  if (source.includes('analges') || source.includes('antipiretik') || source.includes('nsaid'))
    return 'analgesic'
  if (source.includes('antibiotik')) return 'antibiotic'
  if (source.includes('antidiabet')) return 'antidiabetic'
  if (source.includes('antihipertensi') || source.includes('diuretik')) return 'antihypertensive'
  if (source.includes('bronkodilator')) return 'bronchodilator'
  if (source.includes('antihist')) return 'antihistamine'
  if (
    source.includes('gastro') ||
    source.includes('ulkus') ||
    source.includes('antasida') ||
    source.includes('gastroprotektif') ||
    source.includes('antiulkus')
  )
    return 'gastrointestinal'
  if (source.includes('vitamin') || source.includes('mineral') || source.includes('suplemen'))
    return 'vitamin_mineral'
  if (source.includes('emergency') || source.includes('gawat')) return 'emergency'
  if (source.includes('jamur')) return 'other'
  if (source.includes('parkinson')) return 'other'
  if (source.includes('rematik')) return 'other'
  return 'other'
}

function adaptDrugMappings(source: DrugMappingSource): DrugMappingEntry[] {
  if (Array.isArray(source.entries)) {
    return source.entries
  }

  return (source.mappings ?? [])
    .map(entry => {
      const canonicalName = entry.generik?.trim() || ''
      return {
        canonical_name: canonicalName,
        aliases: entry.alias ?? [],
        stock_match_keys: entry.stok_match ?? [canonicalName],
        category: normalizeCategory(entry.kategori),
        is_puskesmas_formulary: true,
        preferred_stock_item_name: canonicalName,
        contraindications: entry.kontraindikasi ?? entry.contraindications,
      }
    })
    .filter(entry => entry.canonical_name)
}

function adaptActiveFormulary(source: RawActiveFormularyItem[]): ActiveFormularyItem[] {
  return source
    .map((item, index) => {
      const name = item.nama_obat?.trim() || ''
      return {
        code: item.kode_obat?.trim() || `formulary-${index + 1}`,
        name,
        dosage_form: item.bentuk_sediaan?.trim() || null,
        strength: item.kekuatan_dosis?.trim() || null,
        route: item.rute?.trim() || null,
        is_active: item.status_aktif !== false,
        normalized_name: normalize(name),
        normalized_base_name: toBaseDrugName(name),
      }
    })
    .filter(item => item.name && item.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
}

const drugMappings = adaptDrugMappings(drugMappingDatabase as DrugMappingSource)
const activeFormularyItems = adaptActiveFormulary(
  activeFormularyDatabase as RawActiveFormularyItem[]
)

function findMappingEntry(
  inputName: string
): { entry: DrugMappingEntry; confidence: number } | null {
  const normalizedInput = normalize(inputName)

  for (const entry of drugMappings) {
    if (normalize(entry.canonical_name) === normalizedInput) {
      return { entry, confidence: 1 }
    }
  }

  for (const entry of drugMappings) {
    for (const alias of entry.aliases) {
      if (normalize(alias) === normalizedInput) {
        return { entry, confidence: 0.97 }
      }
    }
  }

  for (const entry of drugMappings) {
    const canonical = normalize(entry.canonical_name)
    if (canonical.startsWith(normalizedInput) || normalizedInput.startsWith(canonical)) {
      return { entry, confidence: 0.84 }
    }
  }

  for (const entry of drugMappings) {
    for (const alias of entry.aliases) {
      const normalizedAlias = normalize(alias)
      if (normalizedAlias.length < MIN_PARTIAL_MATCH_LENGTH) continue
      if (normalizedAlias.includes(normalizedInput) || normalizedInput.includes(normalizedAlias)) {
        return { entry, confidence: 0.76 }
      }
    }
  }

  for (const entry of drugMappings) {
    for (const key of entry.stock_match_keys) {
      const normalizedKey = normalize(key)
      if (normalizedKey.length < MIN_PARTIAL_MATCH_LENGTH) continue
      if (normalizedInput.includes(normalizedKey)) {
        return { entry, confidence: 0.62 }
      }
    }
  }

  return null
}

function scoreFormularyItem(item: ActiveFormularyItem, rawCandidate: string): number {
  const candidate = normalize(rawCandidate)
  const candidateBase = toBaseDrugName(rawCandidate)
  const hasMeaningfulBase = item.normalized_base_name.length >= MIN_PARTIAL_MATCH_LENGTH
  if (!candidate && !candidateBase) return 0

  if (candidate && item.normalized_name === candidate) return 1
  if (hasMeaningfulBase && candidateBase && item.normalized_base_name === candidateBase) return 0.98
  if (candidate.length >= MIN_PARTIAL_MATCH_LENGTH && item.normalized_name.startsWith(candidate))
    return 0.94
  if (
    hasMeaningfulBase &&
    candidateBase.length >= MIN_PARTIAL_MATCH_LENGTH &&
    item.normalized_base_name.startsWith(candidateBase)
  )
    return 0.92
  if (
    hasMeaningfulBase &&
    candidateBase.length >= MIN_PARTIAL_MATCH_LENGTH &&
    item.normalized_base_name.includes(candidateBase)
  )
    return 0.86
  if (candidate.length >= MIN_PARTIAL_MATCH_LENGTH && item.normalized_name.includes(candidate))
    return 0.82
  if (
    hasMeaningfulBase &&
    candidate.length >= MIN_PARTIAL_MATCH_LENGTH &&
    item.normalized_base_name.length >= MIN_PARTIAL_MATCH_LENGTH &&
    candidate.includes(item.normalized_base_name)
  ) {
    return 0.72
  }
  return 0
}

function findFormularyItem(
  candidateNames: string[]
): { item: ActiveFormularyItem; confidence: number } | null {
  let bestMatch: { item: ActiveFormularyItem; confidence: number } | null = null

  for (const candidate of candidateNames) {
    if (!candidate?.trim()) continue
    for (const item of activeFormularyItems) {
      const confidence = scoreFormularyItem(item, candidate)
      if (!bestMatch || confidence > bestMatch.confidence) {
        if (confidence > 0) {
          bestMatch = { item, confidence }
        }
      }
      if (bestMatch?.confidence === 1) return bestMatch
    }
  }

  return bestMatch
}

const STATUS_LABELS: Record<DrugAvailabilityStatus, string> = {
  mapped_available: 'Masuk formularium aktif',
  mapped_limited: 'Masuk formularium aktif',
  mapped_not_in_stock: 'Masuk formularium aktif',
  not_mapped_to_formulary: 'Di luar formularium aktif',
}

function buildDisplayLabel(
  status: DrugAvailabilityStatus,
  formularyItem: ActiveFormularyItem | null
): string {
  const base = STATUS_LABELS[status]
  if (!formularyItem || status === 'not_mapped_to_formulary') {
    return base
  }
  return `${base} — ${formularyItem.name}`
}

export function resolveDrug(inputName: string): ResolvedDrug {
  const mappingResult = findMappingEntry(inputName)
  const mappingEntry = mappingResult?.entry ?? null
  const formularyMatch = findFormularyItem(
    [
      inputName,
      mappingEntry?.canonical_name ?? '',
      ...(mappingEntry?.aliases ?? []),
      ...(mappingEntry?.stock_match_keys ?? []),
      mappingEntry?.preferred_stock_item_name ?? '',
    ].filter(Boolean)
  )

  if (!mappingEntry && !formularyMatch) {
    return {
      input_name: inputName,
      canonical_name: null,
      aliases: [],
      preferred_stock_item_name: null,
      stock_item: null,
      status: 'not_mapped_to_formulary',
      is_puskesmas_formulary: false,
      display_label: STATUS_LABELS.not_mapped_to_formulary,
      confidence_score: 0,
      category: 'other',
      contraindications: null,
    }
  }

  const status: DrugAvailabilityStatus = formularyMatch
    ? 'mapped_available'
    : 'not_mapped_to_formulary'
  const resolvedName = formularyMatch?.item.name ?? mappingEntry?.canonical_name ?? null
  const confidence = Math.max(mappingResult?.confidence ?? 0, formularyMatch?.confidence ?? 0)

  return {
    input_name: inputName,
    canonical_name: resolvedName,
    aliases: mappingEntry?.aliases ?? [],
    preferred_stock_item_name:
      formularyMatch?.item.name ?? mappingEntry?.preferred_stock_item_name ?? null,
    stock_item: null,
    status,
    is_puskesmas_formulary: Boolean(formularyMatch),
    display_label: buildDisplayLabel(status, formularyMatch?.item ?? null),
    confidence_score: confidence,
    category: mappingEntry?.category ?? 'other',
    notes: mappingEntry?.notes,
    contraindications: mappingEntry?.contraindications ?? null,
  }
}

export function resolveDrugList(drugNames: string[]): ResolvedDrug[] {
  return drugNames.map(name => resolveDrug(name))
}

export function normalizeDrugNameForPrescription(inputName: string): string {
  const resolved = resolveDrug(inputName)
  return resolved.canonical_name ?? inputName.trim()
}
