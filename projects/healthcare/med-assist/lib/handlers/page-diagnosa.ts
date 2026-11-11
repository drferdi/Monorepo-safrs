// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Diagnosa Page Handler
 * Handles auto-fill for Diagnosa/ICD-10 form in ePuskesmas
 *
 * Uses DAS (Data Ascension System) for intelligent field mapping:
 * - Layer 1: Check cache (<50ms)
 * - Layer 2: DOM Scanner (if cache miss)
 * - Layer 3: local semantic mapping
 * - Layer 4: Learning from user corrections
 *
 * Fill Fields:
 * 1. ICD-10 Code (text/autocomplete)
 * 2. Diagnosis Name (text)
 * 3. Jenis Diagnosa (PRIMER/SEKUNDER)
 * 4. Kasus (BARU/LAMA)
 * 5. Prognosa (optional textarea)
 */

import { DOKTER_NAMA, PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import { type FieldMapping, type FillResult, fillFields } from '@/lib/filler/filler-core';
import { VISIT_FIELD_SELECTORS } from '@/lib/scraper/field-selectors';
import { getInputValue } from '@/lib/scraper/dom-utils';
import { createLogger } from '@/utils/logger';
import type { DiagnosaFillPayload } from '@/utils/types';

const diagnosaLog = createLogger('DiagnosaHandler', 'content');

// ============================================================================
// DIAGNOSA PAYLOAD TO DAS MAPPING
// ============================================================================

/**
 * Map DiagnosaFillPayload to generic key-value for DAS
 * DAS expects a flat Record<string, unknown>
 */
function buildDASPayload(payload: DiagnosaFillPayload): Record<string, unknown> {
  const dasPayload: Record<string, unknown> = {};

  if (payload.icd_x) {
    dasPayload['icd_x'] = payload.icd_x;
    dasPayload['icd10'] = payload.icd_x; // Alternative key
    dasPayload['kode_diagnosa'] = payload.icd_x; // Alternative key
  }

  if (payload.nama) {
    dasPayload['nama_diagnosa'] = payload.nama;
    dasPayload['diagnosis_name'] = payload.nama; // Alternative key
  }

  if (payload.jenis) {
    dasPayload['jenis_diagnosa'] = payload.jenis;
    dasPayload['jenis'] = payload.jenis;
  }

  if (payload.kasus) {
    dasPayload['kasus_diagnosa'] = payload.kasus;
    dasPayload['kasus'] = payload.kasus;
  }

  if (payload.prognosa) {
    dasPayload['prognosa'] = payload.prognosa;
    dasPayload['prognosis'] = payload.prognosa; // Alternative key
  }

  return dasPayload;
}

// ============================================================================
// JENIS & KASUS VALUE MAPPING
// ============================================================================

/**
 * Map PRIMER/SEKUNDER to ePuskesmas dropdown values
 */
const JENIS_VALUE_MAP: Record<string, string[]> = {
  PRIMER: ['1', 'PRIMER', 'primer', 'P'],
  SEKUNDER: ['2', 'SEKUNDER', 'sekunder', 'S'],
};

/**
 * Map BARU/LAMA to ePuskesmas dropdown values
 */
const KASUS_VALUE_MAP: Record<string, string[]> = {
  BARU: ['1', 'BARU', 'baru', 'B'],
  LAMA: ['2', 'LAMA', 'lama', 'L'],
};

/**
 * Map prognosis text to ePuskesmas dropdown values
 * ePuskesmas uses numeric values (1-5) for prognosis dropdown
 */
const PROGNOSA_EPUSKESMAS_MAP: Record<string, string> = {
  'Sanam (Sembuh)': '1',
  'Bonam (Baik)': '2',
  'Malam (Buruk/Jelek)': '3',
  'Dubia Ad Sanam/Bonam (Tidak tentu/Ragu-ragu, Cenderung Sembuh/Baik)': '4',
  'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)': '5',
};

/**
 * Try to find matching select option value
 */
function findSelectValue(element: HTMLSelectElement, possibleValues: string[]): string | null {
  for (const opt of Array.from(element.options)) {
    const optValue = opt.value.toUpperCase();
    const optText = opt.text.toUpperCase();

    for (const val of possibleValues) {
      if (optValue === val.toUpperCase() || optText.includes(val.toUpperCase())) {
        return opt.value;
      }
    }
  }
  return possibleValues[0]; // Default to first value
}

function getNearbyText(element: Element | null): string {
  if (!element) return '';
  const scope =
    element.closest('label, .form-group, .panel, .box, .row, tr, td, div') || element.parentElement;
  return (scope?.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getCheckboxLabelText(checkbox: HTMLInputElement): string {
  const parts: string[] = [];

  if (checkbox.id) {
    try {
      const linkedLabel = document.querySelector(
        `label[for="${checkbox.id.replace(/"/g, '\\"')}"]`
      );
      if (linkedLabel?.textContent) {
        parts.push(linkedLabel.textContent);
      }
    } catch {
      // ignore malformed selector edge cases
    }
  }

  const wrappingLabel = checkbox.closest('label');
  if (wrappingLabel?.textContent) {
    parts.push(wrappingLabel.textContent);
  }

  const next = checkbox.nextElementSibling;
  if (next?.textContent) {
    parts.push(next.textContent);
  }

  const parent = checkbox.parentElement;
  if (parent?.textContent) {
    parts.push(parent.textContent);
  }

  const cell = checkbox.closest('td, li, tr, div');
  if (cell?.textContent) {
    parts.push(cell.textContent);
  }

  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isScreeningContext(element: Element | null): boolean {
  const text = getNearbyText(element);
  return (
    text.includes('screening') ||
    text.includes('silhakan pilih jenis screening') ||
    text.includes('silahkan pilih jenis screening')
  );
}

function findPrognosaSelector(): string | null {
  const prioritizedSelectors = [
    'select#prognosa',
    'select[id*="prognosa"]',
    'select[name^="Diagnosa["][name$="[prognosa]"]',
    'select[name="Diagnosa[prognosa]"]',
    'select[name="prognosa"]',
  ];

  const candidates: HTMLSelectElement[] = [];
  for (const sel of prioritizedSelectors) {
    const found = Array.from(document.querySelectorAll(sel)).filter(
      (el): el is HTMLSelectElement => el instanceof HTMLSelectElement
    );
    candidates.push(...found);
  }

  for (const el of candidates) {
    if (isElementHiddenForFill(el)) continue;
    if (isScreeningContext(el)) continue;

    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const nearby = getNearbyText(el);
    const optionsText = Array.from(el.options)
      .map((opt) => (opt.text || '').toLowerCase())
      .join(' | ');

    if (optionsText.includes('screening')) continue;

    const looksLikePrognosaOptions =
      optionsText.includes('bonam') ||
      optionsText.includes('sanam') ||
      optionsText.includes('dubia') ||
      optionsText.includes('malam');

    const looksLikeDiagnosaField =
      id.includes('prognosa') ||
      name.includes('prognosa') ||
      name.includes('diagnosa') ||
      nearby.includes('prognosa');

    if (!looksLikePrognosaOptions || !looksLikeDiagnosaField) {
      continue;
    }

    const token = `sentra-prognosa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    el.setAttribute('data-sentra-prognosa', token);
    return `[data-sentra-prognosa="${token}"]`;
  }

  return null;
}

function sanitizeStaffName(value: string | null | undefined): string | null {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;
  if (/^\d{4,}$/.test(normalized)) return null;
  if (!/[a-z]/i.test(normalized)) return null;
  if (normalized.length < 3) return null;
  return normalized;
}

function isAutocompleteLikeInput(input: HTMLInputElement): boolean {
  const className = (input.className || '').toLowerCase();
  const role = (input.getAttribute('role') || '').toLowerCase();
  return (
    className.includes('ui-autocomplete-input') ||
    className.includes('typeahead') ||
    role === 'combobox' ||
    input.getAttribute('aria-autocomplete') === 'list'
  );
}

function scoreStaffInput(input: HTMLInputElement, role: 'dokter' | 'perawat'): number {
  const placeholder = (input.placeholder || '').toLowerCase();
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const currentValue = (input.value || '').trim();
  let score = 0;

  if (!currentValue) score += 35;
  if (isAutocompleteLikeInput(input)) score += 20;
  if (/^\d{4,}$/.test(currentValue)) score -= 90; // usually hidden/id-like field shown in table
  if (placeholder.includes('cari') || name.includes('icd') || name.includes('diagnosa'))
    score -= 70;

  if (role === 'dokter') {
    if (placeholder.includes('nama dokter')) score += 90;
    if (placeholder.includes('dokter') && !placeholder.includes('asisten')) score += 60;
    if (name.includes('dokter_nama')) score += 45;
    if (name.includes('dokter')) score += 25;
    if (id.includes('dokter')) score += 15;
    if (placeholder.includes('asisten')) score -= 40;
  } else {
    if (placeholder.includes('asisten')) score += 90;
    if (placeholder.includes('perawat') || placeholder.includes('bidan')) score += 70;
    if (name.includes('perawat') || name.includes('bidan')) score += 40;
    if (id.includes('perawat') || id.includes('bidan')) score += 20;
  }

  return score;
}

function findBestStaffInput(role: 'dokter' | 'perawat'): HTMLInputElement | null {
  const selector =
    role === 'dokter'
      ? [
          'input[placeholder*="Dokter"]',
          'input[placeholder*="dokter"]',
          'input[name*="dokter_nama"]',
          'input[name*="dokter"]',
          'input[id*="dokter"]',
        ].join(', ')
      : [
          'input[placeholder*="Asisten"]',
          'input[placeholder*="Perawat"]',
          'input[placeholder*="perawat"]',
          'input[placeholder*="Bidan"]',
          'input[placeholder*="bidan"]',
          'input[name*="perawat"]',
          'input[name*="bidan"]',
          'input[id*="perawat"]',
          'input[id*="bidan"]',
        ].join(', ');

  const candidates = Array.from(document.querySelectorAll(selector)).filter(
    (el): el is HTMLInputElement =>
      el instanceof HTMLInputElement &&
      el.offsetParent !== null &&
      !el.disabled &&
      !el.readOnly &&
      el.type !== 'hidden'
  );

  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((input) => ({ input, score: scoreStaffInput(input, role) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].input : null;
}

/**
 * Find chronic disease checkbox by disease name
 * Tries multiple strategies: label text match, input value match, name attribute
 */
function findChronicDiseaseCheckbox(diseaseName: string): HTMLInputElement | null {
  const searchTerms = CHRONIC_DISEASE_CHECKBOX_MAP[diseaseName] || [diseaseName];

  // Strategy 1: Find by label text
  const allLabels = Array.from(document.querySelectorAll('label'));
  for (const label of allLabels) {
    if (isScreeningContext(label)) continue;
    const labelText = label.textContent?.trim().toLowerCase() || '';
    for (const term of searchTerms) {
      if (labelText.includes(term.toLowerCase())) {
        // Find associated checkbox
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const checkbox = document.getElementById(forAttr) as HTMLInputElement;
          if (checkbox && checkbox.type === 'checkbox') {
            return checkbox;
          }
        }
        // Or checkbox inside label
        const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
          return checkbox;
        }
      }
    }
  }

  // Strategy 2: Find by input name/id/value
  const allCheckboxes = Array.from(
    document.querySelectorAll('input[type="checkbox"]')
  ) as HTMLInputElement[];
  for (const checkbox of allCheckboxes) {
    if (isScreeningContext(checkbox)) continue;
    const name = (checkbox.name || '').toLowerCase();
    const id = (checkbox.id || '').toLowerCase();
    const value = (checkbox.value || '').toLowerCase();
    const labelText = getCheckboxLabelText(checkbox);

    for (const term of searchTerms) {
      const termLower = term.toLowerCase();
      if (
        name.includes(termLower) ||
        id.includes(termLower) ||
        value.includes(termLower) ||
        labelText.includes(termLower)
      ) {
        return checkbox;
      }
    }
  }

  // Strategy 3: Match surrounding text (row/cell/div) near checkbox
  for (const checkbox of allCheckboxes) {
    if (isScreeningContext(checkbox)) continue;
    const scope =
      checkbox.closest('label, tr, td, li, div') ||
      checkbox.parentElement ||
      checkbox.nextElementSibling;
    const scopeText = (scope?.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!scopeText) continue;

    for (const term of searchTerms) {
      if (scopeText.includes(term.toLowerCase())) {
        return checkbox;
      }
    }
  }

  return null;
}

// ============================================================================
// FALLBACK SELECTORS (if DAS fails)
// ============================================================================

/**
 * Chronic disease mapping: Indonesian names to checkbox identifiers
 * Based on ePuskesmas form structure
 */
const CHRONIC_DISEASE_CHECKBOX_MAP: Record<string, string[]> = {
  Hipertensi: ['Hipertensi', 'hipertensi'],
  'Diabetes Mellitus': ['Diabetes Mellitus', 'diabetes'],
  'Gagal Jantung': ['Penyakit Jantung Kronis', 'jantung', 'gagal jantung'],
  'Penyakit Jantung Koroner': ['Penyakit Jantung Kronis', 'jantung', 'koroner'],
  Stroke: ['Stroke', 'stroke'],
  'Gagal Ginjal Kronik': ['Penyakit Ginjal Kronis', 'ginjal', 'gagal ginjal'],
  Kanker: ['Kanker', 'kanker'],
  'Asma Kronis': ['Penyakit Paru Kronis', 'paru', 'asma'],
  PPOK: ['Penyakit Paru Kronis', 'paru', 'ppok'],
  GERD: ['Penyakit Autoimun', 'gerd'], // May vary by ePuskesmas version
  'Gangguan Tiroid': ['Penyakit Autoimun', 'tiroid'], // May vary by ePuskesmas version
};

const FALLBACK_SELECTORS = {
  dokter_nama: [
    'input[name*="dokter"]',
    'input[placeholder*="dokter"]',
    'input[placeholder*="Dokter"]',
    'input[name*="tenaga_medis"]',
  ],
  perawat_nama: [
    'input[name*="perawat"]',
    'input[placeholder*="perawat"]',
    'input[placeholder*="Perawat"]',
    'input[name*="bidan"]',
  ],
  icd_x: [
    // PRIORITY 1: Visible non-indexed fields first
    'input[name="diagnosa_id"]:not([readonly]):not([disabled])',
    'input[data-for="diagnosa_id"][name="diagnosa_id"]:not([readonly]):not([disabled])',
    // PRIORITY 2: Any visible field with diagnosa_id in name
    'input[name*="diagnosa_id"]:not([readonly]):not([disabled])',
    // PRIORITY 3: Indexed variants
    'input[name="Diagnosa[1][diagnosa_id]"]',
    'input[name="Diagnosa[2][diagnosa_id]"]',
    'input[name="Diagnosa[0][diagnosa_id]"]',
    'input[name^="Diagnosa["][name$="[diagnosa_id]"]:not([readonly]):not([disabled])',
    'input[name="Diagnosa[icd_x]"]',
    'input[name="Diagnosa[kode]"]',
    'input[name="icd10"]',
    'input[name="icd_code"]',
    'input[name="kode_diagnosa"]',
    'input#icd-input',
    'input.icd-autocomplete',
    'input[id*="icd"]',
    'input[name*="icd"]',
  ],
  nama: [
    // PRIORITY 1: Visible non-indexed fields first
    'input[name="diagnosa_nama"]:not([readonly]):not([disabled])',
    'input[data-for="diagnosa_nama"][name="diagnosa_nama"]:not([readonly]):not([disabled])',
    // PRIORITY 2: Any visible field with diagnosa_nama in name
    'input[name*="diagnosa_nama"]:not([readonly]):not([disabled])',
    // PRIORITY 3: Indexed variants
    'input[name="Diagnosa[1][diagnosa_nama]"]',
    'input[name="Diagnosa[2][diagnosa_nama]"]',
    'input[name="Diagnosa[0][diagnosa_nama]"]',
    'input[name^="Diagnosa["][name$="[diagnosa_nama]"]:not([readonly]):not([disabled])',
    'input[name="Diagnosa[nama]"]',
    'input[name="diagnosis_name"]',
    'input[name="nama_diagnosa"]',
    'textarea[name="Diagnosa[nama]"]',
    'input[id*="nama_diagnosa"]',
  ],
  jenis: [
    // PRIORITY 1: Visible non-indexed fields first
    'select[name="diagnosa_jenis"]:not([disabled])',
    'select[name="jenis_diagnosa"]:not([disabled])',
    'select[name="jenis"]:not([disabled])',
    // PRIORITY 2: Any visible field with diagnosa_jenis in name
    'select[name*="diagnosa_jenis"]:not([disabled])',
    // PRIORITY 3: Indexed variants
    'select[name="Diagnosa[1][diagnosa_jenis]"]',
    'select[name="Diagnosa[2][diagnosa_jenis]"]',
    'select[name="Diagnosa[0][diagnosa_jenis]"]',
    'select[name^="Diagnosa["][name$="[diagnosa_jenis]"]:not([disabled])',
    'select[name="Diagnosa[jenis]"]',
    'select#jenis-diagnosa',
    'select[id*="jenis"]',
  ],
  kasus: [
    // PRIORITY 1: Visible non-indexed fields first
    'select[name="diagnosa_kasus"]:not([disabled])',
    'select[name="kasus_diagnosa"]:not([disabled])',
    'select[name="kasus"]:not([disabled])',
    // PRIORITY 2: Any visible field with diagnosa_kasus in name
    'select[name*="diagnosa_kasus"]:not([disabled])',
    // PRIORITY 3: Indexed variants
    'select[name="Diagnosa[1][diagnosa_kasus]"]',
    'select[name="Diagnosa[2][diagnosa_kasus]"]',
    'select[name="Diagnosa[0][diagnosa_kasus]"]',
    'select[name^="Diagnosa["][name$="[diagnosa_kasus]"]:not([disabled])',
    'select[name="Diagnosa[kasus]"]',
    'select#kasus-diagnosa',
    'select[id*="kasus"]',
  ],
  prognosa: [
    // Live ePuskesmas variants (confirmed)
    'select#prognosa',
    'select[name="prognosa"]',
    'select[name^="Diagnosa["][name$="[prognosa]"]',
    'textarea[name="Diagnosa[prognosa]"]',
    'textarea[name="prognosa"]',
    'input[name="Diagnosa[prognosa]"]',
    'input[name="prognosa"]',
  ],
} as const;

function isJsdomEnvironment(): boolean {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
}

function isElementHiddenForFill(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }

  // In JSDOM, offsetParent is frequently null even for normal visible elements.
  if (isJsdomEnvironment()) {
    return false;
  }

  return el.offsetParent === null && style.position !== 'fixed';
}

function findSelectorByFallback(selectors: readonly string[]): string | null {
  for (const sel of selectors) {
    const candidates = Array.from(document.querySelectorAll(sel));
    for (const el of candidates) {
      // Skip hidden elements
      if (el instanceof HTMLElement) {
        if (isElementHiddenForFill(el)) {
          diagnosaLog.debug('[Diagnosa Handler] Skipping hidden element:', sel);
          continue;
        }
      }

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.readOnly || el.disabled) {
          continue;
        }
      } else if (el instanceof HTMLSelectElement) {
        if (el.disabled) {
          continue;
        }
      }

      if (el instanceof HTMLElement) {
        diagnosaLog.debug('[Diagnosa Handler] ✅ Found VISIBLE element for:', sel, el);
        const token = `sentra-dx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        el.setAttribute('data-sentra-target', token);
        return `[data-sentra-target="${token}"]`;
      }
    }
  }
  diagnosaLog.debug('[Diagnosa Handler] ❌ No visible element found for selectors:', selectors);
  return null;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findChronicDiseaseCheckboxWithRetry(
  diseaseName: string,
  retries: number = 3,
  delayMs: number = 250
): Promise<HTMLInputElement | null> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const found = findChronicDiseaseCheckbox(diseaseName);
    if (found) return found;
    if (attempt < retries - 1) {
      await waitMs(delayMs);
    }
  }
  return null;
}

async function applyPostDiagnosisFields(
  payload: DiagnosaFillPayload,
  normalizedSkipped: string[]
): Promise<{
  success: FillResult[];
  failed: FillResult[];
}> {
  const postMappings: FieldMapping[] = [];

  if (payload.prognosa) {
    const progSelector = findPrognosaSelector();
    if (progSelector) {
      const progEl = document.querySelector(progSelector);
      let prognosisValue: string = payload.prognosa;
      if (progEl instanceof HTMLSelectElement) {
        const mappedValue = PROGNOSA_EPUSKESMAS_MAP[payload.prognosa];
        if (mappedValue) {
          prognosisValue = findSelectValue(progEl, [mappedValue, payload.prognosa]) || mappedValue;
        }
      }
      postMappings.push({
        selector: progSelector,
        value: prognosisValue,
        type: progEl instanceof HTMLSelectElement ? 'select' : 'textarea',
      });
    } else {
      normalizedSkipped.push('prognosa: Element not found (post-add)');
    }
  }

  if (payload.penyakit_kronis && payload.penyakit_kronis.length > 0) {
    for (const diseaseName of payload.penyakit_kronis) {
      const checkbox = await findChronicDiseaseCheckboxWithRetry(diseaseName, 3, 300);
      if (checkbox) {
        const checkboxToken = `sentra-chronic-post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        checkbox.setAttribute('data-sentra-chronic-post', checkboxToken);
        postMappings.push({
          selector: `[data-sentra-chronic-post="${checkboxToken}"]`,
          value: true,
          type: 'checkbox',
        });
      } else {
        normalizedSkipped.push(`penyakit_kronis[${diseaseName}]: Checkbox not found (post-add)`);
      }
    }
  }

  if (postMappings.length === 0) {
    return { success: [], failed: [] };
  }

  const postResults = await fillFields(postMappings, 90);
  const success: FillResult[] = [];
  const failed: FillResult[] = [];

  for (const r of postResults) {
    if (r.success) {
      success.push(r);
      continue;
    }
    const errorText = String(r.error || '').toLowerCase();
    if (
      errorText.includes('readonly') ||
      errorText.includes('read only') ||
      errorText.includes('disabled') ||
      errorText.includes('protected')
    ) {
      normalizedSkipped.push(`${r.field}: ${r.error || 'readonly/protected field (post-add)'}`);
      continue;
    }
    failed.push(r);
  }

  return { success, failed };
}

// ============================================================================
// MAIN FILL FUNCTION
// ============================================================================

/**
 * Fill Diagnosa form with ICD-10 data
 * Uses DAS for intelligent field mapping with fallback to static selectors
 *
 * @param payload - DiagnosaFillPayload from sidepanel
 * @returns Fill result with success/failed/skipped arrays
 */
export async function fillDiagnosaForm(payload: DiagnosaFillPayload): Promise<{
  success: FillResult[];
  failed: FillResult[];
  skipped: string[];
}> {
  diagnosaLog.debug('Starting diagnosis fill', {
    hasIcd: Boolean(payload.icd_x),
    hasNama: Boolean(payload.nama),
    hasJenis: Boolean(payload.jenis),
    hasKasus: Boolean(payload.kasus),
    hasPrognosa: Boolean(payload.prognosa),
    chronicCount: payload.penyakit_kronis?.length ?? 0,
  });

  const mappings: FieldMapping[] = [];
  const skipped: string[] = [];

  try {
    // ========================================
    // SKIP DAS - Use direct fallback selectors only
    // DAS auth broken, causing fills to fail completely
    // ========================================
    diagnosaLog.debug('[Diagnosa Handler] Skipping DAS, using direct fallback selectors');

    const dasResult = {
      mappings: [],
      unmapped: Object.keys(buildDASPayload(payload)),
      fromCache: false,
      latencyMs: 0,
    };

    diagnosaLog.debug('[Diagnosa Handler] Using fallback for all fields:', dasResult.unmapped);

    // DAS is skipped, so no mappings to process from DAS result
    // All fields will be handled by fallback logic below

    // ========================================
    // STRATEGY 2: Fallback for unmapped fields
    // ========================================
    if (dasResult.unmapped.length > 0) {
      diagnosaLog.debug(
        '[Diagnosa Handler] Using fallback for unmapped fields:',
        dasResult.unmapped
      );

      // ========================================
      // DOCTOR/NURSE NAMES - SCRAPE FROM RME + DIRECT FILL
      // ========================================
      const scrapedNames = scrapeDoctorNurseNames();
      diagnosaLog.debug('[Diagnosa Handler] Scraped names from RME:', scrapedNames);

      // Doctor name — signed-in user or constant (DECISIONS 2026-09-27)
      const dokterName = payload.tenaga_medis?.dokter_nama || DOKTER_NAMA;
      if (dokterName) {
        const dokterInput = findBestStaffInput('dokter');
        if (dokterInput) {
          const token = `sentra-dokter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          dokterInput.setAttribute('data-sentra-target', token);
          const autocomplete = isAutocompleteLikeInput(dokterInput);
          mappings.push({
            selector: `[data-sentra-target="${token}"]`,
            value: dokterName,
            type: autocomplete ? 'autocomplete' : 'text',
            forceOverride: true,
            autocompleteOptions: autocomplete
              ? {
                  timeout: 1800,
                  retries: 1,
                  typeDelay: 35,
                  requireExactMatch: true,
                  allowFirstItemFallback: false,
                  requireDropdownSelection: true,
                }
              : undefined,
          });
          diagnosaLog.debug(
            `[Diagnosa Handler] ✅ Will fill doctor name (${autocomplete ? 'autocomplete' : 'text'}):`,
            dokterName
          );
        } else {
          skipped.push('dokter_nama: target field not found');
        }
      } else {
        skipped.push('dokter_nama: source unavailable');
      }

      // Nurse name — signed-in user or constant (DECISIONS 2026-09-27)
      const perawatName = payload.tenaga_medis?.perawat_nama || PERAWAT_NAMA;
      if (perawatName) {
        const perawatInput = findBestStaffInput('perawat');
        if (perawatInput) {
          const token = `sentra-perawat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          perawatInput.setAttribute('data-sentra-target', token);
          const autocomplete = isAutocompleteLikeInput(perawatInput);
          mappings.push({
            selector: `[data-sentra-target="${token}"]`,
            value: perawatName,
            type: autocomplete ? 'autocomplete' : 'text',
            forceOverride: true,
            autocompleteOptions: autocomplete
              ? {
                  timeout: 1800,
                  retries: 1,
                  typeDelay: 35,
                  requireExactMatch: true,
                  allowFirstItemFallback: false,
                  requireDropdownSelection: true,
                }
              : undefined,
          });
          diagnosaLog.debug(
            `[Diagnosa Handler] ✅ Will fill nurse name (${autocomplete ? 'autocomplete' : 'text'}):`,
            perawatName
          );
        } else {
          skipped.push('perawat_nama: target field not found');
        }
      } else {
        skipped.push('perawat_nama: source unavailable');
      }

      // ICD-X field
      if (payload.icd_x && !mappings.some((m) => m.selector.includes('icd'))) {
        const icdSelector = findSelectorByFallback(FALLBACK_SELECTORS.icd_x);
        if (icdSelector) {
          mappings.push({
            selector: icdSelector,
            value: payload.icd_x,
            type: 'text',
          });
        } else {
          skipped.push('icd_x: Element not found');
        }
      }

      // Nama diagnosa field
      if (payload.nama && !mappings.some((m) => m.selector.includes('nama'))) {
        const namaSelector = findSelectorByFallback(FALLBACK_SELECTORS.nama);
        if (namaSelector) {
          mappings.push({
            selector: namaSelector,
            value: payload.nama,
            type: 'text',
          });
        } else {
          skipped.push('nama: Element not found');
        }
      }

      // Jenis diagnosa field - AGGRESSIVE SEARCH
      if (payload.jenis && !mappings.some((m) => m.selector.includes('jenis'))) {
        // Try ALL select elements in diagnosis table
        const allSelects = Array.from(document.querySelectorAll('select'));
        let jenisEl: HTMLSelectElement | null = null;

        for (const sel of allSelects) {
          const name = sel.name || '';
          const nearby = sel.closest('td')?.previousElementSibling?.textContent || '';

          if (name.includes('jenis') || nearby.includes('Jenis')) {
            if (sel.offsetParent !== null && !sel.disabled) {
              jenisEl = sel;
              diagnosaLog.debug('[Diagnosa Handler] ✅ Found Jenis dropdown:', sel.name);
              break;
            }
          }
        }

        if (jenisEl) {
          const token = `sentra-jenis-${Date.now()}`;
          jenisEl.setAttribute('data-sentra-target', token);
          const jenisValue = findSelectValue(
            jenisEl,
            JENIS_VALUE_MAP[payload.jenis] || [payload.jenis]
          );
          mappings.push({
            selector: `[data-sentra-target="${token}"]`,
            value: jenisValue || '1',
            type: 'select',
          });
          diagnosaLog.debug('[Diagnosa Handler] ✅ Will fill Jenis:', jenisValue);
        } else {
          diagnosaLog.debug('[Diagnosa Handler] ❌ Jenis dropdown not found');
          skipped.push('jenis: Element not found');
        }
      }

      // Kasus field - AGGRESSIVE SEARCH
      if (payload.kasus && !mappings.some((m) => m.selector.includes('kasus'))) {
        // Try ALL select elements in diagnosis table
        const allSelects = Array.from(document.querySelectorAll('select'));
        let kasusEl: HTMLSelectElement | null = null;

        for (const sel of allSelects) {
          const name = sel.name || '';
          const nearby = sel.closest('td')?.previousElementSibling?.textContent || '';

          if (name.includes('kasus') || nearby.includes('Kasus')) {
            if (sel.offsetParent !== null && !sel.disabled) {
              kasusEl = sel;
              diagnosaLog.debug('[Diagnosa Handler] ✅ Found Kasus dropdown:', sel.name);
              break;
            }
          }
        }

        if (kasusEl) {
          const token = `sentra-kasus-${Date.now()}`;
          kasusEl.setAttribute('data-sentra-target', token);
          const kasusValue = findSelectValue(
            kasusEl,
            KASUS_VALUE_MAP[payload.kasus] || [payload.kasus]
          );
          mappings.push({
            selector: `[data-sentra-target="${token}"]`,
            value: kasusValue || '1',
            type: 'select',
          });
          diagnosaLog.debug('[Diagnosa Handler] ✅ Will fill Kasus:', kasusValue);
        } else {
          diagnosaLog.debug('[Diagnosa Handler] ❌ Kasus dropdown not found');
          skipped.push('kasus: Element not found');
        }
      }

      // Prognosa field (optional)
      if (payload.prognosa && !mappings.some((m) => m.selector.includes('prognosa'))) {
        const progSelector = findPrognosaSelector();
        if (progSelector) {
          const progEl = document.querySelector(progSelector);
          let prognosisValue: string = payload.prognosa;

          // If it's a select dropdown, map to numeric value
          if (progEl instanceof HTMLSelectElement) {
            const mappedValue = PROGNOSA_EPUSKESMAS_MAP[payload.prognosa];
            if (mappedValue) {
              prognosisValue =
                findSelectValue(progEl, [mappedValue, payload.prognosa]) || payload.prognosa;
              diagnosaLog.debug(
                `[Diagnosa Handler] Mapped prognosis "${payload.prognosa}" → "${prognosisValue}"`
              );
            }
          }

          mappings.push({
            selector: progSelector,
            value: prognosisValue,
            type: progEl instanceof HTMLSelectElement ? 'select' : 'textarea',
          });
        }
        // Don't add to skipped - prognosa is optional
      }

      // Penyakit kronis checkboxes
      if (payload.penyakit_kronis && payload.penyakit_kronis.length > 0) {
        diagnosaLog.debug(
          '[Diagnosa Handler] Processing chronic diseases:',
          payload.penyakit_kronis
        );
        for (const diseaseName of payload.penyakit_kronis) {
          const checkbox = findChronicDiseaseCheckbox(diseaseName);
          if (checkbox) {
            // Add unique data attribute to target checkbox
            const checkboxToken = `sentra-chronic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            checkbox.setAttribute('data-sentra-chronic', checkboxToken);
            mappings.push({
              selector: `[data-sentra-chronic="${checkboxToken}"]`,
              value: true,
              type: 'checkbox',
            });
            diagnosaLog.debug(`[Diagnosa Handler] Found checkbox for "${diseaseName}"`);
          } else {
            diagnosaLog.debug(
              `[Diagnosa Handler] Checkbox not found for chronic disease: "${diseaseName}"`
            );
            skipped.push(`penyakit_kronis[${diseaseName}]: Checkbox not found`);
          }
        }
      }
    }

    diagnosaLog.debug('[Diagnosa Handler] Final mappings:', mappings.length);
    diagnosaLog.debug('[Diagnosa Handler] Skipped:', skipped);
  } catch (error) {
    diagnosaLog.error('[Diagnosa Handler] DAS error, using pure fallback:', error);

    // Pure fallback mode
    if (payload.icd_x) {
      const selector = findSelectorByFallback(FALLBACK_SELECTORS.icd_x);
      if (selector) {
        mappings.push({
          selector,
          value: payload.icd_x,
          type: 'text',
        });
      }
    }
    if (payload.nama) {
      const selector = findSelectorByFallback(FALLBACK_SELECTORS.nama);
      if (selector) {
        mappings.push({
          selector,
          value: payload.nama,
          type: 'text',
        });
      }
    }
    if (payload.jenis) {
      const selector = findSelectorByFallback(FALLBACK_SELECTORS.jenis);
      if (selector) {
        const jenisEl = document.querySelector(selector) as HTMLSelectElement | null;
        if (jenisEl) {
          const jenisValue = findSelectValue(
            jenisEl,
            JENIS_VALUE_MAP[payload.jenis] || [payload.jenis]
          );
          mappings.push({ selector, value: jenisValue || payload.jenis, type: 'select' });
        }
      }
    }
    if (payload.kasus) {
      const selector = findSelectorByFallback(FALLBACK_SELECTORS.kasus);
      if (selector) {
        const kasusEl = document.querySelector(selector) as HTMLSelectElement | null;
        if (kasusEl) {
          const kasusValue = findSelectValue(
            kasusEl,
            KASUS_VALUE_MAP[payload.kasus] || [payload.kasus]
          );
          mappings.push({ selector, value: kasusValue || payload.kasus, type: 'select' });
        }
      }
    }
    if (payload.prognosa) {
      const selector = findPrognosaSelector();
      if (selector) {
        const progEl = document.querySelector(selector);
        let prognosisValue: string = payload.prognosa;

        // If it's a select dropdown, map to numeric value
        if (progEl instanceof HTMLSelectElement) {
          const mappedValue = PROGNOSA_EPUSKESMAS_MAP[payload.prognosa];
          if (mappedValue) {
            prognosisValue =
              findSelectValue(progEl, [mappedValue, payload.prognosa]) || payload.prognosa;
            diagnosaLog.debug(
              `[Diagnosa Handler] Mapped prognosis "${payload.prognosa}" → "${prognosisValue}"`
            );
          }
        }

        mappings.push({
          selector,
          value: prognosisValue,
          type: progEl instanceof HTMLSelectElement ? 'select' : 'textarea',
        });
      }
    }
  }

  // ========================================
  // EXECUTE FILL
  // ========================================
  if (mappings.length === 0) {
    diagnosaLog.debug('[Diagnosa Handler] No fields to fill');
    return {
      success: [],
      failed: [
        {
          success: false,
          field: 'all',
          value: '',
          method: 'direct',
          error: 'No fields found to fill',
        },
      ],
      skipped,
    };
  }

  const fillResults = await fillFields(mappings, 100);

  // Categorize results
  const success: FillResult[] = [];
  const failed: FillResult[] = [];
  const normalizedSkipped = [...skipped];

  for (const r of fillResults) {
    if (r.success) {
      success.push(r);
      continue;
    }
    const errorText = String(r.error || '').toLowerCase();
    if (
      errorText.includes('readonly') ||
      errorText.includes('read only') ||
      errorText.includes('disabled') ||
      errorText.includes('csrf') ||
      errorText.includes('protected')
    ) {
      normalizedSkipped.push(`${r.field}: ${r.error || 'readonly/protected field'}`);
      continue;
    }
    failed.push(r);
  }

  diagnosaLog.debug('Fill complete', {
    success: success.length,
    failed: failed.length,
    skipped: normalizedSkipped.length,
  });

  // ========================================
  // AUTO-CLICK "TAMBAH" + POST-FILL (PROGNOSA/CHRONIC)
  // ========================================
  if (success.length > 0 && failed.length === 0) {
    try {
      await waitMs(500); // ensure primary fields settled
      const addButton = findAddDiagnosisButton();
      if (addButton) {
        diagnosaLog.debug('[Diagnosa Handler] Auto-clicking "Tambah" button');
        addButton.click();
        await waitMs(700); // wait UI to commit row + refresh dependent fields
      } else {
        diagnosaLog.debug('[Diagnosa Handler] "Tambah" button not found for auto-click');
      }

      const needPostApply = Boolean(payload.prognosa) || Boolean(payload.penyakit_kronis?.length);
      if (needPostApply) {
        const post = await applyPostDiagnosisFields(payload, normalizedSkipped);
        success.push(...post.success);
        failed.push(...post.failed);
        if (post.success.length > 0) {
          diagnosaLog.debug('[Diagnosa Handler] Post-add fields applied:', post.success.length);
        }
      }
    } catch (error) {
      diagnosaLog.error('[Diagnosa Handler] Auto-click/post-fill failed:', error);
    }
  }

  return { success, failed, skipped: normalizedSkipped };
}

