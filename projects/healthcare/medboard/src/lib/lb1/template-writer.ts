// ─── Template Writer: Tulis hasil ke template Excel LB1 ──────────────────────
// Port dari Python app/pipeline/template_writer.py

import fs from 'node:fs'
import * as XLSX from '@e965/xlsx'
import {
  BUCKET_ORDER,
  lb1ColIndex,
  SEX_ORDER,
  START_DATA_ROW,
  TOTAL_COL,
  VISIT_ORDER,
} from './constants'
import type { AggregatedRow, NormalizedRow } from './types'

interface Metadata {
  kode_puskesmas?: string
  puskesmas?: string
  jumlah_pustu?: number
  jumlah_pustu_lapor?: number
  jumlah_poskesdes?: number
  jumlah_poskesdes_lapor?: number
  [key: string]: unknown
}

function safeInt(value: unknown): number {
  const n = Number.parseInt(String(value ?? '0'), 10)
  return isNaN(n) ? 0 : n
}

// Konversi index kolom (1-based) ke nama kolom Excel (A, B, ..., Z, AA, ...)
function colIndexToName(idx: number): string {
  let name = ''
  while (idx > 0) {
    const rem = (idx - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    idx = Math.floor((idx - 1) / 26)
  }
  return name
}

export function writeLb1Output(options: {
  templatePath: string
  outputPath: string
  aggregated: AggregatedRow[]
  periodYear: number
  periodMonth: number
  metadata: Metadata
}): void {
  const { templatePath, outputPath, aggregated, periodYear, periodMonth, metadata } = options

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template LB1 tidak ditemukan: ${templatePath}`)
  }

  // Baca via buffer — hindari "Cannot access file" di Next.js context
  const templateBuffer = fs.readFileSync(templatePath)
  const wb = XLSX.read(templateBuffer, { cellStyles: true, bookVBA: true })
  const wsName = wb.SheetNames[0]
  const ws = wb.Sheets[wsName]

  // ─── Tulis metadata ───────────────────────────────────────────────────────
  ws['C3'] = { v: String(metadata.kode_puskesmas ?? '-'), t: 's' }
  ws['C4'] = { v: String(periodMonth).padStart(2, '0'), t: 's' }
  ws['C5'] = { v: String(metadata.puskesmas ?? '-'), t: 's' }
  ws['C6'] = { v: periodYear, t: 'n' }
  ws['C7'] = { v: safeInt(metadata.jumlah_pustu), t: 'n' }
  ws['C8'] = { v: safeInt(metadata.jumlah_pustu_lapor), t: 'n' }
  ws['C9'] = { v: safeInt(metadata.jumlah_poskesdes), t: 'n' }
  ws['C10'] = { v: safeInt(metadata.jumlah_poskesdes_lapor), t: 'n' }

  // ─── Clear data rows (baris 17 s/d 816) ──────────────────────────────────
  const END_COL = 61 // BI
  for (let row = START_DATA_ROW; row < START_DATA_ROW + 800; row++) {
    for (let col = 1; col <= END_COL; col++) {
      const cellAddr = `${colIndexToName(col)}${row}`
      if (ws[cellAddr]) {
        ws[cellAddr] = { v: null, t: 'z' }
      }
    }
  }

  // ─── Tulis data agregasi ──────────────────────────────────────────────────
  for (let i = 0; i < aggregated.length; i++) {
    const row = aggregated[i]
    const excelRow = START_DATA_ROW + i

    ws[`A${excelRow}`] = { v: i + 1, t: 'n' }
    ws[`B${excelRow}`] = { v: row.icdx10, t: 's' }
    ws[`C${excelRow}`] = { v: row.jenis_penyakit, t: 's' }

    let totalKbL = 0,
      totalKbP = 0,
      totalKlL = 0,
      totalKlP = 0

    for (const bucket of BUCKET_ORDER) {
      for (const visit of VISIT_ORDER) {
        for (const sex of SEX_ORDER) {
          const colIdx = lb1ColIndex(bucket, visit, sex)
          const value = row.counts[`${bucket}_${visit}_${sex}`] ?? 0
          const cellAddr = `${colIndexToName(colIdx)}${excelRow}`
          ws[cellAddr] = { v: value, t: 'n' }

          if (visit === 'KB' && sex === 'L') totalKbL += value
          else if (visit === 'KB' && sex === 'P') totalKbP += value
          else if (visit === 'KL' && sex === 'L') totalKlL += value
          else if (visit === 'KL' && sex === 'P') totalKlP += value
        }
      }
    }

    // Kolom total
    ws[`${colIndexToName(TOTAL_COL['KB_L'])}${excelRow}`] = {
      v: totalKbL,
      t: 'n',
    }
    ws[`${colIndexToName(TOTAL_COL['KB_P'])}${excelRow}`] = {
      v: totalKbP,
      t: 'n',
    }
    ws[`${colIndexToName(TOTAL_COL['KL_L'])}${excelRow}`] = {
      v: totalKlL,
      t: 'n',
    }
    ws[`${colIndexToName(TOTAL_COL['KL_P'])}${excelRow}`] = {
      v: totalKlP,
      t: 'n',
    }
    ws[`${colIndexToName(TOTAL_COL['TOTAL_L'])}${excelRow}`] = {
      v: totalKbL + totalKlL,
      t: 'n',
    }
    ws[`${colIndexToName(TOTAL_COL['TOTAL_P'])}${excelRow}`] = {
      v: totalKbP + totalKlP,
      t: 'n',
    }
  }

  // Update sheet range
  const lastRow = START_DATA_ROW + aggregated.length - 1
  ws['!ref'] = `A1:${colIndexToName(END_COL)}${Math.max(lastRow, START_DATA_ROW)}`

  // Tulis via buffer — hindari "cannot save file" di Next.js context
  const outputBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    bookSST: false,
    type: 'buffer',
  }) as Buffer
  fs.writeFileSync(outputPath, outputBuffer)
}

// ─── Metadata rows untuk format LB1 dinas ────────────────────────────────────

interface RegisMetadata {
  jenis_unit?: string
  nama_unit?: string
  kode_wilayah?: string
  nama_bulan?: string
  angka_bulan?: number | string
  tahun?: number
  kabupaten_kota?: string
}

// Konversi Date → Excel serial number (agar cell tampil sebagai tanggal di Excel)
function dateToExcelSerial(d: Date): number {
  // Excel epoch: 1 Jan 1900 = 1, dengan bug 29 Feb 1900
  return Math.round(d.getTime() / 86400000) + 25569
}

// Tulis metadata rows 1-7 ke worksheet
function writeRegisMetadata(
  ws: XLSX.WorkSheet,
  meta: RegisMetadata,
  bulanNama: string,
  bulanAngka: number,
  tahun: number
): void {
  const MONTH_ID = [
    'JANUARI',
    'FEBRUARI',
    'MARET',
    'APRIL',
    'MEI',
    'JUNI',
    'JULI',
    'AGUSTUS',
    'SEPTEMBER',
    'OKTOBER',
    'NOVEMBER',
    'DESEMBER',
  ]
  const rows: [string, string, string][] = [
    ['JENIS UNIT PELAYANAN', ':', meta.jenis_unit ?? 'DEWASA'],
    ['NAMA UNIT PELAYANAN', ':', meta.nama_unit ?? '-'],
    ['KODE WILAYAH', ':', meta.kode_wilayah ?? '-'],
    ['NAMA BULAN', ':', bulanNama || MONTH_ID[bulanAngka - 1] || '-'],
    ['ANGKA BULAN', ':', String(bulanAngka).padStart(2, '0') + "'"],
    ['TAHUN', ':', String(tahun)],
    ['KABUPATEN/KOTA', ':', meta.kabupaten_kota ?? '-'],
  ]
  for (let i = 0; i < rows.length; i++) {
    const [label, sep, val] = rows[i]
    ws[`A${i + 1}`] = { v: label, t: 's' }
    ws[`B${i + 1}`] = { v: sep, t: 's' }
    ws[`C${i + 1}`] = { v: val, t: 's' }
  }
}

// Tulis header row 10 ke worksheet
function writeRegisHeader(ws: XLSX.WorkSheet): void {
  ws['A10'] = { v: 'Tanggal', t: 's' }
  ws['B10'] = { v: 'UMUR (TH  / BL / HR)', t: 's' }
  // C10, D10 kosong
  ws['E10'] = { v: 'KODE DIAGNOSE', t: 's' }
  ws['F10'] = { v: 'SEX', t: 's' }
  ws['G10'] = { v: 'KB / KL', t: 's' }
}

/**
 * Generate file LB1 format dinas dari NormalizedRow[] valid.
 * Output: 2 sheet — REGIS (semua kunjungan) + RUJUKAN (kunjungan rujukan saja).
 *
 * Format per baris:
 *   A = Tanggal (Excel serial)  B = Umur (tahun, min 1 jika bayi)
 *   C = kosong                  D = kosong
 *   E = Kode Diagnosa           F = Sex (W/L)  G = KB/KL
 */
export function writeRegisLb1Output(options: {
  outputPath: string
  validRows: NormalizedRow[]
  rujukanRows: NormalizedRow[]
  periodYear: number
  periodMonth: number
  metadata: Record<string, unknown>
}): void {
  const { outputPath, validRows, rujukanRows, periodYear, periodMonth, metadata } = options

  const MONTH_ID = [
    'JANUARI',
    'FEBRUARI',
    'MARET',
    'APRIL',
    'MEI',
    'JUNI',
    'JULI',
    'AGUSTUS',
    'SEPTEMBER',
    'OKTOBER',
    'NOVEMBER',
    'DESEMBER',
  ]
  const bulanNama = MONTH_ID[periodMonth - 1] ?? String(periodMonth)

  const regisWs: XLSX.WorkSheet = {}
  const rujukanWs: XLSX.WorkSheet = {}

  const meta: RegisMetadata = {
    jenis_unit: String(metadata.jenis_unit ?? 'DEWASA'),
    nama_unit: String(metadata.puskesmas ?? metadata.nama_unit ?? '-'),
    kode_wilayah: String(metadata.kode_wilayah ?? '-'),
    nama_bulan: bulanNama,
    angka_bulan: periodMonth,
    tahun: periodYear,
    kabupaten_kota: String(metadata.kabupaten_kota ?? '-'),
  }

  // ── REGIS sheet ─────────────────────────────────────────────────────────────
  writeRegisMetadata(regisWs, meta, bulanNama, periodMonth, periodYear)
  // Row 8-9 kosong
  writeRegisHeader(regisWs)

  let regisRow = 11 // Data mulai row 11
  for (const row of validRows) {
    const umurThn = Math.max(1, row.age_year) // min 1 untuk bayi < 1 tahun
    const sexOut = row.sex === 'P' ? 'W' : 'L'
    const serial = dateToExcelSerial(row.visit_date)

    regisWs[`A${regisRow}`] = { v: serial, t: 'n', z: 'DD/MM/YYYY' }
    regisWs[`B${regisRow}`] = { v: umurThn, t: 'n' }
    // C, D kosong
    regisWs[`E${regisRow}`] = { v: row.dx_code, t: 's' }
    regisWs[`F${regisRow}`] = { v: sexOut, t: 's' }
    regisWs[`G${regisRow}`] = { v: row.visit_type, t: 's' }
    regisRow++
  }

  regisWs['!ref'] = `A1:G${Math.max(regisRow - 1, 11)}`

  // ── RUJUKAN sheet ───────────────────────────────────────────────────────────
  writeRegisMetadata(rujukanWs, meta, bulanNama, periodMonth, periodYear)
  writeRegisHeader(rujukanWs)

  let rujukanRow = 11
  for (const row of rujukanRows) {
    const umurThn = Math.max(1, row.age_year)
    const sexOut = row.sex === 'P' ? 'W' : 'L'
    const serial = dateToExcelSerial(row.visit_date)

    rujukanWs[`A${rujukanRow}`] = { v: serial, t: 'n', z: 'DD/MM/YYYY' }
    rujukanWs[`B${rujukanRow}`] = { v: umurThn, t: 'n' }
    rujukanWs[`E${rujukanRow}`] = { v: row.dx_code, t: 's' }
    rujukanWs[`F${rujukanRow}`] = { v: sexOut, t: 's' }
    rujukanWs[`G${rujukanRow}`] = { v: row.visit_type, t: 's' }
    rujukanRow++
  }

  rujukanWs['!ref'] = `A1:G${Math.max(rujukanRow - 1, 11)}`

  // ── Tulis workbook ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, regisWs, 'REGIS')
  XLSX.utils.book_append_sheet(wb, rujukanWs, 'RUJUKAN')

  const outputBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    bookSST: false,
    type: 'buffer',
  }) as Buffer
  fs.writeFileSync(outputPath, outputBuffer)
}
