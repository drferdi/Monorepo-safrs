// ─── LB1 Engine — Pure TypeScript, no Python dependency ──────────────────────
// Pipeline: (RME export via Playwright) → parse Excel → normalize → aggregate
//           → write template Excel → save summary JSON
//
// Port dari Python: app/pipeline/service.py + app/automation/rme_export.py

import fs from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadLb1Config, pathExists, resolveLb1RuntimePaths } from './config'
import { parseExportFile, parseRegisterRujukan, readDiagnosisMapping } from './io'
import { writeLb1Output, writeRegisLb1Output } from './template-writer'
import {
  aggregateForLb1,
  buildDisplayRows,
  computeUnmappedDx,
  countDuplicates,
  countInvalidReasons,
  normalizeRecords,
} from './transform'
import type { EncounterRow, LB1RunResult, LB1Summary, LB1SummaryFile, ParsedExport } from './types'

// ─── Cari kandidat file export di data source dir ────────────────────────────

async function listExportCandidates(dir: string, year: number, month: number): Promise<string[]> {
  if (!(await pathExists(dir))) return []

  const files = await readdir(dir)
  const mm = String(month).padStart(2, '0')
  const allowedPrefixes = ['rme_export_', 'encounters_', 'export_', 'kunjungan_', 'REGIS_', 'LB1_']
  const exportCandidates = files.filter(
    (f) =>
      (f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv')) &&
      allowedPrefixes.some((prefix) => f.startsWith(prefix))
  )
  if (exportCandidates.length === 0) return []

  const filesWithMeta = (
    await Promise.all(
      exportCandidates.map(async (name) => {
        const fullPath = path.join(dir, name)
        try {
          const fileStat = await stat(fullPath)
          return { name, fullPath, mtimeMs: fileStat.mtimeMs }
        } catch {
          return null
        }
      })
    )
  ).filter((entry): entry is { name: string; fullPath: string; mtimeMs: number } => Boolean(entry))

  if (filesWithMeta.length === 0) return []

  // Cari file Excel: rme_export_YYYY_MM_*.xlsx atau encounters_YYYY_MM*.xlsx
  const patterns = [
    `rme_export_${year}_${mm}`,
    `encounters_${year}_${mm}`,
    `export_${year}_${mm}`,
    `kunjungan_${year}_${mm}`,
  ]

  const ordered: string[] = []
  const seen = new Set<string>()

  const pushUnique = (fullPath: string) => {
    if (seen.has(fullPath)) return
    seen.add(fullPath)
    ordered.push(fullPath)
  }

  for (const pattern of patterns) {
    filesWithMeta
      .filter((f) => f.name.startsWith(pattern))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .forEach((entry) => pushUnique(entry.fullPath))
  }

  // Tambahkan kandidat lain berdasarkan mtime terbaru.
  filesWithMeta.sort((a, b) => b.mtimeMs - a.mtimeMs).forEach((entry) => pushUnique(entry.fullPath))

  return ordered
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isFileAccessError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('cannot access file') ||
    normalized.includes('eperm') ||
    normalized.includes('ebusy') ||
    normalized.includes('resource busy') ||
    normalized.includes('permission denied') ||
    normalized.includes('being used by another process') ||
    normalized.includes('sharing violation')
  )
}

async function tryParseExportCandidate(filePath: string): Promise<{
  parsed: ParsedExport | null
  errorMessage: string
}> {
  const maxAttempts = 4
  let lastErrorMessage = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return {
        parsed: parseExportFile(filePath),
        errorMessage: '',
      }
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error)
      const shouldRetry = isFileAccessError(lastErrorMessage) && attempt < maxAttempts
      if (shouldRetry) {
        await sleep(attempt * 1200)
        continue
      }
      break
    }
  }

  return {
    parsed: null,
    errorMessage: lastErrorMessage || 'Gagal membaca file export.',
  }
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
  if (!text) return fallback
  if (['true', '1', 'yes', 'y'].includes(text)) return true
  if (['false', '0', 'no', 'n'].includes(text)) return false
  return fallback
}

