/**
 * Sentra EMR Auto-Fill Engine — Resep Field Mappings
 * Ported from Sentra Assist (assist/data/field-mappings.ts)
 * DOM selectors for ePuskesmas Resep form (29 fields)
 */

import type { AturanPakai, PageFieldMap } from './types'

// ============================================================================
// ATURAN PAKAI OPTIONS
// ============================================================================
export const ATURAN_PAKAI_OPTIONS: Record<AturanPakai, string> = {
  '1': 'Sebelum Makan',
  '2': 'Sesudah Makan',
  '3': 'Pemakaian Luar',
  '4': 'Jika Diperlukan',
  '5': 'Saat Makan',
}

// ============================================================================
// RESEP PAGE STATIC FIELDS (6 readonly + 3 AJAX + 3 fillable)
// ============================================================================
export const RESEP_FIELDS: PageFieldMap = {
  // 6 READONLY (never fill)
  pelayanan_id: {
    selector: 'input[name="pelayanan_id"], input[name="Resep[pelayanan_id]"]',
    type: 'text',
    readonly: true,
  },
  pasien_id: {
    selector: 'input[name="pasien_id"]',
    type: 'text',
    readonly: true,
  },
  ruangan_asal_id: {
    selector: 'input[name="ruangan_asal_id"], select[name="ruangan_asal_id"]',
    type: 'select',
    readonly: true,
  },
  ruangantujuan_id: {
    selector: 'input[name="ruangantujuan_id"], select[name="Resep[ruangantujuan_id]"]',
    type: 'select',
    readonly: true,
  },
  dokter_id: {
    selector: 'input[name="dokter_id"], input[name="Resep[dokter_id]"]',
    type: 'text',
    readonly: true,
  },
  perawat_id: {
    selector: 'input[name="perawat_id"], input[name="Resep[perawat_id]"]',
    type: 'text',
    readonly: true,
  },

  // 3 AJAX autocomplete display fields
  ruangan: {
    selector: 'input[name="ruangan"], input#ruangan, input[data-field="ruangan"]',
    type: 'autocomplete',
    required: false,
  },
  dokter_nama_bpjs: {
    selector: 'input[name="dokter_nama_bpjs"], input[name="dokter"], input#dokter_nama',
    type: 'autocomplete',
    required: true,
  },
  perawat_nama: {
    selector: 'input[name="perawat_nama"], input[name="perawat"], input#perawat_nama',
    type: 'autocomplete',
    required: false,
  },

  // 3 static fillable fields
  no_resep: {
    selector: 'input[name="no_resep"], input[name="Resep[no_resep]"], input#no_resep',
    type: 'text',
    required: false,
  },
  alergi: {
    selector: 'textarea[name="alergi"], input[name="alergi"], textarea#alergi',
    type: 'textarea',
    required: false,
  },
  prioritas: {
    selector: 'select[name="prioritas"], select[name="Resep[prioritas]"]',
    type: 'select',
    required: false,
  },
}

// ============================================================================
// PER-ROW MEDICATION FIELD GENERATORS (7 fields x N rows)
// ============================================================================
export interface ResepRowSelectors {
  obat_racikan: string
  obat_jumlah_permintaan: string
  obat_nama: string
  obat_jumlah: string
  obat_signa: string
  aturan_pakai: string
  obat_keterangan: string
}

/**
 * Generate CSS selectors for medication row fields.
 * ePuskesmas uses array notation: field[index] or ResepDetail[row][subfield]
 * @param n Zero-based row index
 */
