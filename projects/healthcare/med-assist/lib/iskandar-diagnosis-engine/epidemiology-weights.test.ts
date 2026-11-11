// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import {
  EPI_BOOST_MIN_RAW_SCORE,
  resolveEpiAdjustedScore,
} from './epidemiology-weights';

describe('H8 — epidemiology gate on weak matcher scores', () => {
  it('documents the minimum raw score required before epi boost applies', () => {
    expect(EPI_BOOST_MIN_RAW_SCORE).toBeGreaterThan(0);
    expect(EPI_BOOST_MIN_RAW_SCORE).toBeLessThan(0.5);
  });

  it('does not lift a weak matcher score to top-1 solely by epi prior', () => {
    // Without gating: 0.20 * 1.35 = 0.27 would beat a competitive 0.25 neutral.
    const weakEndemic = resolveEpiAdjustedScore(0.2, 1.35);
    const competitiveNeutral = resolveEpiAdjustedScore(0.25, 1.0);

    expect(weakEndemic.epiGated).toBe(true);
    expect(weakEndemic.matchScore).toBe(0.2);
    expect(weakEndemic.appliedWeight).toBe(1);

    expect(competitiveNeutral.epiGated).toBe(false);
    expect(competitiveNeutral.matchScore).toBe(0.25);
    expect(competitiveNeutral.matchScore).toBeGreaterThan(weakEndemic.matchScore);
  });

  it('still applies epi boost when raw matcher score is competitive', () => {
    const strong = resolveEpiAdjustedScore(0.4, 1.2);
    expect(strong.epiGated).toBe(false);
    expect(strong.appliedWeight).toBe(1.2);
    expect(strong.matchScore).toBeCloseTo(0.48, 5);
  });
});
