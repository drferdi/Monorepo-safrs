import fs from 'node:fs'
import path from 'node:path'
import { normalizeIcd10Code, transformToIcd10_2010 } from '@/lib/lb1/icd10-2010'
import { resolveAppRootFile } from '@/lib/server/app-root-file'

import { buildFuzzyIndex, type FuzzyIndex, fuzzySearch } from './fuzzy'
import { type ReferralAdvice, type ReferralData, referralAdvice } from './referral'

type IcdVersionKey = '2010' | '2016' | '2019'

interface ParsedIcdEntry {
  code: string
  title: string
}

interface Icd10JsonRecord {
  kode: string
  nama_en: string
  version?: string
}

interface Icd10JsonFile {
  _metadata?: {
    version?: string
    source?: string
    total_records?: number
  }
  icd10?: Icd10JsonRecord[]
}

interface VersionCatalog {
  version: IcdVersionKey
  entries: ParsedIcdEntry[]
  byCode: Map<string, ParsedIcdEntry>
  byLegacyHead: Map<string, ParsedIcdEntry>
}

interface DynamicIcdDb {
  versions: Record<IcdVersionKey, VersionCatalog>
  extensions: ExtensionCatalog
}

export interface IcdSearchItem {
  code: string
  name: string
  category: string
}

export interface IcdConversionItem {
  modern: string
  modernResolvedCode: string
  modernName: string
  exactModernMatch: boolean
  legacy: string
  knownIn2010: boolean
  knownIn2019: boolean
  legacyName: string
}

export interface IcdLookupResponse {
  query: string
  normalizedPrimary: string
  rows: IcdConversionItem[]
  results: IcdSearchItem[]
  /** Set when a misspelt query was redirected, e.g. "pnemonia" → "pneumonia". */
  correctedQuery?: string
}

interface ExtensionRow {
  code: string
  display: string
  legacyCode?: string
}

interface ExtensionCatalog {
  sourcePath: string
  byCode: Map<string, ExtensionRow>
}

const DATABASE_DIR = resolveAppRootFile('database')

// Production builds only see the static project-relative path.
// Dev fallbacks (env vars + local absolute paths) are tree-shaken out
// to keep Turbopack's NFT trace statically scoped.
const DEFAULT_XML_PATHS: Record<IcdVersionKey, string[]> =
  process.env.NODE_ENV === 'development'
    ? {
        '2010': [
          process.env.ICD10_2010_XML || '',
          'C:/Users/docsy/Desktop/icd102010en.xml',
          path.join(DATABASE_DIR, 'icd102010en.xml'),
        ],
        '2016': [
          process.env.ICD10_2016_XML || '',
          'C:/Users/docsy/Desktop/icd102016en.xml',
          path.join(DATABASE_DIR, 'icd102016en.xml'),
        ],
        '2019': [
          process.env.ICD10_2019_XML || '',
          'C:/Users/docsy/Desktop/icd102019en.xml',
          path.join(DATABASE_DIR, 'icd102019en.xml'),
        ],
      }
    : {
        '2010': [path.join(DATABASE_DIR, 'icd102010en.xml')],
        '2016': [path.join(DATABASE_DIR, 'icd102016en.xml')],
        '2019': [path.join(DATABASE_DIR, 'icd102019en.xml')],
      }

const DEFAULT_ICD10_JSON_PATHS =
  process.env.NODE_ENV === 'development'
    ? [process.env.ICD10_JSON || '', path.join(DATABASE_DIR, 'icd10.json')]
    : [path.join(DATABASE_DIR, 'icd10.json')]

const XML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

let cachedDb: DynamicIcdDb | null = null
let cachedFuzzy: FuzzyIndex | null = null
let cachedReferral: Omit<ReferralData, 'known' | 'categories'> | null = null

// Simple LRU cache for ICD lookup results to improve performance
const LOOKUP_CACHE_LIMIT = 200
const lookupCache = new Map<string, IcdLookupResponse>()

