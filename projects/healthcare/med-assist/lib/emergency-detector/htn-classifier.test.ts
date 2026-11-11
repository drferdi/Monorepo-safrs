// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { classifyHTN } from './htn-classifier';

describe('classifyHTN', () => {
  it('classifies stage-2-range BP as PRIMARY_HTN when clinic-vs-home context is unknown (not MASKED_HTN)', () => {
    // Regression: !undefined && !undefined previously evaluated to true,
    // making classifyHTN() fall through to MASKED_HTN for every non-crisis
    // reading whenever clinic_bp_elevated/home_bp_normal were simply never
    // provided (which is always true today — no UI captures home BP).
    // MASKED_HTN specifically means "normal in clinic, elevated at home" —
    // clinically contradictory when the clinic reading itself is elevated.
    expect(classifyHTN({ sbp: 166, dbp: 102 })).toBe('PRIMARY_HTN');
  });

  it('classifies stage-1-range BP as PRIMARY_HTN when context is unknown', () => {
    expect(classifyHTN({ sbp: 145, dbp: 92 })).toBe('PRIMARY_HTN');
  });

  it('still classifies WHITE_COAT_HTN when clinic-vs-home context is explicitly provided', () => {
    expect(
      classifyHTN({ sbp: 166, dbp: 102 }, { clinic_bp_elevated: true, home_bp_normal: true })
    ).toBe('WHITE_COAT_HTN');
  });

  it('still classifies MASKED_HTN when clinic-vs-home context is explicitly provided', () => {
    expect(
      classifyHTN({ sbp: 166, dbp: 102 }, { clinic_bp_elevated: false, home_bp_normal: false })
    ).toBe('MASKED_HTN');
  });

  it('does not classify WHITE_COAT_HTN or MASKED_HTN when only one of the two context fields is provided', () => {
    expect(classifyHTN({ sbp: 166, dbp: 102 }, { clinic_bp_elevated: true })).toBe('PRIMARY_HTN');
    expect(classifyHTN({ sbp: 166, dbp: 102 }, { home_bp_normal: false })).toBe('PRIMARY_HTN');
  });

  it('classifies RESISTANT_HTN when on multiple medications, unaffected by this fix', () => {
    expect(
      classifyHTN({ sbp: 145, dbp: 92 }, { on_medication: true, multiple_medications: true })
    ).toBe('RESISTANT_HTN');
  });

  it('still classifies crisis-range BP as HTN_URGENCY regardless of context', () => {
    expect(classifyHTN({ sbp: 185, dbp: 115 })).toBe('HTN_URGENCY');
  });

  it('still classifies normal-range BP as NORMAL regardless of context', () => {
    expect(classifyHTN({ sbp: 110, dbp: 70 })).toBe('NORMAL');
  });

  it('still classifies ISOLATED_SYSTOLIC_HTN unaffected by this fix', () => {
    expect(classifyHTN({ sbp: 150, dbp: 80 })).toBe('ISOLATED_SYSTOLIC_HTN');
  });
});
