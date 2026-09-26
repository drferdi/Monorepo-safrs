
/**
 * In-memory tracker for unique users who logged in today.
 * Resets daily or on server restart.
 */
const usersLoggedInToday = new Set<string>()
let todayDate = new Date().toDateString()

/**
 * Reset daily tracking if date changed
 */
function resetDailyTrackingIfNeeded(): void {
  const currentDate = new Date().toDateString()
  if (currentDate !== todayDate) {
    usersLoggedInToday.clear()
    todayDate = currentDate
  }
}

/**
 * Track a user login for today
 */
export function trackUserLoginToday(username: string): void {
  resetDailyTrackingIfNeeded()
  usersLoggedInToday.add(username)
}

/**
 * Get count of unique users logged in today
 */
export function getOnlineTodayCount(): number {
  resetDailyTrackingIfNeeded()
  return usersLoggedInToday.size
}

/**
 * Reset tracking (useful for testing or manual reset)
 */
export function resetOnlineTodayTracking(): void {
  usersLoggedInToday.clear()
  todayDate = new Date().toDateString()
}
