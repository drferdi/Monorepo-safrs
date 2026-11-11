'use client'

import { useCallback, useEffect, useState } from 'react'
import type { IntelligenceEventPayload, IntelligenceSocketState } from '@/lib/intelligence/types'

export interface CriticalAlertBannerState {
  activeAlert: IntelligenceEventPayload | null
  isAcknowledged: boolean
  acknowledgedAt: string | null
  handleAcknowledge: () => void
}

/**
 * Manages Clinical Safety Alert state + single-click acknowledgment.
 * Audit log dikirim ke /api/dashboard/intelligence/alerts/acknowledge (fire-and-forget).
 */
export function useCriticalAlertBanner(
  socketState: Pick<IntelligenceSocketState, 'lastCriticalAlert'>
): CriticalAlertBannerState {
  const [activeAlert, setActiveAlert] = useState<IntelligenceEventPayload | null>(null)
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null)

  // New alert:critical event → reset acknowledgment, show banner
  useEffect(() => {
    const incoming = socketState.lastCriticalAlert
    if (!incoming) return

    setActiveAlert(incoming)
    setIsAcknowledged(false)
    setAcknowledgedAt(null)
  }, [socketState.lastCriticalAlert])

  const handleAcknowledge = useCallback((): void => {
    if (!activeAlert || isAcknowledged) return

    const now = new Date().toISOString()
    setIsAcknowledged(true)
    setAcknowledgedAt(now)

    // Fire-and-forget audit log — non-blocking, no PHI
    void fetch('/api/dashboard/intelligence/alerts/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encounterId: activeAlert.encounterId,
        alertTimestamp: activeAlert.timestamp,
        acknowledgedAt: now,
      }),
    })
  }, [activeAlert, isAcknowledged])

  return { activeAlert, isAcknowledged, acknowledgedAt, handleAcknowledge }
}