function resolveXmlPath(version: IcdVersionKey): string {
  const candidates = DEFAULT_XML_PATHS[version].filter(Boolean)
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return ''
}

function resolveIcd10JsonPath(): string {
  for (const candidate of DEFAULT_ICD10_JSON_PATHS.filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate
  }
  return ''
}

function loadExtensionCatalog(): ExtensionCatalog {
  const candidates =
    process.env.NODE_ENV === 'development'
      ? [
          process.env.ICDX_EXTENSIONS_JSON || '',
          path.join(DATABASE_DIR, 'icdx-extensions.json'),
        ].filter(Boolean)
      : [path.join(DATABASE_DIR, 'icdx-extensions.json')]

  let sourcePath = ''
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      sourcePath = candidate
      break
    }
  }
  if (!sourcePath) return { sourcePath: '', byCode: new Map() }

  const raw = fs.readFileSync(sourcePath, 'utf-8')
  const parsed = JSON.parse(raw) as ExtensionRow[]
  const byCode = new Map<string, ExtensionRow>()
  for (const row of parsed) {
    const code = String(row.code ?? '')
      .trim()
      .toUpperCase()
    const display = String(row.display ?? '').trim()
    if (!code || !display) continue
    byCode.set(code, {
      code,
      display,
      legacyCode: row.legacyCode?.trim().toUpperCase(),
    })
  }
  return { sourcePath, byCode }
}

function decodeXmlText(value: string): string {
  let result = value
  for (const [entity, plain] of Object.entries(XML_ENTITY_MAP)) {
    result = result.replaceAll(entity, plain)
  }
  return result
}

function stripXmlTags(value: string): string {
  return decodeXmlText(
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function parseClamlCategories(xmlContent: string): ParsedIcdEntry[] {
  const entries: ParsedIcdEntry[] = []
  const classRegex = /<Class code="([^"]+)" kind="category">([\s\S]*?)<\/Class>/g
  let match: RegExpExecArray | null = null

  while ((match = classRegex.exec(xmlContent)) !== null) {
    const code = (match[1] || '').trim().toUpperCase()
    const block = match[2] || ''
    if (!code) continue

    const preferredRubricMatch = block.match(
      /<Rubric[^>]*kind="preferred"[^>]*>([\s\S]*?)<\/Rubric>/i
    )
    if (!preferredRubricMatch) continue

    const labelMatch = preferredRubricMatch[1].match(/<Label[^>]*>([\s\S]*?)<\/Label>/i)
    if (!labelMatch) continue

    const title = stripXmlTags(labelMatch[1])
    if (!title) continue

    entries.push({ code, title })
  }

  return entries
}

function buildVersionCatalog(version: IcdVersionKey, xmlPath: string): VersionCatalog {
  const xml = fs.readFileSync(xmlPath, 'utf-8')
  const parsed = parseClamlCategories(xml)
  const byCode = new Map<string, ParsedIcdEntry>()
  const byLegacyHead = new Map<string, ParsedIcdEntry>()

  for (const entry of parsed) {
    const normalizedFull = normalizeIcd10Code(entry.code, false) || entry.code
    if (!byCode.has(entry.code)) byCode.set(entry.code, entry)
    if (!byCode.has(normalizedFull)) byCode.set(normalizedFull, entry)

    const head = normalizeIcd10Code(entry.code, true)
    if (head && !byLegacyHead.has(head)) byLegacyHead.set(head, entry)
  }

  return { version, entries: parsed, byCode, byLegacyHead }
}

