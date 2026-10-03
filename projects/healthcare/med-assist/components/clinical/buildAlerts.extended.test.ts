import { describe, it, expect } from 'vitest';

import { buildAlerts } from './TTVInferenceUI';

import type { DisabilityType, ObesityConfirmation } from '@/lib/clinical/autosen-types';
import type { HistoricalBP } from '@/lib/emergency-detector/occult-shock-detector';

// Helper: build a minimal TTVStateShape (all strings, empty by default)
function makeState(
  overrides: Partial<{
    sbp: string;
    dbp: string;
    hr: string;
    rr: string;
    temp: string;
    spo2: string;
    glucose: string;
    symptomText: string;
  }> = {}
) {
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
    disabilityType: '' as DisabilityType,
    obesityConfirmation: '' as ObesityConfirmation,
    autosenPreset: 'adl' as const,
    avpu: 'A' as const,
    supplemental_o2: false,
    pain_score: '',
    ...overrides,
  };
}

function makeHistory(readings: Array<{ sbp: number; dbp: number }>): HistoricalBP[] {
  return readings.map((r, i) => ({
    visit_date: `2026-04-0${i + 1}`,
    sbp: r.sbp,
    dbp: r.dbp,
    hr: 80,
    rr: 16,
    temp: 36.5,
    spo2: 98,
  }));
}

const ADULT = { patientAge: 35 };
const CHILD_6 = { patientAge: 6 };

describe('buildAlerts — hypotension', () => {
  it('adult: SBP below 90 floor → hypotension critical', () => {
    const alerts = buildAlerts(makeState({ sbp: '85', dbp: '55' }), ADULT);
    const a = alerts.find((a) => a.type === 'hypotension');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('critical');
    expect(a!.gate).toBe('GATE_1_HEMODYNAMIC');
  });

  it('adult: MAP < 65 triggers hypotension (SBP 80, DBP 50 → MAP 60)', () => {
    const alerts = buildAlerts(makeState({ sbp: '80', dbp: '50' }), ADULT);
    expect(alerts.some((a) => a.type === 'hypotension')).toBe(true);
  });

  it('pediatric age 6: SBP below floor (82) → hypotension', () => {
    // pediatricHypotensionFloor(6) = 70 + 2*6 = 82
    const alerts = buildAlerts(makeState({ sbp: '78', dbp: '50' }), CHILD_6);
    const a = alerts.find((a) => a.type === 'hypotension');
    expect(a).toBeDefined();
    expect(a!.gate).toBe('GATE_1_HEMODYNAMIC');
  });

  it('adult: normal SBP 120/80 → no hypotension', () => {
    const alerts = buildAlerts(makeState({ sbp: '120', dbp: '80' }), ADULT);
    expect(alerts.some((a) => a.type === 'hypotension')).toBe(false);
  });
});

describe('buildAlerts — occult_shock', () => {
  it('relative hypotension ≥40 mmHg drop from HTN baseline with acute symptoms → occult_shock', () => {
    const history = makeHistory([
      { sbp: 165, dbp: 100 },
      { sbp: 160, dbp: 95 },
      { sbp: 168, dbp: 102 },
    ]);
    // Current SBP 120 = delta ~45 from ~165 baseline
    const alerts = buildAlerts(
      makeState({ sbp: '120', dbp: '80', symptomText: 'pusing lemas' }),
      ADULT,
      {
        bpHistory: history,
        knownHTN: true,
      }
    );
    expect(alerts.some((a) => a.type === 'occult_shock')).toBe(true);
  });

  it('no occult_shock without knownHTN flag', () => {
    const history = makeHistory([
      { sbp: 165, dbp: 100 },
      { sbp: 160, dbp: 95 },
      { sbp: 168, dbp: 102 },
    ]);
    const alerts = buildAlerts(makeState({ sbp: '120', dbp: '80' }), ADULT, {
      bpHistory: history,
      knownHTN: false,
    });
    expect(alerts.some((a) => a.type === 'occult_shock')).toBe(false);
  });

  it('no occult_shock when < 3 history entries', () => {
    const history = makeHistory([
      { sbp: 165, dbp: 100 },
      { sbp: 160, dbp: 95 },
    ]);
    const alerts = buildAlerts(makeState({ sbp: '120', dbp: '80' }), ADULT, {
      bpHistory: history,
      knownHTN: true,
    });
    expect(alerts.some((a) => a.type === 'occult_shock')).toBe(false);
  });
});

describe('buildAlerts — hypertensive_crisis', () => {
  it('adult SBP ≥ 180 without HMOD red flags → hypertensive_crisis high (HTN_URGENCY, not HTN_EMERGENCY)', () => {
    const alerts = buildAlerts(makeState({ sbp: '185', dbp: '112' }), ADULT);
    const a = alerts.find((a) => a.type === 'hypertensive_crisis');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('high');
    expect(a!.gate).toBe('GATE_2_BP');
  });

  it('adult DBP ≥ 120 alone triggers hypertensive_crisis', () => {
    const alerts = buildAlerts(makeState({ sbp: '170', dbp: '125' }), ADULT);
    expect(alerts.some((a) => a.type === 'hypertensive_crisis')).toBe(true);
  });

  it('adult SBP 150/90 → warning hypertensive alert', () => {
    const alerts = buildAlerts(makeState({ sbp: '150', dbp: '90' }), ADULT);
    const a = alerts.find((alert) => alert.type === 'hypertensive_crisis');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('warning');
    expect(a!.gate).toBe('GATE_2_BP');
  });
});

