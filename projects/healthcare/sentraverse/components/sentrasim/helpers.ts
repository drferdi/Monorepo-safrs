import type { CSSProperties } from 'react'

import type {
  AnomalyTone,
  HeaderTone,
  PlanTone,
  ReasoningTone,
  SimulationBranch,
  SimulationState,
} from '@/components/sentrasim/types'

export const STATUS_TEXT = {
  idle: 'SENTRA / RSIA MELINDA // RM-88492-A // LIVE CASE: IDLE',
  synthesizing: 'SENTRA // RM-88492-A // STRUCTURING CHIEF COMPLAINT...',
  emr: 'SENTRA // RM-88492-A // RETRIEVING HISTORY, ALLERGY, AND COMORBID',
  synced: 'SENTRA // RM-88492-A // TRIAGE CONTEXT VERIFIED',
  lab: 'SENTRA // RM-88492-A // REQUESTING DIAGNOSTIC WORKUP...',
  evidence: 'SENTRA // RM-88492-A // FUSING LAB AND RADIOLOGY EVIDENCE...',
  trajectory: 'SENTRA // RM-88492-A // MONITORING CLINICAL RESPONSE...',
  diagnosis: 'SENTRA // RM-88492-A // RANKING DIFFERENTIAL DIAGNOSES...',
  management: 'SENTRA // RM-88492-A // BUILDING INITIAL MANAGEMENT PLAN...',
  complete: 'SENTRA // RM-88492-A // CASE SIMULATION COMPLETE',
} as const

export type SimulationStatus = (typeof STATUS_TEXT)[keyof typeof STATUS_TEXT]

export const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px)'

export function subscribeDesktopLayout(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(DESKTOP_LAYOUT_QUERY)
  mediaQuery.addEventListener('change', callback)

  return () => {
    mediaQuery.removeEventListener('change', callback)
  }
}

export function getDesktopLayoutSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(DESKTOP_LAYOUT_QUERY).matches
}

export function createInitialSimulationState(branch: SimulationBranch): SimulationState {
  return {
    isRunning: false,
    isComplete: false,
    status: STATUS_TEXT.idle,
    headerTone: 'muted',
    anamnesaText: branch.finalAnamnesaText.split(',')[0] ?? branch.finalAnamnesaText,
    anamnesaTagCount: 0,
    historyPhase: 'idle',
    showVitalsAnomaly: false,
    vitalsTagCount: 0,
    labOpen: false,
    selectedLabCount: 0,
    showLabResults: false,
    labResultCount: 0,
    trajectoryOpen: false,
    showTrajectoryInsight: false,
    showDiagnosis: false,
    diagnosisCount: 0,
    showManagement: false,
    managementCount: 0,
  }
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

export function getHeaderColor(tone: HeaderTone): string {
  return tone === 'accent' ? 'var(--sdx-c-asesmen)' : 'var(--sdx-text-muted)'
}

export function getAnomalyStyles(tone: AnomalyTone): {
  className: string
  dotClassName: string
  dotStyle?: CSSProperties
} {
  if (tone === 'critical') {
    return {
      className: 'text-red-500',
      dotClassName: 'bg-red-500',
      dotStyle: { boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' },
    }
  }

  if (tone === 'warning') {
    return {
      className: 'text-[var(--sentra-warning)]',
      dotClassName: '',
      dotStyle: { background: 'var(--sentra-warning)', boxShadow: '0 0 8px var(--sdx-c-asesmen)' },
    }
  }

  return {
    className: 'text-foreground',
    dotClassName: 'bg-foreground',
  }
}

export function getReasoningToneStyles(tone: ReasoningTone): string {
  if (tone === 'primary') {
    return 'border-accent/30 bg-transparent'
  }

  if (tone === 'warning') {
    return 'border-[var(--sentra-warning-soft)] bg-transparent'
  }

  return 'border-muted/20 bg-transparent'
}

export function getManagementToneStyles(tone: PlanTone): string {
  if (tone === 'urgent') {
    return 'border-red-500/25 bg-transparent'
  }

  if (tone === 'primary') {
    return 'border-accent/30 bg-transparent'
  }

  return 'border-muted/20 bg-transparent'
}