function buildVersionCatalogFromJson(version: IcdVersionKey, jsonPath: string): VersionCatalog {
  const raw = fs.readFileSync(jsonPath, 'utf-8')
  const parsed = JSON.parse(raw) as Icd10JsonFile
  const records = Array.isArray(parsed.icd10) ? parsed.icd10 : []

  const entries: ParsedIcdEntry[] = records
    .map(row => {
      const code = String(row.kode ?? '')
        .trim()
        .toUpperCase()
      const title = String(row.nama_en ?? '').trim()
      return { code, title }
    })
    .filter(row => row.code && row.title)

  const byCode = new Map<string, ParsedIcdEntry>()
  const byLegacyHead = new Map<string, ParsedIcdEntry>()

  for (const entry of entries) {
    const normalizedFull = normalizeIcd10Code(entry.code, false) || entry.code
    if (!byCode.has(entry.code)) byCode.set(entry.code, entry)
    if (!byCode.has(normalizedFull)) byCode.set(normalizedFull, entry)

    const head = normalizeIcd10Code(entry.code, true)
    if (head && !byLegacyHead.has(head)) byLegacyHead.set(head, entry)
  }

  return { version, entries, byCode, byLegacyHead }
}

function createEmptyVersionCatalog(version: IcdVersionKey): VersionCatalog {
  return {
    version,
    entries: [],
    byCode: new Map(),
    byLegacyHead: new Map(),
  }
}

function loadDynamicIcdDb(): DynamicIcdDb {
  if (cachedDb) return cachedDb

  const icd10JsonPath = resolveIcd10JsonPath()

  const resolvedPaths: Record<IcdVersionKey, string> = {
    '2010': icd10JsonPath || resolveXmlPath('2010'),
    '2016': resolveXmlPath('2016'),
    '2019': resolveXmlPath('2019'),
  }

  const extensions = loadExtensionCatalog()

  const v2010 = icd10JsonPath
    ? buildVersionCatalogFromJson('2010', icd10JsonPath)
    : resolvedPaths['2010']
      ? buildVersionCatalog('2010', resolvedPaths['2010'])
      : createEmptyVersionCatalog('2010')
  const v2016 = resolvedPaths['2016']
    ? buildVersionCatalog('2016', resolvedPaths['2016'])
    : createEmptyVersionCatalog('2016')
  const v2019 = resolvedPaths['2019']
    ? buildVersionCatalog('2019', resolvedPaths['2019'])
    : createEmptyVersionCatalog('2019')

  cachedDb = {
    versions: {
      '2010': v2010,
      '2016': v2016,
      '2019': v2019,
    },
    extensions,
  }

  return cachedDb
}

function lookupByCode(
  version: VersionCatalog,
  code: string,
  options: { allowHeadFallback?: boolean } = {}
): ParsedIcdEntry | null {
  const allowHeadFallback = options.allowHeadFallback ?? true
  const key = code.trim().toUpperCase()
  if (!key) return null

  const exact = version.byCode.get(key)
  if (exact) return exact

  const normalizedFull = normalizeIcd10Code(key, false)
  if (normalizedFull) {
    const full = version.byCode.get(normalizedFull)
    if (full) return full
  }

  if (allowHeadFallback) {
    const head = normalizeIcd10Code(key, true)
    if (head) {
      const legacyHead = version.byLegacyHead.get(head)
      if (legacyHead) return legacyHead
    }
  }

  return null
}

function lookupExactCode(version: VersionCatalog, code: string): ParsedIcdEntry | null {
  const key = code.trim().toUpperCase()
  if (!key) return null

  const exact = version.byCode.get(key)
  if (exact) return exact

  const normalizedFull = normalizeIcd10Code(key, false)
  if (normalizedFull) {
    return version.byCode.get(normalizedFull) ?? null
  }

  return null
}

function inferCategoryLabel(code: string): string {
  const chapter = code.trim().toUpperCase().slice(0, 1)
  if (!chapter) return 'ICD-10'
  return `CHAPTER ${chapter}`
}

function extractExplicitCodes(input: string): string[] {
  const matches = input.match(/\b([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,7})?)\b/g) ?? []
  return Array.from(new Set(matches.map(code => code.toUpperCase())))
}