/**
 * Find "Tambah" or "Simpan" button for diagnosis entry
 */
function findAddDiagnosisButton(): HTMLButtonElement | HTMLAnchorElement | HTMLInputElement | null {
  const buttonSelector = 'button, a.btn, input[type="button"], input[type="submit"]';
  const allButtons = Array.from(document.querySelectorAll(buttonSelector)).filter(
    (el): el is HTMLButtonElement | HTMLAnchorElement | HTMLInputElement =>
      el instanceof HTMLButtonElement ||
      el instanceof HTMLAnchorElement ||
      el instanceof HTMLInputElement
  );

  const isAddLike = (btn: HTMLButtonElement | HTMLAnchorElement | HTMLInputElement): boolean => {
    const text = (btn.textContent || '').trim().toLowerCase();
    const value = (btn instanceof HTMLInputElement ? btn.value : '').trim().toLowerCase();
    return text === 'tambah' || text === 'simpan' || value === 'tambah' || value === 'simpan';
  };

  const scoreButton = (btn: HTMLButtonElement | HTMLAnchorElement | HTMLInputElement): number => {
    if (!isAddLike(btn)) return -999;
    if (isScreeningContext(btn)) return -999;

    const nearby = getNearbyText(btn);
    const id = (btn.id || '').toLowerCase();
    const className = (btn.className || '').toLowerCase();
    let score = 0;

    if (nearby.includes('diagnosa')) score += 120;
    if (nearby.includes('icd')) score += 80;
    if (nearby.includes('jenis')) score += 40;
    if (nearby.includes('kasus')) score += 40;
    if (id.includes('diagnosa') || className.includes('diagnosa')) score += 90;
    if (id.includes('tambah') || className.includes('btn-tambah') || className.includes('btn-add'))
      score += 30;

    const label = (btn.textContent || (btn instanceof HTMLInputElement ? btn.value : '') || '')
      .toLowerCase()
      .trim();
    if (label === 'tambah') score += 10;
    if (label === 'simpan') score += 4;

    return score;
  };

  // Strategy 1: Prefer button around diagnosis input area
  const icdInput = document.querySelector(
    'input[name*="diagnosa_id"], input[name*="icd"], input[placeholder*="Cari ICD"], input[placeholder*="Cari Diagnosa"]'
  );
  if (icdInput) {
    const diagnosisArea = icdInput.closest('table, form, .panel, .box, .row, div');
    if (diagnosisArea) {
      const localButtons = Array.from(diagnosisArea.querySelectorAll(buttonSelector)).filter(
        (el): el is HTMLButtonElement | HTMLAnchorElement | HTMLInputElement =>
          el instanceof HTMLButtonElement ||
          el instanceof HTMLAnchorElement ||
          el instanceof HTMLInputElement
      );
      const bestLocal = localButtons
        .map((btn) => ({ btn, score: scoreButton(btn) }))
        .sort((a, b) => b.score - a.score)[0];
      if (bestLocal && bestLocal.score > 0) {
        return bestLocal.btn;
      }
    }
  }

  // Strategy 2: Global fallback with strict scoring + screening block
  const bestGlobal = allButtons
    .map((btn) => ({ btn, score: scoreButton(btn) }))
    .sort((a, b) => b.score - a.score)[0];
  if (bestGlobal && bestGlobal.score > 0) {
    return bestGlobal.btn;
  }

  return null;
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

/**
 * Initialize diagnosa page handler
 * Called when content script detects diagnosa page
 */
export function initDiagnosaPage(): void {
  diagnosaLog.debug('[Diagnosa Handler] Page initialized with DAS integration');

  // Pre-warm DAS cache by scanning fields
  setTimeout(async () => {
    try {
      const { scanPageFields } = await import('@/lib/scraper/adaptive');
      const result = scanPageFields({ includeHidden: false });
      diagnosaLog.debug('[Diagnosa Handler] Pre-scan found', result.fields.length, 'fields');
    } catch (error) {
      diagnosaLog.debug('[Diagnosa Handler] Pre-scan failed:', error);
    }
  }, 500);
}

// ============================================================================
// SCRAPE FUNCTION (optional - for later)
// ============================================================================

/**
 * Scrape diagnosa form data from page
 * @returns Scraped diagnosa data
 */
export async function scrapeDiagnosaForm(): Promise<Partial<DiagnosaFillPayload>> {
  diagnosaLog.debug('Scraping diagnosa form');

  const result: Partial<DiagnosaFillPayload> & {
    keluhan_utama?: string;
    keluhan_tambahan?: string;
  } = {};

  for (const sel of VISIT_FIELD_SELECTORS.complaints.keluhanUtama) {
    const value = getInputValue(sel);
    if (value) {
      result.keluhan_utama = value;
      break;
    }
  }

  for (const sel of [
    'textarea[name="Anamnesa[keluhan_tambahan]"]',
    'textarea[name*="[keluhan_tambahan]"]',
    'textarea[id*="keluhan_tambahan"]',
    'textarea[id*="keluhan-tambahan"]',
  ]) {
    const value = getInputValue(sel);
    if (value) {
      result.keluhan_tambahan = value;
      break;
    }
  }

  // Try to get ICD-X
  for (const sel of FALLBACK_SELECTORS.icd_x) {
    const el = document.querySelector(sel) as HTMLInputElement;
    if (el && el.value) {
      result.icd_x = el.value;
      break;
    }
  }

  // Try to get nama
  for (const sel of FALLBACK_SELECTORS.nama) {
    const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
    if (el && el.value) {
      result.nama = el.value;
      break;
    }
  }

  // Try to get jenis
  for (const sel of FALLBACK_SELECTORS.jenis) {
    const el = document.querySelector(sel) as HTMLSelectElement;
    if (el && el.value) {
      // Map back to PRIMER/SEKUNDER
      const val = el.value.toUpperCase();
      if (val === '1' || val === 'PRIMER' || val === 'P') {
        result.jenis = 'PRIMER';
      } else if (val === '2' || val === 'SEKUNDER' || val === 'S') {
        result.jenis = 'SEKUNDER';
      }
      break;
    }
  }

  // Try to get kasus
  for (const sel of FALLBACK_SELECTORS.kasus) {
    const el = document.querySelector(sel) as HTMLSelectElement;
    if (el && el.value) {
      // Map back to BARU/LAMA
      const val = el.value.toUpperCase();
      if (val === '1' || val === 'BARU' || val === 'B') {
        result.kasus = 'BARU';
      } else if (val === '2' || val === 'LAMA' || val === 'L') {
        result.kasus = 'LAMA';
      }
      break;
    }
  }

  // Try to get prognosa
  for (const sel of FALLBACK_SELECTORS.prognosa) {
    const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
    if (el && el.value) {
      result.prognosa = el.value;
      break;
    }
  }

  diagnosaLog.debug('Diagnosa form scraped', {
    hasKeluhanUtama: Boolean(result.keluhan_utama),
    hasKeluhanTambahan: Boolean(result.keluhan_tambahan),
    hasIcd: Boolean(result.icd_x),
    hasNama: Boolean(result.nama),
    hasJenis: Boolean(result.jenis),
    hasKasus: Boolean(result.kasus),
    hasPrognosa: Boolean(result.prognosa),
  });
  return result;
}

// ============================================================================
// DOCTOR/NURSE NAME SCRAPING
// ============================================================================

/**
 * Scrape doctor and nurse names from RME page
 * Tries multiple strategies to extract names from page header, session info, or hidden fields
 */
function scrapeDoctorNurseNames(): { dokter: string | null; perawat: string | null } {
  const result = { dokter: null as string | null, perawat: null as string | null };

  // Strategy 1: Look for names in RME header/info section
  // Common patterns in ePuskesmas: <div class="info-row">Dokter: dr. John Doe</div>
  const headerTexts = Array.from(
    document.querySelectorAll('.info, .header-info, .patient-info, .rme-info, .form-info')
  );
  for (const header of headerTexts) {
    const text = header.textContent || '';

    // Match doctor name pattern: "Dokter: dr. Name" or "Dokter Pemeriksa: dr. Name"
    const dokterMatch = text.match(/(?:Dokter|Dokter Pemeriksa)\s*:\s*([^\n,]+)/i);
    if (dokterMatch && dokterMatch[1]) {
      result.dokter = dokterMatch[1].trim();
      diagnosaLog.debug('[Diagnosa Handler] Found doctor in header:', result.dokter);
    }

    // Match nurse name pattern: "Perawat: Name" or "Bidan: Name"
    const perawatMatch = text.match(/(?:Perawat|Bidan)\s*:\s*([^\n,]+)/i);
    if (perawatMatch && perawatMatch[1]) {
      result.perawat = perawatMatch[1].trim();
      diagnosaLog.debug('[Diagnosa Handler] Found nurse in header:', result.perawat);
    }
  }

  // Strategy 2: Look for readonly/hidden fields with doctor/nurse names
  if (!result.dokter) {
    const dokterHidden = document.querySelector(
      'input[name*="dokter"][readonly], input[name*="dokter"][type="hidden"]'
    ) as HTMLInputElement;
    if (dokterHidden && dokterHidden.value) {
      const sanitized = sanitizeStaffName(dokterHidden.value);
      if (sanitized) {
        result.dokter = sanitized;
      }
      diagnosaLog.debug('[Diagnosa Handler] Found doctor in hidden field:', result.dokter);
    }
  }

  if (!result.perawat) {
    const perawatHidden = document.querySelector(
      'input[name*="perawat"][readonly], input[name*="perawat"][type="hidden"], input[name*="bidan"][readonly], input[name*="bidan"][type="hidden"]'
    ) as HTMLInputElement;
    if (perawatHidden && perawatHidden.value) {
      const sanitized = sanitizeStaffName(perawatHidden.value);
      if (sanitized) {
        result.perawat = sanitized;
      }
      diagnosaLog.debug('[Diagnosa Handler] Found nurse in hidden field:', result.perawat);
    }
  }

  // Strategy 3: Look for names in session/user info spans/labels
  if (!result.dokter) {
    const allText = Array.from(document.querySelectorAll('span, label, td, th'));
    for (const el of allText) {
      const text = el.textContent || '';
      if (text.toLowerCase().includes('dokter') && text.includes('dr.')) {
        // Extract doctor name: "dr. FirstName LastName"
        const nameMatch = text.match(/(dr\.\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
        if (nameMatch) {
          result.dokter = nameMatch[1].trim();
          diagnosaLog.debug('[Diagnosa Handler] Found doctor in text element:', result.dokter);
          break;
        }
      }
    }
  }

  // Strategy 4: Look for current user name if logged in as doctor/nurse
  // ePuskesmas often shows "Selamat datang, dr. Name" or similar
  const userNameEl = document.querySelector(
    '.username, .user-name, .logged-in-user, .current-user'
  );
  if (userNameEl) {
    const userName = userNameEl.textContent?.trim() || '';
    if (userName.toLowerCase().startsWith('dr.') && !result.dokter) {
      result.dokter = userName;
      diagnosaLog.debug('[Diagnosa Handler] Found doctor from user name:', result.dokter);
    } else if (!result.perawat && userName && !userName.toLowerCase().startsWith('dr.')) {
      result.perawat = userName;
      diagnosaLog.debug('[Diagnosa Handler] Found nurse from user name:', result.perawat);
    }
  }

  // Strategy 5: Check localStorage/sessionStorage for cached user info
  try {
    const storedDoctor =
      localStorage.getItem('epuskesmas_doctor_name') ||
      sessionStorage.getItem('epuskesmas_doctor_name');
    if (storedDoctor && !result.dokter) {
      result.dokter = storedDoctor;
      diagnosaLog.debug('[Diagnosa Handler] Found doctor in storage:', result.dokter);
    }

    const storedNurse =
      localStorage.getItem('epuskesmas_nurse_name') ||
      sessionStorage.getItem('epuskesmas_nurse_name');
    if (storedNurse && !result.perawat) {
      result.perawat = storedNurse;
      diagnosaLog.debug('[Diagnosa Handler] Found nurse in storage:', result.perawat);
    }
  } catch {
    // Storage access may fail in some contexts
  }

  return {
    dokter: sanitizeStaffName(result.dokter),
    perawat: sanitizeStaffName(result.perawat),
  };
}
