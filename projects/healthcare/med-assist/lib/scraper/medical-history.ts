import { cleanText } from './normalizers';

export interface MedicalHistoryItem {
  code: string;
  description: string;
  shortLabel: string;
}

export interface MedicalHistoryScanResult {
  diagnostics: string[];
  history: MedicalHistoryItem[];
}

const ICD_MAPPINGS: Record<string, string> = {
  I10: 'HT',
  I11: 'HT',
  I12: 'HT',
  I13: 'HT',
  I15: 'HT',
  E10: 'DM',
  E11: 'DM',
  E13: 'DM',
  E14: 'DM',
  I50: 'HF',
  I20: 'CHD',
  I25: 'CHD',
  I60: 'STROKE',
  I61: 'STROKE',
  I63: 'STROKE',
  I64: 'STROKE',
  N18: 'CKD',
  J45: 'ASTHMA',
  J44: 'PPOK',
  K21: 'GERD',
  E03: 'THYROID',
  E05: 'THYROID',
  E78: 'Dyslipid',
  K29: 'Gastritis',
};

const DIRECT_CHRONIC_MAPPINGS = [
  { shortLabel: 'HT', code: 'DIRECT_HT', patterns: ['hipertensi', 'tekanan darah tinggi'] },
  { shortLabel: 'DM', code: 'DIRECT_DM', patterns: ['diabetes', 'diabetes mellitus', 'dm'] },
  { shortLabel: 'HF', code: 'DIRECT_HF', patterns: ['gagal jantung', 'heart failure'] },
  {
    shortLabel: 'CHD',
    code: 'DIRECT_CHD',
    patterns: ['penyakit jantung koroner', 'jantung koroner', 'penyakit jantung kronis'],
  },
  { shortLabel: 'STROKE', code: 'DIRECT_STROKE', patterns: ['stroke'] },
  {
    shortLabel: 'CKD',
    code: 'DIRECT_CKD',
    patterns: ['ginjal kronis', 'gagal ginjal kronis', 'penyakit ginjal kronis'],
  },
  { shortLabel: 'ASTHMA', code: 'DIRECT_ASTHMA', patterns: ['asma', 'asthma'] },
  { shortLabel: 'PPOK', code: 'DIRECT_PPOK', patterns: ['ppok', 'copd'] },
  { shortLabel: 'GERD', code: 'DIRECT_GERD', patterns: ['gerd'] },
  {
    shortLabel: 'THYROID',
    code: 'DIRECT_THYROID',
    patterns: ['tiroid', 'hipotiroid', 'hipertiroid'],
  },
  { shortLabel: 'Dyslipid', code: 'DIRECT_DYSLIPID', patterns: ['dislipidemia', 'dyslipidemia'] },
] as const;

const RIWAYAT_FIELD_SELECTORS = [
  'textarea[name="MRiwayatPasien[Riwayat Penyakit Sekarang][value]"]',
  'textarea[name="MRiwayatPasien[Riwayat Penyakit Dulu][value]"]',
  'textarea[name="MRiwayatPasien[Riwayat Penyakit Keluarga][value]"]',
  'textarea#text_rps',
  'textarea#text_rpd',
  'textarea#text_rpk',
];

const SPECIFIC_TABLE_SELECTORS = [
  '#tabel_detail_warna_penyakit',
  '#tabel_detail_warna_penyakit tbody',
  'table#tabel_detail_warna_penyakit',
  '[id*="warna_penyakit"]',
  '[id*="riwayat"]',
];

const ICD_PATTERN = /\b([A-Z]\d{2,3}(?:\.\d{1,2})?)\b/g;

function getAllElements(root: ParentNode): Element[] {
  if ('querySelectorAll' in root) {
    return Array.from(root.querySelectorAll('*'));
  }
  return [];
}

function getRootText(root: ParentNode): string {
  if ('textContent' in root) {
    return cleanText(root.textContent);
  }
  return '';
}

function buildLoosePattern(pattern: string): RegExp {
  const normalized = pattern.toLowerCase().trim();
  let expression = '';

  for (const char of normalized) {
    if (/\s/.test(char)) {
      expression += '\\s*';
      continue;
    }

    expression += `${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`;
  }

  return new RegExp(expression, 'i');
}

function matchesLoosePattern(value: string, pattern: string): boolean {
  const normalized = cleanText(value).toLowerCase();
  if (!normalized) return false;
  return buildLoosePattern(pattern).test(normalized);
}

function extractCellText(cell?: Element | null): string {
  return cleanText(cell?.textContent);
}

function isCompactTextElement(element: Element | null | undefined): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  if (['table', 'tbody', 'thead', 'tr'].includes(tagName)) return false;

  const text = extractCellText(element);
  if (!text) return false;
  if (text.length > 120) return false;
  return true;
}

