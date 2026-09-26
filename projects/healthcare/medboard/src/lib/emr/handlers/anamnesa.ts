/**
 * Sentra EMR Auto-Fill Engine — Anamnesa Handler
 * Playwright adaptation dari assist/lib/handlers/page-anamnesa.ts
 *
 * Fill Order:
 * 1. Keluhan Utama + Keluhan Tambahan + Lama Sakit
 * 2. Riwayat Penyakit
 * 3. Alergi
 * 4. Vital Signs (TTV)
 * 5. Periksa Fisik (GCS, Anthropometrics, SpO2, Activity)
 * 6. Assesmen Nyeri
 * 7. Resiko Jatuh
 * 8. Keadaan Fisik
 * 9. Lainnya (Terapi, Edukasi)
 * 10. Tenaga Medis
 */

import type { Page } from 'playwright'
import {
  activateCheckboxWithOnclick,
  type FieldMapping,
  fillCheckbox,
  fillFields,
  fillNumberField,
  fillRangeSlider,
  fillSelect,
  fillTextarea,
  fillTextField,
  locateFirst,
} from '../playwright-filler'
import type { AnamnesaFillPayload } from '../types'

// ============================================================================
// TEXT FORMATTERS
// ============================================================================

function formatKeluhanUtama(text: string): string {
  if (!text || text.trim().length === 0) return text
  let formatted = text.trim().toLowerCase().replace(/\s+/g, ' ')

  if (!formatted.includes('pasien')) {
    const symptoms = formatted.split(/\s+(?:dan|,|&)\s+/i)
    if (symptoms.length > 1) {
      const cap = symptoms.map(s => s.charAt(0).toUpperCase() + s.slice(1))
      formatted = `Pasien mengeluh ${cap.join(' dan ')}`
    } else {
      formatted = `Pasien mengeluh ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`
    }
  } else {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }
  return formatted
}

function expandKeluhanTambahan(text: string): string {
  if (!text || text.trim().length === 0) return text
  let expanded = text.trim()
  const wordCount = expanded.split(/\s+/).length
  if (wordCount >= 100) return expanded

  if (!expanded.endsWith('.')) expanded += '.'
  const additions: string[] = []
  if (!expanded.toLowerCase().includes('sejak') && !expanded.toLowerCase().includes('selama')) {
    additions.push('Keluhan dirasakan sejak beberapa hari yang lalu')
  }
  if (!expanded.toLowerCase().includes('aktivitas')) {
    additions.push('yang mengganggu aktivitas sehari-hari pasien')
  }
  if (!expanded.toLowerCase().includes('obat') && !expanded.toLowerCase().includes('pengobatan')) {
    additions.push('Pasien belum mendapatkan pengobatan khusus sebelumnya')
  }
  if (!expanded.toLowerCase().includes('kondisi umum')) {
    additions.push('Kondisi umum pasien saat ini cukup stabil dengan kesadaran compos mentis')
  }
  if (additions.length > 0) expanded += ' ' + additions.join('. ') + '.'
  return expanded
}

// ============================================================================
// ALERGI HELPER
// ============================================================================

