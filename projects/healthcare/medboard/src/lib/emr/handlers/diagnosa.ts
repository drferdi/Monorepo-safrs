/**
 * Sentra EMR Auto-Fill Engine — Diagnosa Handler
 * Playwright adaptation dari assist/lib/handlers/page-diagnosa.ts
 * DAS (Data Ascension System) TIDAK diport — data-driven only.
 */

import type { Page } from 'playwright'
import {
  fillAutocomplete,
  fillCheckbox,
  fillSelect,
  fillTextField,
  locateFirst,
} from '../playwright-filler'
import type { DiagnosaFillPayload } from '../types'

// ============================================================================
// JENIS & KASUS VALUE MAPPING
// ============================================================================

const JENIS_VALUE_MAP: Record<string, string[]> = {
  PRIMER: ['1', 'PRIMER', 'primer', 'P'],
  SEKUNDER: ['2', 'SEKUNDER', 'sekunder', 'S'],
}

const KASUS_VALUE_MAP: Record<string, string[]> = {
  BARU: ['1', 'BARU', 'baru', 'B'],
  LAMA: ['2', 'LAMA', 'lama', 'L'],
}

const PROGNOSA_EPUSKESMAS_MAP: Record<string, string> = {
  'Sanam (Sembuh)': '1',
  'Bonam (Baik)': '2',
  'Malam (Buruk/Jelek)': '3',
  'Dubia Ad Sanam/Bonam (Tidak tentu/Ragu-ragu, Cenderung Sembuh/Baik)': '4',
  'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)': '5',
}

const CHRONIC_DISEASE_KEYWORDS: Record<string, string[]> = {
  Hipertensi: ['hipertensi', 'hypertension'],
  'Diabetes Mellitus': ['diabetes', 'dm', 'gula'],
  'Gagal Jantung': ['jantung', 'gagal jantung', 'heart failure'],
  'Penyakit Jantung Koroner': ['koroner', 'jantung koroner', 'coronary'],
  'Gagal Ginjal': ['ginjal', 'renal', 'kidney'],
  TBC: ['tbc', 'tuberkulosis', 'tuberculosis'],
  Stroke: ['stroke'],
  Asma: ['asma', 'asthma'],
  PPOK: ['ppok', 'copd', 'paru obstruktif'],
  Kanker: ['kanker', 'cancer', 'tumor'],
}

// ============================================================================
// HELPER: try multiple selectors for a select field, return best value
// ============================================================================