export function scanMedicalHistoryFromRoot(root: ParentNode): MedicalHistoryScanResult {
  const diagnostics: string[] = [];
  const history: MedicalHistoryItem[] = [];
  const foundCodes = new Set<string>();
  const foundLabels = new Set<string>();

  const log = (message: string) => {
    diagnostics.push(message);
  };

  const pushDirectHistory = (shortLabel: string, description: string, code: string) => {
    if (foundLabels.has(shortLabel)) {
      return;
    }

    foundLabels.add(shortLabel);
    history.push({ code, description, shortLabel });
    log(`direct:${shortLabel}:${description}`);
  };

  const scanCandidateTexts = (candidates: Iterable<string>) => {
    for (const rawText of candidates) {
      const normalized = cleanText(rawText);
      if (!normalized) continue;

      for (const mapping of DIRECT_CHRONIC_MAPPINGS) {
        if (mapping.patterns.some((pattern) => matchesLoosePattern(normalized, pattern))) {
          pushDirectHistory(mapping.shortLabel, normalized, mapping.code);
        }
      }
    }
  };

  const rootText = getRootText(root);
  const allElements = getAllElements(root);

  const chronicLabelCandidates = allElements
    .map((element) => ({
      element,
      text: cleanText(element.textContent),
    }))
    .filter((candidate) => candidate.text && matchesLoosePattern(candidate.text, 'penyakit kronis'))
    .sort((left, right) => left.text.length - right.text.length);
  const chronicLabelElement = chronicLabelCandidates[0]?.element;

  if (chronicLabelElement) {
    const candidates = new Set<string>();
    const chronicLabelText = cleanText(chronicLabelElement.textContent).toLowerCase();
    const parent = chronicLabelElement.parentElement;
    const sibling = chronicLabelElement.nextElementSibling;
    const parentSibling = parent?.nextElementSibling;

    if (isCompactTextElement(sibling)) candidates.add(extractCellText(sibling));
    if (isCompactTextElement(parentSibling)) candidates.add(extractCellText(parentSibling));

    parent?.querySelectorAll('span, div, p, td, a, button, b, strong').forEach((node) => {
      const text = extractCellText(node);
      if (text && text.toLowerCase() !== chronicLabelText) {
        candidates.add(text);
      }
    });

    scanCandidateTexts(candidates);
  }

  const riwayatFields = Array.from(root.querySelectorAll(RIWAYAT_FIELD_SELECTORS.join(',')));
  scanCandidateTexts(
    riwayatFields.map((field) =>
      cleanText(
        field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement
          ? field.value || field.getAttribute('value')
          : field.textContent
      )
    )
  );

  const riwayatRows = Array.from(root.querySelectorAll('table tr'))
    .map((row) => Array.from(row.querySelectorAll('td, th')).map((cell) => cleanText(cell.textContent)))
    .filter((cells) => cells.length >= 2 && matchesLoosePattern(cells[0] || '', 'riwayat penyakit'));
  scanCandidateTexts(riwayatRows.map((cells) => cells[1] || ''));

  let specificTable: Element | null = null;
  for (const selector of SPECIFIC_TABLE_SELECTORS) {
    specificTable = root.querySelector(selector);
    if (specificTable) {
      log(`table:${selector}`);
      break;
    }
  }

  const scanIcdTable = (tableRoot: ParentNode) => {
    const rows = tableRoot.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      cells.forEach((cell, index) => {
        const cellText = cleanText(cell.textContent);
        const matches = cellText.match(ICD_PATTERN);
        if (!matches) return;

        matches.forEach((code) => {
          const baseCode = code.split('.')[0];
          if (foundCodes.has(baseCode)) return;

          foundCodes.add(baseCode);
          const shortLabel = ICD_MAPPINGS[baseCode] || baseCode;
          if (foundLabels.has(shortLabel)) return;

          foundLabels.add(shortLabel);
          history.push({
            code,
            description: extractCellText(cells[index + 1]) || 'From medical history',
            shortLabel,
          });
          log(`icd:${code}`);
        });
      });
    });
  };

  if (specificTable) {
    scanIcdTable(specificTable);
  } else if (history.length === 0) {
    Array.from(root.querySelectorAll('table')).forEach((table) => scanIcdTable(table));
  }

  if (history.length === 0 && rootText) {
    const treeWalkerRoot = root as Node;
    const ownerDocument =
      root instanceof Document ? root : root.ownerDocument || document;
    const walker = ownerDocument.createTreeWalker(treeWalkerRoot, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = cleanText(node.textContent);
      if (text === 'I10' && !foundCodes.has('I10') && !foundLabels.has('HT')) {
        foundCodes.add('I10');
        foundLabels.add('HT');
        history.push({
          code: 'I10',
          description: extractCellText(node.parentElement?.nextElementSibling) || 'Essential hypertension',
          shortLabel: 'HT',
        });
        log('icd:I10:treewalker');
      }
      node = walker.nextNode();
    }
  }

  if (history.length === 0) {
    const matches = rootText.match(ICD_PATTERN);
    matches?.forEach((code) => {
      const baseCode = code.split('.')[0];
      if (foundCodes.has(baseCode)) return;

      foundCodes.add(baseCode);
      const shortLabel = ICD_MAPPINGS[baseCode] || baseCode;
      if (foundLabels.has(shortLabel)) return;

      foundLabels.add(shortLabel);
      history.push({
        code,
        description: 'Detected from page',
        shortLabel,
      });
      log(`icd:${code}:page-text`);
    });
  }

  log(`done:${history.length}`);
  return { diagnostics, history };
}
