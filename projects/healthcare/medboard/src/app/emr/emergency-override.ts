export type EmrViewPhase = 'row1' | 'row2' | 'row3' | null
export type EmrWorkflowTab = 'triage' | 'review' | 'assessment' | 'finalize'
export type EmrPhaseId = Exclude<EmrViewPhase, null>

export interface EmergencyOverrideFlag {
  severity?: string
  condition?: string
  title?: string
  action?: string
}

export interface EmergencyOverrideScreeningAlert {
  severity?: string
  title?: string
  recommendations?: readonly string[]
}

export interface EmergencyOverrideCompositeAlert {
  severity?: string
  title?: string
  summary?: string
  recommendedActions?: readonly string[]
}

export interface EmergencyOverrideSources {
  cdssRedFlags?: readonly EmergencyOverrideFlag[]
  screeningAlerts?: readonly EmergencyOverrideScreeningAlert[]
  compositeDeterioration?: {
    compositeAlerts?: readonly EmergencyOverrideCompositeAlert[]
  } | null
}

export interface EmergencyOverrideInput {
  activeViewPhase: EmrViewPhase
  emergencyAcknowledged: boolean
  emergencyFlags: readonly EmergencyOverrideFlag[]
}

export interface EmergencyOverrideState {
  emergencyActive: boolean
  overrideActive: boolean
  requiresEmergencyAck: boolean
  canClearEmergencyOverride: boolean
  forcedActiveViewPhase: EmrViewPhase
  requiredWorkflowTab: EmrWorkflowTab | null
  phaseClassNames: Record<EmrPhaseId, string>
  emergencyReasonLabels: string[]
}

const PHASES: EmrPhaseId[] = ['row1', 'row2', 'row3']

function isEmergencyFlag(flag: EmergencyOverrideFlag): boolean {
  return flag.severity === undefined || flag.severity === 'emergency'
}

function getPhaseClassName(phase: EmrPhaseId, activeViewPhase: EmrViewPhase): string {
  if (activeViewPhase === phase) return 'emr-phase is-active'
  if (activeViewPhase !== null) return 'emr-phase is-dimmed'
  return 'emr-phase'
}

function dedupeLabels(flags: readonly EmergencyOverrideFlag[]): string[] {
  const labels = new Set<string>()

  flags.forEach((flag) => {
    const label = (flag.condition ?? flag.title ?? flag.action ?? '').trim()
    if (label) labels.add(label)
  })

  return [...labels]
}

export function buildEmergencyOverrideFlags(
  sources: EmergencyOverrideSources
): EmergencyOverrideFlag[] {
  const cdssFlags = (sources.cdssRedFlags ?? []).filter(isEmergencyFlag)
  const screeningFlags = (sources.screeningAlerts ?? [])
    .filter((alert) => alert.severity === 'critical')
    .map<EmergencyOverrideFlag>((alert) => ({
      severity: 'emergency',
      condition: alert.title,
      title: alert.title,
      action: alert.recommendations?.[0],
    }))
  const compositeFlags = (sources.compositeDeterioration?.compositeAlerts ?? [])
    .filter((alert) => alert.severity === 'critical')
    .map<EmergencyOverrideFlag>((alert) => ({
      severity: 'emergency',
      condition: alert.title,
      title: alert.title,
      action: alert.recommendedActions?.[0] ?? alert.summary,
    }))

  return [...cdssFlags, ...screeningFlags, ...compositeFlags]
}

export function deriveEmergencyOverrideState(
  input: EmergencyOverrideInput
): EmergencyOverrideState {
  const emergencyFlags = input.emergencyFlags.filter(isEmergencyFlag)
  const emergencyActive = emergencyFlags.length > 0
  const overrideActive = emergencyActive && !input.emergencyAcknowledged
  const forcedActiveViewPhase = overrideActive ? 'row1' : input.activeViewPhase

  const phaseClassNames = PHASES.reduce<Record<EmrPhaseId, string>>(
    (classes, phase) => {
      if (overrideActive) {
        classes[phase] =
          phase === 'row1' ? 'emr-phase is-active is-emergency-active' : 'emr-phase is-emergency-dimmed'
        return classes
      }

      classes[phase] = getPhaseClassName(phase, forcedActiveViewPhase)
      return classes
    },
    { row1: 'emr-phase', row2: 'emr-phase', row3: 'emr-phase' }
  )

  return {
    emergencyActive,
    overrideActive,
    requiresEmergencyAck: overrideActive,
    canClearEmergencyOverride: !overrideActive,
    forcedActiveViewPhase,
    requiredWorkflowTab: overrideActive ? 'triage' : null,
    phaseClassNames,
    emergencyReasonLabels: dedupeLabels(emergencyFlags),
  }
}
