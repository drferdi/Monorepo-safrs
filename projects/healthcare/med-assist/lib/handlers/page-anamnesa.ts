import { DOKTER_NAMA, PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import {
  activateCheckboxWithOnclick,
  type FieldMapping,
  type FillResult,
  fillFields,
  fillRangeSlider,
} from '@/lib/filler/filler-core';
import { fillViaMainWorld, type MainWorldFieldMapping } from '@/lib/filler/main-world-bridge';
import { sanitizeRMEAnamnesaText } from '@/lib/rme/truncate';
import { createLogger } from '@/utils/logger';
import type { AnamnesaFillPayload } from '@/utils/types';

const anamnesaLog = createLogger('AnamnesaHandler', 'content');
const ANAMNESA_DIRECT_FILL_DELAY_MS = 25;
const ANAMNESA_INTERACTIVE_FILL_DELAY_MS = 100;
const TENAGA_MEDIS_BRIDGE_DELAY_MS = 220;

type AnatomyComplaintLocation = {
  bodyPart: string;
  complaint: string;
};

type AnatomyRule = {
  bodyPart: string;
  keywords: string[];
  markerAliases: string[];
};

const ANATOMY_RULES: AnatomyRule[] = [
  {
    bodyPart: 'Kepala',
    keywords: ['sakit kepala', 'nyeri kepala', 'kepala berat', 'pusing', 'vertigo'],
    markerAliases: ['kepala', 'head'],
  },
  {
    bodyPart: 'Mata',
    keywords: ['nyeri mata', 'sakit mata', 'mata merah', 'penglihatan', 'pandangan kabur'],
    markerAliases: ['mata', 'eye'],
  },
  {
    bodyPart: 'Telinga',
    keywords: ['nyeri telinga', 'sakit telinga', 'telinga berdenging', 'telinga'],
    markerAliases: ['telinga', 'ear'],
  },
  {
    bodyPart: 'Leher',
    keywords: ['nyeri tenggorok', 'sakit tenggorok', 'tenggorokan', 'sulit menelan', 'leher'],
    markerAliases: ['leher', 'tenggorok', 'neck', 'throat'],
  },
  {
    bodyPart: 'Dada',
    keywords: ['nyeri dada', 'sakit dada', 'dada terasa', 'sesak', 'batuk', 'paru'],
    markerAliases: ['dada', 'paru', 'thorax', 'thoraks', 'chest', 'lung'],
  },
  {
    bodyPart: 'Perut',
    keywords: [
      'nyeri perut',
      'sakit perut',
      'perut melilit',
      'ulu hati',
      'mual',
      'muntah',
      'diare',
      'abdomen',
    ],
    markerAliases: ['perut', 'abdomen', 'abdominal', 'ulu hati'],
  },
  {
    bodyPart: 'Pinggang',
    keywords: ['nyeri pinggang', 'sakit pinggang', 'pinggang', 'punggung bawah', 'low back'],
    markerAliases: ['pinggang', 'punggung bawah', 'lumbar', 'low back'],
  },
  {
    bodyPart: 'Punggung',
    keywords: ['nyeri punggung', 'sakit punggung', 'punggung'],
    markerAliases: ['punggung', 'back'],
  },
  {
    bodyPart: 'Tangan',
    keywords: ['nyeri tangan', 'sakit tangan', 'lengan', 'pergelangan tangan', 'jari tangan'],
    markerAliases: ['tangan', 'lengan', 'arm', 'hand'],
  },
  {
    bodyPart: 'Paha',
    keywords: ['nyeri paha', 'sakit paha', 'paha'],
    markerAliases: ['paha', 'thigh'],
  },
  {
    bodyPart: 'Lutut',
    keywords: ['nyeri lutut', 'sakit lutut', 'lutut'],
    markerAliases: ['lutut', 'knee'],
  },
  {
    bodyPart: 'Betis',
    keywords: ['nyeri betis', 'sakit betis', 'betis'],
    markerAliases: ['betis', 'calf'],
  },
  {
    bodyPart: 'Kaki',
    keywords: ['nyeri kaki', 'sakit kaki', 'telapak kaki', 'pergelangan kaki', 'jari kaki', 'kaki'],
    markerAliases: ['kaki', 'telapak kaki', 'ankle', 'foot', 'leg'],
  },
];

const ANATOMY_TARGET_COORDS: Record<string, { x: number; y: number }> = {
  Kepala: { x: 0.22, y: 0.13 },
  Mata: { x: 0.22, y: 0.13 },
  Telinga: { x: 0.18, y: 0.16 },
  Leher: { x: 0.22, y: 0.21 },
  Dada: { x: 0.22, y: 0.32 },
  Perut: { x: 0.22, y: 0.45 },
  Pinggang: { x: 0.58, y: 0.45 },
  Punggung: { x: 0.58, y: 0.32 },
  Tangan: { x: 0.13, y: 0.48 },
  Paha: { x: 0.22, y: 0.64 },
  Lutut: { x: 0.22, y: 0.76 },
  Betis: { x: 0.22, y: 0.86 },
  Kaki: { x: 0.22, y: 0.96 },
};

const GENERAL_HEAD_DOMINANT_KEYWORDS = [
  'demam',
  'lemas',
  'tidak sadar',
  'pingsan',
  'koma',
  'kejang',
  'letargi',
];

const ANATOMY_MARKER_SELECTOR = [
  '[data-body-part]',
  '[data-bodypart]',
  '[data-bagian-tubuh]',
  '[data-lokasi]',
  '[data-anatomi]',
  '[data-anatomy]',
  '[data-original-title]',
  '[data-bs-original-title]',
  '.anatomy-marker',
  '.anatomi-marker',
  '.body-marker',
  '.marker',
  '[onclick]',
  '[data-toggle]',
  '[data-bs-toggle]',
  'area',
  '[role="button"]',
  'button',
  'a',
  'circle',
].join(',');

const ANATOMY_STRUCTURAL_MARKER_SELECTOR = [
  '[data-body-part]',
  '[data-bodypart]',
  '[data-bagian-tubuh]',
  '[data-lokasi]',
  '[data-anatomi]',
  '[data-anatomy]',
  '.anatomy-marker',
  '.anatomi-marker',
  '.body-marker',
  '.marker',
  '[onclick]:not(a)',
  '[data-toggle]',
  '[data-bs-toggle]',
  'area',
  'circle',
].join(',');

const ANATOMY_POPUP_SELECTOR = [
  '[role="dialog"]',
  '.modal',
  '.modal-dialog',
  '.modal-content',
  '.popover',
  '.popover-content',
  '.bootbox',
  '.swal2-popup',
  '.ui-dialog',
].join(',');

const nativeInputValueSetter =
  typeof HTMLInputElement !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    : undefined;

const nativeTextAreaValueSetter =
  typeof HTMLTextAreaElement !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    : undefined;

const KEADAAN_FISIK_CHECKBOX_INDEX: Record<
  keyof NonNullable<AnamnesaFillPayload['keadaan_fisik']>,
  number
> = {
  kulit: 1,
  kuku: 2,
  kepala: 3,
  wajah: 4,
  mata: 5,
  telinga: 6,
  hidung_sinus: 7,
  mulut_bibir: 8,
  leher: 9,
  dada_punggung: 10,
  kardiovaskuler: 11,
  dada_aksila: 12,
  abdomen_perut: 13,
  ekstremitas_atas: 14,
  ekstremitas_bawah: 15,
};

function toSentenceCase(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function pushIfValue(
  mappings: FieldMapping[],
  selector: string,
  value: string | number | boolean | undefined | null,
  type: FieldMapping['type'],
  forceOverride?: boolean
): void {
  if (value === undefined || value === null || value === '') return;
  mappings.push({
    selector,
    value,
    type,
    forceOverride,
  });
}

function normalizeFilledFieldName(field: string): string {
  return field.replace(/^(?:text|number|select|checkbox|radio|autocomplete):/, '');
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findKeywordIndex(text: string, keywords: string[]): number {
  let bestIndex = -1;
  for (const keyword of keywords) {
    const index = text.indexOf(normalizeSearchText(keyword));
    if (index >= 0 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }
  return bestIndex;
}

function buildAnatomyComplaintText(payload: AnamnesaFillPayload): string {
  return [payload.keluhan_utama, payload.keluhan_tambahan, payload.assesmen_nyeri?.lokasi]
    .map((value) => (value || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('. ');
}

function resolveStructuredAnatomyLocations(
  payload: AnamnesaFillPayload
): AnatomyComplaintLocation[] {
  return (payload.anatomi_tubuh || [])
    .filter((item) => item.bagian_tubuh.trim() && item.keterangan.trim())
    .map((item) => ({
      bodyPart: item.bagian_tubuh.trim(),
      complaint: item.keterangan.replace(/\s+/g, ' ').trim(),
    }));
}

function resolveAnatomyComplaintLocations(
  payload: AnamnesaFillPayload
): AnatomyComplaintLocation[] {
  const structuredLocations = resolveStructuredAnatomyLocations(payload);
  if (structuredLocations.length > 0) return structuredLocations;

  const complaint = buildAnatomyComplaintText(payload);
  const normalizedComplaint = normalizeSearchText(complaint);
  if (!normalizedComplaint) return [];

  const matched = ANATOMY_RULES.map((rule) => ({
    rule,
    index: findKeywordIndex(normalizedComplaint, rule.keywords),
  }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);

  if (
    matched.length === 0 &&
    findKeywordIndex(normalizedComplaint, GENERAL_HEAD_DOMINANT_KEYWORDS) >= 0
  ) {
    return [{ bodyPart: 'Kepala', complaint }];
  }

  const seen = new Set<string>();
  const locations: AnatomyComplaintLocation[] = [];
  for (const item of matched) {
    if (seen.has(item.rule.bodyPart)) continue;
    seen.add(item.rule.bodyPart);
    locations.push({ bodyPart: item.rule.bodyPart, complaint });
  }

  return locations;
}

function getAnatomyRule(bodyPart: string): AnatomyRule | undefined {
  return ANATOMY_RULES.find((rule) => rule.bodyPart === bodyPart);
}

function isVisibleElement(element: Element): boolean {
  if (element.closest('[hidden], [aria-hidden="true"]')) return false;

  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }

  return true;
}

function getElementSearchText(element: Element): string {
  const attributes = [
    'data-body-part',
    'data-bodypart',
    'data-bagian-tubuh',
    'data-lokasi',
    'data-anatomi',
    'data-anatomy',
    'data-original-title',
    'data-bs-original-title',
    'aria-label',
    'title',
    'id',
    'class',
    'name',
  ];

  const parts = attributes
    .map((attribute) => element.getAttribute(attribute))
    .filter((value): value is string => Boolean(value));

  parts.push(element.textContent || '');

  return normalizeSearchText(parts.join(' '));
}

function findAnatomyRootElement(): Element | null {
  const candidates = Array.from(
    document.body.querySelectorAll<HTMLElement>(
      'section, fieldset, form, article, div, [aria-label]'
    )
  );
  const matchingCandidates = candidates.filter(
    (element) =>
      isVisibleElement(element) &&
      (getElementSearchText(element).includes('anatomi tubuh') ||
        normalizeSearchText(element.getAttribute('aria-label')).includes('anatomi tubuh'))
  );

  const candidatesWithMarkers = matchingCandidates.filter(
    (element) =>
      element.matches(ANATOMY_STRUCTURAL_MARKER_SELECTOR) ||
      Boolean(element.querySelector(ANATOMY_STRUCTURAL_MARKER_SELECTOR))
  );

  const ranked = (
    candidatesWithMarkers.length > 0 ? candidatesWithMarkers : matchingCandidates
  ).sort((left, right) => {
    const leftRect = getNonZeroRect(left);
    const rightRect = getNonZeroRect(right);
    const leftArea = leftRect ? leftRect.width * leftRect.height : Number.POSITIVE_INFINITY;
    const rightArea = rightRect ? rightRect.width * rightRect.height : Number.POSITIVE_INFINITY;
    return leftArea - rightArea;
  });

  return ranked[0] || null;
}

function hasCoordinateMarkerHint(element: Element): boolean {
  if (
    element.matches(
      [
        '[data-body-part]',
        '[data-bodypart]',
        '[data-bagian-tubuh]',
        '[data-lokasi]',
        '[data-anatomi]',
        '[data-anatomy]',
        '.anatomy-marker',
        '.anatomi-marker',
        '.body-marker',
        '.marker',
        '[onclick]',
        '[data-toggle]',
        '[data-bs-toggle]',
        'area',
        'circle',
      ].join(',')
    )
  ) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  const visibleLabel = normalizeSearchText(
    [element.textContent, element.getAttribute('aria-label'), element.getAttribute('title')]
      .filter(Boolean)
      .join(' ')
  );

  return (tagName === 'button' || tagName === 'a') && visibleLabel.length === 0;
}

function getNonZeroRect(element: Element): DOMRect | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  return rect;
}

function getMarkerCenterPoint(
  element: Element,
  rootRect: DOMRect
): { x: number; y: number } | null {
  const rect = getNonZeroRect(element);
  if (rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  if (element instanceof HTMLAreaElement) {
    const coords = element.coords
      .split(',')
      .map((coord) => Number(coord.trim()))
      .filter((coord) => Number.isFinite(coord));
    if (coords.length >= 2) {
      const xs = coords.filter((_, index) => index % 2 === 0);
      const ys = coords.filter((_, index) => index % 2 === 1);
      const x = xs.reduce((sum, value) => sum + value, 0) / xs.length;
      const y = ys.reduce((sum, value) => sum + value, 0) / ys.length;
      return {
        x: rootRect.left + x,
        y: rootRect.top + y,
      };
    }
  }

  return null;
}

function findNearestAnatomyMarkerByCoordinate(
  bodyPart: string,
  rootElement: Element,
  candidates: Element[]
): Element | null {
  const target = ANATOMY_TARGET_COORDS[bodyPart];
  const rootRect = getNonZeroRect(rootElement);
  if (!target || !rootRect) return null;

  const targetPoint = {
    x: rootRect.left + rootRect.width * target.x,
    y: rootRect.top + rootRect.height * target.y,
  };

  let nearest: { element: Element; distance: number } | null = null;
  for (const candidate of candidates.filter(hasCoordinateMarkerHint)) {
    const candidatePoint = getMarkerCenterPoint(candidate, rootRect);
    if (!candidatePoint) continue;

    const distance = Math.hypot(candidatePoint.x - targetPoint.x, candidatePoint.y - targetPoint.y);
    if (!nearest || distance < nearest.distance) {
      nearest = { element: candidate, distance };
    }
  }

  return nearest?.element || null;
}

function findVisibleAnatomyMarker(bodyPart: string): Element | null {
  const rule = getAnatomyRule(bodyPart);
  const aliases = [bodyPart, ...(rule?.markerAliases || [])].map(normalizeSearchText);
  const rootElement = findAnatomyRootElement();
  if (!rootElement) return null;

  const root = rootElement;
  const candidates = Array.from(root.querySelectorAll(ANATOMY_MARKER_SELECTOR)).filter(
    isVisibleElement
  );

  const labeledMarker =
    candidates.find((element) => {
      const text = getElementSearchText(element);
      return aliases.some((alias) => alias && text.includes(alias));
    }) || null;

  if (labeledMarker) return labeledMarker;

  return findNearestAnatomyMarkerByCoordinate(bodyPart, rootElement, candidates);
}

function isFillableTextField(
  element: Element | null
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLSelectElement)
  ) {
    return false;
  }

  if (!isVisibleElement(element) || element.disabled) return false;
  if (element instanceof HTMLInputElement && (element.type === 'hidden' || element.readOnly))
    return false;
  if (element instanceof HTMLTextAreaElement && element.readOnly) return false;

  return true;
}

function getFieldSearchText(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string {
  const label = field.closest('label')?.textContent || '';
  const fieldId = field.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`)?.textContent
    : '';

  return normalizeSearchText(
    [
      field.name,
      field.id,
      field instanceof HTMLSelectElement ? '' : field.placeholder,
      field.getAttribute('aria-label'),
      field.getAttribute('data-name'),
      label,
      fieldId,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function findVisibleFieldByKeywords(
  scope: ParentNode,
  keywords: string[]
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const normalizedKeywords = keywords.map(normalizeSearchText);
  const fields = Array.from(scope.querySelectorAll('input, textarea, select')).filter(
    isFillableTextField
  );

  return (
    fields.find((field) => {
      const text = getFieldSearchText(field);
      return normalizedKeywords.every((keyword) => text.includes(keyword));
    }) || null
  );
}

function findAnatomyPopupScope(): ParentNode | null {
  const popups = Array.from(document.body.querySelectorAll(ANATOMY_POPUP_SELECTOR)).filter(
    isVisibleElement
  );
  for (const popup of popups) {
    if (
      findVisibleFieldByKeywords(popup, ['bagian', 'tubuh']) &&
      findVisibleFieldByKeywords(popup, ['keterangan'])
    ) {
      return popup;
    }
  }

  return null;
}

function setFieldValue(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void {
  if (field instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(field, value);
  } else if (field instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(field, value);
  } else {
    field.value = value;
  }

  field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
}

function clickElement(element: Element): void {
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
  clickEvent.preventDefault();
  element.dispatchEvent(clickEvent);
}

function getActionElementText(element: Element): string {
  if (element instanceof HTMLInputElement) {
    return normalizeSearchText(`${element.value} ${element.getAttribute('aria-label') || ''}`);
  }

  return getElementSearchText(element);
}

function clickAnatomySaveButton(scope: ParentNode): boolean {
  const actions = Array.from(
    scope.querySelectorAll('button, input[type="button"], input[type="submit"], a, [role="button"]')
  ).filter(isVisibleElement);

  const saveButton = actions.find((element) => {
    const text = getActionElementText(element);
    return ['simpan', 'tambah', 'ok', 'save'].some((label) => text.includes(label));
  });

  if (!saveButton) return false;
  clickElement(saveButton);
  return true;
}

async function waitForAnatomyPopupScope(): Promise<ParentNode | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scope = findAnatomyPopupScope();
    if (scope) return scope;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return null;
}

async function fillAnatomyMap(payload: AnamnesaFillPayload): Promise<{
  success: FillResult[];
  failed: FillResult[];
  skipped: string[];
}> {
  const locations = resolveAnatomyComplaintLocations(payload);
  const success: FillResult[] = [];
  const failed: FillResult[] = [];
  const skipped: string[] = [];

  if (locations.length === 0) return { success, failed, skipped };

  for (const location of locations) {
    const marker = findVisibleAnatomyMarker(location.bodyPart);
    if (!marker) {
      skipped.push(`anatomi.${location.bodyPart}: marker visible tidak ditemukan`);
      continue;
    }

    clickElement(marker);

    const popupScope = await waitForAnatomyPopupScope();
    const bodyPartField = popupScope
      ? findVisibleFieldByKeywords(popupScope, ['bagian', 'tubuh'])
      : null;
    const notesField = popupScope ? findVisibleFieldByKeywords(popupScope, ['keterangan']) : null;

    if (!popupScope || !bodyPartField || !notesField) {
      skipped.push(
        `anatomi.${location.bodyPart}: popup anatomi valid tidak ditemukan atau field wajib tidak lengkap`
      );
      continue;
    }

    setFieldValue(bodyPartField, location.bodyPart);
    setFieldValue(notesField, location.complaint);
    clickAnatomySaveButton(popupScope);

    success.push({
      success: true,
      field: `anatomi:${location.bodyPart}`,
      value: location.complaint,
      method: 'direct',
    });
  }

  return { success, failed, skipped };
}

async function activateKeadaanFisikSections(
  payload: AnamnesaFillPayload,
  skipped: string[]
): Promise<void> {
  const keadaanFisik = payload.keadaan_fisik;
  if (!keadaanFisik) return;

  for (const key of Object.keys(keadaanFisik) as Array<keyof typeof keadaanFisik>) {
    if (!keadaanFisik[key]) continue;
    const index = KEADAAN_FISIK_CHECKBOX_INDEX[key];
    if (!index) continue;

    const result = await activateCheckboxWithOnclick(
      `input#textareaFisik\\[${index}\\], input[id="textareaFisik[${index}]"]`,
      true
    );

    if (!result.success) {
      skipped.push(`keadaan_fisik.${key}: checkbox tidak dapat diaktifkan`);
    }
  }
}

function buildKeadaanFisikMappings(payload: AnamnesaFillPayload, mappings: FieldMapping[]): void {
  const keadaanFisik = payload.keadaan_fisik;
  if (!keadaanFisik) return;

  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kulit][Inspeksi]"]',
    keadaanFisik.kulit?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kulit][Palpasi]"]',
    keadaanFisik.kulit?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kuku][Inspeksi]"]',
    keadaanFisik.kuku?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kuku][Palpasi]"]',
    keadaanFisik.kuku?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kepala][Inspeksi]"]',
    keadaanFisik.kepala?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kepala][Palpasi]"]',
    keadaanFisik.kepala?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[wajah][Inspeksi]"]',
    keadaanFisik.wajah?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[wajah][Palpasi]"]',
    keadaanFisik.wajah?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[mata][Inspeksi]"]',
    keadaanFisik.mata?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[telinga][Inspeksi]"]',
    keadaanFisik.telinga?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[telinga][Palpasi]"]',
    keadaanFisik.telinga?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[hidung_sinus][Inspeksi]"]',
    keadaanFisik.hidung_sinus?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[hidung_sinus][Palpasi dan Perkusi]"]',
    keadaanFisik.hidung_sinus?.palpasi_perkusi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[mulut_bibir][Inspeksi dan Palpasi Struktur Luar]"]',
    keadaanFisik.mulut_bibir?.inspeksi_luar,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[mulut_bibir][Inspeksi dan Palpasi Strukur Dalam]"]',
    keadaanFisik.mulut_bibir?.inspeksi_dalam,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[leher][Inspeksi Leher]"]',
    keadaanFisik.leher?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[leher][Inspeksi dan Auskultasi Arteri Karotis]"]',
    keadaanFisik.leher?.auskultasi_karotis,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[leher][Inspeksi dan Palpasi Kelenjer Tiroid]"]',
    keadaanFisik.leher?.palpasi_tiroid,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[leher][Auskultasi (Bising Pembuluh Darah)]"]',
    keadaanFisik.leher?.auskultasi_bising,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_punggung][Inspeksi]"]',
    keadaanFisik.dada_punggung?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_punggung][Palpasi]"]',
    keadaanFisik.dada_punggung?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_punggung][Perkusi]"]',
    keadaanFisik.dada_punggung?.perkusi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_punggung][Auskultasi]"]',
    keadaanFisik.dada_punggung?.auskultasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kardiovaskuler][Inspeksi]"]',
    keadaanFisik.kardiovaskuler?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kardiovaskuler][Palpasi]"]',
    keadaanFisik.kardiovaskuler?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kardiovaskuler][Perkusi]"]',
    keadaanFisik.kardiovaskuler?.perkusi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[kardiovaskuler][Auskultasi]"]',
    keadaanFisik.kardiovaskuler?.auskultasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_aksila][Inspeksi Dada]"]',
    keadaanFisik.dada_aksila?.inspeksi_dada,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_aksila][Palpasi Dada]"]',
    keadaanFisik.dada_aksila?.palpasi_dada,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[dada_aksila][Inspeksi dan Palpasi Aksila]"]',
    keadaanFisik.dada_aksila?.inspeksi_palpasi_aksila,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Inspeksi]"]',
    keadaanFisik.abdomen_perut?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Auskultasi]"]',
    keadaanFisik.abdomen_perut?.auskultasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Perkusi Semua Kuadran]"]',
    keadaanFisik.abdomen_perut?.perkusi_kuadran,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Perkusi Hepar]"]',
    keadaanFisik.abdomen_perut?.perkusi_hepar,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Perkusi Limfa]"]',
    keadaanFisik.abdomen_perut?.perkusi_limfa,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Perkusi Ginjal]"]',
    keadaanFisik.abdomen_perut?.perkusi_ginjal,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[abdomen_perut][Palpasi Semua Kuadran]"]',
    keadaanFisik.abdomen_perut?.palpasi_kuadran,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[ekstermitas_atas][Inspeksi Struktur Muskuloskletal]"]',
    keadaanFisik.ekstremitas_atas?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[ekstermitas_atas][Palpasi]"]',
    keadaanFisik.ekstremitas_atas?.palpasi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[ekstermitas_bawah][Inspeksi Struktur Muskuloskletal]"]',
    keadaanFisik.ekstremitas_bawah?.inspeksi,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="PeriksaFisik[ekstermitas_bawah][Palpasi]"]',
    keadaanFisik.ekstremitas_bawah?.palpasi,
    'textarea'
  );
}