async function fillAlergiSection(page: Page, alergi: AnamnesaFillPayload['alergi']): Promise<void> {
  if (!alergi) return

  const alergiGroups = [
    {
      key: 'obat',
      items: alergi.obat,
      nameSel: 'input[name*="alergi_obat"]',
      areaSel: 'textarea[name*="alergi_obat"]',
    },
    {
      key: 'makanan',
      items: alergi.makanan,
      nameSel: 'input[name*="alergi_makanan"]',
      areaSel: 'textarea[name*="alergi_makanan"]',
    },
    {
      key: 'udara',
      items: alergi.udara,
      nameSel: 'input[name*="alergi_udara"]',
      areaSel: 'textarea[name*="alergi_udara"]',
    },
    {
      key: 'lainnya',
      items: alergi.lainnya,
      nameSel: 'input[name*="alergi_lainnya"]',
      areaSel: 'textarea[name*="alergi_lainnya"]',
    },
  ]

  for (const group of alergiGroups) {
    if (!group.items || group.items.length === 0) continue
    const value = group.items.join(', ')
    const selectors = `${group.nameSel}, ${group.areaSel}`
    const found = await locateFirst(page, selectors)
    if (found) {
      await fillTextField(page, found, value, true)
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export interface AnamnesaFillResult {
  success: boolean
  filledFields: string[]
  failedFields: string[]
  error?: string
}

export async function fillAnamnesa(
  page: Page,
  payload: AnamnesaFillPayload
): Promise<AnamnesaFillResult> {
  const filledFields: string[] = []
  const failedFields: string[] = []

  // ---- 1. Keluhan Utama ----
  if (payload.keluhan_utama) {
    const formatted = formatKeluhanUtama(payload.keluhan_utama)
    const selectors = [
      'textarea[name="Anamnesa[keluhan_utama]"]',
      'textarea[name*="[keluhan_utama]"]',
      'textarea[id*="keluhan_utama"]',
      'textarea[id*="keluhan"]',
      'input[name*="keluhan_utama"]',
    ].join(', ')

    const r = await fillTextarea(page, selectors, formatted, true)
    if (r.success) filledFields.push('keluhan_utama')
    else failedFields.push('keluhan_utama')
  }

  // ---- 2. Keluhan Tambahan ----
  if (payload.keluhan_tambahan) {
    const expanded = expandKeluhanTambahan(payload.keluhan_tambahan)
    const selectors = [
      'textarea[name="Anamnesa[keluhan_tambahan]"]',
      'textarea[name*="[keluhan_tambahan]"]',
      'textarea[id*="keluhan_tambahan"]',
      'input[name*="keluhan_tambahan"]',
    ].join(', ')

    const r = await fillTextarea(page, selectors, expanded, true)
    if (r.success) filledFields.push('keluhan_tambahan')
    else failedFields.push('keluhan_tambahan')
  }

  // ---- 3. Lama Sakit ----
  if (payload.lama_sakit) {
    const { thn, bln, hr } = payload.lama_sakit
    const fields: FieldMapping[] = [
      {
        selector: [
          'input[name="Anamnesa[lama_sakit_tahun]"]',
          'input[name*="[lama_sakit_tahun]"]',
          'input[id*="lama_sakit_tahun"]',
          'input[id*="lama_thn"]',
        ].join(', '),
        value: thn,
        type: 'number',
      },
      {
        selector: [
          'input[name="Anamnesa[lama_sakit_bulan]"]',
          'input[name*="[lama_sakit_bulan]"]',
          'input[id*="lama_sakit_bulan"]',
          'input[id*="lama_bln"]',
        ].join(', '),
        value: bln,
        type: 'number',
      },
      {
        selector: [
          'input[name="Anamnesa[lama_sakit_hari]"]',
          'input[name*="[lama_sakit_hari]"]',
          'input[id*="lama_sakit_hari"]',
          'input[id*="lama_hr"]',
        ].join(', '),
        value: hr,
        type: 'number',
      },
    ]

    const results = await fillFields(page, fields, 50)
    for (let i = 0; i < results.length; i++) {
      const key = ['lama_sakit_thn', 'lama_sakit_bln', 'lama_sakit_hr'][i]
      if (results[i]?.success) filledFields.push(key!)
    }
  }

  // ---- 4. Vital Signs ----
  if (payload.vital_signs) {
    const vs = payload.vital_signs
    const vsFields: FieldMapping[] = [
      {
        selector:
          'input[name="PeriksaFisik[sistole]"], input[name*="[sistole]"], input[id*="sistole"]',
        value: vs.tekanan_darah_sistolik,
        type: 'number',
      },
      {
        selector:
          'input[name="PeriksaFisik[diastole]"], input[name*="[diastole]"], input[id*="diastole"]',
        value: vs.tekanan_darah_diastolik,
        type: 'number',
      },
      {
        selector:
          'input[name="PeriksaFisik[detak_nadi]"], input[name*="[detak_nadi]"], input[id*="nadi"]',
        value: vs.nadi,
        type: 'number',
      },
      {
        selector: 'input[name="PeriksaFisik[nafas]"], input[name*="[nafas]"], input[id*="nafas"]',
        value: vs.respirasi,
        type: 'number',
      },
      {
        selector: 'input[name="PeriksaFisik[suhu]"], input[name*="[suhu]"], input[id*="suhu"]',
        value: vs.suhu,
        type: 'number',
      },
    ]

    if (vs.gula_darah !== undefined) {
      vsFields.push({
        selector:
          'input#gula-darah, input[name="PeriksaFisik[gula_darah]"], input[name*="[gula_darah]"]',
        value: vs.gula_darah,
        type: 'number',
      })
    }

    const results = await fillFields(page, vsFields, 100)
    const vsKeys = ['sistole', 'diastole', 'nadi', 'nafas', 'suhu', 'gula_darah']
    for (let i = 0; i < results.length; i++) {
      if (results[i]?.success) filledFields.push(`vs_${vsKeys[i]}`)
    }

    // Kesadaran
    if (vs.kesadaran) {
      const kesadaranMap: Record<string, string> = {
        'COMPOS MENTIS': '1',
        SOMNOLEN: '2',
        SOPOR: '3',
        COMA: '4',
      }
      const val = kesadaranMap[vs.kesadaran] || '1'
      await fillSelect(page, 'select[name*="[kesadaran]"], select[id*="kesadaran"]', val)
    }
  }

  // ---- 5. Periksa Fisik (GCS, Anthropometrics, SpO2, Activity) ----
  if (payload.periksa_fisik) {
    const pf = payload.periksa_fisik

    const pfFields: FieldMapping[] = [
      {
        selector: 'input[name*="[gcs_mata]"], select[name*="[gcs_mata]"], input[id*="gcs_mata"]',
        value: pf.gcs_membuka_mata,
        type: 'select',
      },
      {
        selector:
          'input[name*="[gcs_verbal]"], select[name*="[gcs_verbal]"], input[id*="gcs_verbal"]',
        value: pf.gcs_respon_verbal,
        type: 'select',
      },
      {
        selector:
          'input[name*="[gcs_motorik]"], select[name*="[gcs_motorik]"], input[id*="gcs_motorik"]',
        value: pf.gcs_respon_motorik,
        type: 'select',
      },
      {
        selector: 'input[name*="[tinggi_badan]"], input[name*="[tinggi]"], input[id*="tinggi"]',
        value: pf.tinggi,
        type: 'number',
      },
      {
        selector: 'input[name*="[berat_badan]"], input[name*="[berat]"], input[id*="berat"]',
        value: pf.berat,
        type: 'number',
      },
      {
        selector: 'input[name*="[lingkar_perut]"], input[id*="lingkar_perut"]',
        value: pf.lingkar_perut,
        type: 'number',
      },
      {
        selector: 'input[name*="[saturasi]"], input[name*="[spo2]"], input[id*="saturasi"]',
        value: pf.saturasi,
        type: 'number',
      },
    ]

    await fillFields(page, pfFields, 80)
    filledFields.push('periksa_fisik')

    // IMT (calculated, might be auto-calculated — try anyway)
    if (pf.imt) {
      const imtSel = await locateFirst(page, 'input[name*="[imt]"], input[id*="imt"]')
      if (imtSel) await fillNumberField(page, imtSel, pf.imt)
    }

    // Activity fields (radio buttons: 0/1/2)
    const activityFields = [
      { key: 'mobilisasi', val: pf.mobilisasi },
      { key: 'toileting', val: pf.toileting },
      { key: 'makan_minum', val: pf.makan_minum },
      { key: 'mandi', val: pf.mandi },
      { key: 'berpakaian', val: pf.berpakaian },
    ] as const

    for (const af of activityFields) {
      const sel = `input[name*="[${af.key}]"][value="${af.val}"], select[name*="[${af.key}]"]`
      const found = await locateFirst(page, sel)
      if (found) {
        const tagName = await page
          .locator(found)
          .first()
          .evaluate(el => el.tagName.toLowerCase())
        if (tagName === 'select') {
          await fillSelect(page, found, af.val)
        } else {
          await page
            .locator(found)
            .first()
            .click()
            .catch(() => null)
        }
      }
    }
  }

  // ---- 6. Assesmen Nyeri ----
  if (payload.assesmen_nyeri) {
    const { merasakan_nyeri, skala_nyeri } = payload.assesmen_nyeri

    if (merasakan_nyeri === '1') {
      // Click "Ya" radio / checkbox untuk nyeri
      const nyeriSel =
        'input[name*="[merasakan_nyeri]"][value="1"], input[id*="merasakan_nyeri_ya"]'
      const found = await locateFirst(page, nyeriSel)
      if (found)
        await page
          .locator(found)
          .first()
          .click()
          .catch(() => null)

      // Fill skala nyeri slider
      if (skala_nyeri !== undefined) {
        await fillRangeSlider(
          page,
          'input#skala_nyeri, input[name*="[skala_nyeri]"]',
          'input#range-slider, input[type="range"][id*="skala"]',
          skala_nyeri
        )
        filledFields.push('skala_nyeri')
      }
    }
  }

  // ---- 7. Resiko Jatuh ----
  if (payload.resiko_jatuh) {
    const { cara_berjalan, penopang } = payload.resiko_jatuh

    if (cara_berjalan === '1') {
      const sel = 'input[name*="[cara_berjalan]"][value="1"], input[id*="cara_berjalan_ya"]'
      const found = await locateFirst(page, sel)
      if (found) await activateCheckboxWithOnclick(page, found, true)
    }
    if (penopang === '1') {
      const sel = 'input[name*="[penopang]"][value="1"], input[id*="penopang_ya"]'
      const found = await locateFirst(page, sel)
      if (found) await activateCheckboxWithOnclick(page, found, true)
    }
  }

  // ---- 8. Keadaan Fisik ----
  if (payload.keadaan_fisik) {
    const kf = payload.keadaan_fisik
    const areas = Object.entries(kf) as [
      string,
      { inspeksi: string; palpasi?: string } | undefined,
    ][]

    for (const [area, data] of areas) {
      if (!data) continue

      // Enable checkbox for this area
      const checkboxSel = [
        `input[type="checkbox"][name*="${area}"]`,
        `input[type="checkbox"][id*="${area}"]`,
        `input[type="checkbox"][value*="${area}"]`,
      ].join(', ')
      const cbFound = await locateFirst(page, checkboxSel)
      if (cbFound) {
        await activateCheckboxWithOnclick(page, cbFound, true)
        await page.waitForTimeout(200) // wait for textarea to become visible
      }

      // Fill inspeksi
      if ('inspeksi' in data && data.inspeksi) {
        const inspSel = [
          `textarea[name*="${area}"][name*="inspeksi"]`,
          `textarea[id*="${area}_inspeksi"]`,
        ].join(', ')
        const found = await locateFirst(page, inspSel)
        if (found) await fillTextarea(page, found, data.inspeksi, true)
      }

      // Fill palpasi
      if ('palpasi' in data && data.palpasi) {
        const palSel = [
          `textarea[name*="${area}"][name*="palpasi"]`,
          `textarea[id*="${area}_palpasi"]`,
        ].join(', ')
        const found = await locateFirst(page, palSel)
        if (found) await fillTextarea(page, found, data.palpasi, true)
      }
    }
    filledFields.push('keadaan_fisik')
  }

  // ---- 9. Riwayat Penyakit ----
  if (payload.riwayat_penyakit) {
    const rp = payload.riwayat_penyakit
    const rpFields: FieldMapping[] = [
      {
        selector:
          'textarea[name*="[rps]"], textarea[id*="rps"], textarea[name*="riwayat_sekarang"]',
        value: rp.sekarang,
        type: 'textarea',
        forceOverride: true,
      },
      {
        selector: 'textarea[name*="[rpd]"], textarea[id*="rpd"], textarea[name*="riwayat_dahulu"]',
        value: rp.dahulu,
        type: 'textarea',
        forceOverride: true,
      },
      {
        selector:
          'textarea[name*="[rpk]"], textarea[id*="rpk"], textarea[name*="riwayat_keluarga"]',
        value: rp.keluarga,
        type: 'textarea',
        forceOverride: true,
      },
    ]
    await fillFields(page, rpFields, 80)
    filledFields.push('riwayat_penyakit')
  }

  // ---- 10. Alergi ----
  if (payload.alergi) {
    await fillAlergiSection(page, payload.alergi)
    filledFields.push('alergi')
  }

  // ---- 11. Status Psikososial ----
  if (payload.status_psikososial) {
    const sp = payload.status_psikososial
    const spFields: FieldMapping[] = [
      {
        selector:
          'select[name*="[alat_bantu_aktrifitas]"], input[name*="[alat_bantu]"][value="${sp.alat_bantu_aktrifitas}"]',
        value: sp.alat_bantu_aktrifitas,
        type: 'select',
      },
      {
        selector: 'select[name*="[bahasa_digunakan]"]',
        value: sp.bahasa_digunakan,
        type: 'select',
      },
      {
        selector: 'select[name*="[tinggal_dengan]"]',
        value: sp.tinggal_dengan,
        type: 'select',
      },
      {
        selector: 'select[name*="[sosial_ekonomi]"]',
        value: sp.sosial_ekonomi,
        type: 'select',
      },
    ]
    await fillFields(page, spFields, 80)
    filledFields.push('status_psikososial')
  }

  // ---- 12. Lainnya ----
  if (payload.lainnya) {
    const l = payload.lainnya
    const lainnyaFields: FieldMapping[] = []

    if (l.terapi) {
      lainnyaFields.push({
        selector: 'textarea[name*="[terapi]"], input[name*="[terapi]"]',
        value: l.terapi,
        type: 'textarea',
        forceOverride: true,
      })
    }
    if (l.terapi_non_obat) {
      lainnyaFields.push({
        selector: 'textarea[name*="[terapi_non_obat]"]',
        value: l.terapi_non_obat,
        type: 'textarea',
        forceOverride: true,
      })
    }
    if (l.edukasi) {
      lainnyaFields.push({
        selector: 'textarea[name*="[edukasi]"], input[name*="[edukasi]"]',
        value: l.edukasi,
        type: 'textarea',
        forceOverride: true,
      })
    }

    if (lainnyaFields.length > 0) {
      await fillFields(page, lainnyaFields, 80)
      filledFields.push('lainnya')
    }
  }

  // ---- 13. Tenaga Medis ----
  if (payload.tenaga_medis) {
    const tm = payload.tenaga_medis

    if (tm.dokter_nama) {
      const dokterSel = [
        'input[placeholder*="Nama Dokter"]',
        'input[placeholder*="dokter"]',
        'input[name*="dokter_nama"]',
        'input[name*="dokter"]',
      ].join(', ')
      await fillTextField(page, dokterSel, tm.dokter_nama, false)
    }

    if (tm.perawat_nama) {
      const perawatSel = [
        'input[placeholder*="Asisten"]',
        'input[placeholder*="Perawat"]',
        'input[placeholder*="perawat"]',
        'input[name*="perawat_nama"]',
        'input[name*="perawat"]',
      ].join(', ')
      await fillTextField(page, perawatSel, tm.perawat_nama, false)
    }
  }

  return {
    success: failedFields.length === 0 || filledFields.length > 0,
    filledFields,
    failedFields,
  }
}
