// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';
import { analyzeTrajectory } from './trajectory-analyzer';
import type { VisitRecord } from './visit-history-store';

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  keluhan = 'Kontrol rutin',
  diagnosa: VisitRecord['diagnosa'] = { icd_x: 'I10', nama: 'Hipertensi' }
): VisitRecord {
  const base = new Date('2026-01-01T08:00:00.000Z').getTime();
  const timestamp = new Date(base + index * 24 * 60 * 60 * 1000).toISOString();

  return {
    patient_id: 'RM-001',
    encounter_id: `enc-${index}`,
    timestamp,
    vitals,
    keluhan_utama: keluhan,
    diagnosa,
    source: 'scrape',
  };
}

describe('trajectory-analyzer enhanced output', () => {
  it('caps analysis to max 5 visits and returns clinical-safe output contract', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 130, dbp: 84, hr: 82, rr: 18, temp: 36.7, glucose: 140 }),
      makeVisit(2, { sbp: 132, dbp: 85, hr: 83, rr: 18, temp: 36.8, glucose: 145 }),
      makeVisit(3, { sbp: 134, dbp: 86, hr: 84, rr: 19, temp: 36.9, glucose: 150 }),
      makeVisit(4, { sbp: 136, dbp: 87, hr: 85, rr: 19, temp: 37, glucose: 155 }),
      makeVisit(5, { sbp: 138, dbp: 88, hr: 86, rr: 19, temp: 37.1, glucose: 160 }),
      makeVisit(6, { sbp: 140, dbp: 89, hr: 88, rr: 20, temp: 37.2, glucose: 165 }),
    ];

    const result = analyzeTrajectory(visits);

    expect(result.visitCount).toBe(5);
    expect(result.global_deterioration.deterioration_score).toBeGreaterThanOrEqual(0);
    expect(result.global_deterioration.deterioration_score).toBeLessThanOrEqual(100);
    expect(result.clinical_safe_output.review_window).toBe('24h');
    expect(result.clinical_safe_output.confidence).toBeGreaterThan(0);
    expect(result.clinical_safe_output.confidence).toBeLessThanOrEqual(1);
    expect(result.early_warning_burden.total_breaches_last5).toBeGreaterThanOrEqual(0);
  });

  it('raises high acute risk and mortality proxy for severe trend', () => {
    const visits: VisitRecord[] = [
      makeVisit(
        1,
        { sbp: 162, dbp: 101, hr: 108, rr: 22, temp: 38.4, glucose: 250 },
        'nyeri dada ringan'
      ),
      makeVisit(
        2,
        { sbp: 168, dbp: 106, hr: 114, rr: 23, temp: 38.7, glucose: 280 },
        'nyeri dada dan sesak'
      ),
      makeVisit(
        3,
        { sbp: 176, dbp: 112, hr: 120, rr: 25, temp: 38.9, glucose: 310 },
        'nyeri dada menjalar'
      ),
      makeVisit(
        4,
        { sbp: 184, dbp: 118, hr: 126, rr: 27, temp: 39.1, glucose: 340 },
        'nyeri dada, sesak, keringat dingin'
      ),
      makeVisit(
        5,
        { sbp: 192, dbp: 124, hr: 132, rr: 29, temp: 39.3, glucose: 360 },
        'nyeri dada berat dan sesak'
      ),
    ];

    const result = analyzeTrajectory(visits);

    expect(result.global_deterioration.state).toBe('critical');
    expect(result.acute_attack_risk_24h.hypertensive_crisis_risk).toBeGreaterThanOrEqual(80);
    expect(result.acute_attack_risk_24h.stroke_acs_suspicion_risk).toBeGreaterThanOrEqual(60);
    expect(['high', 'very_high']).toContain(result.mortality_proxy.mortality_proxy_tier);
    expect(['high', 'immediate']).toContain(result.mortality_proxy.clinical_urgency_tier);
  });

  it('marks missing data and lowers confidence when history is sparse', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 150, dbp: 95, hr: 0, rr: 0, temp: 0, glucose: 0 }, '', undefined),
    ];

    const result = analyzeTrajectory(visits);

    expect(result.clinical_safe_output.missing_data).toContain('insufficient_history_lt2');
    expect(result.clinical_safe_output.missing_data).toContain('latest_vital_hr_missing');
    expect(result.clinical_safe_output.missing_data).toContain('latest_keluhan_utama_missing');
    expect(result.clinical_safe_output.confidence).toBeLessThan(0.7);
  });

  it('computes time-to-critical estimate when trajectory is moving toward threshold', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 170, dbp: 98, hr: 90, rr: 18, temp: 36.8, glucose: 180 }),
      makeVisit(2, { sbp: 175, dbp: 102, hr: 92, rr: 19, temp: 36.9, glucose: 190 }),
      makeVisit(3, { sbp: 178, dbp: 108, hr: 95, rr: 20, temp: 37, glucose: 210 }),
    ];

    const result = analyzeTrajectory(visits);
    const eta = result.time_to_critical_estimate.sbp_hours_to_critical;

    expect(eta).not.toBeNull();
    expect(eta as number).toBeGreaterThanOrEqual(0);
    expect(eta as number).toBeLessThanOrEqual(168);
  });

  it('ignores one-off noisy chronic code when diagnosis name is non-readable numeric', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 148, dbp: 90, hr: 86, rr: 18, temp: 36.8, glucose: 132 }, 'kontrol', {
        icd_x: 'C50',
        nama: '59064',
      }),
      makeVisit(2, { sbp: 150, dbp: 92, hr: 88, rr: 18, temp: 36.9, glucose: 138 }, 'kontrol', {
        icd_x: 'I10',
        nama: 'Hipertensi',
      }),
    ];

    const result = analyzeTrajectory(visits);
    expect(result.confirmed_chronic_diagnoses.some((item) => item.icd_x === 'C50')).toBe(false);
    expect(result.confirmed_chronic_diagnoses.some((item) => item.icd_x === 'I10')).toBe(true);
  });
});