function buildKeadaanFisikDetailMappings(payload: AnamnesaFillPayload): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  buildKeadaanFisikMappings(payload, mappings);
  return mappings;
}

function buildPainDetailMappings(payload: AnamnesaFillPayload): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const assesmenNyeri = payload.assesmen_nyeri;
  if (!assesmenNyeri) return mappings;

  pushIfValue(
    mappings,
    'input[name="PeriksaFisik[pencetus]"], textarea[name="PeriksaFisik[pencetus_nyeri]"], textarea[name="PeriksaFisik[pencetus]"], textarea#pencetus_nyeri',
    assesmenNyeri.pencetus,
    'text'
  );
  pushIfValue(
    mappings,
    'select[name="PeriksaFisik[kualitas]"], textarea[name="PeriksaFisik[kualitas_nyeri]"], textarea[name="PeriksaFisik[kualitas]"], textarea#kualitas_nyeri',
    assesmenNyeri.kualitas,
    'select'
  );
  pushIfValue(
    mappings,
    'input[name="PeriksaFisik[lokasi]"], textarea[name="PeriksaFisik[lokasi_nyeri]"], textarea[name="PeriksaFisik[lokasi]"], textarea#lokasi_nyeri',
    assesmenNyeri.lokasi,
    'text'
  );
  pushIfValue(
    mappings,
    `input[name="PeriksaFisik[waktu]"][value="${assesmenNyeri.waktu}"]`,
    assesmenNyeri.waktu,
    'radio'
  );

  return mappings;
}

