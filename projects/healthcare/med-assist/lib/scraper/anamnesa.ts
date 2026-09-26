// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

import { getInputValue, getTextContent, waitForElement } from '@/lib/scraper/dom-utils.ts';

interface EncounterData {
  patientId: string;
  encounterId?: string;
  timestamp: string;
  complaint?: string;
  history?: string[];
  allergies?: string[];
  diagnosis?: {
    code: string;
    name: string;
    type: 'Primary' | 'Secondary';
  }[];
}

/** Helper: parse numeric value from input, return undefined if empty/NaN */
const getNumericValue = (selector: string): number | undefined => {
  const raw = getInputValue(selector);
  if (!raw) return undefined;
  const num = Number.parseFloat(raw);
  return Number.isNaN(num) ? undefined : num;
};

/** Helper: read select element's selected value */
const getSelectValue = (selector: string): string => {
  const el = document.querySelector(selector) as HTMLSelectElement | null;
  if (!el) return '';
  return el.value?.trim() || '';
};

/**
 * AnamnesaScrapeResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AnamnesaScrapeResult extends Partial<EncounterData> {
  /** Vital signs scraped from PeriksaFisik fields */
  vital_signs?: {
    tekanan_darah_sistolik?: number;
    tekanan_darah_diastolik?: number;
    nadi?: number;
    respirasi?: number;
    suhu?: number;
    gula_darah?: number;
  };
  /** Patient demographics scraped from page header / hidden fields */
  patient_demographics?: {
    nama?: string;
    umur?: number;
    jenis_kelamin?: 'L' | 'P';
    no_rm?: string;
    no_bpjs?: string;
  };
  /** Anamnesa data in Encounter format (keluhan_utama, keluhan_tambahan, etc.) */
  anamnesa?: {
    keluhan_utama: string;
    keluhan_tambahan: string;
    lama_sakit?: { thn: number; bln: number; hr: number };
    riwayat_penyakit?: string;
    alergi?: {
      obat: string[];
      makanan: string[];
      udara: string[];
      lainnya: string[];
    };
  };
}

export const scrapeAnamnesa = async (): Promise<AnamnesaScrapeResult> => {
  console.warn('[Scraper] Analyzing Anamnesa Page...');

  await waitForElement('#form-anamnesa-container');

  // ── Legacy fields (backward compat) ──
  const patientId = getTextContent('.patient-info .id-label');
  const keluhanUtama = getInputValue('textarea[name="keluhan_utama"]');
  const keluhanTambahan = getInputValue('textarea[name="keluhan_tambahan"]');

  // ── Vital Signs from PeriksaFisik section ──
  const sbp = getNumericValue('input#sistole, input[name="PeriksaFisik[sistole]"]');
  const dbp = getNumericValue('input#diastole, input[name="PeriksaFisik[diastole]"]');
  const hr = getNumericValue('input#detak-nadi, input[name="PeriksaFisik[detak_nadi]"]');
  const rr = getNumericValue('input#nafas, input[name="PeriksaFisik[nafas]"]');
  const temp = getNumericValue('input#suhu, input[name="PeriksaFisik[suhu]"]');
  const glucose = getNumericValue(
    'input#gula-darah, input[name="PeriksaFisik[gula_darah]"], input[name="gula_darah"]'
  );

  const hasVitals = sbp !== undefined || dbp !== undefined || hr !== undefined;
  const vital_signs = hasVitals
    ? {
        tekanan_darah_sistolik: sbp,
        tekanan_darah_diastolik: dbp,
        nadi: hr,
        respirasi: rr,
        suhu: temp,
        gula_darah: glucose,
      }
    : undefined;

  // ── Patient Demographics ──
  // ePuskesmas typically shows patient info in header area
  const namaSelectors = [
    '.patient-info .nama-pasien',
    '.patient-info .patient-name',
    '.patient-header .nama',
    'input[name="nama_pasien"]',
    'span.nama-pasien',
    '#nama-pasien',
  ];
  let nama = '';
  for (const sel of namaSelectors) {
    nama = getTextContent(sel) || getInputValue(sel);
    if (nama) break;
  }

  // Age: try hidden input or text display
  const umurSelectors = [
    'input[name="umur"]',
    'input[name="usia"]',
    '.patient-info .umur',
    '.patient-info .age',
    'span.umur-pasien',
  ];
  let umur: number | undefined;
  for (const sel of umurSelectors) {
    const raw = getInputValue(sel) || getTextContent(sel);
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 200) {
        umur = parsed;
        break;
      }
    }
  }

  // Gender
  const genderSelectors = [
    'input[name="jenis_kelamin"]',
    'select[name="jenis_kelamin"]',
    '.patient-info .jk',
    '.patient-info .gender',
    'span.jk-pasien',
  ];
  let jk: 'L' | 'P' | undefined;
  for (const sel of genderSelectors) {
    const raw = (getSelectValue(sel) || getInputValue(sel) || getTextContent(sel)).toUpperCase();
    if (raw === 'L' || raw === 'LAKI-LAKI' || raw === 'LAKI' || raw === 'M' || raw === 'MALE') {
      jk = 'L';
      break;
    }
    if (raw === 'P' || raw === 'PEREMPUAN' || raw === 'F' || raw === 'FEMALE' || raw === 'WANITA') {
      jk = 'P';
      break;
    }
  }

  // No RM / No BPJS
  const noRm =
    getInputValue('input[name="no_rm"]') ||
    getInputValue('input[name="nomor_rm"]') ||
    getTextContent('.patient-info .no-rm') ||
    patientId;
  const noBpjs =
    getInputValue('input[name="no_bpjs"]') ||
    getInputValue('input[name="nomor_bpjs"]') ||
    getTextContent('.patient-info .no-bpjs');

  const patient_demographics =
    nama || umur || jk
      ? {
          nama: nama || undefined,
          umur,
          jenis_kelamin: jk,
          no_rm: noRm || undefined,
          no_bpjs: noBpjs || undefined,
        }
      : undefined;

  // ── Anamnesa structured data ──
  const lamaThn = getNumericValue(
    'input[name="Anamnesa[lama_sakit_thn]"], input[name="lama_sakit_thn"]'
  );
  const lamaBln = getNumericValue(
    'input[name="Anamnesa[lama_sakit_bln]"], input[name="lama_sakit_bln"]'
  );
  const lamaHr = getNumericValue(
    'input[name="Anamnesa[lama_sakit_hr]"], input[name="lama_sakit_hr"]'
  );

  const data: AnamnesaScrapeResult = {
    // Legacy fields
    patientId,
    timestamp: new Date().toISOString(),
    complaint: keluhanUtama,
    history: [
      getInputValue('textarea[name="riwayat_penyakit"]'),
      getInputValue('textarea[name="riwayat_alergi"]'),
    ].filter(Boolean),

    // New structured data
    vital_signs,
    patient_demographics,
    anamnesa: {
      keluhan_utama: keluhanUtama,
      keluhan_tambahan: keluhanTambahan,
      lama_sakit: {
        thn: lamaThn ?? 0,
        bln: lamaBln ?? 0,
        hr: lamaHr ?? 0,
      },
      riwayat_penyakit: getInputValue('textarea[name="riwayat_penyakit"]') || undefined,
    },
  };

  console.warn('[Scraper] Anamnesa scraped:', {
    hasVitals: !!vital_signs,
    hasDemographics: !!patient_demographics,
    hasKeluhan: !!keluhanUtama,
  });

  return data;
};
