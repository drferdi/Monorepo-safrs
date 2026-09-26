// Designed and constructed by Drferdi.
import { VISIT_FIELD_SELECTORS, VISIT_LABEL_KEYWORDS } from './field-selectors';
import { cleanText, toFloat, toInt } from './normalizers';

/**
 * ScrapedVisitData interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface ScrapedVisitData {
  encounter_id: string;
  date: string;
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    glucose: number;
  };
  keluhan_utama: string;
  diagnosa: { icd_x: string; nama: string } | null;
  terapi_obat: string;
  dokter_penanganan: string;
  perawat_penanganan: string;
}

const ICD_CODE_PATTERN = /\b([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?)\b/i;
const ICD_EMERGENCY_HEAD_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
};

const getElementValue = (root: ParentNode, selector: string): string => {
  const node = root.querySelector(selector);
  if (!node) return '';

  if (node instanceof HTMLInputElement) {
    if (node.type === 'radio' || node.type === 'checkbox') {
      if (!node.checked) return '';
      return cleanText(node.value || node.getAttribute('value'));
    }
    return cleanText(node.value || node.getAttribute('value'));
  }

  if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
    return cleanText(node.value);
  }

  return cleanText(node.textContent);
};

const getFirstSelectorValue = (root: ParentNode, selectors: string[]): string => {
  for (const selector of selectors) {
    const value = getElementValue(root, selector);
    if (value) return value;
  }
  return '';
};

const getLabelValueFromTables = (root: ParentNode, keywords: readonly string[]): string => {
  const rows = root.querySelectorAll('table tr');
  for (const row of Array.from(rows)) {
    const cells = row.querySelectorAll('td, th');
    for (let idx = 0; idx < cells.length; idx++) {
      const label = cleanText(cells[idx]?.textContent).toLowerCase();
      if (!label) continue;

      if (keywords.some((k) => label.includes(k.toLowerCase()))) {
        const candidates = [cells[idx + 2], cells[idx + 1]];
        for (const candidate of candidates) {
          const value = cleanText(candidate?.textContent);
          if (value) return value;
        }
      }
    }
  }
  return '';
};

const getDiagnosisNameFromTables = (root: ParentNode): string => {
  const rows = root.querySelectorAll('table tr');
  for (const row of Array.from(rows)) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    for (let idx = 0; idx < cells.length; idx++) {
      const label = cleanText(cells[idx]?.textContent).toLowerCase();
      if (!label) continue;
      if (label.includes('id diagno')) continue;
      if (!['diagnosa', 'diagnosis', 'diagno a', 'diagnoa'].some((key) => label.includes(key))) {
        continue;
      }

      const candidates = [cells[idx + 2], cells[idx + 1]];
      for (const candidate of candidates) {
        const value = cleanText(candidate?.textContent);
        if (isReadableDiagnosisLabel(value)) {
          return value;
        }
      }
    }
  }

  return '';
};

const getLabelValueGeneric = (root: ParentNode, keywords: readonly string[]): string => {
  const labelNodes = root.querySelectorAll('label, th, td, span, div, strong, b');
  for (const node of Array.from(labelNodes)) {
    const labelText = cleanText(node.textContent).toLowerCase();
    if (!labelText) continue;
    if (!keywords.some((k) => labelText.includes(k.toLowerCase()))) continue;

    const next = node.nextElementSibling;
    const nextText = cleanText(next?.textContent);
    if (nextText && nextText.length <= 180 && nextText.toLowerCase() !== labelText) {
      return nextText;
    }

    const parentText = cleanText(node.parentElement?.textContent);
    if (parentText && parentText.length <= 220) {
      for (const key of keywords) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = parentText.match(new RegExp(`${escaped}\\s*[:-]?\\s*(.+)$`, 'i'));
        if (m?.[1]) return cleanText(m[1].replace(/^:+/, ''));
      }
    }
  }
  return '';
};

const getLabelValueFromText = (root: ParentNode, keywords: readonly string[]): string => {
  const text = cleanText((root as Element).textContent || '');
  if (!text) return '';

  for (const key of keywords) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(`${escaped}\\s*[:-]?\\s*([^\\n\\r]{1,120})`, 'i'));
    if (m?.[1]) return cleanText(m[1]);
  }

  return '';
};

const getFieldValue = (
  root: ParentNode,
  selectors: string[],
  labelKeywords: readonly string[]
): string => {
  const bySelector = getFirstSelectorValue(root, selectors);
  if (bySelector) return bySelector;

  const byTable = getLabelValueFromTables(root, labelKeywords);
  if (byTable) return byTable;

  const byLabel = getLabelValueGeneric(root, labelKeywords);
  if (byLabel) return byLabel;

  return getLabelValueFromText(root, labelKeywords);
};

const VISIT_DOKTER_KEYWORDS = ['dokter / tenaga medi', 'dokter / tenaga medis', 'dokter'];
const VISIT_PERAWAT_KEYWORDS = ['perawat / bidan', 'perawat', 'bidan'];
const VISIT_TERAPI_OBAT_KEYWORDS = [
  'terapi obat',
  'terapi',
  'farmakoterapi',
  'penatalaksanaan',
  'rencana penatalaksanaan',
  'resep obat',
  'resep',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeIcdCode(raw: string): string {
  const cleaned = cleanText(raw).toUpperCase().replace(/\s+/g, '').trim();
  if (!cleaned) return '';

  const match = cleaned.match(ICD_CODE_PATTERN);
  if (match?.[1]) return match[1].toUpperCase().trim();

  const compact = cleaned.replace(/[^A-Z0-9.]/g, '');
  if (!compact) return '';

  const mappedHead = ICD_EMERGENCY_HEAD_MAP[compact[0]];
  if (!mappedHead) return '';

  const candidate = `${mappedHead}${compact.slice(1)}`;
  const recovered = candidate.match(/^([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?)/);
  return recovered?.[1]?.toUpperCase().trim() || '';
}

function isReadableDiagnosisLabel(raw: string): boolean {
  const cleaned = cleanText(raw);
  if (!cleaned) return false;
  if (cleaned.length < 3) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (!/[A-Za-z]/.test(cleaned)) return false;
  return true;
}

function normalizeDiagnosisName(raw: string, icdCode: string): string {
  let cleaned = cleanText(raw);
  if (!cleaned) return '';

  if (icdCode) {
    const icdPrefix = new RegExp(`^${escapeRegex(icdCode)}\\s*[-:]*\\s*`, 'i');
    cleaned = cleaned.replace(icdPrefix, '').trim();
  }

  cleaned = cleaned.replace(/\bICD[-\s]*X?\b[:\s-]*/gi, '').trim();
  if (!isReadableDiagnosisLabel(cleaned)) return '';
  return cleaned;
}

