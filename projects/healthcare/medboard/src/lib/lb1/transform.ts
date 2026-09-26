// ─── Transform: normalisasi + agregasi data kunjungan ────────────────────────
// Port dari Python app/pipeline/transform.py

import { BUCKET_ORDER, SEX_MAP, SEX_ORDER, VISIT_MAP, VISIT_ORDER } from './constants'
import { normalizeIcd10Code, transformToIcd10_2010 } from './icd10-2010'
import type {
  AggregatedRow,
  DiagnosisMapping,
  InvalidRow,
  NormalizedData,
  NormalizedRow,
  RawRow,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function uniqueCodes(values: string[]): string[] {
  const normalized = values.map(value => value.trim().toUpperCase()).filter(Boolean)
  return Array.from(new Set(normalized))
}

function buildMappingLookup(mapping: DiagnosisMapping[]): Map<string, DiagnosisMapping> {
  const lookup = new Map<string, DiagnosisMapping>()

  for (const entry of mapping) {
    const raw = entry.raw_dx.trim().toUpperCase()
    const normalizedWithSubcode = normalizeIcd10Code(raw, false)
    const normalized2010 = normalizeIcd10Code(raw, true)

    if (raw) lookup.set(raw, entry)
    if (normalizedWithSubcode) lookup.set(normalizedWithSubcode, entry)
    if (normalized2010) lookup.set(normalized2010, entry)
  }

  return lookup
}

function findMappingForCodes(
  codes: string[],
  mappingLookup: Map<string, DiagnosisMapping>
): { matchedCode: string; mapping: DiagnosisMapping | null } {
  const candidates = uniqueCodes(codes)

  for (const candidate of candidates) {
    const variants = uniqueCodes([
      candidate,
      normalizeIcd10Code(candidate, false),
      normalizeIcd10Code(candidate, true),
    ])

    for (const key of variants) {
      const match = mappingLookup.get(key)
      if (match) {
        return { matchedCode: key, mapping: match }
      }
    }
  }

  return { matchedCode: candidates[0] ?? '', mapping: null }
}

// Parse tanggal dari berbagai format (termasuk Excel serial number)
function parseDate(value: unknown): Date | null {
  if (value == null) return null

  // Excel serial number (number)
  if (typeof value === 'number') {
    // Excel epoch: 1 Jan 1900 = serial 1, tapi ada bug 1900-02-29
    const d = new Date(Math.round((value - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) ? null : d
  }

  const text = String(value).trim()
  if (!text) return null

  // Coba sebagai Excel serial string
  if (/^\d+(\.\d+)?$/.test(text)) {
    const num = Number.parseFloat(text)
    const d = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime())) return d
  }

  // Coba berbagai format tanggal
  // DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const d = new Date(
      Number.parseInt(dmyMatch[3]),
      Number.parseInt(dmyMatch[2]) - 1,
      Number.parseInt(dmyMatch[1])
    )
    if (!isNaN(d.getTime())) return d
  }

  // ISO format YYYY-MM-DD
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const d = new Date(
      Number.parseInt(isoMatch[1]),
      Number.parseInt(isoMatch[2]) - 1,
      Number.parseInt(isoMatch[3])
    )
    if (!isNaN(d.getTime())) return d
  }

  const parsed = new Date(text)
  return isNaN(parsed.getTime()) ? null : parsed
}

function toInt(value: unknown): number {
  const text = String(value ?? '').trim()
  if (!text || text.toUpperCase() === 'NAN') return 0
  const normalized = text.replace(',', '.')
  const n = Number.parseFloat(normalized)
  return Number.isNaN(n) ? -1 : Math.trunc(n)
}

// Bucket usia sesuai format LB1
function ageBucket(years: number, months: number, days: number): string | null {
  if (years < 0 || months < 0 || days < 0) return null

  const totalDays = years * 365 + months * 30 + days
  if (totalDays <= 7) return '0_7_hari'
  if (totalDays <= 28) return '8_28_hari'
  if (years < 1) return '1_11_bulan'
  if (years < 5) return '1_4_tahun'
  if (years < 10) return '5_9_tahun'
  if (years < 15) return '10_14_tahun'
  if (years < 20) return '15_19_tahun'
  if (years < 45) return '20_44_tahun'
  if (years < 55) return '45_54_tahun'
  if (years < 60) return '55_59_tahun'
  if (years < 65) return '60_64_tahun'
  if (years < 70) return '65_69_tahun'
  return '70_tahun'
}

