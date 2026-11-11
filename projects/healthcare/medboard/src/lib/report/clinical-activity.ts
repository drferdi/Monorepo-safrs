// Daily clinical-report counts for the profile heatmap (Chief 2026-10-07): one entry per WIB
// day, oldest to newest, starting on a Sunday 52 weeks before today, so each column is a week.

export interface ActivityDay {
  date: string
  count: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

// Asia/Jakarta has no daylight saving, so a fixed +7 h gives the WIB calendar day.
export function wibDayKey(instant: Date): string {
  return new Date(instant.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

function firstGridDay(today: Date): Date {
  const start = new Date(`${wibDayKey(today)}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - 52 * 7)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  return start
}

export function activitySince(today: Date): Date {
  return new Date(firstGridDay(today).getTime() - WIB_OFFSET_MS)
}

export function buildActivityDays(createdAts: Date[], today: Date): ActivityDay[] {
  const counts = new Map<string, number>()
  for (const createdAt of createdAts) {
    const key = wibDayKey(createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const last = wibDayKey(today)
  const days: ActivityDay[] = []
  for (let day = firstGridDay(today); ; day = new Date(day.getTime() + DAY_MS)) {
    const date = day.toISOString().slice(0, 10)
    days.push({ date, count: counts.get(date) ?? 0 })
    if (date === last) return days
  }
}