function buildPainRadioMappings(payload: AnamnesaFillPayload): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const assesmenNyeri = payload.assesmen_nyeri;
  if (!assesmenNyeri) return mappings;

  pushIfValue(
    mappings,
    `input[name="PeriksaFisik[merasakan_nyeri]"][value="${assesmenNyeri.merasakan_nyeri}"]`,
    assesmenNyeri.merasakan_nyeri,
    'radio'
  );

  return mappings;
}

function buildAnamnesaMappings(
  payload: AnamnesaFillPayload,
  options: {
    includePainAssessment?: boolean;
    includePainDetails?: boolean;
    includeKeadaanFisik?: boolean;
  } = {}
): FieldMapping[] {
  const includePainAssessment = options.includePainAssessment ?? true;
  const includePainDetails = options.includePainDetails ?? true;
  const includeKeadaanFisik = options.includeKeadaanFisik ?? true;
  const mappings: FieldMapping[] = [];

  if (payload.keluhan_utama) {
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[keluhan_utama]"], textarea#keluhan',
      toSentenceCase(sanitizeRMEAnamnesaText(payload.keluhan_utama)),
      'textarea',
      true
    );
  }

  if (payload.keluhan_tambahan) {
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[keluhan_tambahan]"], textarea#keluhan-tambahan',
      sanitizeRMEAnamnesaText(payload.keluhan_tambahan),
      'textarea',
      true
    );
  }

  pushIfValue(
    mappings,
    'input[name="Anamnesa[lama_sakit_hari]"], input#sakit_hari',
    payload.lama_sakit?.hr && payload.lama_sakit.hr > 0 ? payload.lama_sakit.hr : undefined,
    'number'
  );
  pushIfValue(
    mappings,
    'input[name="Anamnesa[lama_sakit_bulan]"], input#sakit_bulan',
    payload.lama_sakit?.bln && payload.lama_sakit.bln > 0 ? payload.lama_sakit.bln : undefined,
    'number'
  );
  pushIfValue(
    mappings,
    'input[name="Anamnesa[lama_sakit_tahun]"], input#sakit_tahun',
    payload.lama_sakit?.thn && payload.lama_sakit.thn > 0 ? payload.lama_sakit.thn : undefined,
    'number'
  );

  pushIfValue(
    mappings,
    'textarea[name="MRiwayatPasien[Riwayat Penyakit Sekarang][value]"], textarea#text_rps',
    payload.riwayat_penyakit?.sekarang
      ? sanitizeRMEAnamnesaText(payload.riwayat_penyakit.sekarang)
      : undefined,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="MRiwayatPasien[Riwayat Penyakit Dulu][value]"], textarea#text_rpd',
    payload.riwayat_penyakit?.dahulu,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="MRiwayatPasien[Riwayat Penyakit Keluarga][value]"], textarea#text_rpk',
    payload.riwayat_penyakit?.keluarga,
    'textarea'
  );

  pushIfValue(
    mappings,
    'textarea[name="MAlergiPasien[Obat][value]"], textarea#text_alergiobat',
    payload.alergi?.obat?.length ? payload.alergi.obat.join(', ') : undefined,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="MAlergiPasien[Makanan][value]"], textarea#text_alergimakanan',
    payload.alergi?.makanan?.length ? payload.alergi.makanan.join(', ') : undefined,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="MAlergiPasien[Udara][value]"], textarea#text_alergiudara',
    payload.alergi?.udara?.length ? payload.alergi.udara.join(', ') : undefined,
    'textarea'
  );
  pushIfValue(
    mappings,
    'textarea[name="MAlergiPasien[Umum][value]"], textarea#text_alergiumum',
    payload.alergi?.lainnya?.length ? payload.alergi.lainnya.join(', ') : undefined,
    'textarea'
  );

  pushIfValue(
    mappings,
    `input[name="Anamnesa[is_pregnant]"][value="${payload.is_pregnant ? '1' : '0'}"], input[name="Anamnesa[kehamilan]"][value="${payload.is_pregnant ? '1' : '0'}"], input[name="PeriksaFisik[status_hamil]"][value="${payload.is_pregnant ? '1' : '0'}"]`,
    payload.is_pregnant === undefined ? undefined : payload.is_pregnant ? '1' : '0',
    'radio'
  );

  const psikososial = payload.status_psikososial;
  if (psikososial) {
    pushIfValue(
      mappings,
      `input[name="Anamnesa[alat_bantu_aktrifitas]"][value="${psikososial.alat_bantu_aktrifitas}"]`,
      psikososial.alat_bantu_aktrifitas,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[kendala_komunikasi]"][value="${psikososial.kendala_komunikasi}"]`,
      psikososial.kendala_komunikasi,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[merawat_dirumah]"][value="${psikososial.merawat_dirumah}"]`,
      psikososial.merawat_dirumah,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[membutuhkan_bantuan]"][value="${psikososial.membutuhkan_bantuan}"]`,
      psikososial.membutuhkan_bantuan,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[bahasa_digunakan]"][value="${psikososial.bahasa_digunakan}"]`,
      psikososial.bahasa_digunakan,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[tinggal_dengan]"][value="${psikososial.tinggal_dengan}"]`,
      psikososial.tinggal_dengan,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[sosial_ekonomi]"][value="${psikososial.sosial_ekonomi}"]`,
      psikososial.sosial_ekonomi,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[gangguan_jiwa_dimasa_lalu]"][value="${psikososial.gangguan_jiwa_dimasa_lalu}"]`,
      psikososial.gangguan_jiwa_dimasa_lalu,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[status_ekonomi]"][value="${psikososial.status_ekonomi}"]`,
      psikososial.status_ekonomi,
      'radio'
    );
    pushIfValue(
      mappings,
      'select[name="Anamnesa[hubungan_keluarga]"]',
      psikososial.hubungan_keluarga,
      'select'
    );
  }

  const vital = payload.vital_signs;
  if (vital) {
    pushIfValue(
      mappings,
      'input#sistole, input[name="PeriksaFisik[sistole]"]',
      vital.tekanan_darah_sistolik || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input#diastole, input[name="PeriksaFisik[diastole]"]',
      vital.tekanan_darah_diastolik || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input#nilai-map, input[name="PeriksaFisik[map]"]',
      vital.map || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input#detak-nadi, input[name="PeriksaFisik[detak_nadi]"]',
      vital.nadi || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      `input[name="PeriksaFisik[detak_jantung]"][value="${vital.detak_jantung || 'REGULAR'}"]`,
      vital.detak_jantung,
      'radio'
    );
    pushIfValue(
      mappings,
      'input#nafas, input[name="PeriksaFisik[nafas]"]',
      vital.respirasi || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input#suhu, input[name="PeriksaFisik[suhu]"]',
      vital.suhu || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input#gula-darah, input[name="PeriksaFisik[gula_darah]"], input[name="gula_darah"]',
      vital.gula_darah,
      'number'
    );
    pushIfValue(mappings, 'select[name="PeriksaFisik[kesadaran]"]', vital.kesadaran, 'select');
  }

  const periksaFisik = payload.periksa_fisik;
  if (periksaFisik) {
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[membuka_mata]"], select#membuka_mata',
      periksaFisik.gcs_membuka_mata,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[respon_verbal]"], select#respon_verbal',
      periksaFisik.gcs_respon_verbal,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[respon_motorik]"], select#respon_motorik',
      periksaFisik.gcs_respon_motorik,
      'select'
    );
    pushIfValue(
      mappings,
      'input[name="PeriksaFisik[tinggi]"], input#tinggi_badan, input#tinggi',
      periksaFisik.tinggi || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input[name="PeriksaFisik[berat]"], input#berat_badan, input#berat',
      periksaFisik.berat || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input[name="PeriksaFisik[lingkar_perut]"], input#lingkar_perut',
      periksaFisik.lingkar_perut || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'input[name="PeriksaFisik[imt]"], input#imt',
      periksaFisik.imt ? Number(periksaFisik.imt.toFixed(1)) : undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[hasil_imt]"], select#hasil_imt, input[name="PeriksaFisik[hasil_imt]"]',
      periksaFisik.hasil_imt,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[cara_ukur]"], select#cara_ukur',
      periksaFisik.cara_ukur,
      'select'
    );
    pushIfValue(
      mappings,
      `input[name="PeriksaFisik[triage]"][value="${periksaFisik.triage}"]`,
      periksaFisik.triage,
      'radio'
    );
    pushIfValue(
      mappings,
      'input[name="PeriksaFisik[saturasi]"], input#saturasi, input[name="PeriksaFisik[spo2]"]',
      periksaFisik.saturasi || undefined,
      'number'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[mobilisasi]"], select#mobilisasi',
      periksaFisik.mobilisasi,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[toileting]"], select#toileting',
      periksaFisik.toileting,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[makan_minum]"], select#makan_minum',
      periksaFisik.makan_minum,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[mandi]"], select#mandi',
      periksaFisik.mandi,
      'select'
    );
    pushIfValue(
      mappings,
      'select[name="PeriksaFisik[berpakaian]"], select#berpakaian',
      periksaFisik.berpakaian,
      'select'
    );
    pushIfValue(
      mappings,
      'textarea[name="PeriksaFisik[aktifitas_fisik]"], textarea#aktifitas_fisik',
      periksaFisik.aktifitas_fisik,
      'textarea'
    );
  }

  const resikoJatuh = payload.resiko_jatuh;
  if (resikoJatuh) {
    pushIfValue(
      mappings,
      `input[name="PeriksaFisik[cara_berjalan]"][value="${resikoJatuh.cara_berjalan}"]`,
      resikoJatuh.cara_berjalan,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="PeriksaFisik[penopang]"][value="${resikoJatuh.penopang}"]`,
      resikoJatuh.penopang,
      'radio'
    );
  }

  const assesmenNyeri = payload.assesmen_nyeri;
  if (includePainAssessment && assesmenNyeri) {
    mappings.push(...buildPainRadioMappings(payload));
    if (includePainDetails) {
      mappings.push(...buildPainDetailMappings(payload));
    }
  }

  if (includeKeadaanFisik) {
    buildKeadaanFisikMappings(payload, mappings);
  }

  const lainnya = payload.lainnya;
  if (lainnya) {
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[terapi]"], textarea#text_terapi',
      lainnya.terapi,
      'textarea'
    );
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[terapi_non_obat]"], textarea#text_terapi_non_obat',
      lainnya.terapi_non_obat,
      'textarea'
    );
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[bmhp]"], textarea#text_bmhp',
      lainnya.bmhp,
      'textarea'
    );
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[rencana_tindakan]"]',
      lainnya.rencana_tindakan,
      'textarea'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[merokok]"][value="${lainnya.merokok}"]`,
      lainnya.merokok,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[konsumsi_alkohol]"][value="${lainnya.konsumsi_alkohol}"]`,
      lainnya.konsumsi_alkohol,
      'radio'
    );
    pushIfValue(
      mappings,
      `input[name="Anamnesa[kurang_sayur_buah]"][value="${lainnya.kurang_sayur_buah}"]`,
      lainnya.kurang_sayur_buah,
      'radio'
    );
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[edukasi]"], textarea#text_edukasi',
      lainnya.edukasi,
      'textarea'
    );
    pushIfValue(mappings, 'textarea[name="Anamnesa[askep]"]', lainnya.askep, 'textarea');
    pushIfValue(mappings, 'textarea[name="Anamnesa[observasi]"]', lainnya.observasi, 'textarea');
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[keterangan]"], textarea#text_keterangan',
      lainnya.keterangan,
      'textarea'
    );
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[biopsikososial]"], textarea#text_biopsikososial',
      lainnya.biopsikososial,
      'textarea'
    );
    pushIfValue(
      mappings,
      'textarea[name="Anamnesa[tindakan_keperawatan]"], textarea#tindakan_keperawatan',
      lainnya.tindakan_keperawatan,
      'textarea'
    );
  }

  return mappings;
}

