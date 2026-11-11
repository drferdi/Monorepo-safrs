// ─── Core types untuk LB1 engine (pure TypeScript, no Python) ─────────────────

export type RunHistoryStatus = 'success' | 'failed'

export interface RunHistoryEntry {
  id: string
  timestamp: string
  mode: 'ts-engine' | 'unknown'
  year: number
  month: number
  status: RunHistoryStatus
  command: string
  code: number
  outputFile: string
  summaryFile: string
  validRows: number
  invalidRows: number
  rawatJalan: number
  rawatInap: number
  error: string
}

// ─── Raw row dari parse Excel/CSV ─────────────────────────────────────────────

export interface RawRow {
  visit_date: string
  dx_code: string
  sex: string
  visit_type: string
  age_year: string
  age_month: string
  age_day: string
  source_row: number
}

export interface ParsedExport {
  rows: RawRow[]
  detectedHeaderRow: number
  sourcePath: string
}

// ─── Normalized row setelah validasi ──────────────────────────────────────────

export interface NormalizedRow {
  visit_date: Date
  dx_code: string
  dx_candidates: string[]
  sex: 'L' | 'P'
  visit_type: 'KB' | 'KL'
  age_year: number
  age_month: number
  age_day: number
  age_bucket: string
  source_row: number
}

export interface InvalidRow extends RawRow {
  error_reason: string
}

export interface NormalizedData {
  valid: NormalizedRow[]
  invalid: InvalidRow[]
}

// ─── Diagnosis mapping CSV ─────────────────────────────────────────────────────

export interface DiagnosisMapping {
  raw_dx: string
  icdx10: string
  jenis_penyakit: string
}

// ─── Aggregated output ─────────────────────────────────────────────────────────

export interface AggregatedRow {
  icdx10: string
  jenis_penyakit: string
  counts: Record<string, number> // key: `${bucket}_${visit}_${sex}`
}

// ─── Generation result ─────────────────────────────────────────────────────────

export interface GenerationResult {
  outputFile: string
  qcFile: string
  summaryFile: string
  validCount: number
  invalidCount: number
  periodYear: number
  periodMonth: number
}

// ─── Summary JSON (disimpan di runtime/lb1-output) ────────────────────────────

export interface LB1SummaryFile {
  timestamp: string
  period_year: number
  period_month: number
  valid_count: number
  invalid_count: number
  unmapped_dx_count: number
  unmapped_dx: string[]
  duplicate_candidate_count: number
  strip_icd_subcode: boolean
  exclude_codes: string[]
  valid_day_range: [number, number]
  invalid_reason_counts: Record<string, number>
}

// ─── Dipakai oleh /api/report ──────────────────────────────────────────────────

export interface LB1Summary {
  periodYear: number
  periodMonth: number
  totalKunjungan: number
  rawatJalan: number
  rawatInap: number
  rujukan: number
  unmappedDx: string[]
  generatedAt: string
}

export interface EncounterRow {
  rm: string
  nama: string
  tanggal: string
  diagnosis: string
  icd: string
  dokter: string
  rawStatus?: string
}

export interface LB1RunResult {
  ok: boolean
  summary: LB1Summary
  rows: EncounterRow[]
  validCount: number
  invalidCount: number
  error?: string
  durationMs: number
}

// ─── RME Config (dari YAML) ───────────────────────────────────────────────────

export interface RmeConfig {
  base_url: string
  login_url: string
  export_url: string
  username_env: string
  password_env: string
  poli_dewasa_id: string
  status_periksa: string
  headless: boolean
  timeout_ms: number
  export_date_format: string
  retry_count: number
  retry_delay_seconds: number
  export_params: Record<string, string>
  selectors: Record<string, string>
  post_login_wait_text: string
  /** Path ke file session Playwright tersimpan (default: runtime/rme-session.json) */
  session_path?: string
}

export interface Lb1Config {
  rme: RmeConfig
  pipeline: {
    strip_icd_subcode: boolean
    exclude_codes: string[]
    valid_date_range: [number, number]
  }
  lb1: {
    template_path: string
    output_dir: string
    mapping_path: string
    metadata: Record<string, unknown>
  }
}
