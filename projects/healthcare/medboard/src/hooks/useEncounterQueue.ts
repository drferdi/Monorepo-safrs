'use client'

import type { DashboardEncounterSummary } from '@abyss/types'
import { useEffect, useState } from 'react'
import type { IntelligenceEventStatus } from '@/lib/intelligence/socket-payload'
import type { IntelligenceSocketState } from '@/lib/intelligence/types'

export interface EncounterQueueItem {
  encounterId: string
  patientLabel: string // PHI-safe label — bukan nama pasien
  status: IntelligenceEventStatus
  note: string
  timestamp: string
}

interface ApiEncountersResponse {
  success: boolean
  data: DashboardEncounterSummary[]
}

export function getEncounterQueueErrorMessage(status?: number): string {
  if (status === 403) {
    return 'Akses antrian intelligence dibatasi untuk role saat ini.'
  }

  if (status === 401) {
    return 'Sesi berakhir. Silakan login kembali untuk memuat antrian intelligence.'
  }

  return 'Gagal memuat antrian'
}

export interface EncounterQueueState {
  encounters: EncounterQueueItem[]
  isLoading: boolean
  error: string | null
  /** True when socket is disconnected and displayed data may be stale. */
  isStale: boolean
  /** Call to re-fetch encounter data after a fetch failure. */
  retry: () => void
}

const STATUS_SORT_ORDER: Record<IntelligenceEventStatus, number> = {
  in_consultation: 0,
  cdss_pending: 1,
  documentation_incomplete: 2,
  waiting: 3,
  completed: 4,
}

function sortEncounters(items: EncounterQueueItem[]): EncounterQueueItem[] {
  return [...items].sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status])
}

export function mergeEncounterUpdate(
  current: EncounterQueueItem[],
  updated: EncounterQueueItem
): EncounterQueueItem[] {
  const exists = current.some(e => e.encounterId === updated.encounterId)
  const merged = exists
    ? current.map(e =>
        e.encounterId === updated.encounterId
          ? {
              ...e,
              ...updated,
              patientLabel:
                updated.patientLabel === 'Pasien' ? e.patientLabel : updated.patientLabel,
              note: updated.note || e.note,
            }
          : e
      )
    : [...current, updated]
  return sortEncounters(merged)
}

export function extractEncounterQueueData(payload: unknown): EncounterQueueItem[] | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const raw = payload as Partial<ApiEncountersResponse>
  if (raw.success !== true || Array.isArray(raw.data) === false) {
    return null
  }

  return raw.data.map(summary => ({
    encounterId: summary.encounterId,
    patientLabel: summary.patientLabel,
    status: summary.status,
    note:
      summary.activeComplianceFailures[0]?.message ??
      summary.eklaimReadiness.blockers[0]?.message ??
      '',
    timestamp: summary.lastUpdatedAt,
  }))
}

/**
 * Fetch patient queue dari API + live update via Socket.IO encounter:updated.
 * @param socketState - state dari useIntelligenceSocket (needs lastEncounterUpdate + isConnected)
 */
export function useEncounterQueue(
  socketState: Pick<IntelligenceSocketState, 'lastEncounterUpdate' | 'isConnected'>
): EncounterQueueState {
  const [encounters, setEncounters] = useState<EncounterQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  // Increment to trigger a re-fetch (retry pattern).
  const [retryToken, setRetryToken] = useState(0)

  function retry(): void {
    setIsLoading(true)
    setError(null)
    setRetryToken(n => n + 1)
  }

  // Initial fetch + retry
  useEffect(() => {
    let cancelled = false

    async function fetchEncounters(): Promise<void> {
      try {
        const res = await fetch('/api/dashboard/intelligence/encounters')
        if (!res.ok) throw new Error(String(res.status))
        const json: ApiEncountersResponse = (await res.json()) as ApiEncountersResponse
        const data = extractEncounterQueueData(json)
        if (!cancelled && data) {
          setEncounters(sortEncounters(data))
          setIsLoading(false)
          setError(null)
          return
        }

        throw new Error('Encounter queue payload invalid')
      } catch (error) {
        const status = Number(error instanceof Error ? Number(error.message) : Number.NaN)
        if (!cancelled) {
          setIsLoading(false)
          setError(getEncounterQueueErrorMessage(Number.isFinite(status) ? status : undefined))
        }
      }
    }

    void fetchEncounters()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // intentional: hanya re-fetch saat retry dipicu, bukan saat fetchEncounters reference berubah
  }, [retryToken])

  // Merge socket live update
  useEffect(() => {
    const update = socketState.lastEncounterUpdate
    if (!update) return

    const data = update.data
    const item: EncounterQueueItem = {
      encounterId: update.encounterId,
      patientLabel: typeof data?.patientLabel === 'string' ? data.patientLabel : 'Pasien',
      status: update.status,
      note: typeof data?.note === 'string' ? data.note : '',
      timestamp: update.timestamp,
    }

    setEncounters(prev => mergeEncounterUpdate(prev, item))
  }, [socketState.lastEncounterUpdate])

  // Track socket staleness: mark stale when disconnected and data is loaded.
  useEffect(() => {
    setIsStale(!socketState.isConnected && (!isLoading || encounters.length > 0))
  }, [socketState.isConnected, isLoading, encounters.length])

  return { encounters, isLoading, error, isStale, retry }
}
