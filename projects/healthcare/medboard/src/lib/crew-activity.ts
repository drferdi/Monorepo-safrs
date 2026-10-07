// Active hours (Chief 2026-10-07): the dashboard beats once a minute while the tab is visible
// and the user gave input in the last five minutes. The server credits at most 60 s per beat
// and ignores beats closer than 50 s, so extra tabs never add time.
import { wibDayKey } from '@/lib/report/clinical-activity'

export const FIRST_BEAT_SECONDS = 60
export const BEAT_INTERVAL_MS = 60_000
export const IDLE_AFTER_MS = 5 * 60_000
const MIN_GAP_MS = 50_000
const MAX_CREDIT_MS = 60_000

export function activityDayKey(now: Date): string {
  return wibDayKey(now)
}

export function creditForBeat(lastBeatAt: Date, now: Date): number | null {
  const gap = now.getTime() - lastBeatAt.getTime()
  if (gap < MIN_GAP_MS) return null
  return Math.floor(Math.min(gap, MAX_CREDIT_MS) / 1000)
}

export function shouldSendBeat(args: { visible: boolean; lastInputAt: number; now: number }): boolean {
  return args.visible && args.now - args.lastInputAt <= IDLE_AFTER_MS
}
