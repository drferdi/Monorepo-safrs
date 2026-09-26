import { cleanText } from './normalizers';

export interface ExtractedPatientInfo {
  name: string;
  gender: 'L' | 'P';
  age: number;
  rm: string;
  bpjsStatus: 'aktif' | 'nonaktif' | 'mandiri' | null;
  kelurahan: string;
  dob: string;
}

export interface ExtractedClinicalContext {
  facilityName: string;
  payerLabel: string;
  specialConditions: string[];
  pregnancyRisk: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
}

export interface ExtractedTenagaMedis {
  dokterNama: string;
  perawatNama: string;
  source: string[];
}

const PATIENT_LABEL_BOUNDARY =
  '(?:RM|No\\.?\\s*RM|Usia|Umur|JK|Jenis\\s*Kelamin|Kelurahan|Alamat|BPJS|Tgl\\.?\\s*Lahir|Tanggal\\s*Lahir|TTL)';
const PATIENT_LABEL_LOOKAHEAD = `(?=\\s+${PATIENT_LABEL_BOUNDARY}\\s*[-:]|\\s*$)`;

const NAME_SELECTORS = [
  '[class*="nama"]',
  '[id*="nama"]',
  '.patient-name',
  '.nama-pasien',
  '[data-field="nama"]',
  '#nama_pasien',
];

const RM_SELECTORS = [
  '[class*="rm"]',
  '[id*="rm"]',
  '[class*="rekam"]',
  '.no-rm',
  '.rm-number',
  '#no_rm',
];

const DOKTER_SELECTORS = [
  'input[name="dokter_nama_bpjs"]',
  'input[name="dokter_nama"]',
  'input[name="dokter"]',
  'input[name*="dokter"]',
  'input[placeholder*="Dokter"]',
  'input[placeholder*="dokter"]',
  'input[id*="dokter"]',
];

const PERAWAT_SELECTORS = [
  'input[name="perawat_nama"]',
  'input[name="perawat"]',
  'input[name*="perawat"]',
  'input[name*="bidan"]',
  'input[placeholder*="Perawat"]',
  'input[placeholder*="perawat"]',
  'input[placeholder*="Bidan"]',
  'input[placeholder*="bidan"]',
  'input[id*="perawat"]',
];

function normalizeName(value: string): string {
  return cleanText(value).replace(/[|]/g, '').trim();
}

function readNodeText(node: Element | null | undefined): string {
  if (!node) return '';
  if (node instanceof HTMLElement) {
    return cleanText(node.innerText || node.textContent);
  }
  return cleanText(node.textContent);
}

function isPlausibleName(value: string, role: 'dokter' | 'perawat'): boolean {
  const normalized = normalizeName(value);
  if (!normalized || normalized.length < 3) return false;

  const lower = normalized.toLowerCase();
  const blocked = [
    'dr. sentra ai',
    'perawat sentra',
    'unknown',
    'tidak diketahui',
    'n/a',
    'null',
    'undefined',
    '-',
  ];
  if (blocked.some((item) => lower === item)) return false;
  if (role === 'dokter' && lower.includes('perawat')) return false;
  return true;
}

function readSelectorValue(root: ParentNode, selector: string): string {
  const el = root.querySelector(selector);
  if (!el) return '';
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return normalizeName(el.value || el.getAttribute('value') || '');
  }
  if (el instanceof HTMLSelectElement) {
    return normalizeName(el.value || el.options[el.selectedIndex]?.text || '');
  }
  return normalizeName(el.textContent || '');
}

function firstNonEmpty(root: ParentNode, selectors: string[]): string {
  for (const selector of selectors) {
    const value = readSelectorValue(root, selector);
    if (value) return value;
  }
  return '';
}

function persistTenagaMedis(root: Document, dokterNama: string, perawatNama: string): void {
  const view = root.defaultView;
  if (!view) return;

  const snapshot = JSON.stringify({
    dokterNama,
    perawatNama,
    capturedAt: new Date().toISOString(),
  });

  try {
    view.localStorage.setItem('sentra_tenaga_medis', snapshot);
    if (dokterNama) {
      view.localStorage.setItem('epuskesmas_doctor_name', dokterNama);
      view.sessionStorage.setItem('epuskesmas_doctor_name', dokterNama);
    }
    if (perawatNama) {
      view.localStorage.setItem('epuskesmas_nurse_name', perawatNama);
      view.sessionStorage.setItem('epuskesmas_nurse_name', perawatNama);
    }
  } catch {
    // Storage may be blocked by browser policy; non-fatal.
  }
}

