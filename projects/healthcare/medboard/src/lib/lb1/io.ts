// ─── IO: Parse file export RME (Excel/CSV) ───────────────────────────────────
// Port dari Python app/pipeline/io.py

import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from '@e965/xlsx'
import { CANONICAL_COLUMNS, EPUSKESMAS_COL, REQUIRED_COLUMNS } from './constants'
import type { DiagnosisMapping, ParsedExport, RawRow } from './types'

const MAX_EXCEL_FILE_BYTES = 10 * 1024 * 1024
const MAX_CSV_FILE_BYTES = 5 * 1024 * 1024
const MAX_PARSED_ROWS = 120_000
const MAX_PARSED_COLUMNS = 256

// ─── Normalisasi header ───────────────────────────────────────────────────────

function normalizeHeader(value: unknown): string {
  const raw = value == null ? '' : String(value)
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9/]+/g, '')
}

function parseCsvRows(content: string): string[][] {
  const source = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]

    if (ch === '"') {
      if (inQuotes && source[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      if (rows.length > MAX_PARSED_ROWS) {
        throw new Error('CSV terlalu besar untuk diproses aman.')
      }
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  row.push(cell)
  if (row.some((value) => value.length > 0)) rows.push(row)
  if (rows.length > MAX_PARSED_ROWS) {
    throw new Error('CSV terlalu besar untuk diproses aman.')
  }
  return rows
}

function assertFileSize(filePath: string, ext: string): void {
  const stat = fs.statSync(filePath)
  const maxBytes = ext === '.csv' ? MAX_CSV_FILE_BYTES : MAX_EXCEL_FILE_BYTES
  if (stat.size > maxBytes) {
    throw new Error(`File ${path.basename(filePath)} melebihi batas aman (${maxBytes} bytes).`)
  }
}

function assertMatrixBounds(raw: unknown[][]): void {
  if (raw.length > MAX_PARSED_ROWS) {
    throw new Error('Jumlah baris file melebihi batas aman parser LB1.')
  }
  for (const row of raw) {
    if ((row?.length ?? 0) > MAX_PARSED_COLUMNS) {
      throw new Error('Jumlah kolom file melebihi batas aman parser LB1.')
    }
  }
}

// ─── Baca raw file ke 2D array ────────────────────────────────────────────────

function readRawFile(filePath: string): unknown[][] {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.xlsx' || ext === '.xls') {
    assertFileSize(filePath, ext)
    // Hindari XLSX.readFile agar tidak kena false-positive "Cannot access file"
    // pada Windows saat file baru saja dibuat/di-scan.
    const buffer = fs.readFileSync(filePath)
    const wb = XLSX.read(buffer, {
      type: 'buffer',
      raw: true,
      cellDates: false,
    })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
    }) as unknown[][]
    assertMatrixBounds(raw)
    return raw
  }
  if (ext === '.csv') {
    assertFileSize(filePath, ext)
    const content = fs.readFileSync(filePath, 'utf-8')
    const raw = parseCsvRows(content)
    assertMatrixBounds(raw)
    return raw
  }
  throw new Error(`Format file tidak didukung: ${ext}`)
}

// ─── Score header row ────────────────────────────────────────────────────────

function scoreHeaderRow(rowValues: string[]): number {
  let score = 0
  for (const aliases of Object.values(CANONICAL_COLUMNS)) {
    if (aliases.some((alias) => rowValues.some((cell) => cell.includes(alias)))) {
      score++
    }
  }
  return score
}

// ─── Deteksi baris header ────────────────────────────────────────────────────

function detectHeaderRow(raw: unknown[][]): { row: number; score: number } {
  const maxScan = Math.min(40, raw.length)
  let bestRow = -1
  let bestScore = -1

  for (let idx = 0; idx < maxScan; idx++) {
    const normalized = (raw[idx] as unknown[])
      .map((v) => normalizeHeader(v))
      .filter((x) => x.length > 0)
    if (normalized.length === 0) continue
    const score = scoreHeaderRow(normalized)
    if (score > bestScore) {
      bestScore = score
      bestRow = idx
    }
  }

  if (bestRow < 0) throw new Error('Header row tidak ditemukan.')
  return { row: bestRow, score: bestScore }
}

// ─── Map header ke canonical columns ─────────────────────────────────────────

