import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import type { IcdLookupResponse } from '@/lib/icd/dynamic-db'
import { type OnlineIcdResult, searchIcdOnline } from '@/lib/icd/online-api'
import { ICD_MAP } from '@/lib/lb1/icd-mapping'
import { normalizeIcd10Code, transformToIcd10_2010 } from '@/lib/lb1/icd10-2010'
import { resolveAppRootFile } from '@/lib/server/app-root-file'

type ClinicalIcdSourceMode = 'legacy' | 'shadow' | 'abyss'

interface PenyakitEntry {
  nama: string
  nama_en: string
  icd10: string
}

let penyakitCache: PenyakitEntry[] | null = null
let unsupportedModeLogged = false
const PENYAKIT_JSON_PATH = resolveAppRootFile('public/data/penyakit.json')

function getClinicalIcdSourceMode(): ClinicalIcdSourceMode {
  const value = process.env.CLINICAL_ICD_SOURCE_MODE?.trim().toLowerCase()
  if (value === 'shadow' || value === 'abyss') return value
  return 'legacy'
}

function ensureSupportedMode(mode: ClinicalIcdSourceMode) {
  if (mode === 'legacy') return
  if (unsupportedModeLogged) return

  console.warn(
    `[ICDx Adapter] Requested mode "${mode}" falls back to legacy because dashboard has no linked Abyss clinical-assets dependency yet.`,
  )
  unsupportedModeLogged = true
}

function loadPenyakit(): PenyakitEntry[] {
  if (penyakitCache) return penyakitCache
  try {
    const raw = JSON.parse(fs.readFileSync(PENYAKIT_JSON_PATH, 'utf-8')) as
      | { penyakit?: PenyakitEntry[] }
      | PenyakitEntry[]
    penyakitCache = Array.isArray(raw) ? raw : (raw.penyakit ?? [])
  } catch {
    penyakitCache = []
  }
  return penyakitCache
}

function searchLocalPenyakit(q: string): Array<{ code: string; name: string; nameId: string }> {
  if (!q) return []
  const lower = q.toLowerCase()
  return loadPenyakit()
    .filter(
      p =>
        p.icd10?.toLowerCase().includes(lower) ||
        p.nama?.toLowerCase().includes(lower) ||
        p.nama_en?.toLowerCase().includes(lower),
    )
    .map(p => ({ code: p.icd10, name: p.nama_en || p.nama, nameId: p.nama }))
}

function inferCategory(code: string): string {
  const ch = code.trim().toUpperCase()[0]
  return ch ? `CHAPTER ${ch}` : 'ICD-10'
}

function extractExplicitCodes(input: string): string[] {
  const matches = input.toUpperCase().match(/\b([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?)\b/g) ?? []
  return Array.from(new Set(matches))
}

function searchIcdMap(q: string): Array<{ code: string; name: string }> {
  if (!q) return []
  const lower = q.toLowerCase()
  return Object.values(ICD_MAP)
    .filter(entry => entry.code.toLowerCase().includes(lower) || entry.name.toLowerCase().includes(lower))
    .map(entry => ({ code: entry.code, name: entry.name }))
}

function mergeResults(
  local: Array<{ code: string; name: string }>,
  online: OnlineIcdResult[],
): Array<{ code: string; name: string }> {
  const seen = new Set<string>()
  const merged: Array<{ code: string; name: string }> = []

  for (const item of local) {
    const key = item.code.toUpperCase()
    if (!item.code || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  for (const item of online) {
    const key = item.code.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ code: item.code, name: item.name })
  }

  return merged
}

function buildConversionRows(query: string, allResults: Array<{ code: string; name: string }>) {
  const transformed = transformToIcd10_2010(query, { stripSubcode: false })
  const explicitCodes = extractExplicitCodes(query)

  let codesForRows: string[] = explicitCodes
  if (codesForRows.length === 0 && transformed.mode === 'range') {
    codesForRows = transformed.candidateCodes
  }
  if (codesForRows.length === 0 && transformed.primaryCode) {
    codesForRows = [transformed.primaryCode]
  }
  if (codesForRows.length === 0) return []

  const byCode = new Map(allResults.map(result => [result.code.toUpperCase(), result]))

  return codesForRows.slice(0, 10).map(rawCode => {
    const normFull = normalizeIcd10Code(rawCode, false) || rawCode
    const normHead = normalizeIcd10Code(rawCode, true) || rawCode

    const hit =
      byCode.get(rawCode.toUpperCase()) ??
      byCode.get(normFull.toUpperCase()) ??
      allResults.find(result => result.code.toUpperCase().startsWith(normHead.toUpperCase()))

    const icdMapEntry = ICD_MAP[rawCode] ?? ICD_MAP[normFull] ?? ICD_MAP[normHead]
    const resolvedName = hit?.name ?? icdMapEntry?.name ?? ''
    const resolvedCode = hit?.code ?? normFull
    const knownIn2010 = Boolean(icdMapEntry) || Boolean(normalizeIcd10Code(normHead, true))

    return {
      modern: rawCode,
      modernResolvedCode: resolvedCode,
      modernName: resolvedName,
      exactModernMatch: Boolean(hit),
      legacy: normFull,
      knownIn2010,
      knownIn2019: Boolean(hit),
      legacyName: resolvedName,
    }
  })
}

function buildEmptyLookupResponse(): IcdLookupResponse {
  return {
    query: '',
    normalizedPrimary: '',
    results: [],
    rows: [],
  }
}

async function lookupIcdFromLegacySources(query: string): Promise<IcdLookupResponse> {
  const { lookupIcdDynamically } = await import('@/lib/icd/dynamic-db')
  const local = lookupIcdDynamically(query)
  if (local.results.length > 0) {
    return { ...local, query }
  }

  if (!query.trim()) {
    return buildEmptyLookupResponse()
  }

  const [penyakitResults, icdMapResults, onlineResults] = await Promise.all([
    Promise.resolve(searchLocalPenyakit(query)),
    Promise.resolve(searchIcdMap(query)),
    searchIcdOnline(query, 40).catch(() => [] as OnlineIcdResult[]),
  ])

  const localCombined = [...penyakitResults, ...icdMapResults]
  const allResults = mergeResults(localCombined, onlineResults)
  const transformed = transformToIcd10_2010(query, { stripSubcode: false })

  return {
    query,
    normalizedPrimary: transformed.primaryCode,
    results: allResults.slice(0, 80).map(({ code, name }) => ({
      code,
      name,
      category: inferCategory(code),
    })),
    rows: buildConversionRows(query, allResults),
  }
}

export async function lookupDashboardIcd(query: string): Promise<IcdLookupResponse> {
  const mode = getClinicalIcdSourceMode()
  ensureSupportedMode(mode)
  return lookupIcdFromLegacySources(query)
}