async function fillPainAssessment(payload: AnamnesaFillPayload): Promise<{
  success: FillResult[];
  failed: FillResult[];
  skipped: string[];
}> {
  const success: FillResult[] = [];
  const failed: FillResult[] = [];
  const skipped: string[] = [];
  const assesmenNyeri = payload.assesmen_nyeri;
  if (!assesmenNyeri) return { success, failed, skipped };

  const radioMappings = buildPainRadioMappings(payload);
  if (radioMappings.length > 0) {
    const radioResults = await fillFields(radioMappings, ANAMNESA_INTERACTIVE_FILL_DELAY_MS);
    success.push(...radioResults.filter((result) => result.success));
    failed.push(...radioResults.filter((result) => !result.success));
  }

  if (assesmenNyeri.merasakan_nyeri !== '1') {
    skipped.push('assesmen_nyeri.detail: dilewati karena pasien tidak merasakan nyeri');
    return { success, failed, skipped };
  }

  const painDetailMappings = buildPainDetailMappings(payload);
  if (painDetailMappings.length > 0) {
    const painResults = await fillFields(painDetailMappings, ANAMNESA_INTERACTIVE_FILL_DELAY_MS);
    success.push(...painResults.filter((result) => result.success));
    failed.push(...painResults.filter((result) => !result.success));
  }

  if (assesmenNyeri.skala_nyeri !== undefined && assesmenNyeri.skala_nyeri > 0) {
    const sliderResult = await fillRangeSlider(
      'input#skala_nyeri, input[name="PeriksaFisik[skala_nyeri]"]',
      'input#range-slider, input[name="PeriksaFisik[skala_nyeri_slider]"]',
      assesmenNyeri.skala_nyeri
    );
    if (sliderResult.success) success.push(sliderResult);
    else failed.push(sliderResult);
  }

  return { success, failed, skipped };
}

