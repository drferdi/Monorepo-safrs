import { browser } from 'wxt/browser';

import type { DailyServiceReport } from './types';

const DAILY_REPORT_CACHE_KEY = 'sentra:statistic:daily';
const KEPT_DAYS = 31;

type DailyReportStore = Record<string, DailyServiceReport>;

async function readStore(): Promise<DailyReportStore> {
  const raw = (await browser.storage.local.get(DAILY_REPORT_CACHE_KEY)) as Record<string, unknown>;
  return (raw?.[DAILY_REPORT_CACHE_KEY] as DailyReportStore | undefined) ?? {};
}

/** Stores a day's identity-free rows, replacing a reloaded day; only the latest 31 days stay. */
export async function saveDailyReport(report: DailyServiceReport): Promise<void> {
  const store = { ...(await readStore()), [report.date]: report };
  const kept = Object.keys(store).sort().slice(-KEPT_DAYS);
  await browser.storage.local.set({
    [DAILY_REPORT_CACHE_KEY]: Object.fromEntries(kept.map((date) => [date, store[date]])),
  });
}

export async function readDailyReport(date: string): Promise<DailyServiceReport | null> {
  return (await readStore())[date] ?? null;
}

/** The latest stored day before `date`, for the day-to-day change. */
export async function readPreviousDailyReport(date: string): Promise<DailyServiceReport | null> {
  const store = await readStore();
  const previous = Object.keys(store)
    .filter((stored) => stored < date)
    .sort()
    .pop();
  return previous ? store[previous] : null;
}
