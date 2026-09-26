/**
 * @abyss/types — Intelligence Dashboard Types
 * ───────────────────────────────────────────
 * Shared contracts for the Sentra Intelligence Dashboard route,
 * API responses, and realtime event payloads.
 */

import type { ClinicalAlert, IskandarSuggestion } from './clinical'

export type DashboardEncounterStatus =
  | 'waiting'
  | 'in_consultation'
  | 'cdss_pending'
  | 'documentation_incomplete'
  | 'completed'

export interface DashboardComplianceIssue {
  code: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface DashboardEklaimReadiness {
  isReady: boolean
  checkedAt: string
  blockers: DashboardComplianceIssue[]
}

export interface DashboardEncounterSummary {
  encounterId: string
  patientLabel: string
  status: DashboardEncounterStatus
  suggestions: IskandarSuggestion[]
  alerts: ClinicalAlert[]
  eklaimReadiness: DashboardEklaimReadiness
  activeComplianceFailures: DashboardComplianceIssue[]
  lastUpdatedAt: string
}

export interface DashboardAlertFeed {
  encounterId: string
  alert: ClinicalAlert
  emittedAt: string
  acknowledgedAt?: string
}

export interface DashboardOperationalMetrics {
  shiftLabel: string
  totalEncounters: number
  encountersByStatus: Record<DashboardEncounterStatus, number>
  cdssUtilizationRate: number
  eklaimReadinessRate: number
  averageConfidenceScore: number
  overrideCount: number
  overrideRate: number
  generatedAt: string
}