async function fillTenagaMedis(
  payload: AnamnesaFillPayload
): Promise<{ success: FillResult[]; failed: FillResult[]; skipped: string[] }> {
  const dokterNama = payload.tenaga_medis?.dokter_nama || DOKTER_NAMA;
  const perawatNama = payload.tenaga_medis?.perawat_nama || PERAWAT_NAMA;

  const directMappings: FieldMapping[] = [
    {
      selector: 'input[name="dokter_nama_bpjs"], input[name="dokter_nama"], input[name="dokter"]',
      value: dokterNama,
      type: 'text',
      forceOverride: true,
    },
    {
      selector: 'input[name="perawat_nama"], input[name="perawat"], input[name*="bidan"]',
      value: perawatNama,
      type: 'text',
      forceOverride: true,
    },
  ];

  const directResults = await fillFields(directMappings, ANAMNESA_DIRECT_FILL_DELAY_MS);
  const success: FillResult[] = directResults.filter((result) => result.success);
  const failed: FillResult[] = directResults.filter((result) => !result.success);
  const skipped: string[] = [];

  const bridgeMappings: MainWorldFieldMapping[] = [
    {
      selector: 'input[name="dokter_nama_bpjs"], input[name="dokter_nama"], input[name="dokter"]',
      value: dokterNama,
      type: 'autocomplete',
      autocompleteTimeout: 4000,
      requireExactMatch: true,
    },
    {
      selector: 'input[name="perawat_nama"], input[name="perawat"], input[name*="bidan"]',
      value: perawatNama,
      type: 'autocomplete',
      autocompleteTimeout: 4000,
      requireExactMatch: true,
    },
  ];

  const bridgeResult = await fillViaMainWorld(bridgeMappings, 25000, TENAGA_MEDIS_BRIDGE_DELAY_MS);
  const successfulFields = new Set(success.map((result) => normalizeFilledFieldName(result.field)));
  success.push(
    ...bridgeResult.success.map((result) => ({
      success: true,
      field: result.field,
      value: result.value,
      method: 'autocomplete' as const,
    }))
  );
  for (const result of bridgeResult.failed) {
    const normalizedError = (result.error || '').toLowerCase();
    if (
      successfulFields.has(normalizeFilledFieldName(result.field)) &&
      normalizedError.includes('jquery not available')
    ) {
      skipped.push(`${result.field}: bridge autocomplete dilewati karena jQuery tidak tersedia`);
      continue;
    }

    failed.push({
      success: false,
      field: result.field,
      value: result.value,
      method: 'autocomplete' as const,
      error: result.error,
    });
  }

  return { success, failed, skipped };
}