function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseValidDayRange(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length < 2) return [1, 25]
  const minDay = parseInteger(value[0], 1)
  const maxDay = parseInteger(value[1], 25)
  const normalizedMin = Math.min(31, Math.max(1, minDay))
  const normalizedMax = Math.min(31, Math.max(1, maxDay))
  return normalizedMin <= normalizedMax
    ? [normalizedMin, normalizedMax]
    : [normalizedMax, normalizedMin]
}

function normalizeExcludeCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return ['Z00']
  const normalized = value
    .map((item) =>
      String(item ?? '')
        .trim()
        .toUpperCase()
    )
    .filter(Boolean)
  return normalized.length > 0 ? Array.from(new Set(normalized)) : ['Z00']
}

function parseMetadata(value: unknown): Record<string, unknown> {
  const src =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  const readText = (key: string, fallback = '-'): string => {
    const text = String(src[key] ?? '').trim()
    return text || fallback
  }
  const readInt = (key: string): number => {
    const parsed = parseInteger(src[key], 0)
    return parsed >= 0 ? parsed : 0
  }

  return {
    kode_puskesmas: readText('kode_puskesmas', '-'),
    puskesmas: readText('puskesmas', '-'),
    jumlah_pustu: readInt('jumlah_pustu'),
    jumlah_pustu_lapor: readInt('jumlah_pustu_lapor'),
    jumlah_poskesdes: readInt('jumlah_poskesdes'),
    jumlah_poskesdes_lapor: readInt('jumlah_poskesdes_lapor'),
  }
}

function resolveLb1Paths(config: ReturnType<typeof loadLb1Config>): {
  dataDir: string
  outputDir: string
  templatePath: string
  mappingPath: string
} {
  return resolveLb1RuntimePaths(config)
}

async function exportLb1RmeData(
  config: NonNullable<ReturnType<typeof loadLb1Config>>['rme'],
  periodYear: number,
  periodMonth: number,
  downloadDir: string,
  evidenceDir: string
): Promise<string> {
  const { exportRmeVisitData } = await import('./rme-export')
  return exportRmeVisitData(config, periodYear, periodMonth, downloadDir, evidenceDir)
}

function toLb1SummaryFromUnknown(payload: unknown): LB1Summary | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const data = payload as Record<string, unknown>

  const periodYear = Number(data.periodYear)
  const periodMonth = Number(data.periodMonth)
  const totalKunjungan = Number(data.totalKunjungan)
  if (
    Number.isFinite(periodYear) &&
    Number.isFinite(periodMonth) &&
    Number.isFinite(totalKunjungan)
  ) {
    return {
      periodYear,
      periodMonth,
      totalKunjungan,
      rawatJalan: Number(data.rawatJalan) || 0,
      rawatInap: Number(data.rawatInap) || 0,
      rujukan: Number(data.rujukan) || 0,
      unmappedDx: Array.isArray(data.unmappedDx) ? data.unmappedDx.map((x) => String(x)) : [],
      generatedAt: String(data.generatedAt ?? new Date().toISOString()),
    }
  }

  const snakeYear = Number(data.period_year)
  const snakeMonth = Number(data.period_month)
  const snakeValid = Number(data.valid_count)
  if (Number.isFinite(snakeYear) && Number.isFinite(snakeMonth) && Number.isFinite(snakeValid)) {
    return {
      periodYear: snakeYear,
      periodMonth: snakeMonth,
      totalKunjungan: snakeValid,
      rawatJalan: 0,
      rawatInap: 0,
      rujukan: Number(data.unmapped_dx_count) || 0,
      unmappedDx: Array.isArray(data.unmapped_dx) ? data.unmapped_dx.map((x) => String(x)) : [],
      generatedAt: String(data.timestamp ?? new Date().toISOString()),
    }
  }

  return null
}

