// Designed and constructed by Drferdi.
/**
 * Triage Zone Verdict — ranks buildAlerts() output into one MERAH/KUNING/HIJAU
 * verdict, without changing, skipping, or re-running any gate.
 *
 * See docs/specs/2026-07-06-triage-zone-verdict-design.md for the full design.
 *
 * @module lib/emergency-detector/triage-verdict
 */

export type TriageZone = 'standby' | 'hijau' | 'kuning' | 'merah';

/** Matches the existing ScreeningAlert interface in TTVInferenceUI.tsx. */
export interface TriageAlertLike {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'warning';
  gate: string;
}

export interface TriageVerdict<T extends TriageAlertLike> {
  zone: TriageZone;
  headlineAlert: T | null;
  sortedAlerts: T[];
}

const SEVERITY_RANK: Record<TriageAlertLike['severity'], number> = {
  critical: 0,
  high: 1,
  warning: 2,
};

/**
 * Same-tier tiebreak order only — NOT a primary sort key. Reflects Chief's
 * proposed ABCDE-style check order, corrected to put glucose ahead of
 * hemodynamic/shock (hypoglycemia can mimic shock — see
 * occult-shock-detector.ts's integratedTTVWorkflow()).
 */
const TRIAGE_GATE_PRIORITY_GROUPS: readonly (readonly string[])[] = [
  ['GATE_CODE_RED'],
  ['GATE_0_AVPU'],
  ['GATE_3_GLUCOSE'],
  ['GATE_1_HEMODYNAMIC', 'GATE_1B_GERIATRIC_ORTHOSTATIC', 'GATE_SHOCK_INDEX'],
  ['GATE_2_BP'],
  ['GATE_SEPSIS_EARLY', 'GATE_SEPTIC_SHOCK_HIGH'],
  ['GATE_4_RESPIRATORY', 'GATE_RESP_FAILURE', 'GATE_RESP_ASTHMA_COPD'],
  ['GATE_5_CIRCULATION', 'GATE_5B_CIRCULATION_LOW'],
  ['GATE_6_RESP_RATE', 'GATE_6B_RESP_RATE_LOW'],
  ['GATE_7_TEMPERATURE', 'GATE_7B_GERIATRIC_AFEBRILE'],
  [
    'GATE_STROKE',
    'GATE_ACS',
    'GATE_ANAPHYLAXIS',
    'GATE_DKA_HHS',
    'GATE_PE_SUSPECT',
    'GATE_ANEMIA_BLEED_CHRONIC',
  ],
  ['GATE_PAIN', 'GATE_PREGNANCY_BP', 'GATE_PATIENT_CONTEXT'],
];

const GATE_PRIORITY_INDEX: Record<string, number> = {};
TRIAGE_GATE_PRIORITY_GROUPS.forEach((group, index) => {
  group.forEach((gate) => {
    GATE_PRIORITY_INDEX[gate] = index;
  });
});

/** Unrecognized gate strings sort last within their severity tier — never throws. */
const UNKNOWN_GATE_PRIORITY = TRIAGE_GATE_PRIORITY_GROUPS.length;

function gatePriority(gate: string): number {
  return GATE_PRIORITY_INDEX[gate] ?? UNKNOWN_GATE_PRIORITY;
}

/**
 * Ranks alerts already produced by buildAlerts() into one triage verdict.
 *
 * Zone before any vital is entered is always 'standby', never 'hijau' — a
 * green "cleared" indicator on unassessed data is unsafe.
 */
export function computeTriageVerdict<T extends TriageAlertLike>(
  alerts: T[],
  hasVitalsEntered: boolean
): TriageVerdict<T> {
  if (!hasVitalsEntered) {
    return { zone: 'standby', headlineAlert: null, sortedAlerts: [] };
  }

  const sortedAlerts = alerts
    .map((alert, index) => ({ alert, index }))
    .sort((a, b) => {
      const severityDiff = SEVERITY_RANK[a.alert.severity] - SEVERITY_RANK[b.alert.severity];
      if (severityDiff !== 0) return severityDiff;
      const priorityDiff = gatePriority(a.alert.gate) - gatePriority(b.alert.gate);
      if (priorityDiff !== 0) return priorityDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.alert);

  const hasCritical = sortedAlerts.some((alert) => alert.severity === 'critical');
  const hasHighOrWarning = sortedAlerts.some(
    (alert) => alert.severity === 'high' || alert.severity === 'warning'
  );

  const zone: TriageZone = hasCritical ? 'merah' : hasHighOrWarning ? 'kuning' : 'hijau';

  return {
    zone,
    headlineAlert: sortedAlerts[0] ?? null,
    sortedAlerts,
  };
}