function readStoredTenagaMedis(root: Document): { dokterNama: string; perawatNama: string } {
  const view = root.defaultView;
  if (!view) {
    return { dokterNama: '', perawatNama: '' };
  }

  try {
    const raw = view.localStorage.getItem('sentra_tenaga_medis');
    if (raw) {
      const parsed = JSON.parse(raw) as { dokterNama?: string; perawatNama?: string };
      return {
        dokterNama: normalizeName(parsed.dokterNama || ''),
        perawatNama: normalizeName(parsed.perawatNama || ''),
      };
    }
  } catch {
    // ignore malformed storage
  }

  return {
    dokterNama: normalizeName(
      view.localStorage.getItem('epuskesmas_doctor_name') ||
        view.sessionStorage.getItem('epuskesmas_doctor_name') ||
        ''
    ),
    perawatNama: normalizeName(
      view.localStorage.getItem('epuskesmas_nurse_name') ||
        view.sessionStorage.getItem('epuskesmas_nurse_name') ||
        ''
    ),
  };
}

function cleanCandidateValue(rawValue: string, labels: string[]): string {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  return (
    rawValue
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s*:\s*/g, ': ')
      .split('|')
      .map((item) => item.trim())
      .find((item) => {
        const normalized = item.toLowerCase();
        if (!normalized || normalized.length > 180) return false;
        if (normalizedLabels.includes(normalized)) return false;
        if (normalizedLabels.some((label) => normalized === `${label}:`)) return false;
        if (/^(warna|status|icdx|icd x|icd-?x)$/i.test(normalized)) return false;
        return true;
      }) || ''
  );
}