function mapColumns(headerRow: unknown[]): Record<string, number> {
  const mapping: Record<string, number> = {}
  const normalized = headerRow.map((v) => normalizeHeader(v))

  for (let idx = 0; idx < normalized.length; idx++) {
    const cell = normalized[idx]
    if (!cell) continue
    for (const [canonical, aliases] of Object.entries(CANONICAL_COLUMNS)) {
      if (canonical in mapping) continue
      if (aliases.some((alias) => cell.includes(alias))) {
        mapping[canonical] = idx
      }
    }
  }

  // Fallback untuk age_year
  if (!('age_year' in mapping)) {
    for (let idx = 0; idx < normalized.length; idx++) {
      if (normalized[idx].includes('UMUR')) {
        mapping['age_year'] = idx
        break
      }
    }
  }

  const missing = REQUIRED_COLUMNS.filter((col) => !(col in mapping))
  if (missing.length > 0) {
    throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(', ')}`)
  }
  return mapping
}

// ─── Parse dengan header ──────────────────────────────────────────────────────

function parseWithHeader(raw: unknown[][], sourcePath: string): ParsedExport {
  const { row: headerRow, score } = detectHeaderRow(raw)
  if (score < 3) throw new Error('Header score terlalu rendah. Fallback ke positional.')

  const colMap = mapColumns(raw[headerRow] as unknown[])
  const rows: RawRow[] = []

  for (let i = headerRow + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[]
    const visitDate = String(r[colMap['visit_date']] ?? '').trim()
    const dxCode = String(r[colMap['dx_code']] ?? '').trim()
    if (!visitDate && !dxCode) continue

    rows.push({
      visit_date: visitDate,
      dx_code: dxCode,
      sex: String(r[colMap['sex']] ?? '').trim(),
      visit_type: String(r[colMap['visit_type']] ?? '').trim(),
      age_year: String(r[colMap['age_year'] ?? -1] ?? '0').trim(),
      age_month: String(r[colMap['age_month'] ?? -1] ?? '0').trim(),
      age_day: String(r[colMap['age_day'] ?? -1] ?? '0').trim(),
      source_row: i + 1,
    })
  }

  return { rows, detectedHeaderRow: headerRow + 1, sourcePath }
}

// ─── Parse positional (format ePuskesmas) ────────────────────────────────────

function parseEpuskesmasPositional(raw: unknown[][], sourcePath: string): ParsedExport {
  const minCol = Math.max(...Object.values(EPUSKESMAS_COL))
  if (!raw[0] || (raw[0] as unknown[]).length <= minCol) {
    throw new Error('Kolom tidak cukup untuk positional mapping ePuskesmas.')
  }

  const rows: RawRow[] = []

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] as unknown[]
    const visitDate = String(r[EPUSKESMAS_COL.visit_date] ?? '').trim()
    const dx1 = String(r[EPUSKESMAS_COL.dx1] ?? '').trim()
    const dx2 = String(r[EPUSKESMAS_COL.dx2] ?? '').trim()
    const dx3 = String(r[EPUSKESMAS_COL.dx3] ?? '').trim()

    // Skip header-like rows
    const upper = visitDate.toUpperCase()
    if (upper.includes('TANGGAL') || upper.includes('TGL')) continue

    for (const dxRaw of [dx1, dx2, dx3]) {
      if (!dxRaw || dxRaw.toUpperCase() === 'NAN' || dxRaw.toUpperCase() === 'NONE') continue

      rows.push({
        visit_date: visitDate,
        dx_code: dxRaw,
        sex: String(r[EPUSKESMAS_COL.sex] ?? '').trim(),
        visit_type: String(r[EPUSKESMAS_COL.visit_type] ?? '').trim(),
        age_year: String(r[EPUSKESMAS_COL.age_year] ?? '0').trim(),
        age_month: String(r[EPUSKESMAS_COL.age_month] ?? '0').trim(),
        age_day: String(r[EPUSKESMAS_COL.age_day] ?? '0').trim(),
        source_row: i + 1,
      })
    }
  }

  return { rows, detectedHeaderRow: 0, sourcePath }
}

// ─── Deteksi apakah file adalah format REGISTER POLI DEWASA ──────────────────

function isRegisterFormat(raw: unknown[][]): boolean {
  if (!raw[0]) return false
  const firstRow = (raw[0] as unknown[]).map((v) =>
    String(v ?? '')
      .trim()
      .toUpperCase()
  )
  // Format REGISTER punya header di row 1 dengan kolom khas
  return (
    firstRow.includes('NO.') ||
    firstRow.includes('NO') ||
    firstRow.some((h) => h.includes('NAMA PASIEN')) ||
    firstRow.some((h) => h.includes('JENIS KELAMIN')) ||
    firstRow.some((h) => h.includes('ICD-X 1') || h.includes('ICDX1'))
  )
}

// ─── Parser format REGISTER POLI DEWASA ──────────────────────────────────────
// Sheet REGISTER DEWASA: expand multi-diagnosa (ICD-X 1-5) jadi baris terpisah
// KB/KL per baris diambil dari kolom Jenis Kunjungan (X), bukan per-diagnosa

function parseRegisterFormat(raw: unknown[][], sourcePath: string): ParsedExport {
  // Cari header row (bisa row 0 atau 1)
  let headerRowIdx = 0
  const firstRow = (raw[0] as unknown[]).map((v) => String(v ?? '').trim())
  if (!firstRow.some((h) => h.toUpperCase().includes('ICD'))) {
    // Header mungkin di row 0 tapi ICD ada di row 0 — cek row 0 dulu
    headerRowIdx = 0
  }

  const headerRow = (raw[headerRowIdx] as unknown[]).map((v) => String(v ?? '').trim())

  // Cari index kolom yang dibutuhkan
  const findCol = (names: string[]): number => {
    for (const name of names) {
      const idx = headerRow.findIndex((h) => h.toUpperCase() === name.toUpperCase())
      if (idx >= 0) return idx
    }
    return -1
  }

  const colTanggal = findCol(['Tanggal'])
  const colSex = findCol(['Jenis Kelamin'])
  const colUmurThn = findCol(['Umur Tahun'])
  const colUmurBln = findCol(['Umur Bulan'])
  const colUmurHari = findCol(['Umur Hari'])
  const colJenisKunj = findCol(['Jenis Kunjungan'])

  // ICD-X 1-5 dan Jenis Kasus 1-5
  const icdCols: number[] = []
  const jkCols: number[] = []
  for (let i = 1; i <= 5; i++) {
    icdCols.push(findCol([`ICD-X ${i}`, `ICD-X${i}`, `ICDX${i}`]))
    jkCols.push(findCol([`Jenis Kasus ${i}`, `Jenis Kasus${i}`]))
  }

  if (colTanggal < 0 || colSex < 0 || colUmurThn < 0 || icdCols[0] < 0) {
    throw new Error(
      'Format REGISTER: kolom wajib tidak ditemukan (Tanggal/JenisKelamin/UmurTahun/ICD-X1)'
    )
  }

  const rows: RawRow[] = []

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[]
    if (!r || r.length === 0) continue

    const visitDateRaw = String(r[colTanggal] ?? '').trim()
    if (!visitDateRaw || visitDateRaw === '0') continue

    const sex = String(r[colSex] ?? '').trim()
    const umurThnRaw = String(r[colUmurThn] ?? '0')
      .trim()
      .replace(/\s*tahun\s*/i, '')
      .trim()
    const umurBln =
      colUmurBln >= 0
        ? String(r[colUmurBln] ?? '0')
            .trim()
            .replace(/\s*bulan\s*/i, '')
            .trim()
        : '0'
    const umurHari =
      colUmurHari >= 0
        ? String(r[colUmurHari] ?? '0')
            .trim()
            .replace(/\s*hari\s*/i, '')
            .trim()
        : '0'
    // Jika umur < 1 tahun (bayi/neonatus), tulis 1 sesuai aturan pelaporan LB1
    const umurThnNum = Number.parseInt(umurThnRaw, 10) || 0
    const umurThn = umurThnNum === 0 ? '1' : umurThnRaw
    const jenisKunj = colJenisKunj >= 0 ? String(r[colJenisKunj] ?? '').trim() : ''

    // Expand tiap ICD jadi baris terpisah
    for (let d = 0; d < 5; d++) {
      const icdColIdx = icdCols[d]
      if (icdColIdx < 0) continue
      const icdCode = String(r[icdColIdx] ?? '').trim()
      if (!icdCode) continue

      // KB/KL: dari Jenis Kunjungan (untuk REGIS), bukan dari Jenis Kasus
      const visitType = jenisKunj || String(jkCols[d] >= 0 ? (r[jkCols[d]] ?? '') : '').trim()

      rows.push({
        visit_date: visitDateRaw,
        dx_code: icdCode,
        sex,
        visit_type: visitType,
        age_year: umurThn,
        age_month: umurBln,
        age_day: umurHari,
        source_row: i + 1,
      })
    }
  }

  return { rows, detectedHeaderRow: headerRowIdx + 1, sourcePath }
}

// ─── Parser format REGISTER — sheet RUJUKAN ──────────────────────────────────
// Kolom: B=Tanggal, H=Sex, I=Umur, M=Diagnosa, R=KB/KL
// Header di row 1 (index 0), data mulai row 3 (index 2, karena ada sub-header di row 2)

export function parseRegisterRujukan(filePath: string): RawRow[] {
  const buffer = fs.readFileSync(filePath)
  const wb = XLSX.read(buffer, { type: 'buffer', raw: true, cellDates: false })

  const rujukanSheet = wb.Sheets['RUJUKAN']
  if (!rujukanSheet) return []

  const raw = XLSX.utils.sheet_to_json<unknown[]>(rujukanSheet, {
    header: 1,
    defval: '',
  }) as unknown[][]
  if (raw.length < 3) return []

  const headerRow = (raw[0] as unknown[]).map((v) => String(v ?? '').trim())

  const findCol = (names: string[]): number => {
    for (const name of names) {
      const idx = headerRow.findIndex((h) => h.toUpperCase() === name.toUpperCase())
      if (idx >= 0) return idx
    }
    return -1
  }

  const colTanggal = findCol(['TANGGAL'])
  const colSex = findCol(['SEX'])
  const colUmur = findCol(['UMUR'])
  const colDiagnosa = findCol(['DIAGNOSA'])
  const colKLKB = findCol(['KL/KB', 'KB/KL'])

  if (colDiagnosa < 0) return []

  const rows: RawRow[] = []
  // Data mulai row index 2 (skip sub-header di row 1)
  for (let i = 2; i < raw.length; i++) {
    const r = raw[i] as unknown[]
    const diagnosa = String(r[colDiagnosa] ?? '').trim()
    if (!diagnosa) continue

    rows.push({
      visit_date: colTanggal >= 0 ? String(r[colTanggal] ?? '').trim() : '',
      dx_code: diagnosa,
      sex: colSex >= 0 ? String(r[colSex] ?? '').trim() : '',
      visit_type: colKLKB >= 0 ? String(r[colKLKB] ?? '').trim() : 'KL',
      age_year: colUmur >= 0 ? String(r[colUmur] ?? '0').trim() : '0',
      age_month: '0',
      age_day: '0',
      source_row: i + 1,
    })
  }

  return rows
}

// ─── Entry point: parse file export ──────────────────────────────────────────

export function parseExportFile(filePath: string): ParsedExport {
  const raw = readRawFile(filePath)

  // Cek apakah format REGISTER POLI DEWASA
  if (isRegisterFormat(raw)) {
    const parsed = parseRegisterFormat(raw, filePath)
    if (parsed.rows.length > 0) return parsed
  }

  try {
    const parsed = parseWithHeader(raw, filePath)
    if (parsed.rows.length > 0) return parsed
  } catch {
    // fallback ke positional
  }

  return parseEpuskesmasPositional(raw, filePath)
}

// ─── Baca diagnosis mapping CSV ───────────────────────────────────────────────

export function readDiagnosisMapping(filePath: string): DiagnosisMapping[] {
  if (!fs.existsSync(filePath)) return []

  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsvRows(content).filter((row) => row.some((cell) => cell.trim().length > 0))
  if (rows.length < 2) return []

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idxRaw = header.indexOf('raw_dx')
  const idxIcd = header.indexOf('icdx10')
  const idxNama = header.indexOf('jenis_penyakit')

  if (idxRaw < 0 || idxIcd < 0 || idxNama < 0) {
    throw new Error(
      'diagnosis_mapping.csv missing required columns: raw_dx, icdx10, jenis_penyakit'
    )
  }

  const result: DiagnosisMapping[] = []
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    const raw_dx = (cols[idxRaw] ?? '').trim().toUpperCase()
    const icdx10 = (cols[idxIcd] ?? '').trim().toUpperCase()
    const jenis_penyakit = (cols[idxNama] ?? '').trim().toUpperCase()
    if (raw_dx) result.push({ raw_dx, icdx10, jenis_penyakit })
  }
  return result
}