// ─── Public: jalankan full pipeline LB1 ──────────────────────────────────────

export async function runLb1Engine(
  year: number,
  month: number,
  options: { forceRmeExport?: boolean } = {}
): Promise<LB1RunResult> {
  const start = Date.now()

  try {
    const config = loadLb1Config()
    const { dataDir, outputDir, templatePath, mappingPath } = resolveLb1Paths(config)

    // Pipeline config (dengan defaults)
    const stripIcdSubcode = parseBoolean(config?.pipeline?.strip_icd_subcode, true)
    const excludeCodes = normalizeExcludeCodes(config?.pipeline?.exclude_codes)
    const [validDayMin, validDayMax] = parseValidDayRange(config?.pipeline?.valid_date_range)
    const metadata = parseMetadata(config?.lb1?.metadata)

    // ── Step 1: Cari file export ──────────────────────────────────────────────
    const exportCandidates = await listExportCandidates(dataDir, year, month)
    const shouldForceRmeExport = options.forceRmeExport ?? false

    if (shouldForceRmeExport && config?.rme?.base_url?.trim()) {
      try {
        const exportedPath = await exportLb1RmeData(
          config.rme,
          year,
          month,
          dataDir,
          path.join(outputDir, 'rpa')
        )
        if (exportedPath) exportCandidates.unshift(exportedPath)
      } catch (rpaErr) {
        process.stderr.write(
          `[lb1-engine] RPA export forced mode gagal: ${rpaErr instanceof Error ? rpaErr.message : String(rpaErr)}\n`
        )
      }
    }

    // ── Step 2: Jika tidak ada file dan ada RME config → RPA export ──────────
    if (exportCandidates.length === 0 && config?.rme?.base_url?.trim()) {
      try {
        const exportedPath = await exportLb1RmeData(
          config.rme,
          year,
          month,
          dataDir,
          path.join(outputDir, 'rpa')
        )
        exportCandidates.unshift(exportedPath)
      } catch (rpaErr) {
        // RPA gagal — lanjut tanpa export (akan pakai fallback)
        process.stderr.write(
          `[lb1-engine] RPA export gagal: ${rpaErr instanceof Error ? rpaErr.message : String(rpaErr)}\n`
        )
      }
    }

    // ── Step 3: Parse file export ─────────────────────────────────────────────
    if (exportCandidates.length === 0) {
      return {
        ok: false,
        summary: {
          periodYear: year,
          periodMonth: month,
          totalKunjungan: 0,
          rawatJalan: 0,
          rawatInap: 0,
          rujukan: 0,
          unmappedDx: [],
          generatedAt: new Date().toISOString(),
        },
        rows: [],
        validCount: 0,
        invalidCount: 0,
        error: `File export tidak ditemukan di ${dataDir}. Taruh file Excel export ePuskesmas di folder tersebut, atau konfigurasi RME di runtime/lb1-config.yaml.`,
        durationMs: Date.now() - start,
      }
    }

    let parsed = null as ParsedExport | null
    let parseError = ''
    let sawAccessError = false
    const attemptedFiles: string[] = []

    for (const candidate of exportCandidates) {
      if (!candidate || !fs.existsSync(candidate)) continue
      attemptedFiles.push(candidate)
      const parseResult = await tryParseExportCandidate(candidate)
      if (parseResult.parsed) {
        parsed = parseResult.parsed
        break
      }
      parseError = parseResult.errorMessage
      sawAccessError = sawAccessError || isFileAccessError(parseError)
    }

    // Fallback: jika file kandidat ada tapi terkunci, coba tarik export RPA baru.
    if (!parsed && sawAccessError && config?.rme?.base_url?.trim()) {
      try {
        const exportedPath = await exportLb1RmeData(
          config.rme,
          year,
          month,
          dataDir,
          path.join(outputDir, 'rpa')
        )

        if (exportedPath && fs.existsSync(exportedPath)) {
          attemptedFiles.push(exportedPath)
          const parseResult = await tryParseExportCandidate(exportedPath)
          if (parseResult.parsed) {
            parsed = parseResult.parsed
          } else {
            parseError = parseResult.errorMessage
            sawAccessError = sawAccessError || isFileAccessError(parseError)
          }
        }
      } catch (error) {
        parseError = error instanceof Error ? error.message : String(error)
      }
    }

    if (!parsed) {
      const attemptedList = attemptedFiles.length > 0 ? attemptedFiles.join('; ') : dataDir
      const reason = parseError || 'File export tidak dapat diparsing.'
      const accessHint = sawAccessError
        ? ' Pastikan file export tidak sedang dibuka oleh Excel/aplikasi lain.'
        : ''
      return {
        ok: false,
        summary: {
          periodYear: year,
          periodMonth: month,
          totalKunjungan: 0,
          rawatJalan: 0,
          rawatInap: 0,
          rujukan: 0,
          unmappedDx: [],
          generatedAt: new Date().toISOString(),
        },
        rows: [],
        validCount: 0,
        invalidCount: 0,
        error: `Gagal membaca file export LB1. Detail: ${reason}.${accessHint} Kandidat dicek: ${attemptedList}`,
        durationMs: Date.now() - start,
      }
    }

    // ── Step 4: Normalize records ─────────────────────────────────────────────
    const normalized = normalizeRecords(parsed.rows, year, month, {
      validDayMin,
      validDayMax,
      stripIcdSubcode,
      excludeCodes,
    })

    // ── Step 5: Baca diagnosis mapping ────────────────────────────────────────
    const mapping = readDiagnosisMapping(mappingPath)

    // ── Step 6: Agregasi ──────────────────────────────────────────────────────
    const aggregated = aggregateForLb1(normalized.valid, mapping)

    // ── Step 7: Tulis ke template Excel (jika template ada) ───────────────────
    const outputName = `LB1_${year}_${String(month).padStart(2, '0')}.xlsx`
    const outputFile = path.join(outputDir, outputName)
    await mkdir(outputDir, { recursive: true })

    if (fs.existsSync(templatePath)) {
      writeLb1Output({
        templatePath,
        outputPath: outputFile,
        aggregated,
        periodYear: year,
        periodMonth: month,
        metadata,
      })
    }

    // ── Step 7b: Tulis REGIS format dinas (2 sheet: REGIS + RUJUKAN) ──────────
    // Cari sheet RUJUKAN dari file sumber (jika format REGISTER)
    let rujukanRows: import('./types').NormalizedRow[] = []
    if (
      parsed.sourcePath &&
      (parsed.sourcePath.endsWith('.xlsx') || parsed.sourcePath.endsWith('.xls'))
    ) {
      try {
        const rujukanRaw = parseRegisterRujukan(parsed.sourcePath)
        if (rujukanRaw.length > 0) {
          const normRujukan = normalizeRecords(rujukanRaw, year, month, {
            validDayMin,
            validDayMax,
            stripIcdSubcode,
            excludeCodes,
          })
          rujukanRows = normRujukan.valid
        }
      } catch {
        // Sheet RUJUKAN tidak ada / gagal — lanjut tanpa rujukan
      }
    }

    const regisOutputName = `REGIS_${year}_${String(month).padStart(2, '0')}.xlsx`
    const regisOutputFile = path.join(outputDir, regisOutputName)
    writeRegisLb1Output({
      outputPath: regisOutputFile,
      validRows: normalized.valid,
      rujukanRows,
      periodYear: year,
      periodMonth: month,
      metadata,
    })

    // ── Step 8: Tulis QC CSV (invalid rows) ───────────────────────────────────
    const qcName = `QC_${year}_${String(month).padStart(2, '0')}.csv`
    const qcFile = path.join(outputDir, qcName)
    const qcLines = [
      'source_row,visit_date,dx_code,sex,visit_type,age_year,age_month,age_day,error_reason',
      ...normalized.invalid.map((r) =>
        [
          r.source_row,
          r.visit_date,
          r.dx_code,
          r.sex,
          r.visit_type,
          r.age_year,
          r.age_month,
          r.age_day,
          `"${r.error_reason}"`,
        ].join(',')
      ),
    ]
    await writeFile(qcFile, qcLines.join('\n'), 'utf-8')

    // ── Step 9: Hitung statistik summary ──────────────────────────────────────
    const unmappedDx = computeUnmappedDx(normalized.valid, mapping)
    const dupCount = countDuplicates(normalized.valid)
    const invalidReasonCounts = countInvalidReasons(normalized.invalid)
    const validKbCount = normalized.valid.filter((r) => r.visit_type === 'KB').length
    const validKlCount = normalized.valid.filter((r) => r.visit_type === 'KL').length

    const summaryPayload: LB1SummaryFile = {
      timestamp: new Date().toISOString(),
      period_year: year,
      period_month: month,
      valid_count: normalized.valid.length,
      invalid_count: normalized.invalid.length,
      unmapped_dx_count: unmappedDx.length,
      unmapped_dx: unmappedDx,
      duplicate_candidate_count: dupCount,
      strip_icd_subcode: stripIcdSubcode,
      exclude_codes: excludeCodes,
      valid_day_range: [validDayMin, validDayMax],
      invalid_reason_counts: invalidReasonCounts,
    }

    // ── Step 10: Build display rows untuk halaman Report ─────────────────────
    const displayRows = buildDisplayRows(aggregated, year, month)

    // Juga simpan LB1Summary (format yang dipakai /api/report)
    const generatedAt = summaryPayload.timestamp
    const lb1Summary: LB1Summary = {
      periodYear: year,
      periodMonth: month,
      totalKunjungan: normalized.valid.length,
      rawatJalan: validKbCount,
      rawatInap: validKlCount,
      rujukan: unmappedDx.length,
      unmappedDx,
      generatedAt,
    }

    // Simpan satu summary file yang kompatibel untuk API report + payload detail.
    const lb1SummaryPath = path.join(
      outputDir,
      `SUMMARY_${year}_${String(month).padStart(2, '0')}.json`
    )
    await writeFile(
      lb1SummaryPath,
      JSON.stringify({ ...lb1Summary, _raw: summaryPayload }, null, 2),
      'utf-8'
    )

    return {
      ok: true,
      summary: lb1Summary,
      rows: displayRows as EncounterRow[],
      validCount: normalized.valid.length,
      invalidCount: normalized.invalid.length,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      ok: false,
      summary: {
        periodYear: year,
        periodMonth: month,
        totalKunjungan: 0,
        rawatJalan: 0,
        rawatInap: 0,
        rujukan: 0,
        unmappedDx: [],
        generatedAt: new Date().toISOString(),
      },
      rows: [],
      validCount: 0,
      invalidCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

// ─── Baca summary terakhir dari file ─────────────────────────────────────────

export async function loadLatestSummary(): Promise<LB1Summary | null> {
  try {
    const config = loadLb1Config()
    const { outputDir: dir } = resolveLb1Paths(config)
    if (!(await pathExists(dir))) return null

    const files = await readdir(dir)
    const summaryFiles = files.filter((f) => /^SUMMARY_\d{4}_\d{2}\.json$/.test(f))
    if (summaryFiles.length === 0) return null

    summaryFiles.sort().reverse()
    const raw = await readFile(path.join(dir, summaryFiles[0]), 'utf-8')
    // Reviver blocks __proto__ keys to prevent prototype pollution
    const parsed: unknown = JSON.parse(raw, (key, val) =>
      key === '__proto__' ? undefined : (val as unknown)
    )
    return toLb1SummaryFromUnknown(parsed)
  } catch {
    return null
  }
}
