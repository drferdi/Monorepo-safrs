import { describe, expect, it } from 'vitest';

import { buildAlerts } from './TTVInferenceUI';

import {
  classifyHypertension,
  triageHypertensiveCrisis,
  type HMODRedFlags,
} from '@/lib/emergency-detector/htn-classifier';

function makeState(
  overrides: Partial<Parameters<typeof buildAlerts>[0]> = {}
): Parameters<typeof buildAlerts>[0] {
  return {
    sbp: '',
    dbp: '',
    hr: '',
    rr: '',
    temp: '',
    spo2: '',
    glucose: '',
    symptomText: '',
    allergies: [],
    pregnancyStatus: null,
    disabilityType: '',
    obesityConfirmation: '',
    autosenPreset: 'adl',
    avpu: 'A',
    supplemental_o2: false,
    pain_score: '',
    ...overrides,
  };
}

const noHmod: HMODRedFlags = {
  chest_pain: false,
  pulmonary_edema: false,
  neurological_deficit: false,
  vision_changes: false,
  severe_headache: false,
  oliguria: false,
  altered_mental_status: false,
};

describe('HTNCrisisTriage legacy surface replacement', () => {
  it('maps crisis without HMOD to urgency and keeps the GATE_2 alert active', () => {
    const triage = triageHypertensiveCrisis({ sbp: 185, dbp: 112 }, noHmod);
    const classification = classifyHypertension(
      {
        readings: [
          { sbp: 184, dbp: 112 },
          { sbp: 185, dbp: 112 },
        ],
        final_bp: { sbp: 185, dbp: 112 },
        measurement_quality: 'good',
      },
      noHmod
    );
    const alerts = buildAlerts(makeState({ sbp: '185', dbp: '112' }), { patientAge: 45 });

    expect(triage).toBe('HTN_URGENCY');
    expect(classification.type).toBe('HTN_URGENCY');
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'hypertensive_crisis',
          severity: 'high',
          gate: 'GATE_2_BP',
        }),
      ])
    );
  });

  it('maps crisis with HMOD to emergency through the active classifier', () => {
    const redFlags: HMODRedFlags = {
      ...noHmod,
      chest_pain: true,
      neurological_deficit: true,
    };

    const triage = triageHypertensiveCrisis({ sbp: 190, dbp: 120 }, redFlags);
    const classification = classifyHypertension(
      {
        readings: [
          { sbp: 190, dbp: 120 },
          { sbp: 192, dbp: 118 },
        ],
        final_bp: { sbp: 191, dbp: 119 },
        measurement_quality: 'good',
      },
      redFlags
    );

    expect(triage).toBe('HTN_EMERGENCY');
    expect(classification.type).toBe('HTN_EMERGENCY');
    expect(classification.reasoning).toMatch(/EMERGENCY/i);
  });
});
