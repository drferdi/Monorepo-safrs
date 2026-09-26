import { browser } from 'wxt/browser';

import type { ShiftOverviewSnapshot } from './types';

const SHIFT_OVERVIEW_CACHE_KEY = 'sentra:statistic:shift-overview';

export async function saveShiftOverviewCache(snapshot: ShiftOverviewSnapshot): Promise<void> {
  await browser.storage.local.set({ [SHIFT_OVERVIEW_CACHE_KEY]: snapshot });
}

export async function readShiftOverviewCache(): Promise<ShiftOverviewSnapshot | null> {
  const raw = (await browser.storage.local
    .get(SHIFT_OVERVIEW_CACHE_KEY)
    .catch(() => ({}))) as Record<string, unknown>;
  const snapshot = raw?.[SHIFT_OVERVIEW_CACHE_KEY] as ShiftOverviewSnapshot | undefined;
  return snapshot || null;
}
