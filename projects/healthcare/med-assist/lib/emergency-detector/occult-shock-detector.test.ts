// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import {
  calculateBaseline,
  calculateMAP,
  detectOccultShock,
  getRecentBaseline,
  SHOCK_THRESHOLDS,
  type HistoricalBP,
  type OccultShockInput,
} from './occult-shock-detector';

// ============================================================================
// HELPERS
// ============================================================================

const makeHistory = (readings: Array<{ sbp: number; dbp: number }>): HistoricalBP[] =>
  readings.map((r, i) => ({
    visit_date: `2026-0${i + 1}-01`,
    sbp: r.sbp,
    dbp: r.dbp,
  }));

const noSymptoms = { dizziness: false, presyncope: false, syncope: false, weakness: false };
const acuteSymptoms = { dizziness: true, presyncope: true, syncope: false, weakness: false };

const makeInput = (overrides: Partial<OccultShockInput> = {}): OccultShockInput => ({
  vitals: { current_sbp: 120, current_dbp: 80 },
  last_3_visits: makeHistory([
    { sbp: 160, dbp: 95 },
    { sbp: 165, dbp: 100 },
    { sbp: 158, dbp: 92 },
  ]),
  symptoms: noSymptoms,
  known_htn: true,
  ...overrides,
});

// ============================================================================
// calculateMAP
// ============================================================================

describe('calculateMAP', () => {
  it('calculates MAP correctly using DBP + (SBP - DBP) / 3', () => {
    expect(calculateMAP(120, 80)).toBe(93);
    expect(calculateMAP(90, 60)).toBe(70);
    expect(calculateMAP(180, 120)).toBe(140);
  });

  it('returns 65 for borderline perfusion values', () => {
    // MAP = 60 + (90 - 60) / 3 = 70
    expect(calculateMAP(90, 60)).toBeGreaterThan(SHOCK_THRESHOLDS.MAP_HYPOPERFUSION);
  });

  it('returns below 65 when organ hypoperfusion risk', () => {
    // MAP = 50 + (80 - 50) / 3 = 60
    expect(calculateMAP(80, 50)).toBeLessThan(SHOCK_THRESHOLDS.MAP_HYPOPERFUSION);
  });
});

// ============================================================================
// calculateBaseline
// ============================================================================

describe('calculateBaseline', () => {
  it('returns null when fewer than 3 readings', () => {
    expect(calculateBaseline(makeHistory([{ sbp: 160, dbp: 95 }]))).toBeNull();
    expect(
      calculateBaseline(
        makeHistory([
          { sbp: 160, dbp: 95 },
          { sbp: 155, dbp: 90 },
        ])
      )
    ).toBeNull();
  });

  it('returns median SBP and DBP for exactly 3 readings', () => {
    const history = makeHistory([
      { sbp: 150, dbp: 90 },
      { sbp: 160, dbp: 100 },
      { sbp: 170, dbp: 110 },
    ]);
    const baseline = calculateBaseline(history);
    expect(baseline).not.toBeNull();
    expect(baseline!.sbp).toBe(160); // median of [150, 160, 170]
    expect(baseline!.dbp).toBe(100); // median of [90, 100, 110]
  });

  it('uses median (robust to outliers), not mean', () => {
    // Without outlier: mean = (150+160+170)/3 = 160, median = 160
    // With outlier 240: mean = (150+160+170+240)/4 = 180, median(sorted) = 165
    const history = makeHistory([
      { sbp: 150, dbp: 90 },
      { sbp: 160, dbp: 100 },
      { sbp: 170, dbp: 105 },
      { sbp: 240, dbp: 130 }, // outlier
    ]);
    const baseline = calculateBaseline(history);
    // sorted SBP: [150, 160, 170, 240], median index = floor(4/2) = 2 → 170
    expect(baseline!.sbp).toBe(170);
  });
});

// ============================================================================
// getRecentBaseline
// ============================================================================

