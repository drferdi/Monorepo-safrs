// Drferdi — useTrajectoryAnalysis Hook
/**
 * useTrajectoryAnalysis
 *
 * TanStack Query hook that fetches CME trajectory analysis for a patient
 * from GET /api/patients/[id]/trajectory.
 *
 * Usage:
 *   const { data, isLoading, error } = useTrajectoryAnalysis(patientIdentifier)
 *
 * @param patientIdentifier - 64-char hex SHA-256 hash (from buildPatientIdentifierHash)
 * @param visitCount        - Number of visits to analyze (default 5, max 10)
 */

'use client'

import { useEffect, useState } from 'react'

import type { ClinicalTrajectoryV1 } from '@/types/abyss/clinical-trajectory'
import type { TrajectoryAnalysis, VitalSnapshot, MomentumSnapshot } from '@/types/abyss/trajectory'

export type TrajectoryApiSuccessResponse = {
  success: true
  data: TrajectoryAnalysis
  visit_history?: VitalSnapshot[]
  momentum_history?: MomentumSnapshot[]
  clinicalTrajectory?: ClinicalTrajectoryV1 | null
  meta?: {
    patientIdentifier: string
    visitCount: number
    analyzedAt: string
  }
}

export type TrajectoryApiErrorResponse = {
  success: false
  error?: string
}

export type TrajectoryApiResponse = TrajectoryApiSuccessResponse | TrajectoryApiErrorResponse

type UseTrajectoryAnalysisResult = {
  data: TrajectoryAnalysis | undefined
  visitHistory: VitalSnapshot[]
  momentumHistory: MomentumSnapshot[]
  clinicalTrajectory: ClinicalTrajectoryV1 | null
  isLoading: boolean
  error: Error | null
}

export function normalizeTrajectoryApiResponse(json: TrajectoryApiResponse): {
  data: TrajectoryAnalysis
  visitHistory: VitalSnapshot[]
  momentumHistory: MomentumSnapshot[]
  clinicalTrajectory: ClinicalTrajectoryV1 | null
} {
  if (!json.success) {
    throw new Error(json.error ?? 'Trajectory analysis unavailable')
  }

  if (!json.data) {
    throw new Error('Trajectory analysis unavailable')
  }

  return {
    data: json.data,
    visitHistory: json.visit_history ?? [],
    momentumHistory: json.momentum_history ?? [],
    clinicalTrajectory: json.clinicalTrajectory ?? null,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTrajectoryAnalysis(
  patientIdentifier: string | null | undefined,
  visitCount = 5
): UseTrajectoryAnalysisResult {
  const [data, setData] = useState<TrajectoryAnalysis | undefined>(undefined)
  const [visitHistory, setVisitHistory] = useState<VitalSnapshot[]>([])
  const [momentumHistory, setMomentumHistory] = useState<MomentumSnapshot[]>([])
  const [clinicalTrajectory, setClinicalTrajectory] = useState<ClinicalTrajectoryV1 | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const isEnabled = !!patientIdentifier && /^[0-9a-f]{64}$/.test(patientIdentifier)
    if (!isEnabled) {
      setData(undefined)
      setClinicalTrajectory(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        setIsLoading(true)
        setError(null)
        const visits = Math.min(Math.max(1, visitCount), 10)
        const res = await fetch(`/api/patients/${patientIdentifier}/trajectory?visits=${visits}`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(
            (body as { error?: string }).error ?? `Trajectory fetch failed (${res.status})`
          )
        }

        const json = (await res.json()) as TrajectoryApiResponse
        const normalized = normalizeTrajectoryApiResponse(json)

        setData(normalized.data)
        setVisitHistory(normalized.visitHistory)
        setMomentumHistory(normalized.momentumHistory)
        setClinicalTrajectory(normalized.clinicalTrajectory)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setData(undefined)
        setClinicalTrajectory(null)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [patientIdentifier, visitCount])

  return { data, visitHistory, momentumHistory, clinicalTrajectory, isLoading, error }
}
