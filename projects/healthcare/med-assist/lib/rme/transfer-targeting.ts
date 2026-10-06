import type { RMETransferStepStatus } from '@/utils/types';

export type DetectedEpuskesmasPage = 'anamnesa' | 'soap' | 'resep' | 'diagnosa' | null;

export type TransferTabCandidate = {
  id?: number;
  url?: string | null;
  active?: boolean;
};

const STEP_URL_ALIASES: Record<RMETransferStepStatus, string[]> = {
  anamnesa: ['anamnesa', 'anamnesis', 'soap'],
  diagnosa: ['diagnosa', 'diagnosis', 'icd10', 'icd-10'],
  resep: ['resep', 'terapi', 'obat', 'prescription'],
};

const GENERIC_ANAMNESA_ROUTE_MARKERS = [
  '/pelayanan/',
  '/rawat_jalan/',
  '/rawatjalan/',
  '/pemeriksaan/',
];

const ANAMNESA_DOM_HINT_SELECTORS = [
  'textarea[name*="keluhan_utama"]',
  'input[name*="keluhan_utama"]',
  'textarea[name*="keluhan_tambahan"]',
  'input[name*="keluhan_tambahan"]',
  '[name*="anamnesa["]',
  '[name*="periksafisik["]',
  '[name*="malergipasien["]',
  '[name*="mriwayatpasien["]',
].join(', ');

function normalizeUrl(url: string | null | undefined): string {
  return (url || '').trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExplicitRoute(url: string, aliases: string[]): boolean {
  return aliases.some(
    (alias) =>
      url.includes(`/${alias}/`) ||
      url.includes(`/${alias}?`) ||
      url.endsWith(`/${alias}`) ||
      url.includes(`${alias}=`) ||
      url.includes(alias)
  );
}

export function isStepUrl(url: string, step: RMETransferStepStatus): boolean {
  return hasExplicitRoute(normalizeUrl(url), STEP_URL_ALIASES[step]);
}

export function hasAnamnesaDomHints(root: ParentNode): boolean {
  return (
    typeof root.querySelector === 'function' &&
    Boolean(root.querySelector(ANAMNESA_DOM_HINT_SELECTORS))
  );
}

export function detectEpuskesmasPageType(
  url: string,
  root?: ParentNode | null
): DetectedEpuskesmasPage {
  const normalized = normalizeUrl(url);

  if (
    normalized.includes('/resep/') ||
    normalized.includes('/resep?') ||
    normalized.endsWith('/resep') ||
    normalized.includes('/terapi/') ||
    normalized.includes('/obat/') ||
    normalized.includes('prescription')
  ) {
    return 'resep';
  }

  if (
    normalized.includes('/diagnosa/') ||
    normalized.includes('/diagnosa?') ||
    normalized.endsWith('/diagnosa') ||
    normalized.includes('/diagnosis/') ||
    normalized.includes('/diagnosis?') ||
    normalized.endsWith('/diagnosis') ||
    normalized.includes('/icd10/') ||
    normalized.includes('/icd-10/')
  ) {
    return 'diagnosa';
  }

  if (
    normalized.includes('/soap/') ||
    normalized.includes('/soap?') ||
    normalized.endsWith('/soap') ||
    normalized.includes('subjektif')
  ) {
    return 'soap';
  }

  if (
    normalized.includes('/anamnesa/') ||
    normalized.includes('/anamnesa?') ||
    normalized.endsWith('/anamnesa') ||
    normalized.includes('anamnesis') ||
    normalized.includes('/anamnesis/')
  ) {
    return 'anamnesa';
  }

  if (GENERIC_ANAMNESA_ROUTE_MARKERS.some((marker) => normalized.includes(marker))) {
    return root && hasAnamnesaDomHints(root) ? 'anamnesa' : null;
  }

  return null;
}

function isEpuskesmasUrl(url: string): boolean {
  return url.includes('epuskesmas.id');
}

function isGenericPemeriksaanRoute(url: string): boolean {
  return url.includes('/pemeriksaan/');
}

function urlMatchesEncounter(url: string, encounterId: string | undefined): boolean {
  if (!encounterId) return false;
  const pattern = new RegExp(`(?:/|=)${escapeRegExp(encounterId)}(?:/|\\?|&|$)`);
  return pattern.test(url);
}

export function selectBestTransferTab(
  candidates: TransferTabCandidate[],
  options: {
    encounterId?: string;
    step?: RMETransferStepStatus;
  } = {}
): number | undefined {
  const ranked = candidates
    .filter(
      (candidate): candidate is TransferTabCandidate & { id: number } =>
        typeof candidate.id === 'number'
    )
    .map((candidate) => {
      const url = normalizeUrl(candidate.url);
      const isEpuskesmas = isEpuskesmasUrl(url);

      let score = 0;
      if (isEpuskesmas) score += 100;
      if (candidate.active && isEpuskesmas) score += 40;
      if (urlMatchesEncounter(url, options.encounterId)) score += 80;
      if (options.step && isStepUrl(url, options.step)) score += 50;
      if (options.step === 'anamnesa' && isGenericPemeriksaanRoute(url)) score -= 30;

      return {
        id: candidate.id,
        score,
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  return best && best.score > 0 ? best.id : undefined;
}

/**
 * The tab a dashboard bridge entry may fill: an ePuskesmas tab whose URL carries the entry's
 * pelayanan id, the step's page first. Unlike `selectBestTransferTab` there is no fallback to
 * another tab, so a bridge entry never lands in another patient's record.
 */
export function selectBridgeTransferTab(
  candidates: TransferTabCandidate[],
  options: {
    pelayananId: string;
    step?: RMETransferStepStatus;
  }
): number | undefined {
  const pelayananId = options.pelayananId.trim();
  if (!pelayananId) return undefined;

  const matching = candidates.filter((candidate) => {
    const url = normalizeUrl(candidate.url);
    return isEpuskesmasUrl(url) && urlMatchesEncounter(url, pelayananId.toLowerCase());
  });
  return selectBestTransferTab(matching, {
    encounterId: pelayananId.toLowerCase(),
    step: options.step,
  });
}

/** The pelayanan id in an ePuskesmas URL path (`/anamnesa/create/83206?from=pelayanan`), or null. */
export function pelayananIdFromUrl(url: string): string | null {
  const match = url.match(/\/(\d+)(?:[/?#]|$)/);
  return match ? match[1] : null;
}

/**
 * An encounter id that names an ePuskesmas pelayanan (the digits from its URL). An id the
 * background generated (`alpha-v3-<ts>`) names none and binds to no tab.
 */
export function boundPelayananId(encounterId: string | undefined): string | undefined {
  const id = encounterId?.trim();
  return id && /^\d+$/.test(id) ? id : undefined;
}

/**
 * The tab the side panel's transfer may fill. With an encounter, only its pelayanan's ePuskesmas
 * tab, as for a bridge entry, so another patient's active tab is never filled (audit 2026-10-06).
 * Without one, the best-scoring tab, then the active tab, as before.
 */
export function selectPanelTransferTab(
  candidates: TransferTabCandidate[],
  options: { encounterId?: string; step?: RMETransferStepStatus; activeTabId?: number }
): number | undefined {
  const pelayananId = boundPelayananId(options.encounterId);
  if (pelayananId) {
    return selectBridgeTransferTab(candidates, { pelayananId, step: options.step });
  }
  return selectBestTransferTab(candidates, { step: options.step }) ?? options.activeTabId;
}
