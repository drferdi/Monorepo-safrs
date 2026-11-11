'use client'

import type { DashboardOperationalMetrics } from '@abyss/types'
import { useEffect, useState } from 'react'

interface ApiMetricsResponse {
  success: boolean
  data: DashboardOperationalMetrics
}

export function getOperationalMetricsErrorMessage(status?: number): string {
  if (status === 403) {
    return 'Ringkasan operasional hanya tersedia untuk role manajemen.'
  }

  if (status === 401) {
    return 'Sesi berakhir. Silakan login kembali untuk memuat ringkasan operasional.'
  }

  return 'Gagal memuat ringkasan operasional'
}

export interface OperationalMetricsState {
  metrics: DashboardOperationalMetrics | null
  isLoading: boolean
  error: string | null
}

export function extractOperationalMetrics(payload: unknown): DashboardOperationalMetrics | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const raw = payload as Partial<ApiMetricsResponse>
  if (raw.success !== true || !raw.data || typeof raw.data !== 'object') {
    return null
  }

  return raw.data
}

export function useOperationalMetrics(): OperationalMetricsState {
  const [state, setState] = useState<OperationalMetricsState>({
    metrics: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchMetrics(): Promise<void> {
      try {
        const response = await fetch('/api/dashboard/intelligence/metrics')
        if (!response.ok) {
          throw new Error(String(response.status))
        }

        const json = (await response.json()) as ApiMetricsResponse
        const metrics = extractOperationalMetrics(json)
        if (!metrics) {
          throw new Error('Operational metrics payload invalid')
        }

        if (!cancelled) {
          setState({
            metrics,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        const status = Number(error instanceof Error ? Number(error.message) : Number.NaN)
        if (!cancelled) {
          setState({
            metrics: null,
            isLoading: false,
            error: getOperationalMetricsErrorMessage(Number.isFinite(status) ? status : undefined),
          })
        }
      }
    }

    void fetchMetrics()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
