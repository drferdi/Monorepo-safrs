
/**
 * Track dashboard and EMR clinical usage per hour today.
 * Resets daily or on server restart.
 */

interface HourlyUsage {
  hour: number // 0-23
  dashboardUsers: Set<string>
  emrClinicalUsers: Set<string>
}

const todayUsage: Map<number, HourlyUsage> = new Map()
let todayDate = new Date().toDateString()

/**
 * Reset daily tracking if date changed
 */
function resetDailyTrackingIfNeeded(): void {
  const currentDate = new Date().toDateString()
  if (currentDate !== todayDate) {
    todayUsage.clear()
    todayDate = currentDate
  }
}

/**
 * Get current hour (0-23)
 */
function getCurrentHour(): number {
  return new Date().getHours()
}

/**
 * Track dashboard usage
 */
export function trackDashboardUsage(username: string): void {
  resetDailyTrackingIfNeeded()
  const hour = getCurrentHour()
  if (!todayUsage.has(hour)) {
    todayUsage.set(hour, {
      hour,
      dashboardUsers: new Set(),
      emrClinicalUsers: new Set(),
    })
  }
  todayUsage.get(hour)!.dashboardUsers.add(username)
}

/**
 * Track EMR Clinical usage
 */
export function trackEMRClinicalUsage(username: string): void {
  resetDailyTrackingIfNeeded()
  const hour = getCurrentHour()
  if (!todayUsage.has(hour)) {
    todayUsage.set(hour, {
      hour,
      dashboardUsers: new Set(),
      emrClinicalUsers: new Set(),
    })
  }
  todayUsage.get(hour)!.emrClinicalUsers.add(username)
}

/**
 * Get hourly usage data for today (for chart)
 */
export function getTodayUsageData(): {
  hours: string[]
  dashboardCounts: number[]
  emrClinicalCounts: number[]
} {
  resetDailyTrackingIfNeeded()

  const hours: string[] = []
  const dashboardCounts: number[] = []
  const emrClinicalCounts: number[] = []

  // Get all hours from 0 to current hour
  const currentHour = getCurrentHour()
  for (let h = 0; h <= currentHour; h++) {
    const usage = todayUsage.get(h)
    hours.push(`${h.toString().padStart(2, '0')}:00`)
    dashboardCounts.push(usage?.dashboardUsers.size || 0)
    emrClinicalCounts.push(usage?.emrClinicalUsers.size || 0)
  }

  return { hours, dashboardCounts, emrClinicalCounts }
}

/**
 * Get total unique users for today
 */
export function getTodayTotals(): {
  dashboardTotal: number
  emrClinicalTotal: number
} {
  resetDailyTrackingIfNeeded()

  const dashboardUsers = new Set<string>()
  const emrClinicalUsers = new Set<string>()

  for (const usage of todayUsage.values()) {
    usage.dashboardUsers.forEach(u => dashboardUsers.add(u))
    usage.emrClinicalUsers.forEach(u => emrClinicalUsers.add(u))
  }

  return {
    dashboardTotal: dashboardUsers.size,
    emrClinicalTotal: emrClinicalUsers.size,
  }
}

/**
 * Get recent logins (unique users who logged in today)
 */
export function getRecentLogins(): string[] {
  resetDailyTrackingIfNeeded()

  const allUsers = new Set<string>()
  for (const usage of todayUsage.values()) {
    usage.dashboardUsers.forEach(u => allUsers.add(u))
    usage.emrClinicalUsers.forEach(u => allUsers.add(u))
  }

  return Array.from(allUsers)
}

/**
 * Get top users (users with most activity today)
 */
export function getTopUsers(limit: number = 10): Array<{
  username: string
  dashboardCount: number
  emrClinicalCount: number
  totalActivity: number
}> {
  resetDailyTrackingIfNeeded()

  const userActivity = new Map<string, { dashboardCount: number; emrClinicalCount: number }>()

  for (const usage of todayUsage.values()) {
    usage.dashboardUsers.forEach(u => {
      const current = userActivity.get(u) || { dashboardCount: 0, emrClinicalCount: 0 }
      current.dashboardCount++
      userActivity.set(u, current)
    })

    usage.emrClinicalUsers.forEach(u => {
      const current = userActivity.get(u) || { dashboardCount: 0, emrClinicalCount: 0 }
      current.emrClinicalCount++
      userActivity.set(u, current)
    })
  }

  return Array.from(userActivity.entries())
    .map(([username, counts]) => ({
      username,
      ...counts,
      totalActivity: counts.dashboardCount + counts.emrClinicalCount,
    }))
    .sort((a, b) => b.totalActivity - a.totalActivity)
    .slice(0, limit)
}

/**
 * Reset tracking (useful for testing or manual reset)
 */
export function resetUsageTracking(): void {
  todayUsage.clear()
  todayDate = new Date().toDateString()
}