describe('getRecentBaseline', () => {
  it('returns null when fewer than 3 clinic readings', () => {
    const history: HistoricalBP[] = [
      { visit_date: '2026-01-01', sbp: 160, dbp: 95, location: 'clinic' },
      { visit_date: '2026-02-01', sbp: 162, dbp: 97, location: 'clinic' },
    ];
    expect(getRecentBaseline(history)).toBeNull();
  });

  it('filters home readings and uses only clinic readings', () => {
    const history: HistoricalBP[] = [
      { visit_date: '2026-01-01', sbp: 200, dbp: 130, location: 'home' }, // outlier, should be excluded
      { visit_date: '2026-02-01', sbp: 160, dbp: 95, location: 'clinic' },
      { visit_date: '2026-03-01', sbp: 162, dbp: 97, location: 'clinic' },
      { visit_date: '2026-04-01', sbp: 158, dbp: 93, location: 'clinic' },
    ];
    const baseline = getRecentBaseline(history);
    expect(baseline).not.toBeNull();
    // Only clinic readings used: [160, 162, 158] → median SBP = 160
    expect(baseline!.sbp).toBe(160);
  });
});

// ============================================================================
// detectOccultShock — Hypoglycemia priority
// ============================================================================

describe('detectOccultShock — hypoglycemia priority', () => {
  it('returns CRITICAL and treats hypoglycemia first before checking BP', () => {
    const result = detectOccultShock(
      makeInput({
        vitals: { current_sbp: 80, current_dbp: 50, glucose: 55 }, // BP also critical
      })
    );
    expect(result.risk_level).toBe('CRITICAL');
    expect(result.triggers[0]).toContain('Hypoglycemia');
    expect(result.recommendations[0]).toContain('HYPOGLYCEMIA FIRST');
  });

  it('skips hypoglycemia check when glucose >= 70', () => {
    const result = detectOccultShock(
      makeInput({
        vitals: { current_sbp: 120, current_dbp: 80, glucose: 70 },
      })
    );
    expect(result.triggers).not.toContain(expect.stringContaining('Hypoglycemia'));
  });
});

// ============================================================================
// detectOccultShock — Absolute hypotension
// ============================================================================

describe('detectOccultShock — absolute hypotension', () => {
  it('flags CRITICAL for SBP < 90', () => {
    const result = detectOccultShock(
      makeInput({
        vitals: { current_sbp: 85, current_dbp: 55 },
        symptoms: acuteSymptoms,
      })
    );
    expect(result.risk_level).toBe('CRITICAL');
    expect(result.triggers.some((t) => t.includes('Absolute hypotension'))).toBe(true);
  });

  it('flags CRITICAL when MAP < 65', () => {
    // MAP = 55 + (80 - 55) / 3 ≈ 63
    const result = detectOccultShock(
      makeInput({
        vitals: { current_sbp: 80, current_dbp: 55 },
        symptoms: acuteSymptoms,
      })
    );
    expect(result.risk_level).toBe('CRITICAL');
    expect(result.triggers.some((t) => t.includes('MAP'))).toBe(true);
  });

  it('returns LOW when BP is normal and no symptoms', () => {
    const result = detectOccultShock(
      makeInput({
        vitals: { current_sbp: 120, current_dbp: 80 },
        symptoms: noSymptoms,
        known_htn: false,
        last_3_visits: [],
      })
    );
    expect(result.risk_level).toBe('LOW');
    expect(result.triggers).toHaveLength(0);
  });
});

// ============================================================================
// detectOccultShock — Relative hypotension (occult shock)
// ============================================================================