export async function fillAnamnesaForm(payload: AnamnesaFillPayload): Promise<{
  success: FillResult[];
  failed: FillResult[];
  skipped: string[];
}> {
  anamnesaLog.debug('fillAnamnesaForm start', {
    hasVitalSigns: Boolean(payload.vital_signs),
    hasKeadaanFisik: Boolean(payload.keadaan_fisik),
    hasTenagaMedis: Boolean(payload.tenaga_medis),
  });

  const skipped: string[] = [];

  await activateKeadaanFisikSections(payload, skipped);

  const mappings = buildAnamnesaMappings(payload, {
    includePainAssessment: false,
    includePainDetails: false,
    includeKeadaanFisik: false,
  });
  const keadaanFisikMappings = buildKeadaanFisikDetailMappings(payload);

  if (mappings.length === 0 && !payload.assesmen_nyeri && keadaanFisikMappings.length === 0) {
    return {
      success: [],
      failed: [
        {
          success: false,
          field: 'anamnesa',
          value: '',
          method: 'direct',
          error: 'Tidak ada field anamnesa yang dapat diisi',
        },
      ],
      skipped,
    };
  }

  const fillResults =
    mappings.length > 0 ? await fillFields(mappings, ANAMNESA_DIRECT_FILL_DELAY_MS) : [];
  const success: FillResult[] = fillResults.filter((result) => result.success);
  const failed: FillResult[] = fillResults.filter((result) => !result.success);

  const painAssessmentResult = await fillPainAssessment(payload);
  success.push(...painAssessmentResult.success);
  failed.push(...painAssessmentResult.failed);
  skipped.push(...painAssessmentResult.skipped);

  if (keadaanFisikMappings.length > 0) {
    const keadaanFisikResults = await fillFields(
      keadaanFisikMappings,
      ANAMNESA_DIRECT_FILL_DELAY_MS
    );
    success.push(...keadaanFisikResults.filter((result) => result.success));
    failed.push(...keadaanFisikResults.filter((result) => !result.success));
  }

  const anatomyMapResult = await fillAnatomyMap(payload);
  success.push(...anatomyMapResult.success);
  failed.push(...anatomyMapResult.failed);
  skipped.push(...anatomyMapResult.skipped);

  const tenagaMedisResult = await fillTenagaMedis(payload);
  success.push(...tenagaMedisResult.success);
  failed.push(...tenagaMedisResult.failed);
  skipped.push(...tenagaMedisResult.skipped);

  anamnesaLog.debug('fillAnamnesaForm done', {
    successCount: success.length,
    failedCount: failed.length,
    skippedCount: skipped.length,
  });

  return { success, failed, skipped };
}

export function initAnamnesaPage(): void {
  anamnesaLog.debug('Halaman anamnesa terdeteksi dan handler diinisialisasi');
}
