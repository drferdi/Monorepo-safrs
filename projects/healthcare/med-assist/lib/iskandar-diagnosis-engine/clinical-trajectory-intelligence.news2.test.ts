import { describe, expect, it } from 'vitest';

import { calculateClinicalNEWS2 } from './clinical-trajectory-intelligence';
import type { SymphonyVitalsInput } from './symphony-trajectory-core';

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

type Vitals = Omit<SymphonyVitalsInput, 'observedAt'>;
const scoreOf = (vitals: Vitals, parameter: string, hasCOPD = false) =>
  calculateClinicalNEWS2({ observedAt, ...vitals }, hasCOPD).parameterScores.find(
    (p) => p.parameter === parameter
  )?.score;

// RCP NEWS2 (2017) chart 1, each band edge on both sides.
describe('calculateClinicalNEWS2 band edges', () => {
  it.each([[8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3]])(
    'respiration rate %d scores %d',
    (respiratoryRate, score) => expect(scoreOf({ respiratoryRate }, 'respiratory_rate')).toBe(score)
  );
  it.each([[91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0]])(
    'SpO2 Scale 1 %d scores %d',
    (spo2, score) => expect(scoreOf({ spo2 }, 'spo2')).toBe(score)
  );
  it.each([[90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3]])(
    'systolic %d scores %d',
    (systolicBp, score) => expect(scoreOf({ systolicBp }, 'systolic')).toBe(score)
  );
  it.each([[40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1], [111, 2], [130, 2], [131, 3]])(
    'pulse %d scores %d',
    (heartRate, score) => expect(scoreOf({ heartRate }, 'heart_rate')).toBe(score)
  );
  it.each([[35, 3], [35.1, 1], [36, 1], [36.1, 0], [38, 0], [38.1, 1], [39, 1], [39.1, 2]])(
    'temperature %d scores %d',
    (temperatureC, score) => expect(scoreOf({ temperatureC }, 'temperature')).toBe(score)
  );
  // Scale 2 (hypercapnic respiratory failure): the 93-96 and >=97 bands score only on oxygen.
  it.each([
    [83, false, 3], [84, false, 2], [86, false, 1], [88, false, 0], [92, false, 0],
    [93, false, 0], [95, false, 0], [97, false, 0],
    [93, true, 1], [94, true, 1], [95, true, 2], [96, true, 2], [97, true, 3],
  ])('SpO2 Scale 2 %d (on oxygen: %s) scores %d', (spo2, supplementalO2, score) =>
    expect(scoreOf({ spo2, supplementalO2 }, 'spo2_scale2', true)).toBe(score)
  );
  // Oxygen not recorded is "not on oxygen", as the supplementalO2 parameter itself reads it (0).
  it('scores Scale 2 by the air bands when oxygen was not recorded', () => {
    expect(scoreOf({ spo2: 95 }, 'spo2_scale2', true)).toBe(0);
  });
});