export function getResepRowSelectors(n: number): ResepRowSelectors {
  const n1 = n + 1
  const firstRowOnly = (selectors: string[]): string[] => (n === 0 ? selectors : [])
  return {
    obat_racikan: [
      `select[name="obat_racikan[${n}]"]`,
      `select[name="obat_racikan[${n1}]"]`,
      `select[name="ResepDetail[${n}][obat_racikan]"]`,
      `select[name="ResepDetail[${n1}][obat_racikan]"]`,
      `select[name="resepdetail[${n}][obat_racikan]"]`,
      `select[name="resepdetail[${n1}][obat_racikan]"]`,
      ...firstRowOnly(['select[name="obat_racikan"]', 'select[name*="[obat_racikan]"]']),
      `.medication-row:nth-child(${n + 1}) select[name*="racikan"]`,
    ].join(', '),

    obat_jumlah_permintaan: [
      `input[name="obat_jumlah_permintaan[${n}]"]`,
      `input[name="obat_jumlah_permintaan[${n1}]"]`,
      `input[name="ResepDetail[${n}][obat_jumlah_permintaan]"]`,
      `input[name="ResepDetail[${n1}][obat_jumlah_permintaan]"]`,
      `input[name="resepdetail[${n}][obat_jumlah_permintaan]"]`,
      `input[name="resepdetail[${n1}][obat_jumlah_permintaan]"]`,
      ...firstRowOnly([
        'input[name="obat_jumlah_permintaan"]',
        'input[name*="[obat_jumlah_permintaan]"]',
      ]),
      `.medication-row:nth-child(${n + 1}) input[name*="jumlah_permintaan"]`,
    ].join(', '),

    obat_nama: [
      `input[name="obat_nama[${n}]"]`,
      `input[name="obat_nama[${n1}]"]`,
      `input[name="obat_nama_${n}"]`,
      `input[name="obat_nama_${n1}"]`,
      `input[name="ResepDetail[${n}][obat_nama]"]`,
      `input[name="ResepDetail[${n1}][obat_nama]"]`,
      `input[name="resepdetail[${n}][obat_nama]"]`,
      `input[name="resepdetail[${n1}][obat_nama]"]`,
      `input[name="obat[${n}][nama]"]`,
      `input[name="obat[${n1}][nama]"]`,
      ...firstRowOnly([
        'input[name="obat_nama"]',
        'input[name*="[obat_nama]"]',
        'input[name*="resepdetail"][name*="obat_nama"]',
        'input[placeholder*="Nama Obat"]',
      ]),
      `.medication-row:nth-child(${n + 1}) input[name*="obat_nama"]`,
    ].join(', '),

    obat_jumlah: [
      `input[name="obat_jumlah[${n}]"]`,
      `input[name="obat_jumlah[${n1}]"]`,
      `input[name="ResepDetail[${n}][obat_jumlah]"]`,
      `input[name="ResepDetail[${n1}][obat_jumlah]"]`,
      `input[name="resepdetail[${n}][obat_jumlah]"]`,
      `input[name="resepdetail[${n1}][obat_jumlah]"]`,
      `input[name="obat[${n}][jumlah]"]`,
      `input[name="obat[${n1}][jumlah]"]`,
      ...firstRowOnly(['input[name="obat_jumlah"]', 'input[name*="[obat_jumlah]"]']),
      `.medication-row:nth-child(${n + 1}) input[name*="obat_jumlah"]:not([name*="permintaan"])`,
    ].join(', '),

    obat_signa: [
      `input[name="obat_signa[${n}]"]`,
      `input[name="obat_signa[${n1}]"]`,
      `input[name="ResepDetail[${n}][obat_signa]"]`,
      `input[name="ResepDetail[${n1}][obat_signa]"]`,
      `input[name="resepdetail[${n}][obat_signa]"]`,
      `input[name="resepdetail[${n1}][obat_signa]"]`,
      `input[name="obat[${n}][signa]"]`,
      `input[name="obat[${n1}][signa]"]`,
      ...firstRowOnly([
        'input[name="obat_signa"]',
        'input[name*="[obat_signa]"]',
        'input[name*="resepdetail"][name*="obat_signa"]',
        'input[placeholder*="Cari Resep"]',
      ]),
      `.medication-row:nth-child(${n + 1}) input[name*="signa"]`,
    ].join(', '),

    aturan_pakai: [
      `select[name="aturan_pakai[${n}]"]`,
      `select[name="aturan_pakai[${n1}]"]`,
      `select[name="ResepDetail[${n}][aturan_pakai]"]`,
      `select[name="ResepDetail[${n1}][aturan_pakai]"]`,
      `select[name="resepdetail[${n}][aturan_pakai]"]`,
      `select[name="resepdetail[${n1}][aturan_pakai]"]`,
      `select[name="obat[${n}][aturan]"]`,
      `select[name="obat[${n1}][aturan]"]`,
      ...firstRowOnly(['select[name="aturan_pakai"]', 'select[name*="[aturan_pakai]"]']),
      `.medication-row:nth-child(${n + 1}) select[name*="aturan"]`,
    ].join(', '),

    obat_keterangan: [
      `input[name="obat_keterangan[${n}]"]`,
      `input[name="obat_keterangan[${n1}]"]`,
      `textarea[name="obat_keterangan[${n}]"]`,
      `textarea[name="obat_keterangan[${n1}]"]`,
      `input[name="ResepDetail[${n}][obat_keterangan]"]`,
      `input[name="ResepDetail[${n1}][obat_keterangan]"]`,
      `input[name="resepdetail[${n}][obat_keterangan]"]`,
      `input[name="resepdetail[${n1}][obat_keterangan]"]`,
      ...firstRowOnly([
        'input[name="obat_keterangan"]',
        'textarea[name="obat_keterangan"]',
        'input[name*="[obat_keterangan]"]',
        'textarea[name*="[obat_keterangan]"]',
      ]),
      `.medication-row:nth-child(${n + 1}) input[name*="keterangan"]`,
      `.medication-row:nth-child(${n + 1}) textarea[name*="keterangan"]`,
    ].join(', '),
  }
}

// ============================================================================
// AUTOCOMPLETE OPTIONS PER FIELD TYPE
// ============================================================================
export interface AutocompleteOptions {
  timeout?: number
  dropdownSelector?: string
  retries?: number
  typeDelay?: number
  allowFirstItemFallback?: boolean
  requireDropdownSelection?: boolean
}

export const AUTOCOMPLETE_OPTIONS: Record<string, AutocompleteOptions> = {
  ruangan: {
    timeout: 1000,
    dropdownSelector: '.ui-autocomplete .ui-menu-item, .autocomplete-result',
    retries: 2,
    typeDelay: 50,
  },
  dokter: {
    timeout: 1500,
    dropdownSelector: '.ui-autocomplete .ui-menu-item, .autocomplete-result',
    retries: 2,
    typeDelay: 50,
  },
  perawat: {
    timeout: 1000,
    dropdownSelector: '.ui-autocomplete .ui-menu-item, .autocomplete-result',
    retries: 2,
    typeDelay: 50,
  },
  obat: {
    timeout: 1500,
    dropdownSelector: '.ui-autocomplete .ui-menu-item, .autocomplete-result',
    retries: 3,
    typeDelay: 60,
  },
  signa: {
    timeout: 800,
    dropdownSelector: '.ui-autocomplete .ui-menu-item, .autocomplete-result',
    retries: 2,
    typeDelay: 40,
  },
}

// ============================================================================
// ADD ROW BUTTON SELECTORS
// ============================================================================
export const ADD_ROW_BUTTON_SELECTORS = [
  'button#add-obat',
  'button.tambah-obat',
  'button[data-action="add-row"]',
  'a.add-medication',
  '.btn-tambah-obat',
  '[onclick*="tambahObat"]',
  '[onclick*="addRow"]',
  '[onclick*="addObat"]',
]
