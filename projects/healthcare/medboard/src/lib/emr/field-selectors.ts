/**
 * Sentra EMR Auto-Fill Engine — Field Selectors
 * Ported from Sentra Assist (assist/lib/scraper/field-selectors.ts)
 * Centralized selector registry for clinical field extraction.
 */

export interface VisitFieldSelectorMap {
  vitals: {
    sbp: string[]
    dbp: string[]
    hr: string[]
    rr: string[]
    temp: string[]
    glucose: string[]
  }
  complaints: {
    keluhanUtama: string[]
  }
  diagnosis: {
    icd: string[]
    nama: string[]
  }
}

export const VISIT_FIELD_SELECTORS: VisitFieldSelectorMap = {
  vitals: {
    sbp: [
      'input[name="PeriksaFisik[sistole]"]',
      'input[name*="[sistole]"]',
      'input[id*="sistole"]',
      'input[id*="sistol"]',
    ],
    dbp: [
      'input[name="PeriksaFisik[diastole]"]',
      'input[name*="[diastole]"]',
      'input[id*="diastole"]',
      'input[id*="diastol"]',
    ],
    hr: [
      'input[name="PeriksaFisik[detak_nadi]"]',
      'input[name*="[detak_nadi]"]',
      'input[name*="[nadi]"]',
      'input[id*="detak_nadi"]',
      'input[id*="nadi"]',
    ],
    rr: [
      'input[name="PeriksaFisik[nafas]"]',
      'input[name*="[nafas]"]',
      'input[name*="[respirasi]"]',
      'input[id*="nafas"]',
      'input[id*="resp"]',
    ],
    temp: [
      'input[name="PeriksaFisik[suhu]"]',
      'input[name*="[suhu]"]',
      'input[id*="suhu"]',
      'input[id*="temp"]',
    ],
    glucose: [
      'input#gula-darah',
      'input[name="PeriksaFisik[gula_darah]"]',
      'input[name*="[gula_darah]"]',
      'input[id*="gula"]',
      'input[id*="glucose"]',
    ],
  },
  complaints: {
    keluhanUtama: [
      'textarea[name="Anamnesa[keluhan_utama]"]',
      'textarea[name*="[keluhan_utama]"]',
      'textarea[id*="keluhan_utama"]',
      'textarea[id*="keluhan"]',
    ],
  },
  diagnosis: {
    icd: ['input[name="icd_x"]', 'input[name*="[icd"]', 'input[id*="icd"]'],
    nama: ['input[name="diagnosa"]', 'input[name*="[diagnosa]"]', 'input[id*="diagnosa"]'],
  },
}

export const VISIT_LABEL_KEYWORDS = {
  sbp: ['sistole', 'sistolik'],
  dbp: ['diastole', 'diastolik'],
  hr: ['detak nadi', 'nadi', 'heart rate'],
  rr: ['nafas', 'respirasi', 'respiratory rate'],
  temp: ['suhu', 'temperatur', 'temperature'],
  glucose: ['gula darah', 'glukosa', 'glucose'],
  keluhanUtama: ['keluhan utama', 'keluhan'],
  icd: ['icd', 'icd-x', 'icdx'],
  diagnosa: ['diagnosa', 'diagnosis'],
} as const