function readLabeledValue(root: Document, labelInput: string | string[]): string {
  const labels = Array.isArray(labelInput) ? labelInput : [labelInput];
  const allElements = Array.from(root.querySelectorAll<HTMLElement>('body *'));
  const candidates = new Set<string>();
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  const labelElements = allElements.filter((element) => {
    const text = readNodeText(element).toLowerCase();
    return normalizedLabels.some((label) => text === label || text === `${label}:`);
  });

  labelElements.forEach((labelElement) => {
    const parent = labelElement.parentElement;
    const sibling = labelElement.nextElementSibling as HTMLElement | null;
    const parentSibling = parent?.nextElementSibling as HTMLElement | null;
    const row = labelElement.closest('tr');
    const rowCells = row ? Array.from(row.querySelectorAll<HTMLElement>('td, th')) : [];
    const labelIndex = rowCells.findIndex(
      (cell) => cell === labelElement || cell.contains(labelElement)
    );

    const siblingText = readNodeText(sibling);
    if (siblingText) {
      candidates.add(siblingText);
    }

    const parentSiblingText = readNodeText(parentSibling);
    if (parentSiblingText) {
      candidates.add(parentSiblingText);
    }

    if (row && labelIndex >= 0) {
      const nextCell = rowCells[labelIndex + 1];
      const nextCellText = readNodeText(nextCell);
      if (nextCellText) {
        candidates.add(nextCellText);
      }
    }

    parent
      ?.querySelectorAll<HTMLElement>('span, div, p, td, a, button, strong, small')
      .forEach((node) => {
        const text = readNodeText(node);
        if (text) {
          candidates.add(text);
        }
      });
  });

  const pageText = cleanText(root.body?.innerText || root.body?.textContent);
  normalizedLabels.forEach((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}\\s*:?\\s*([^\\n\\r|]{1,80})`, 'i');
    const match = pageText.match(regex);
    if (match?.[1]) {
      candidates.add(match[1].trim());
    }
  });

  return (
    Array.from(candidates)
      .map((candidate) => cleanCandidateValue(candidate, labels))
      .find(Boolean) || ''
  );
}

const NON_VALUE_HEADER_TOKENS = new Set([
  'warna',
  'status',
  'icd',
  'icdx',
  'x',
  'penyakit',
  'khusus',
]);

function normalizeTableArtifactText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHeaderOnlyValue(item: string): boolean {
  const normalized = normalizeTableArtifactText(item);
  if (/^warna\s+icd\s*x?\s+penyakit(?:\s|$)/.test(normalized)) {
    return true;
  }

  const tokens = normalized.split(/[\s-]+/g).filter(Boolean);

  return tokens.length > 0 && tokens.every((token) => NON_VALUE_HEADER_TOKENS.has(token));
}

function parseList(rawValue: string): string[] {
  return rawValue
    .split(/\n|,|;|\|/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isHeaderOnlyValue(item))
    .filter((item) => !/^warna$/i.test(item) && !/^status$/i.test(item) && !/^icd/i.test(item));
}

function normalizeAllergyList(items: string[]): string[] {
  const mapped = new Set<string>();

  items.forEach((item) => {
    const normalized = item.toLowerCase();
    if (normalized.includes('makanan')) mapped.add('Makanan');
    if (normalized.includes('kulit')) mapped.add('Kulit');
    if (normalized.includes('debu')) mapped.add('Debu');
    if (normalized.includes('obat')) mapped.add('Obat');
  });

  return Array.from(mapped).sort((left, right) => left.localeCompare(right));
}

function parsePregnancyStatus(rawValue: string): boolean | null {
  const normalized = rawValue.toLowerCase();
  if (!normalized) return null;
  if (
    normalized.includes('tidak hamil') ||
    normalized.includes('non hamil') ||
    normalized.includes('negatif')
  ) {
    return false;
  }
  if (normalized.includes('hamil') || normalized.includes('gravid')) {
    return true;
  }
  return null;
}

export function extractClinicalContextFromDocument(root: Document): ExtractedClinicalContext {
  return {
    facilityName: readLabeledValue(root, ['Nama Faskes', 'Faskes', 'Nama Puskesmas']),
    payerLabel:
      readLabeledValue(root, ['Penjamin', 'BPJS', 'Cara Bayar', 'Status BPJS']) ||
      readLabeledValue(root, 'Jaminan'),
    specialConditions: parseList(readLabeledValue(root, 'Penyakit Khusus')),
    pregnancyRisk: readLabeledValue(root, ['Risiko Kehamilan', 'Resiko Kehamilan']),
    allergies: normalizeAllergyList([
      ...parseList(readLabeledValue(root, 'Riwayat Alergi')),
      ...parseList(readLabeledValue(root, 'Alergi')),
    ]),
    pregnancyStatus: parsePregnancyStatus(
      readLabeledValue(root, ['Status Kehamilan', 'Status Hamil', 'Kehamilan'])
    ),
  };
}

export function extractPatientInfoFromDocument(root: Document): ExtractedPatientInfo {
  const result: ExtractedPatientInfo = {
    name: '',
    gender: 'L',
    age: 0,
    rm: '',
    bpjsStatus: null,
    kelurahan: '',
    dob: '',
  };

  const pageText = root.body?.innerText || root.body?.textContent || '';

  const namaMatch = pageText.match(
    new RegExp(`Nama\\s*[-:]\\s*(.+?)${PATIENT_LABEL_LOOKAHEAD}`, 'i')
  );
  if (namaMatch) {
    result.name = namaMatch[1].trim();
  }

  const rmMatch = pageText.match(
    new RegExp(`(?:No\\.?\\s*)?RM\\s*[-:]\\s*(.+?)${PATIENT_LABEL_LOOKAHEAD}`, 'i')
  );
  if (rmMatch) {
    result.rm = rmMatch[1].trim();
  }

  const umurMatch = pageText.match(
    new RegExp(`(?:Umur|Usia)\\s*[-:]\\s*(.+?)${PATIENT_LABEL_LOOKAHEAD}`, 'i')
  );
  if (umurMatch) {
    const ageMatch = umurMatch[1].match(/(\d+)/);
    if (ageMatch?.[1]) {
      result.age = Number.parseInt(ageMatch[1], 10);
    }
  }

  const jkMatch = pageText.match(
    new RegExp(`(?:JK|Jenis\\s*Kelamin|J\\.K\\.?)\\s*[-:]\\s*(.+?)${PATIENT_LABEL_LOOKAHEAD}`, 'i')
  );
  if (jkMatch) {
    const jk = jkMatch[1].toUpperCase();
    result.gender = jk === 'L' || jk.startsWith('LAKI') ? 'L' : 'P';
  }

  const alamatMatch = pageText.match(
    new RegExp(`(?:Alamat|Kelurahan)\\s*[-:]\\s*(.+?)${PATIENT_LABEL_LOOKAHEAD}`, 'i')
  );
  if (alamatMatch) {
    result.kelurahan = alamatMatch[1].trim().substring(0, 100);
  }

  const bpjsMatch = pageText.match(/BPJS\s*[-:]?\s*(Aktif|Non\s*Aktif|Mandiri|Tidak\s*Aktif)/i);
  if (bpjsMatch) {
    const status = bpjsMatch[1].toLowerCase();
    if (status.includes('aktif') && !status.includes('non') && !status.includes('tidak')) {
      result.bpjsStatus = 'aktif';
    } else if (status.includes('mandiri')) {
      result.bpjsStatus = 'mandiri';
    } else {
      result.bpjsStatus = 'nonaktif';
    }
  }

  const dobMatch = pageText.match(
    /(?:Tgl\.?\s*Lahir|Tanggal\s*Lahir|TTL)\s*[-:]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
  );
  if (dobMatch?.[1]) {
    result.dob = dobMatch[1].trim();
  }

  if (!result.name) {
    for (const selector of NAME_SELECTORS) {
      try {
        const text = cleanText(root.querySelector(selector)?.textContent);
        if (text && text.length > 2 && text.length < 100) {
          result.name = text;
          break;
        }
      } catch {
        // selector might be invalid for this DOM
      }
    }
  }

  if (!result.rm) {
    for (const selector of RM_SELECTORS) {
      try {
        const text = cleanText(root.querySelector(selector)?.textContent);
        if (text && /^\d/.test(text)) {
          result.rm = text;
          break;
        }
      } catch {
        // selector might be invalid for this DOM
      }
    }
  }

  return result;
}

export function extractTenagaMedisFromDocument(root: Document): ExtractedTenagaMedis {
  const source: string[] = [];
  const stored = readStoredTenagaMedis(root);

  let dokterNama = firstNonEmpty(root, DOKTER_SELECTORS);
  if (dokterNama) source.push('dom-input:dokter');

  let perawatNama = firstNonEmpty(root, PERAWAT_SELECTORS);
  if (perawatNama) source.push('dom-input:perawat');

  const pageText = root.body?.innerText || root.body?.textContent || '';

  if (!dokterNama) {
    const dokterMatch = pageText.match(
      /(?:Dokter|Dokter Pemeriksa|DPJP)\s*[:-]\s*([^\n\r|,]{3,120})/i
    );
    if (dokterMatch?.[1]) {
      dokterNama = normalizeName(dokterMatch[1]);
      source.push('dom-text:dokter');
    }
  }

  if (!perawatNama) {
    const perawatMatch = pageText.match(/(?:Perawat|Bidan|Ners)\s*[:-]\s*([^\n\r|,]{3,120})/i);
    if (perawatMatch?.[1]) {
      perawatNama = normalizeName(perawatMatch[1]);
      source.push('dom-text:perawat');
    }
  }

  if (!dokterNama || !perawatNama) {
    const userName = normalizeName(
      firstNonEmpty(root, ['.username', '.user-name', '.logged-in-user', '.current-user'])
    );
    if (userName) {
      if (!dokterNama && /^dr\.?\s/i.test(userName)) {
        dokterNama = userName;
        source.push('user-banner:dokter');
      }
      if (!perawatNama && !/^dr\.?\s/i.test(userName)) {
        perawatNama = userName;
        source.push('user-banner:perawat');
      }
    }
  }

  if (!dokterNama && stored.dokterNama) {
    dokterNama = stored.dokterNama;
    source.push('storage:dokter');
  }
  if (!perawatNama && stored.perawatNama) {
    perawatNama = stored.perawatNama;
    source.push('storage:perawat');
  }

  if (!isPlausibleName(dokterNama, 'dokter')) dokterNama = '';
  if (!isPlausibleName(perawatNama, 'perawat')) perawatNama = '';

  if (dokterNama || perawatNama) {
    persistTenagaMedis(root, dokterNama, perawatNama);
  }

  return { dokterNama, perawatNama, source };
}