async function fillSelectWithFallbacks(
  page: Page,
  selectors: string[],
  possibleValues: string[]
): Promise<boolean> {
  for (const sel of selectors) {
    try {
      const found = await locateFirst(page, sel)
      if (!found) continue

      // Get available options via evaluate
      const optionValues = await page.evaluate(
        (s: string): Array<{ value: string; text: string }> => {
          const el = document.querySelector(s) as HTMLSelectElement | null
          if (!el) return []
          return Array.from(el.options).map(o => ({
            value: o.value,
            text: o.text,
          }))
        },
        found
      )

      // Find matching option
      let matchValue: string | null = null
      for (const pv of possibleValues) {
        for (const opt of optionValues) {
          if (
            opt.value.toUpperCase() === pv.toUpperCase() ||
            opt.text.toUpperCase().includes(pv.toUpperCase())
          ) {
            matchValue = opt.value
            break
          }
        }
        if (matchValue) break
      }

      if (matchValue) {
        await fillSelect(page, found, matchValue)
        return true
      }
    } catch {
      // try next
    }
  }
  return false
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export interface DiagnosaFillResult {
  success: boolean
  filledFields: string[]
  failedFields: string[]
  error?: string
}

export async function fillDiagnosa(
  page: Page,
  payload: DiagnosaFillPayload
): Promise<DiagnosaFillResult> {
  const filledFields: string[] = []
  const failedFields: string[] = []

  // 1. ICD-10 Code
  if (payload.icd_x) {
    const icdSelectors = [
      'input[name="icd_x"]',
      'input[name*="[icd_x]"]',
      'input[id*="icd"]',
      'input[placeholder*="ICD"]',
      'input[placeholder*="icd"]',
    ].join(', ')

    // Try autocomplete first (ePuskesmas has jQuery UI autocomplete for ICD)
    const icdSel = await locateFirst(page, icdSelectors)
    if (icdSel) {
      const r = await fillAutocomplete(page, icdSel, payload.icd_x, {
        timeout: 2000,
        retries: 2,
        allowFirstItemFallback: false,
        requireDropdownSelection: false,
      })

      if (r.success) {
        filledFields.push('icd_x')
      } else {
        // Fallback to direct text fill
        const r2 = await fillTextField(page, icdSel, payload.icd_x, true)
        if (r2.success) filledFields.push('icd_x')
        else failedFields.push('icd_x')
      }
    } else {
      failedFields.push('icd_x')
    }
  }

  // 2. Diagnosis name
  if (payload.nama) {
    const namaSelectors = [
      'input[name="diagnosa"]',
      'input[name*="[diagnosa]"]',
      'input[name="nama_diagnosa"]',
      'input[id*="diagnosa"]',
      'input[placeholder*="Diagnosa"]',
      'input[placeholder*="diagnosa"]',
    ].join(', ')

    const r = await fillTextField(page, namaSelectors, payload.nama, true)
    if (r.success) filledFields.push('nama_diagnosa')
    else failedFields.push('nama_diagnosa')
  }

  // 3. Jenis Diagnosa (PRIMER/SEKUNDER)
  if (payload.jenis) {
    const jenisSelectors = [
      'select[name="Diagnosa[jenis]"]',
      'select[name*="[jenis_diagnosa]"]',
      'select[name*="[jenis]"]',
      'select[id*="jenis"]',
    ]
    const possibleValues = JENIS_VALUE_MAP[payload.jenis] || [payload.jenis]
    const ok = await fillSelectWithFallbacks(page, jenisSelectors, possibleValues)
    if (ok) filledFields.push('jenis_diagnosa')
    else failedFields.push('jenis_diagnosa')
  }

  // 4. Kasus (BARU/LAMA)
  if (payload.kasus) {
    const kasusSelectors = [
      'select[name="Diagnosa[kasus]"]',
      'select[name*="[kasus_diagnosa]"]',
      'select[name*="[kasus]"]',
      'select[id*="kasus"]',
    ]
    const possibleValues = KASUS_VALUE_MAP[payload.kasus] || [payload.kasus]
    const ok = await fillSelectWithFallbacks(page, kasusSelectors, possibleValues)
    if (ok) filledFields.push('kasus_diagnosa')
    else failedFields.push('kasus_diagnosa')
  }

  // 5. Prognosa
  if (payload.prognosa) {
    // Map prognosa text to numeric value
    const prognosaValue = PROGNOSA_EPUSKESMAS_MAP[payload.prognosa] || payload.prognosa
    const prognosaSelectors = [
      'select#prognosa',
      'select[id*="prognosa"]',
      'select[name="Diagnosa[prognosa]"]',
      'select[name*="[prognosa]"]',
      'select[name="prognosa"]',
    ]
    const ok = await fillSelectWithFallbacks(page, prognosaSelectors, [
      prognosaValue,
      payload.prognosa,
    ])
    if (ok) filledFields.push('prognosa')
    else failedFields.push('prognosa')
  }

  // 6. Penyakit Kronis checkboxes
  if (payload.penyakit_kronis && payload.penyakit_kronis.length > 0) {
    for (const penyakit of payload.penyakit_kronis) {
      const keywords = CHRONIC_DISEASE_KEYWORDS[penyakit] || [penyakit.toLowerCase()]

      // Find checkbox by label text using evaluate
      const checkboxSel = await page.evaluate((terms: string[]) => {
        const allCheckboxes = Array.from(
          document.querySelectorAll('input[type="checkbox"]')
        ) as HTMLInputElement[]
        for (const cb of allCheckboxes) {
          const label = document.querySelector(`label[for="${cb.id}"]`)
          const labelText = (
            (label?.textContent || '') +
            ' ' +
            (cb.closest('label, tr, td, li, div')?.textContent || '') +
            ' ' +
            (cb.nextElementSibling?.textContent || '')
          ).toLowerCase()

          for (const term of terms) {
            if (labelText.includes(term.toLowerCase())) {
              // Generate unique token for selector
              const token = `sentra-chronic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
              cb.setAttribute('data-sentra-chronic', token)
              return `[data-sentra-chronic="${token}"]`
            }
          }
        }
        return null
      }, keywords)

      if (checkboxSel) {
        const r = await fillCheckbox(page, checkboxSel, true)
        if (r.success) filledFields.push(`penyakit_kronis:${penyakit}`)
        else failedFields.push(`penyakit_kronis:${penyakit}`)
      } else {
        failedFields.push(`penyakit_kronis:${penyakit}:not_found`)
      }
    }
  }

  return {
    success: failedFields.length === 0,
    filledFields,
    failedFields,
  }
}
