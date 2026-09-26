import { describe, expect, it } from 'vitest';

import {
  buildPhysicianSafeTrajectoryPresentation,
  findForbiddenPhysicianTrajectoryTerms,
  serializePhysicianSafeTrajectoryPresentation,
} from './presentation-safety';
import type { TrajectoryAnalysis } from './trajectory-analyzer';

function makeAnalysis(
  overrides: Partial<
    Pick<
      TrajectoryAnalysis,
      | 'summary'
      | 'clinical_safe_output'
      | 'recommendations'
      | 'global_deterioration'
      | 'overallRisk'
      | 'time_to_critical_estimate'
    >
  > = {}
): Pick<
  TrajectoryAnalysis,
  | 'summary'
  | 'clinical_safe_output'
  | 'recommendations'
  | 'global_deterioration'
  | 'overallRisk'
  | 'time_to_critical_estimate'
> {
  return {
    summary: 'Critical trajectory with DRIFTING momentum and acute peak concern.',
    overallRisk: 'high',
    global_deterioration: {
      state: 'deteriorating',
      deterioration_score: 72,
    },
    clinical_safe_output: {
      risk_tier: 'high',
      confidence: 0.68,
      drivers: ['Treatment response ineffective', 'Time to critical narrowed'],
      missing_data: ['Mortality proxy input unavailable'],
      recommended_action: 'Review because mortality proxy and death risk language leaked.',
      review_window: '24h',
    },
    recommendations: [
      {
        category: 'action',
        priority: 'high',
        text: 'Escalate due to time-to-critical estimate and acute peak.',
      },
    ],
    time_to_critical_estimate: {
      sbp_hours_to_critical: 8,
      dbp_hours_to_critical: null,
      hr_hours_to_critical: null,
      rr_hours_to_critical: 6,
      temp_hours_to_critical: null,
      gds_hours_to_critical: null,
    },
    ...overrides,
  };
}

describe('presentation-safety', () => {
  it('keeps actual-case mortality proxy and time-to-critical terms visible', () => {
    const presentation = buildPhysicianSafeTrajectoryPresentation(makeAnalysis());
    const serialized = serializePhysicianSafeTrajectoryPresentation(presentation);

    expect(presentation.showPrognosticProxy).toBe(false);
    expect(presentation.summary).toContain('significant clinical trajectory concern');
    expect(presentation.summary).toContain('unstable trend pattern');
    expect(presentation.recommendedAction).toContain('mortality proxy');
    expect(presentation.recommendedAction).not.toContain('death');
    expect(presentation.timeSensitiveReview.sectionTitle).toBe('TIME TO CRITICAL');
    expect(presentation.timeSensitiveReview.entries).toEqual([
      { key: 'sbp_hours_to_critical', label: 'SBP', hours: 8 },
      { key: 'rr_hours_to_critical', label: 'RR', hours: 6 },
    ]);
    expect(serialized).toContain('mortality proxy');
    expect(findForbiddenPhysicianTrajectoryTerms(serialized)).toEqual([]);
  });

  it('keeps missing-data warnings uncertain instead of normalizing them away', () => {
    const presentation = buildPhysicianSafeTrajectoryPresentation(
      makeAnalysis({
        clinical_safe_output: {
          risk_tier: 'moderate',
          confidence: 0.41,
          drivers: ['Data quality limited'],
          missing_data: ['Time to critical cannot be estimated because RR missing'],
          recommended_action: 'Repeat vitals and clinical review.',
          review_window: '24h',
        },
        global_deterioration: {
          state: 'stable',
          deterioration_score: 38,
        },
      })
    );

    expect(presentation.missingData).toContain(
      'Time to critical cannot be estimated because RR missing'
    );
    expect(findForbiddenPhysicianTrajectoryTerms(presentation.missingData.join(' | '))).toEqual([]);
  });
});
