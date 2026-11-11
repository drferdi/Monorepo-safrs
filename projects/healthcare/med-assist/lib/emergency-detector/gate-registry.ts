// Designed and constructed by Drferdi.
/**
 * Clinical GATE Registry — 11 new clinical decision gates (v2).
 *
 * These are OUTPUT LABELS on pattern matches, not separate detector functions.
 * Existing gates (GATE_0_AVPU through GATE_7_TEMPERATURE) remain untouched
 * in TTVInferenceUI.tsx buildAlerts().
 *
 * Source: docs/specs/assist-gate 2-detect-trigger-action.md
 * @module lib/emergency-detector/gate-registry
 */

export const CLINICAL_GATE = {
  SEPSIS_EARLY: 'GATE_SEPSIS_EARLY',
  SEPTIC_SHOCK: 'GATE_SEPTIC_SHOCK_HIGH',
  SHOCK_INDEX: 'GATE_SHOCK_INDEX',
  RESP_FAILURE: 'GATE_RESP_FAILURE',
  PE_SUSPECT: 'GATE_PE_SUSPECT',
  ACS: 'GATE_ACS',
  STROKE: 'GATE_STROKE',
  ANAPHYLAXIS: 'GATE_ANAPHYLAXIS',
  DKA_HHS: 'GATE_DKA_HHS',
  RESP_ASTHMA_COPD: 'GATE_RESP_ASTHMA_COPD',
  ANEMIA_BLEED: 'GATE_ANEMIA_BLEED_CHRONIC',
} as const;

export type ClinicalGateId = (typeof CLINICAL_GATE)[keyof typeof CLINICAL_GATE];