// ─── Normalize records ────────────────────────────────────────────────────────

export function normalizeRecords(
  rows: RawRow[],
  periodYear: number,
  periodMonth: number,
  options: {
    validDayMin?: number
    validDayMax?: number
    stripIcdSubcode?: boolean
    excludeCodes?: string[]
  } = {}
): NormalizedData {
  const { validDayMin = 1, validDayMax = 25, stripIcdSubcode = true, excludeCodes = [] } = options

  const excludeSet = new Set(excludeCodes.map(x => x.trim().toUpperCase()))
  const valid: NormalizedRow[] = []
  const invalid: InvalidRow[] = []

  for (const row of rows) {
    const rowErrors: string[] = []

    // Validasi tanggal
    const dt = parseDate(row.visit_date)
    let visitDate: Date = new Date()
    if (!dt) {
      rowErrors.push('invalid_visit_date')
    } else {
      visitDate = dt
      if (dt.getFullYear() !== periodYear || dt.getMonth() + 1 !== periodMonth) {
        rowErrors.push('outside_period_month')
      }
      if (dt.getDate() < validDayMin || dt.getDate() > validDayMax) {
        rowErrors.push(`outside_day_${validDayMin}_${validDayMax}`)
      }
    }

    // Ekstrak ICD
    const dxTransform = transformToIcd10_2010(row.dx_code, {
      stripSubcode: stripIcdSubcode,
    })
    const dxCode = dxTransform.primaryCode
    const dxCandidates = uniqueCodes([dxCode, ...dxTransform.candidateCodes])
    if (!dxCode) {
      rowErrors.push('empty_dx_code')
    } else if (excludeSet.has(dxCode)) {
      rowErrors.push('excluded_dx_code')
    }

    // Normalisasi jenis kelamin
    const sexText = normalizeText(row.sex).replace(/[^A-Z]/g, '')
    const sex = SEX_MAP[sexText]
    if (!sex) rowErrors.push('invalid_sex')

    // Normalisasi jenis kunjungan
    const visitText = normalizeText(row.visit_type).replace(/[^A-Z]/g, '')
    const visitType = VISIT_MAP[visitText]
    if (!visitType) rowErrors.push('invalid_visit_type')

    // Hitung bucket usia
    const ageYear = toInt(row.age_year)
    const ageMonth = toInt(row.age_month)
    const ageDay = toInt(row.age_day)
    const bucket = ageBucket(ageYear, ageMonth, ageDay)
    if (!bucket) rowErrors.push('invalid_age_bucket')

    if (rowErrors.length > 0) {
      invalid.push({ ...row, error_reason: rowErrors.join(',') })
    } else {
      valid.push({
        visit_date: visitDate,
        dx_code: dxCode,
        dx_candidates: dxCandidates.length > 0 ? dxCandidates : [dxCode],
        sex: sex as 'L' | 'P',
        visit_type: visitType as 'KB' | 'KL',
        age_year: ageYear,
        age_month: ageMonth,
        age_day: ageDay,
        age_bucket: bucket!,
        source_row: row.source_row,
      })
    }
  }

  return { valid, invalid }
}

// ─── Agregasi untuk LB1 ───────────────────────────────────────────────────────

