/**
 * CDSS Pre-filter — Keyword-based disease relevance scoring
 *
 * Dari 159 penyakit di KB, filter hanya yang relevan dengan keluhan.
 * Mengurangi token ke reasoner ~80% (dari 159 → 10-15 penyakit).
 *
 * Scoring per penyakit:
 * - Keyword match di gejala: +3 per hit (field paling relevan)
 * - Keyword match di red_flags: +2 per hit
 * - Keyword match di definisi: +1 per hit
 * - Keyword match di diagnosis_banding: +1 per hit
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildBM25Index, scoreBM25 } from './bm25'
import { expandQueryWithAliases } from './symptom-aliases'

interface PenyakitEntry {
  id: string
  nama: string
  icd10: string
  kompetensi?: string
  definisi: string
  gejala?: string[]
  gejala_klinis?: string[]
  pemeriksaan_fisik?: string[]
  red_flags?: string[]
  terapi?: Array<{ obat: string; dosis: string; frek: string }>
  kriteria_rujukan?: string
  diagnosis_banding?: string[]
}

interface PenyakitDB {
  penyakit: PenyakitEntry[]
}

let _db: PenyakitEntry[] | null = null
let _bm25Index: ReturnType<typeof buildBM25Index> | null = null

function loadDB(): PenyakitEntry[] {
  if (_db) return _db
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data', 'penyakit.json'), 'utf-8')
    _db = (JSON.parse(raw) as PenyakitDB).penyakit ?? []
    return _db
  } catch {
    return []
  }
}

function getBM25Index(db: PenyakitEntry[]): ReturnType<typeof buildBM25Index> {
  if (_bm25Index) return _bm25Index
  _bm25Index = buildBM25Index(
    db.map(d => ({
      id: d.id,
      text: [
        d.nama,
        d.nama,
        d.nama, // Triple weight for disease name
        ...(d.gejala ?? []),
        ...(d.gejala ?? []),
        ...(d.gejala_klinis ?? []),
        ...(d.gejala_klinis ?? []),
        ...(d.gejala_klinis ?? []), // Triple weight for symptoms
        ...(d.red_flags ?? []),
        ...(d.red_flags ?? []), // Double weight for red flags
        d.definisi ?? '',
        ...(d.diagnosis_banding ?? []),
      ].join(' '),
    }))
  )
  return _bm25Index
}

// Normalisasi teks: lowercase, hapus tanda baca, split jadi tokens
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3)
}

// Stopwords medis Indonesia yang tidak informatif
const STOPWORDS = new Set([
  'dan',
  'atau',
  'yang',
  'dengan',
  'pada',
  'dari',
  'untuk',
  'dalam',
  'tidak',
  'ada',
  'ini',
  'itu',
  'saja',
  'sudah',
  'akan',
  'bisa',
  'dapat',
  'hari',
  'sejak',
  'sudah',
  'karena',
  'akibat',
  'oleh',
])

function extractMedicalTokens(text: string): string[] {
  return tokenize(text).filter(t => !STOPWORDS.has(t))
}

export interface FilteredDisease {
  id: string
  icd10: string
  nama: string
  definisi: string
  gejala: string[]
  pemeriksaan_fisik: string[]
  red_flags: string[]
  terapi: Array<{ obat: string; dosis: string; frek: string }>
  kriteria_rujukan: string
  diagnosis_banding: string[]
  score: number
}

export function preFilterDiseases(
  keluhanUtama: string,
  keluhanTambahan?: string,
  topN = 15
): FilteredDisease[] {
  const db = loadDB()
  if (db.length === 0) return []

  const rawQuery = [keluhanUtama, keluhanTambahan ?? ''].join(' ')
  const expandedQuery = expandQueryWithAliases(rawQuery)
  const queryTokens = extractMedicalTokens(expandedQuery)

  if (queryTokens.length === 0) {
    // Fallback: kembalikan penyakit dengan kompetensi 4A (paling umum di FKTP)
    return db
      .filter(d => d.kompetensi?.includes('4'))
      .slice(0, topN)
      .map(d => toFiltered(d, 0))
  }

  // BM25 scoring — accounts for term frequency saturation + doc length normalization + IDF
  const bm25 = getBM25Index(db)
  const bm25Scores = scoreBM25(bm25, queryTokens)
  const bm25Map = new Map(bm25Scores.map(s => [s.id, s.score]))

  const scored = db.map(d => {
    const score = bm25Map.get(d.id) ?? 0
    return { disease: d, score }
  })

  // Sort by score, ambil top N (minimum score > 0, fallback ke top N jika semua 0)
  const ranked = scored.sort((a, b) => b.score - a.score)
  const withScore = ranked.filter(r => r.score > 0)
  const result = withScore.length >= topN ? withScore.slice(0, topN) : ranked.slice(0, topN)

  return result.map(r => toFiltered(r.disease, r.score))
}

function toFiltered(d: PenyakitEntry, score: number): FilteredDisease {
  return {
    id: d.id,
    icd10: d.icd10,
    nama: d.nama,
    definisi: d.definisi ?? '',
    gejala: [...(d.gejala ?? []), ...(d.gejala_klinis ?? [])],
    pemeriksaan_fisik: d.pemeriksaan_fisik ?? [],
    red_flags: d.red_flags ?? [],
    terapi: d.terapi ?? [],
    kriteria_rujukan: d.kriteria_rujukan ?? '',
    diagnosis_banding: d.diagnosis_banding ?? [],
    score,
  }
}

export function getKBStats(): {
  total: number
  withGejala: number
  withRedFlags: number
} {
  const db = loadDB()
  return {
    total: db.length,
    withGejala: db.filter(
      d => (d.gejala && d.gejala.length > 0) || (d.gejala_klinis && d.gejala_klinis.length > 0)
    ).length,
    withRedFlags: db.filter(d => d.red_flags && d.red_flags.length > 0).length,
  }
}