describe('buildAlerts — glucose', () => {
  it('glucose < 70 → hypoglycemia critical', () => {
    const alerts = buildAlerts(makeState({ glucose: '55' }), ADULT);
    const a = alerts.find((a) => a.type === 'hypoglycemia');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('critical');
    expect(a!.gate).toBe('GATE_3_GLUCOSE');
  });

  // The TTV form records no classic symptoms; a GDS of 200 or more still raises Gate 3.
  it('glucose ≥ 200 without classic symptom input → high hyperglycemia alert to confirm DM', () => {
    const alerts = buildAlerts(makeState({ glucose: '320' }), ADULT);
    const a = alerts.find((alert) => alert.type === 'hyperglycemia');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('high');
    expect(a!.gate).toBe('GATE_3_GLUCOSE');
    expect(a!.title).toBe('Hiperglikemia berat — evaluasi DM (GDS 320 mg/dL)');
    expect(a!.reasoning).toContain('DM belum tegak');
  });

  it('glucose 199 → no hyperglycemia alert', () => {
    const alerts = buildAlerts(makeState({ glucose: '199' }), ADULT);
    expect(alerts.some((a) => a.type === 'hyperglycemia')).toBe(false);
  });

  it('glucose 100 → no glucose alert', () => {
    const alerts = buildAlerts(makeState({ glucose: '100' }), ADULT);
    expect(alerts.some((a) => a.type === 'hypoglycemia' || a.type === 'hyperglycemia')).toBe(false);
  });
});

describe('buildAlerts — SpO2', () => {
  it('spo2 < 90 → hypoxia critical', () => {
    const alerts = buildAlerts(makeState({ spo2: '88' }), ADULT);
    const a = alerts.find((a) => a.type === 'hypoxia');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('critical');
    expect(a!.gate).toBe('GATE_4_RESPIRATORY');
  });

  it('spo2 between 91-93 → borderline_hypoxia high', () => {
    const alerts = buildAlerts(makeState({ spo2: '92' }), ADULT);
    const a = alerts.find((a) => a.type === 'borderline_hypoxia');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('high');
  });

  it('spo2 98 → no SpO2 alert', () => {
    const alerts = buildAlerts(makeState({ spo2: '98' }), ADULT);
    expect(alerts.some((a) => a.type === 'hypoxia' || a.type === 'borderline_hypoxia')).toBe(false);
  });
});

describe('buildAlerts — heart rate', () => {
  it('adult HR ≥ 130 → tachycardia high', () => {
    const alerts = buildAlerts(makeState({ hr: '140' }), ADULT);
    const a = alerts.find((a) => a.type === 'tachycardia');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('high');
    expect(a!.gate).toBe('GATE_5_CIRCULATION');
  });

  it('adult HR ≤ 50 → bradycardia', () => {
    const alerts = buildAlerts(makeState({ hr: '45' }), ADULT);
    const a = alerts.find((a) => a.type === 'bradycardia');
    expect(a).toBeDefined();
    expect(a!.gate).toBe('GATE_5B_CIRCULATION_LOW');
  });

  it('adult HR 72 → no HR alert', () => {
    const alerts = buildAlerts(makeState({ hr: '72' }), ADULT);
    expect(alerts.some((a) => a.type === 'tachycardia' || a.type === 'bradycardia')).toBe(false);
  });
});

describe('buildAlerts — multiple simultaneous alerts', () => {
  it('hypertensive_crisis + hypoglycemia + hypoxia fire together', () => {
    const alerts = buildAlerts(
      makeState({ sbp: '185', dbp: '115', glucose: '55', spo2: '88' }),
      ADULT
    );
    expect(alerts.some((a) => a.type === 'hypertensive_crisis')).toBe(true);
    expect(alerts.some((a) => a.type === 'hypoglycemia')).toBe(true);
    expect(alerts.some((a) => a.type === 'hypoxia')).toBe(true);
    expect(alerts.length).toBeGreaterThanOrEqual(3);
  });
});

describe('buildAlerts — all-normal vitals', () => {
  it('normal vitals → empty alerts array', () => {
    const alerts = buildAlerts(
      makeState({
        sbp: '120',
        dbp: '80',
        hr: '72',
        rr: '16',
        temp: '36.5',
        spo2: '98',
        glucose: '100',
      }),
      ADULT
    );
    const clinicalAlerts = alerts.filter((a) =>
      [
        'hypotension',
        'occult_shock',
        'hypertensive_crisis',
        'hypoglycemia',
        'hyperglycemia',
        'hypoxia',
        'borderline_hypoxia',
        'tachycardia',
        'bradycardia',
        'tachypnea',
        'bradypnea',
      ].includes(a.type)
    );
    expect(clinicalAlerts.length).toBe(0);
  });
});