/**
 * extractVisitFromRoot
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const extractVisitFromRoot = (
  root: ParentNode,
  encounterId: string,
  timestamp: string
): ScrapedVisitData | null => {
  const sbp = toInt(
    getFieldValue(root, VISIT_FIELD_SELECTORS.vitals.sbp, VISIT_LABEL_KEYWORDS.sbp)
  );
  const dbp = toInt(
    getFieldValue(root, VISIT_FIELD_SELECTORS.vitals.dbp, VISIT_LABEL_KEYWORDS.dbp)
  );
  const hr = toInt(getFieldValue(root, VISIT_FIELD_SELECTORS.vitals.hr, VISIT_LABEL_KEYWORDS.hr));
  const rr = toInt(getFieldValue(root, VISIT_FIELD_SELECTORS.vitals.rr, VISIT_LABEL_KEYWORDS.rr));
  const temp = toFloat(
    getFieldValue(root, VISIT_FIELD_SELECTORS.vitals.temp, VISIT_LABEL_KEYWORDS.temp)
  );
  const glucose = toInt(
    getFieldValue(root, VISIT_FIELD_SELECTORS.vitals.glucose, VISIT_LABEL_KEYWORDS.glucose)
  );

  const keluhanUtama = getFieldValue(
    root,
    VISIT_FIELD_SELECTORS.complaints.keluhanUtama,
    VISIT_LABEL_KEYWORDS.keluhanUtama
  );

  const icdRaw = getFieldValue(root, VISIT_FIELD_SELECTORS.diagnosis.icd, VISIT_LABEL_KEYWORDS.icd);
  const icd = normalizeIcdCode(icdRaw);
  const diagnosaNamaRaw = getFieldValue(
    root,
    VISIT_FIELD_SELECTORS.diagnosis.nama,
    VISIT_LABEL_KEYWORDS.diagnosa
  );
  const diagnosaNama =
    normalizeDiagnosisName(diagnosaNamaRaw, icd) ||
    normalizeDiagnosisName(getDiagnosisNameFromTables(root), icd);
  const terapiObat = getFieldValue(root, [], VISIT_TERAPI_OBAT_KEYWORDS);
  const dokterPenanganan = getFieldValue(root, [], VISIT_DOKTER_KEYWORDS);
  const perawatPenanganan = getFieldValue(root, [], VISIT_PERAWAT_KEYWORDS);

  const hasUsableVitals = sbp > 0 || dbp > 0 || hr > 0 || rr > 0 || temp > 0;
  if (!hasUsableVitals) {
    return null;
  }

  return {
    encounter_id: encounterId,
    date: timestamp,
    vitals: { sbp, dbp, hr, rr, temp, glucose },
    keluhan_utama: keluhanUtama,
    diagnosa: icd ? { icd_x: icd, nama: diagnosaNama || `Diagnosis ${icd}` } : null,
    terapi_obat: terapiObat,
    dokter_penanganan: dokterPenanganan,
    perawat_penanganan: perawatPenanganan,
  };
};
