/**
 * CDSS Retrieval Filter
 *
 * Local lexical ranking over `penyakit.json`.
 * This replaces the previous cloud embedding dependency so the engine
 * can run without legacy cloud credentials.
 */

import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FilteredDisease } from './pre-filter'

interface PenyakitEntry {
  id?: string
  icd10: string
  nama: string
  definisi?: string
  gejala?: string[]
  gejala_klinis?: string[]
  pemeriksaan_fisik?: string[]
  red_flags?: string[]
  terapi?: Array<{ obat: string; dosis: string; frek: string }>
  kriteria_rujukan?: string
  diagnosis_banding?: string[]
}

let _penyakitMap: Map<string, PenyakitEntry[]> | null = null
let _penyakitEntries: PenyakitEntry[] | null = null

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeText(value: string): string {
  return normalizeWhitespace(value).toLowerCase()
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map(token => token.replace(/[^a-z0-9]+/g, ''))
    .filter(token => token.length >= 3)
}

function loadDiseases(): PenyakitEntry[] {
  if (_penyakitEntries) return _penyakitEntries

  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data', 'penyakit.json'), 'utf-8')
    const db = JSON.parse(raw) as { penyakit: PenyakitEntry[] }
    _penyakitEntries = db.penyakit ?? []
    _penyakitMap = new Map()

    for (const disease of _penyakitEntries) {
      const key = buildEntryKey(disease.icd10, disease.nama)
      const current = _penyakitMap.get(key) ?? []
      current.push(disease)
      _penyakitMap.set(key, current)
    }

    return _penyakitEntries
  } catch {
    _penyakitEntries = []
    _penyakitMap = new Map()
    return []
  }
}

function getPenyakitMap(): Map<string, PenyakitEntry[]> {
  if (!_penyakitMap) loadDiseases()
  return _penyakitMap ?? new Map()
}

function buildEntryKey(icd10: string, nama: string): string {
  return `${icd10.trim().toUpperCase()}::${normalizeText(nama)}`
}

function scoreOverlap(queryTokens: string[], text: string): number {
  if (!text) return 0
  const normalizedText = normalizeText(text)
  if (!normalizedText) return 0

  let score = 0
  const textTokens = new Set(tokenize(normalizedText))
  for (const token of queryTokens) {
    if (textTokens.has(token)) score += 1
    if (normalizedText.includes(token)) score += 0.25
  }

  const queryText = normalizeText(queryTokens.join(' '))
  if (queryText && normalizedText.includes(queryText)) score += 2
  return score
}

function toFilteredDisease(entry: PenyakitEntry, score: number): FilteredDisease {
  return {
    id: entry.id ?? `${entry.icd10}:${entry.nama}`,
    icd10: entry.icd10,
    nama: entry.nama,
    definisi: entry.definisi ?? '',
    gejala: [...(entry.gejala ?? []), ...(entry.gejala_klinis ?? [])],
    pemeriksaan_fisik: entry.pemeriksaan_fisik ?? [],
    red_flags: entry.red_flags ?? [],
    terapi: entry.terapi ?? [],
    kriteria_rujukan: entry.kriteria_rujukan ?? '',
    diagnosis_banding: entry.diagnosis_banding ?? [],
    score,
  }
}

export async function embeddingFilterDiseases(
  keluhanUtama: string,
  keluhanTambahan: string | undefined,
  topN = 15,
): Promise<FilteredDisease[]> {
  const diseases = loadDiseases()
  if (diseases.length === 0) throw new Error('Penyakit database belum dimuat')

  const query = normalizeText([keluhanUtama, keluhanTambahan ?? ''].join(' '))
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  const scored = diseases
    .map((disease) => {
      const symptoms = [...(disease.gejala ?? []), ...(disease.gejala_klinis ?? [])].join(' ')
      const banding = (disease.diagnosis_banding ?? []).join(' ')
      const redFlags = (disease.red_flags ?? []).join(' ')

      const score =
        scoreOverlap(queryTokens, disease.nama) * 3 +
        scoreOverlap(queryTokens, disease.definisi ?? '') +
        scoreOverlap(queryTokens, symptoms) * 1.5 +
        scoreOverlap(queryTokens, banding) * 0.75 +
        scoreOverlap(queryTokens, redFlags) * 0.5

      return {
        key: buildEntryKey(disease.icd10, disease.nama),
        score,
      }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)

  const penyakitMap = getPenyakitMap()

  return scored
    .flatMap(({ key, score }) => {
      const entries = penyakitMap.get(key) ?? []
      return entries.map(entry => toFilteredDisease(entry, Math.round(score * 100)))
    })
    .slice(0, topN)
}

export function isEmbeddingReady(): boolean {
  return loadDiseases().length > 0
}
