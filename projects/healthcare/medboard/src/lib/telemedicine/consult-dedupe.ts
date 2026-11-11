// Assist retries a consult once on 503 or a dropped connection with the same event_id.
// Remembering event_id → consultId in memory lets the retry reuse the first consult instead of
// notifying the doctor twice. ConsultLog has no event_id column, and the map is per process.
const CONSULT_EVENT_TTL_MS = 10 * 60 * 1000

const seenConsultEvents = new Map<string, { consultId: string; seenAt: number }>()

/** Returns the earlier consultId for a repeated event_id, or null after recording a new one. */
export function claimConsultEvent(eventId: string, consultId: string, now = Date.now()): string | null {
  for (const [id, seen] of seenConsultEvents) {
    if (now - seen.seenAt > CONSULT_EVENT_TTL_MS) seenConsultEvents.delete(id)
  }

  const earlier = seenConsultEvents.get(eventId)
  if (earlier) return earlier.consultId

  seenConsultEvents.set(eventId, { consultId, seenAt: now })
  return null
}

/** Forgets an event_id whose consult failed, so a retry is processed instead of answered. */
export function releaseConsultEvent(eventId: string): void {
  seenConsultEvents.delete(eventId)
}
