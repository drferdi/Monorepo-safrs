// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { CLINICAL_PATTERNS } from './clinical-patterns';
import { buildClinicalSnapshot } from './clinical-snapshot';
import { evaluatePatterns, patternMatchesToAlerts } from './pattern-engine';

describe('patternMatchesToAlerts', () => {
  it('preserves actionProtocolId from the matched pattern onto the resulting alert', () => {
    // sbp<=100 + rr>=22 satisfies CP-001's qSOFA scoredCriteria (2 of 3,
    // minScore 2) without needing AVPU!=A.
    const snapshot = buildClinicalSnapshot(
      {
        sbp: '90',
        dbp: '60',
        hr: '95',
        rr: '24',
        temp: '38.5',
        spo2: '96',
        glucose: '100',
        symptomText: '',
        allergies: [],
        pregnancyStatus: null,
        avpu: 'A',
        supplemental_o2: false,
        pain_score: '',
      },
      { patientAge: 45 }
    );

    const matches = evaluatePatterns(snapshot, CLINICAL_PATTERNS, [], { tierFilter: ['A', 'B'] });
    const cp001Match = matches.find((m) => m.pattern.id === 'CP-001');
    expect(cp001Match).toBeDefined();

    const alerts = patternMatchesToAlerts(matches);
    const cp001Alert = alerts.find((a) => a.id === 'pattern-CP-001');
    expect(cp001Alert?.actionProtocolId).toBe('PROTO_SEPSIS');
  });
});

describe('evaluatePatterns supersededBy', () => {
  it('drops the allergic-reaction watch (CP-025) when anaphylaxis (CP-024) already matched', () => {
    const snapshot = buildClinicalSnapshot(
      {
        sbp: '110',
        dbp: '70',
        hr: '110',
        rr: '24',
        temp: '36.8',
        spo2: '92',
        glucose: '',
        symptomText: 'biduran dan sesak setelah makan udang',
        allergies: [],
        pregnancyStatus: null,
        avpu: 'A',
        supplemental_o2: false,
        pain_score: '',
      },
      { patientAge: 30 }
    );

    const ids = evaluatePatterns(snapshot, CLINICAL_PATTERNS, []).map((m) => m.pattern.id);
    expect(ids).toContain('CP-024');
    expect(ids).not.toContain('CP-025');
  });
});