describe('detectOccultShock — relative hypotension', () => {
  it('flags HIGH when ΔSBP ≥ 40 from baseline with known HTN and acute symptoms', () => {
    // Baseline: median of [155, 160, 165] = 160
    // Current SBP: 115 → ΔSBP = 45 ≥ 40
    const result = detectOccultShock({
      vitals: { current_sbp: 115, current_dbp: 75 },
      last_3_visits: makeHistory([
        { sbp: 155, dbp: 95 },
        { sbp: 160, dbp: 100 },
        { sbp: 165, dbp: 105 },
      ]),
      symptoms: acuteSymptoms,
      known_htn: true,
    });
    expect(result.risk_level).toBe('HIGH');
    expect(result.triggers.some((t) => t.includes('Relative hypotension'))).toBe(true);
    expect(result.delta_sbp).toBe(45);
    expect(result.baseline_bp?.sbp).toBe(160);
  });

  it('does NOT flag relative hypotension when ΔSBP < 40', () => {
    // Baseline: 160, current: 125 → ΔSBP = 35 < 40
    const result = detectOccultShock({
      vitals: { current_sbp: 125, current_dbp: 80 },
      last_3_visits: makeHistory([
        { sbp: 158, dbp: 95 },
        { sbp: 160, dbp: 100 },
        { sbp: 162, dbp: 98 },
      ]),
      symptoms: acuteSymptoms,
      known_htn: true,
    });
    expect(result.triggers.some((t) => t.includes('Relative hypotension'))).toBe(false);
  });

  it('does NOT flag relative hypotension without known HTN history', () => {
    const result = detectOccultShock({
      vitals: { current_sbp: 110, current_dbp: 70 },
      last_3_visits: makeHistory([
        { sbp: 160, dbp: 95 },
        { sbp: 165, dbp: 100 },
        { sbp: 158, dbp: 92 },
      ]),
      symptoms: acuteSymptoms,
      known_htn: false, // ← no HTN
    });
    expect(result.triggers.some((t) => t.includes('Relative hypotension'))).toBe(false);
  });

  it('does NOT flag relative hypotension with fewer than 3 visits', () => {
    const result = detectOccultShock({
      vitals: { current_sbp: 110, current_dbp: 70 },
      last_3_visits: makeHistory([
        { sbp: 160, dbp: 95 },
        { sbp: 165, dbp: 100 },
      ]), // only 2 visits
      symptoms: acuteSymptoms,
      known_htn: true,
    });
    expect(result.triggers.some((t) => t.includes('Relative hypotension'))).toBe(false);
    expect(result.baseline_bp).toBeUndefined();
  });

  it('downgrades to MODERATE when triggers present but no acute symptoms', () => {
    // ΔSBP ≥ 40 but NO symptoms → MODERATE
    const result = detectOccultShock({
      vitals: { current_sbp: 115, current_dbp: 75 },
      last_3_visits: makeHistory([
        { sbp: 158, dbp: 95 },
        { sbp: 160, dbp: 100 },
        { sbp: 162, dbp: 102 },
      ]),
      symptoms: noSymptoms, // ← no symptoms
      known_htn: true,
    });
    expect(result.risk_level).toBe('MODERATE');
    expect(result.recommendations[0]).toContain('no acute symptoms');
  });
});

// ============================================================================
// detectOccultShock — result structure
// ============================================================================

describe('detectOccultShock — result structure', () => {
  it('always returns map in result', () => {
    const result = detectOccultShock(makeInput());
    expect(typeof result.map).toBe('number');
    expect(result.map).toBeGreaterThan(0);
  });

  it('returns occult shock recommendations with critical checklist when HIGH risk + symptoms', () => {
    const result = detectOccultShock({
      vitals: { current_sbp: 112, current_dbp: 72 },
      last_3_visits: makeHistory([
        { sbp: 158, dbp: 95 },
        { sbp: 160, dbp: 100 },
        { sbp: 162, dbp: 102 },
      ]),
      symptoms: acuteSymptoms,
      known_htn: true,
    });
    expect(result.recommendations.some((r) => r.includes('OCCULT SHOCK'))).toBe(true);
    expect(result.recommendations.some((r) => r.includes('Serial BP'))).toBe(true);
  });
});
