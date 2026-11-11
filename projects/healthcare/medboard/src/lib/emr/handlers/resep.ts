/**
 * Sentra EMR Auto-Fill Engine — Resep Handler
 * Playwright adaptation dari assist/lib/handlers/page-resep.ts
 *
 * Per-obat state machine: init → row_ready → medication_selected → fields_filled → validated → committed
 * Timing constants dipertahankan dari Extension (kritis untuk reliabilitas).
 */

import type { Page } from 'playwright'
import {
  ADD_ROW_BUTTON_SELECTORS,
  ATURAN_PAKAI_OPTIONS,
  type AutocompleteOptions,
  getResepRowSelectors,
  RESEP_FIELDS,
} from '../field-mappings'
import {
  fillAutocomplete,
  fillNumberField,
  fillSelect,
  fillTextField,
  locateFirst,
} from '../playwright-filler'
import type { AturanPakai, ResepFillPayload } from '../types'

// ============================================================================
// TIMING CONSTANTS (from assist — do NOT reduce)
// ============================================================================
const DELAY_BETWEEN_ROWS = 800 // ms
const DELAY_AFTER_ADD_ROW = 1200 // ms
const DELAY_STOCK_CHECK = 2000 // ms (CRITICAL — stock fetch needs this)
const DELAY_SIGNA_LOOKUP = 1000 // ms
const COMMIT_VERIFY_TIMEOUT = 5000 // ms
const COMMIT_VERIFY_POLL_INTERVAL = 160 // ms
const COMMIT_VERIFY_MAX_RETRIES = 3

// ============================================================================
// STATE MACHINE
// ============================================================================
type ResepRowState =
  | 'init'
  | 'row_ready'
  | 'medication_selected'
  | 'fields_filled'
  | 'validated'
  | 'committed'
  | 'failed'

export type ResepRuntimeReasonCode =
  | 'STOCK_INSUFFICIENT'
  | 'FORMULATION_MISMATCH'
  | 'SIGNA_INVALID'
  | 'COMMIT_TIMEOUT'
  | 'DUPLICATE_MEDICATION'
  | 'ROW_NOT_READY'

// ============================================================================
// MEDICATION ALIASES (from assist/lib/handlers/page-resep.ts — verbatim)
// ============================================================================
const MEDICATION_NAME_ALIASES: Record<string, string[]> = {
  amoxicillin: ['amoksisilin'],
  amoksisilin: ['amoxicillin'],
  paracetamol: ['parasetamol'],
  parasetamol: ['paracetamol'],
  acetaminophen: ['asetaminofen', 'parasetamol'],
  aspirin: ['asam asetilsalisilat'],
  'asam asetilsalisilat': ['aspirin'],
  diclofenac: ['diklofenak'],
  diklofenak: ['diclofenac'],
  'mefenamic acid': ['asam mefenamat'],
  'asam mefenamat': ['mefenamic acid'],
  dexamethasone: ['deksametason'],
  deksametason: ['dexamethasone'],
  prednisone: ['prednison'],
  prednison: ['prednisone'],
  methylprednisolone: ['metilprednisolon'],
  metilprednisolon: ['methylprednisolone'],
  amlodipine: ['amlodipin'],
  amlodipin: ['amlodipine'],
  captopril: ['kaptopril'],
  kaptopril: ['captopril'],
  cetirizine: ['cetirizin', 'setirizin'],
  cetirizin: ['cetirizine', 'setirizin'],
  setirizin: ['cetirizine', 'cetirizin'],
  cefixime: ['sefiksim'],
  sefiksim: ['cefixime'],
  ceftriaxone: ['seftriakson'],
  seftriakson: ['ceftriaxone'],
  ciprofloxacin: ['siprofloksasin'],
  siprofloksasin: ['ciprofloxacin'],
  azithromycin: ['azitromisin'],
  azitromisin: ['azithromycin'],
  erythromycin: ['eritromisin'],
  eritromisin: ['erythromycin'],
  chlorpheniramine: ['klorfeniramin', 'ctm'],
  ctm: ['chlorpheniramine', 'klorfeniramin'],
  omeprazole: ['omeprazol'],
  omeprazol: ['omeprazole'],
  'vitamin c': ['asam askorbat'],
  'asam askorbat': ['vitamin c'],
  'folic acid': ['asam folat'],
  'asam folat': ['folic acid'],
  rifampicin: ['rifampisin'],
  rifampisin: ['rifampicin'],
  theophylline: ['teofilin'],
  teofilin: ['theophylline'],
  acyclovir: ['asiklovir'],
  asiklovir: ['acyclovir'],
}