function buildCodeVariants(code: string): string[] {
  const upper = code.trim().toUpperCase()
  if (!upper) return []

  const out = new Set<string>()
  const normalizedFull = normalizeIcd10Code(upper, false)
  const normalizedHead = normalizeIcd10Code(upper, true)

  if (upper) out.add(upper)
  if (normalizedFull) out.add(normalizedFull)

  if (normalizedFull.includes('.')) {
    const [head, sub = ''] = normalizedFull.split('.')
    if (sub.length > 1) out.add(`${head}.${sub.slice(0, 2)}`)
    if (sub.length > 0) out.add(`${head}.${sub[0]}`)
  }
  if (normalizedHead) out.add(normalizedHead)

  return Array.from(out)
}

function findBestMatch(version: VersionCatalog, rawCode: string): ParsedIcdEntry | null {
  const variants = buildCodeVariants(rawCode)
  for (const variant of variants) {
    const hit = lookupByCode(version, variant, { allowHeadFallback: false })
    if (hit) return hit
  }
  return lookupByCode(version, rawCode, { allowHeadFallback: true })
}

// Indonesian names of the KKI diseases (public/data/penyakit.json), so "hipertensi" finds I10.
function loadKkiNames(): Array<{ code: string; name: string }> {
  try {
    const raw = JSON.parse(fs.readFileSync(resolveAppRootFile('public/data/penyakit.json'), 'utf-8')) as {
      penyakit?: Array<{ nama?: unknown; icd10?: unknown }>
    }
    return (raw.penyakit ?? []).flatMap((item) =>
      typeof item.nama === 'string' && typeof item.icd10 === 'string'
        ? [{ code: item.icd10.trim().toUpperCase(), name: item.nama }]
        : []
    )
  } catch {
    return []
  }
}

function fuzzyIndexFor(catalog: VersionCatalog): FuzzyIndex {
  if (!cachedFuzzy) cachedFuzzy = buildFuzzyIndex(catalog.entries, loadKkiNames())
  return cachedFuzzy
}

/** Catalogue names for the given codes, in the given order; unknown codes are left out. */
export function icdCandidates(codes: ReadonlyArray<string>): Array<{ code: string; name: string }> {
  const v2010 = loadDynamicIcdDb().versions['2010']
  return codes.flatMap((code) => {
    const entry = v2010.byCode.get(code.trim().toUpperCase())
    return entry ? [{ code: entry.code, name: entry.title }] : []
  })
}

export interface IcdCodeDetail {
  code: string
  name: string
  category: string
  /** In the ICD-10 2010 catalogue, the version PCare and ePuskesmas accept. */
  in2010: boolean
  parent: { code: string; name: string } | null
  children: Array<{ code: string; name: string }>
  /** The code in WHO ICD-10 2019; the 2010 code itself when the 2019 catalogue is not on this server. */
  worldwideCode: string | null
  referral: ReferralAdvice
}

function readJson(relative: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(resolveAppRootFile(relative), 'utf-8'))
  } catch {
    return null
  }
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

// The 144 FKTP diagnoses and the SKDI competence list, read once.
function referralSources(): Omit<ReferralData, 'known' | 'categories'> {
  if (cachedReferral) return cachedReferral
  const fktpRaw = readJson('public/data/144_penyakit_puskesmas.json')
  const skdiRaw = readJson('public/data/penyakit.json')
  const list = (raw: unknown, key: string): unknown[] =>
    raw && typeof raw === 'object' && key in raw && Array.isArray((raw as Record<string, unknown>)[key])
      ? ((raw as Record<string, unknown>)[key] as unknown[])
      : []
  const field = (item: unknown, key: string): string =>
    item && typeof item === 'object' && key in item ? text((item as Record<string, unknown>)[key]) : ''
  cachedReferral = {
    fktp: list(fktpRaw, 'diseases')
      .map(item => ({ code: field(item, 'icd10').toUpperCase(), name: field(item, 'name'), system: field(item, 'system') }))
      .filter(item => item.code),
    skdi: list(skdiRaw, 'penyakit')
      .map(item => ({
        code: field(item, 'icd10').toUpperCase(),
        name: field(item, 'nama'),
        competence: field(item, 'kompetensi'),
        system: field(item, 'body_system'),
      }))
      .filter(item => item.code),
  }
  return cachedReferral
}

