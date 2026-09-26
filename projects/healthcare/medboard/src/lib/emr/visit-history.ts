export interface ScrapedVisitDiagnosis {
  icd_x: string
  nama: string
}

export interface ScrapedVisitVitals {
  sbp: number
  dbp: number
  hr: number
  rr: number
  temp: number
  glucose: number
  // Phase 1A: SpO2 now tracked for trajectory analysis
  spo2: number
}

export interface ScrapedVisit {
  encounter_id: string
  date: string
  vitals: ScrapedVisitVitals
  keluhan_utama: string
  diagnosa: ScrapedVisitDiagnosis | null
}

export const MAX_HISTORY_FROM_ASSIST = 5
export const MAX_TRAJECTORY_VISITS = 5
export const MAX_OCCULT_SHOCK_BASELINE_VISITS = 3

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim())
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }

  return 0
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const raw = String(value).trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (!Number.isFinite(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function hasUsableVitals(vitals: ScrapedVisitVitals): boolean {
  return (
    vitals.sbp > 0 ||
    vitals.dbp > 0 ||
    vitals.hr > 0 ||
    vitals.rr > 0 ||
    vitals.temp > 0 ||
    vitals.glucose > 0 ||
    vitals.spo2 > 0
  )
}

function normalizeDiagnosis(value: unknown): ScrapedVisitDiagnosis | null {
  if (!isRecord(value)) return null

  const icd_x = normalizeText(value.icd_x)
  const nama = normalizeText(value.nama)

  if (!icd_x && !nama) {
    return null
  }

  return {
    icd_x,
    nama,
  }
}

function createVisitKey(visit: ScrapedVisit): string {
  return `${visit.encounter_id}::${visit.date}`
}

function sortVisitsAscending(left: ScrapedVisit, right: ScrapedVisit): number {
  const leftTime = new Date(left.date).getTime()
  const rightTime = new Date(right.date).getTime()

  if (leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return left.encounter_id.localeCompare(right.encounter_id)
}

function normalizeVisitWindow(maxVisits: number): number {
  if (!Number.isFinite(maxVisits) || maxVisits <= 0) {
    return MAX_HISTORY_FROM_ASSIST
  }

  return Math.floor(maxVisits)
}

export function normalizeScrapedVisitHistory(
  input: unknown,
  maxVisits = MAX_HISTORY_FROM_ASSIST
): ScrapedVisit[] {
  if (!Array.isArray(input)) {
    return []
  }

  const normalized = input.flatMap((item, index) => {
    if (!isRecord(item)) return []

    const date = normalizeDate(item.date)
    const vitalsRaw = isRecord(item.vitals) ? item.vitals : null
    if (!date || !vitalsRaw) return []

    const vitals: ScrapedVisitVitals = {
      sbp: normalizeNumber(vitalsRaw.sbp),
      dbp: normalizeNumber(vitalsRaw.dbp),
      hr: normalizeNumber(vitalsRaw.hr),
      rr: normalizeNumber(vitalsRaw.rr),
      temp: normalizeNumber(vitalsRaw.temp),
      glucose: normalizeNumber(vitalsRaw.glucose),
      spo2: normalizeNumber(vitalsRaw.spo2),
    }

    if (!hasUsableVitals(vitals)) {
      return []
    }

    const encounter_id = normalizeText(item.encounter_id) || `visit-${index + 1}-${date}`

    return [
      {
        encounter_id,
        date,
        vitals,
        keluhan_utama: normalizeText(item.keluhan_utama),
        diagnosa: normalizeDiagnosis(item.diagnosa),
      },
    ]
  })

  const deduped = new Map<string, ScrapedVisit>()
  for (const visit of normalized.sort(sortVisitsAscending)) {
    deduped.set(createVisitKey(visit), visit)
  }

  return Array.from(deduped.values()).slice(-normalizeVisitWindow(maxVisits))
}

export function getTrajectoryHistoryWindow(
  visits: unknown,
  includeCurrentVisit: boolean
): ScrapedVisit[] {
  const maxHistoryVisits = includeCurrentVisit ? MAX_TRAJECTORY_VISITS - 1 : MAX_TRAJECTORY_VISITS

  return normalizeScrapedVisitHistory(visits, maxHistoryVisits)
}

export function getOccultShockHistoryWindow(
  visits: unknown
): Array<{ visit_date: string; sbp: number; dbp: number }> {
  return normalizeScrapedVisitHistory(visits, MAX_HISTORY_FROM_ASSIST)
    .slice(-MAX_OCCULT_SHOCK_BASELINE_VISITS)
    .map(visit => ({
      visit_date: visit.date,
      sbp: visit.vitals.sbp,
      dbp: visit.vitals.dbp,
    }))
}