const LIQUID_KEYWORDS = ['sirup', 'syrup', 'suspensi', 'drop', 'elixir', 'solution', 'ml']
const SOLID_KEYWORDS = ['tablet', 'kaplet', 'kapsul', 'capsule', 'caplet', 'tab']
const ATURAN_PAKAI_ENTRIES = Object.entries(ATURAN_PAKAI_OPTIONS) as Array<[AturanPakai, string]>

// ============================================================================
// HELPERS
// ============================================================================

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bph/g, 'f')
    .replace(/x/g, 'ks')
    .replace(/y/g, 'i')
    .replace(/\bc(?=[eiy])/g, 's')
    .replace(/\bc(?=[aouklnrt])/g, 'k')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegex(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripDose(v: string): string {
  return v
    .replace(/\b\d+\s*(mg|ml|mcg|g|gr|iu)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function removeParen(v: string): string {
  return v.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildMedicationNameCandidates(rawName: string): string[] {
  const base = rawName.trim()
  if (!base) return []
  const candidates: string[] = [base]
  const push = (v: string) => {
    if (v && v.length >= 2 && !candidates.includes(v)) candidates.push(v)
  }

  push(stripDose(base))
  push(removeParen(base))
  push(stripDose(removeParen(base)))

  for (const [term, aliases] of Object.entries(MEDICATION_NAME_ALIASES)) {
    if (!new RegExp(`\\b${escapeRegex(term)}\\b`, 'i').test(base)) continue
    for (const alias of aliases) {
      const replaced = base.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, 'ig'), alias)
      push(replaced)
      push(stripDose(replaced))
    }
  }

  // Form variants
  const compact = stripDose(removeParen(base))
  const isLiquid = LIQUID_KEYWORDS.some(k => normalizeLabel(base).includes(k))
  if (!isLiquid) {
    push(`${compact} tablet`)
    push(`${compact} kaplet`)
  } else {
    push(`${compact} sirup`)
    push(`${compact} suspensi`)
  }

  return candidates.slice(0, 12)
}

function normalizeSigna(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, '').replace(/[xX×]/g, 'x')
  const match = compact.match(/(\d+)\s*x\s*(\d+)/i)
  if (!match) return '1x1'
  return `${Math.max(1, Number(match[1]))}x${Math.max(1, Number(match[2]))}`
}

function normalizeAturanPakai(raw: unknown): AturanPakai | null {
  if (!raw) return null
  const value = String(raw).trim()
  const exact = ATURAN_PAKAI_ENTRIES.find(([code]) => code === value)
  if (exact) return exact[0]
  const byLabel = ATURAN_PAKAI_ENTRIES.find(
    ([, label]) => label.toLowerCase() === value.toLowerCase()
  )
  return byLabel ? byLabel[0] : null
}

async function checkStockAlert(page: Page): Promise<boolean> {
  const STOCK_ALERT_SELECTORS = [
    '.alert-danger',
    '.alert-warning',
    '.toast-message',
    '.noty_body',
    '.swal2-html-container',
    '.noty_message',
  ]

  for (const sel of STOCK_ALERT_SELECTORS) {
    try {
      const el = page.locator(sel).first()
      const visible = await el.isVisible().catch(() => false)
      if (!visible) continue
      const text = ((await el.textContent()) || '').toLowerCase()
      const norm = normalizeLabel(text)
      const hasStock =
        norm.includes('stok obat') || (norm.includes('stok') && norm.includes('obat'))
      const hasFail =
        norm.includes('tidak mencukupi') ||
        norm.includes('tidak cukup') ||
        norm.includes('pilih obat lain')
      if (hasStock && hasFail) return true
    } catch {
      // continue
    }
  }
  return false
}

async function clickAddRowButton(page: Page): Promise<boolean> {
  for (const sel of ADD_ROW_BUTTON_SELECTORS) {
    try {
      const found = await locateFirst(page, sel)
      if (!found) continue
      await page.locator(found).first().click()
      return true
    } catch {
      // try next
    }
  }
  return false
}

async function verifyCommit(page: Page, rowIndex: number, expectedName: string): Promise<boolean> {
  const selectors = getResepRowSelectors(rowIndex)
  const maxAttempts = COMMIT_VERIFY_MAX_RETRIES

  for (let i = 0; i < maxAttempts; i++) {
    const obatSel = await locateFirst(page, selectors.obat_nama)
    if (obatSel) {
      const val = await page
        .locator(obatSel)
        .first()
        .inputValue()
        .catch(() => '')
      if (val.trim().length > 0) {
        const normActual = normalizeLabel(val)
        const normExpected = normalizeLabel(stripDose(removeParen(expectedName)))
        if (
          normActual.includes(normExpected.split(' ')[0] || '') ||
          normExpected.includes(normActual.split(' ')[0] || '')
        ) {
          return true
        }
      }
    }
    await page.waitForTimeout(COMMIT_VERIFY_POLL_INTERVAL)
  }
  return false
}

// ============================================================================
// FILL STATIC HEADER FIELDS
// ============================================================================

async function fillResepHeader(page: Page, payload: ResepFillPayload): Promise<void> {
  // no_resep
  if (payload.static.no_resep) {
    const sel = RESEP_FIELDS['no_resep']?.selector
    if (sel) await fillTextField(page, sel, payload.static.no_resep, false)
  }

  // alergi
  if (payload.static.alergi) {
    const sel = RESEP_FIELDS['alergi']?.selector
    if (sel) await fillTextField(page, sel, payload.static.alergi, false)
  }

  // prioritas
  const prioritas = String(payload.prioritas ?? '0')
  const prioSel = RESEP_FIELDS['prioritas']?.selector
  if (prioSel) await fillSelect(page, prioSel, prioritas).catch(() => null)

  // AJAX: ruangan, dokter, perawat
  if (payload.ajax.ruangan) {
    const ruanganSel = RESEP_FIELDS['ruangan']?.selector
    if (ruanganSel) {
      await fillAutocomplete(page, ruanganSel, payload.ajax.ruangan, {
        timeout: 1000,
        retries: 2,
        allowFirstItemFallback: true,
      })
    }
  }

  if (payload.ajax.dokter) {
    const dokterSel = RESEP_FIELDS['dokter_nama_bpjs']?.selector
    if (dokterSel) {
      await fillAutocomplete(page, dokterSel, payload.ajax.dokter, {
        timeout: 1500,
        retries: 2,
        allowFirstItemFallback: true,
      })
    }
  }

  if (payload.ajax.perawat) {
    const perawatSel = RESEP_FIELDS['perawat_nama']?.selector
    if (perawatSel) {
      await fillAutocomplete(page, perawatSel, payload.ajax.perawat, {
        timeout: 1000,
        retries: 2,
        allowFirstItemFallback: true,
      })
    }
  }
}

// ============================================================================
// FILL SINGLE MEDICATION ROW
// ============================================================================

async function fillMedicationRow(
  page: Page,
  rowIndex: number,
  med: ResepFillPayload['medications'][number]
): Promise<{
  state: ResepRowState
  reasonCode?: ResepRuntimeReasonCode
  error?: string
}> {
  const selectors = getResepRowSelectors(rowIndex)
  let state: ResepRowState = 'row_ready'

  // 1. racikan (select)
  const racikanVal = med.racikan === '1' || med.racikan === (true as unknown) ? '1' : '0'
  const racikanSel = await locateFirst(page, selectors.obat_racikan)
  if (racikanSel) {
    await fillSelect(page, racikanSel, racikanVal).catch(() => null)
  }

  // 2. jumlah_permintaan
  if (med.jumlah_permintaan !== undefined) {
    const jpSel = await locateFirst(page, selectors.obat_jumlah_permintaan)
    if (jpSel) await fillNumberField(page, jpSel, med.jumlah_permintaan).catch(() => null)
  }

  // 3. Medication name (autocomplete — most critical)
  const candidates = buildMedicationNameCandidates(med.nama_obat)
  let medicationFilled = false

  for (const candidate of candidates) {
    const obatSel = await locateFirst(page, selectors.obat_nama)
    if (!obatSel) break

    const autocompleteOpts: AutocompleteOptions = {
      timeout: 1500,
      retries: 2,
      dropdownSelector: '.ui-autocomplete .ui-menu-item, .autocomplete-result',
      allowFirstItemFallback: false,
      requireDropdownSelection: true,
    }

    const r = await fillAutocomplete(page, obatSel, candidate, autocompleteOpts)
    if (r.success) {
      medicationFilled = true
      state = 'medication_selected'
      break
    }
  }

  if (!medicationFilled) {
    return {
      state: 'failed',
      reasonCode: 'ROW_NOT_READY',
      error: `Medication not found: ${med.nama_obat}`,
    }
  }

  // 4. Wait for stock check
  await page.waitForTimeout(DELAY_STOCK_CHECK)

  // 5. Check stock alert
  const stockFailed = await checkStockAlert(page)
  if (stockFailed) {
    return {
      state: 'failed',
      reasonCode: 'STOCK_INSUFFICIENT',
      error: `Stok tidak mencukupi: ${med.nama_obat}`,
    }
  }

  // 6. jumlah
  const jumlahSel = await locateFirst(page, selectors.obat_jumlah)
  if (jumlahSel) {
    await fillNumberField(page, jumlahSel, med.jumlah).catch(() => null)
  }

  // 7. signa
  const signa = normalizeSigna(med.signa)
  const signaSel = await locateFirst(page, selectors.obat_signa)
  if (signaSel) {
    await fillAutocomplete(page, signaSel, signa, {
      timeout: 800,
      retries: 2,
      allowFirstItemFallback: true,
    })
    await page.waitForTimeout(DELAY_SIGNA_LOOKUP)
  }

  // 8. aturan_pakai
  const aturanCode = normalizeAturanPakai(med.aturan_pakai)
  if (aturanCode) {
    const aturanSel = await locateFirst(page, selectors.aturan_pakai)
    if (aturanSel) {
      await fillSelect(page, aturanSel, aturanCode).catch(() => null)
    }
  }

  // 9. keterangan
  if (med.keterangan) {
    const ketSel = await locateFirst(page, selectors.obat_keterangan)
    if (ketSel) await fillTextField(page, ketSel, med.keterangan, false).catch(() => null)
  }

  state = 'fields_filled'

  // 10. Verify commit
  const committed = await verifyCommit(page, rowIndex, med.nama_obat)
  state = committed ? 'committed' : 'validated'

  return { state }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export interface ResepFillResult {
  success: boolean
  filledRows: number
  failedRows: Array<{
    index: number
    nama_obat: string
    error?: string
    reasonCode?: ResepRuntimeReasonCode
  }>
  error?: string
}

export async function fillResep(page: Page, payload: ResepFillPayload): Promise<ResepFillResult> {
  const failedRows: ResepFillResult['failedRows'] = []
  let filledRows = 0

  // Fill static header fields
  await fillResepHeader(page, payload)

  if (!payload.medications || payload.medications.length === 0) {
    return { success: true, filledRows: 0, failedRows: [] }
  }

  for (let i = 0; i < payload.medications.length; i++) {
    const med = payload.medications[i]
    if (!med) continue

    // Add new row (except first if row already exists)
    if (i > 0) {
      const added = await clickAddRowButton(page)
      if (!added) {
        failedRows.push({
          index: i,
          nama_obat: med.nama_obat,
          error: 'Add row button not found',
        })
        continue
      }
      await page.waitForTimeout(DELAY_AFTER_ADD_ROW)
    }

    // Fill this row
    const result = await fillMedicationRow(page, i, med)

    if (result.state === 'failed') {
      failedRows.push({
        index: i,
        nama_obat: med.nama_obat,
        error: result.error,
        reasonCode: result.reasonCode,
      })
    } else {
      filledRows++
    }

    // Delay before next row
    if (i < payload.medications.length - 1) {
      await page.waitForTimeout(DELAY_BETWEEN_ROWS)
    }
  }

  return {
    success: failedRows.length === 0,
    filledRows,
    failedRows,
  }
}