/** One code from the 2010 catalogue with its parent category and subcodes; null when unknown. */
export function icdCodeDetail(rawCode: string): IcdCodeDetail | null {
  const { versions } = loadDynamicIcdDb()
  const v2010 = versions['2010']
  const v2019 = versions['2019']
  const entry = v2010.byCode.get(rawCode.trim().toUpperCase())
  if (!entry) return null
  const head = entry.code.split('.')[0]
  const parentEntry = head !== entry.code ? v2010.byCode.get(head) : undefined
  const children = v2010.entries
    .filter(child => child.code.startsWith(`${entry.code}.`))
    .map(child => ({ code: child.code, name: child.title }))
    .sort((a, b) => a.code.localeCompare(b.code))
  return {
    code: entry.code,
    name: entry.title,
    category: inferCategoryLabel(entry.code),
    in2010: true,
    parent: parentEntry ? { code: parentEntry.code, name: parentEntry.title } : null,
    children,
    worldwideCode: v2019.entries.length > 0 ? (v2019.byCode.get(entry.code)?.code ?? null) : entry.code,
    referral: referralAdvice(entry.code, {
      ...referralSources(),
      known: code => v2010.byCode.has(code),
      categories: v2010.entries.filter(item => !item.code.includes('.')).map(item => ({ code: item.code, name: item.title })),
    }),
  }
}

