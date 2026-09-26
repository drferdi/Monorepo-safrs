import { describe, expect, it } from 'vitest';

import { checkVitalRanges, inferVitals, NORMAL_RANGES } from './ttv-inference';

import { getVitalScreeningProfile } from '@/lib/clinical/vital-screening-thresholds';

describe('inferVitals — without patientAge (backward compatible, flat adult ranges)', () => {
  it('falls back to flat NORMAL_RANGES when no pattern matches and no age given', () => {
    const result = inferVitals('kontrol rutin, tidak ada keluhan');

    expect(result.values.pulse).toBeGreaterThanOrEqual(NORMAL_RANGES.pulse.min);
    expect(result.values.pulse).toBeLessThanOrEqual(NORMAL_RANGES.pulse.max);
    expect(result.values.rr).toBeGreaterThanOrEqual(NORMAL_RANGES.rr.min);
    expect(result.values.rr).toBeLessThanOrEqual(NORMAL_RANGES.rr.max);
  });

  it('never overrides already-measured vitals regardless of age', () => {
    const result = inferVitals('demam tinggi', { pulse: 72, rr: 16 }, 0.5);

    expect(result.values.pulse).toBe(72);
    expect(result.values.rr).toBe(16);
    expect(result.metadata.pulse?.source).toBe('measured');
    expect(result.metadata.rr?.source).toBe('measured');
  });
});

describe('inferVitals — regression guard: age-cohort-aware ranges', () => {
  it('keeps no-pattern-matched pulse/RR within the infant cohort range, not flat adult range', () => {
    const profile = getVitalScreeningProfile(0.5);
    const result = inferVitals('kontrol rutin, tidak ada keluhan', {}, 0.5);

    expect(result.values.pulse).toBeGreaterThanOrEqual(profile.bradycardiaThreshold);
    expect(result.values.pulse).toBeLessThanOrEqual(profile.tachycardiaThreshold);
    // The old adult-flat bug would have produced a pulse inside 60-100, which
    // is below an infant's own bradycardia threshold (100) — guard against it.
    expect(result.values.pulse).toBeGreaterThan(NORMAL_RANGES.pulse.max - 1);
  });

  it('re-centers the fever pattern pulse range onto an infant baseline, above the adult-shaped range', () => {
    const result = inferVitals('demam tinggi sejak semalam', {}, 0.5);

    // Adult-shaped fever pattern is 90-110; an infant's own resting HR already
    // exceeds that, so the scaled range must sit clearly above it.
    expect(result.values.pulse).toBeGreaterThan(110);
    expect(result.metadata.pulse?.confidence).toBe('medium');
  });

  it('matches the unscaled adult fever pattern range when no age is given', () => {
    const result = inferVitals('demam tinggi sejak semalam');

    expect(result.values.pulse).toBeGreaterThanOrEqual(90);
    expect(result.values.pulse).toBeLessThanOrEqual(110);
  });
});

describe('checkVitalRanges — age-cohort-aware classification', () => {
  it('classifies a pulse of 90 as normal for an adult but low for an infant', () => {
    const adultResult = checkVitalRanges({ pulse: 90 }, 35);
    const infantResult = checkVitalRanges({ pulse: 90 }, 0.5);

    expect(adultResult.pulse).toBe('normal');
    expect(infantResult.pulse).toBe('low');
  });

  it('falls back to flat adult ranges when no age is given', () => {
    const result = checkVitalRanges({ pulse: 90, rr: 16 });

    expect(result.pulse).toBe('normal');
    expect(result.rr).toBe('normal');
  });
});