export function aggregateForLb1(
  valid: NormalizedRow[],
  mapping: DiagnosisMapping[]
): AggregatedRow[] {
  if (valid.length === 0) return []

  // Build lookup mapping (mendukung alias/normalisasi ICD-10 2010)
  const mappingLookup = buildMappingLookup(mapping)

  // Gabungkan mapping ke setiap row
  type EnrichedRow = NormalizedRow & { icdx10: string; jenis_penyakit: string }
  const enriched: EnrichedRow[] = valid.map(row => {
    const { matchedCode, mapping: m } = findMappingForCodes(
      [row.dx_code, ...row.dx_candidates],
      mappingLookup
    )
    const resolvedCode = matchedCode || row.dx_code
    return {
      ...row,
      icdx10: m?.icdx10 ?? resolvedCode,
      jenis_penyakit: m?.jenis_penyakit ?? resolvedCode,
    }
  })

  // Hitung counts per (icdx10, jenis_penyakit, age_bucket, visit_type, sex)
  const countMap = new Map<string, number>()
  for (const row of enriched) {
    const key = `${row.icdx10}||${row.jenis_penyakit}||${row.age_bucket}||${row.visit_type}||${row.sex}`
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  }

  // Kumpulkan semua kombinasi icdx10+jenis_penyakit
  const diseaseMap = new Map<string, AggregatedRow>()
  for (const row of enriched) {
    const dk = `${row.icdx10}||${row.jenis_penyakit}`
    if (!diseaseMap.has(dk)) {
      diseaseMap.set(dk, {
        icdx10: row.icdx10,
        jenis_penyakit: row.jenis_penyakit,
        counts: {},
      })
    }
  }

  // Isi counts
  for (const [key, count] of countMap) {
    const [icdx10, jenis_penyakit, bucket, visit, sex] = key.split('||')
    const dk = `${icdx10}||${jenis_penyakit}`
    const agg = diseaseMap.get(dk)
    if (agg) {
      agg.counts[`${bucket}_${visit}_${sex}`] =
        (agg.counts[`${bucket}_${visit}_${sex}`] ?? 0) + count
    }
  }

  // Sort by icdx10
  return Array.from(diseaseMap.values()).sort((a, b) => a.icdx10.localeCompare(b.icdx10))
}

// ─── Hitung statistik summary dari valid rows ─────────────────────────────────

export function computeUnmappedDx(valid: NormalizedRow[], mapping: DiagnosisMapping[]): string[] {
  const mappingLookup = buildMappingLookup(mapping)
  const unmapped = new Set<string>()

  for (const row of valid) {
    const { mapping: mapped } = findMappingForCodes(
      [row.dx_code, ...row.dx_candidates],
      mappingLookup
    )

    if (!mapped && row.dx_code) {
      unmapped.add(row.dx_code.toUpperCase())
    }
  }

  return Array.from(unmapped).sort()
}

export function countDuplicates(valid: NormalizedRow[]): number {
  const seen = new Map<string, number>()
  for (const row of valid) {
    const key = [
      row.visit_date.toISOString().slice(0, 10),
      row.dx_code,
      row.sex,
      row.visit_type,
      row.age_year,
      row.age_month,
      row.age_day,
    ].join('|')
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  let total = 0
  for (const count of seen.values()) {
    if (count > 1) total += count
  }
  return total
}

export function countInvalidReasons(invalid: InvalidRow[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of invalid) {
    for (const reason of row.error_reason.split(',')) {
      const r = reason.trim()
      if (r) result[r] = (result[r] ?? 0) + 1
    }
  }
  return result
}

// ─── Build display rows untuk halaman Report ──────────────────────────────────

export function buildDisplayRows(
  aggregated: AggregatedRow[],
  periodYear: number,
  periodMonth: number
): Array<{
  rm: string
  nama: string
  tanggal: string
  diagnosis: string
  icd: string
  dokter: string
  status: 'SELESAI' | 'RAWAT INAP' | 'RUJUK'
}> {
  const MONTH_ID = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ]
  const period = `${MONTH_ID[periodMonth - 1]} '${String(periodYear).slice(-2)}`

  return aggregated.slice(0, 50).map((row, i) => {
    // Hitung total kunjungan untuk row ini
    const total = Object.values(row.counts).reduce((s, v) => s + v, 0)
    // Tentukan status berdasarkan total
    let status: 'SELESAI' | 'RAWAT INAP' | 'RUJUK' = 'SELESAI'
    if (total === 0) status = 'RUJUK'
    else if (total >= 10) status = 'RAWAT INAP'

    return {
      rm: `LB1-${String(i + 1).padStart(3, '0')}`,
      nama: row.jenis_penyakit,
      tanggal: period,
      diagnosis: row.jenis_penyakit,
      icd: row.icdx10,
      dokter: 'LB1 Engine',
      status,
    }
  })
}

// Re-export untuk dipakai engine
export { BUCKET_ORDER, SEX_ORDER, VISIT_ORDER }
