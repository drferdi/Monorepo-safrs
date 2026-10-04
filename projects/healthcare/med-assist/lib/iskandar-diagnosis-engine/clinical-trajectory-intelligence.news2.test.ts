import { describe, expect, it } from 'vitest';

import { calculateClinicalNEWS2 } from './clinical-trajectory-intelligence';

const observedAt = '2026-10-04T08:00:00.000Z';

describe('calculateClinicalNEWS2 (RCP NEWS2 2017)', () => {
  it('scores new confusion as 3', () => {
    const news2 = calculateClinicalNEWS2({ observedAt, consciousness: 'confusion' });
    expect(news2.parameterScores.find((p) => p.parameter === 'consciousness')?.score).toBe(3);
  });

  it('treats unknown consciousness as missing, not as a scored parameter', () => {
    const news2 = calculateClinicalNEWS2({
      observedAt,
      respiratoryRate: 18,
      consciousness: 'unknown',
    });
    expect(news2.scoreableParameters).toBe(1);
  });

  it('adds 2 points for supplemental oxygen', () => {
    const onAir = calculateClinicalNEWS2({ observedAt, spo2: 95, supplementalO2: false });
    const onO2 = calculateClinicalNEWS2({ observedAt, spo2: 95, supplementalO2: true });
    expect(onO2.aggregateScore - onAir.aggregateScore).toBe(2);
    expect(onO2.parameterScores.find((p) => p.parameter === 'supplementalO2')?.score).toBe(2);
  });

  it('does not count supplemental oxygen as scored when it was not recorded', () => {
    const news2 = calculateClinicalNEWS2({ observedAt, spo2: 95 });
    expect(news2.scoreableParameters).toBe(1);
  });
});