export function lookupIcdDynamically(query: string): IcdLookupResponse {
  const normalizedQuery = (query || '').trim().toUpperCase()

  // ⚡ Optimization: Return from cache if available
  // This avoids expensive string processing and filtering on 100k+ records
  if (lookupCache.has(normalizedQuery)) {
    const cached = lookupCache.get(normalizedQuery)!

    // Maintain true LRU: move recently accessed item to the end
    lookupCache.delete(normalizedQuery)
    lookupCache.set(normalizedQuery, cached)

    // Ensure the response query field matches the user's input
    return { ...cached, query }
  }

  const db = loadDynamicIcdDb()
  const transformed = transformToIcd10_2010(normalizedQuery, {
    stripSubcode: false,
  })
  const v2010 = db.versions['2010']
  const v2019 = db.versions['2019']
  const ext = db.extensions

  const explicitCodes = extractExplicitCodes(normalizedQuery)
  let modernCodes: string[] = explicitCodes

  if (
    modernCodes.length === 0 &&
    transformed.mode === 'range' &&
    transformed.candidateCodes.length > 0
  ) {
    modernCodes = transformed.candidateCodes.map(code => code.toUpperCase())
  }
  // In text mode the "primary code" is only the typed words (e.g. PNEUMONIA), not a code to convert.
  if (modernCodes.length === 0 && transformed.primaryCode && transformed.mode !== 'text') {
    modernCodes = [transformed.primaryCode.toUpperCase()]
  }

  const rows: IcdConversionItem[] = modernCodes.map(modernRaw => {
    const modernFull = normalizeIcd10Code(modernRaw, false) || modernRaw
    const extHit = ext.byCode.get(modernRaw) ?? ext.byCode.get(modernFull)
    const exact2019 = lookupExactCode(v2019, modernRaw)
    const best2019 = extHit
      ? { code: extHit.code, title: extHit.display }
      : findBestMatch(v2019, modernFull)

    const preferredLegacyCode = extHit?.legacyCode || modernFull
    const legacyExactEntry = lookupExactCode(v2010, preferredLegacyCode)
    const legacyEntry = legacyExactEntry ?? findBestMatch(v2010, preferredLegacyCode)
    const legacy =
      legacyExactEntry?.code ||
      legacyEntry?.code ||
      normalizeIcd10Code(preferredLegacyCode, true) ||
      preferredLegacyCode

    return {
      modern: modernRaw,
      modernResolvedCode: best2019?.code ?? '',
      modernName: best2019?.title ?? '',
      exactModernMatch: Boolean(extHit || exact2019),
      legacy,
      knownIn2010: Boolean(legacyEntry),
      knownIn2019: Boolean(best2019),
      legacyName: legacyEntry?.title ?? '',
    }
  })

  const tokens = new Set<string>()
  if (normalizedQuery) tokens.add(normalizedQuery.toLowerCase())
  if (transformed.primaryCode) tokens.add(transformed.primaryCode.toLowerCase())
  for (const variant of buildCodeVariants(transformed.primaryCode)) {
    tokens.add(variant.toLowerCase())
  }
  for (const candidate of transformed.candidateCodes) tokens.add(candidate.toLowerCase())
  for (const explicit of explicitCodes) {
    tokens.add(explicit.toLowerCase())
    for (const variant of buildCodeVariants(explicit)) {
      tokens.add(variant.toLowerCase())
    }
  }

  const tokenList = Array.from(tokens).filter(Boolean)
  // Use best available catalog: prefer v2019, fall back to v2016, then v2010
  const searchCatalog =
    v2019.entries.length > 0
      ? v2019
      : db.versions['2016'].entries.length > 0
        ? db.versions['2016']
        : v2010
  let baseResults =
    tokenList.length === 0
      ? searchCatalog.entries.slice(0, 40)
      : searchCatalog.entries.filter(entry => {
          const code = entry.code.toLowerCase()
          const title = entry.title.toLowerCase()
          return tokenList.some(token => code.includes(token) || title.includes(token))
        })

  // Words, not codes: typo-tolerant ranking first (plainest name on top), then plain substring hits.
  let correctedQuery: string | undefined
  if (transformed.mode === 'text' && normalizedQuery) {
    const fuzzy = fuzzySearch(fuzzyIndexFor(searchCatalog), normalizedQuery, 80)
    const ranked = new Map(fuzzy.matches.map(({ code, title }) => [code, { code, title }]))
    for (const entry of baseResults) if (!ranked.has(entry.code)) ranked.set(entry.code, entry)
    baseResults = Array.from(ranked.values())
    correctedQuery = fuzzy.corrected ?? undefined
  }

  if (baseResults.length === 0 && rows.length > 0) {
    const fallback = new Map<string, ParsedIcdEntry>()
    for (const row of rows) {
      if (row.modernResolvedCode && row.modernName) {
        fallback.set(row.modernResolvedCode, {
          code: row.modernResolvedCode,
          title: row.modernName,
        })
      } else {
        const hit2019 = findBestMatch(v2019, row.modern)
        if (hit2019) fallback.set(hit2019.code, hit2019)
      }

      const hit2010 = lookupByCode(v2010, row.legacy)
      if (hit2010) fallback.set(hit2010.code, hit2010)
    }
    if (fallback.size > 0) {
      baseResults = Array.from(fallback.values())
    }
  }

  const prioritized = new Map<string, ParsedIcdEntry>()
  for (const row of rows) {
    if (row.exactModernMatch && row.modernResolvedCode && row.modernName) {
      prioritized.set(row.modernResolvedCode, {
        code: row.modernResolvedCode,
        title: row.modernName,
      })
    }
  }
  for (const entry of baseResults) {
    if (!prioritized.has(entry.code)) prioritized.set(entry.code, entry)
  }

  const results: IcdSearchItem[] = Array.from(prioritized.values())
    .slice(0, 80)
    .map(entry => ({
      code: entry.code,
      name: entry.title,
      category: inferCategoryLabel(entry.code),
    }))

  const response: IcdLookupResponse = {
    query,
    normalizedPrimary: transformed.primaryCode,
    rows,
    results,
    ...(correctedQuery ? { correctedQuery } : {}),
  }

  // ⚡ Optimization: Add to cache with LRU eviction
  if (lookupCache.size >= LOOKUP_CACHE_LIMIT) {
    const firstKey = lookupCache.keys().next().value
    if (firstKey !== undefined) lookupCache.delete(firstKey)
  }
  lookupCache.set(normalizedQuery, response)

  return response
}
