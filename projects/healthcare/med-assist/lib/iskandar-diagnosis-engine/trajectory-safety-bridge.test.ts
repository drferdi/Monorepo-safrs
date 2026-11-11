import { describe, it, expect } from 'vitest';

import type { HybridTrajectoryResult } from './hybrid-trajectory';
import { extractSafetyAlertsFromTrajectory } from './trajectory-safety-bridge';

describe('extractSafetyAlertsFromTrajectory', () => {
  it('extracts critical alerts from trajectory red flags', () => {
    const mockTrajectory = {
      integratedAssessment: {
        calibratedSeverity: 'critical',
        recommendedAction: 'EMERGENCY REVIEW: Stabilkan pasien.',
      },
      redFlags: [
        {
          id: 'physio-sepsis-like',
          severity: 'critical',
          source: 'physiological',
          title: 'Pola perburukan sistemik — Sepsis-like',
          rationale: 'Sepsis-like deterioration risk tinggi.',
        },
      ],
      clinicalIntelligence: {
        news2: { riskLevel: 'high', aggregateScore: 7 },
      },
    } as unknown as HybridTrajectoryResult;

    const alerts = extractSafetyAlertsFromTrajectory(mockTrajectory);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('emergency');
    expect(alerts[0].title).toContain('Sepsis');
  });

  it('returns empty when trajectory is low risk', () => {
    const mockTrajectory = {
      integratedAssessment: { calibratedSeverity: 'low' },
      redFlags: [],
    } as unknown as HybridTrajectoryResult;

    const alerts = extractSafetyAlertsFromTrajectory(mockTrajectory);
    expect(alerts.length).toBe(0);
  });

  it('adds summary alert when multiple critical flags present', () => {
    const mockTrajectory = {
      integratedAssessment: {
        calibratedSeverity: 'critical',
        recommendedAction: 'Stabilkan segera.',
      },
      redFlags: [
        {
          id: 'shock-index',
          severity: 'critical',
          source: 'physiological',
          title: 'Shock Index tinggi',
          rationale: 'HR/SBP > 1.2 mengindikasikan syok.',
        },
        {
          id: 'resp-failure',
          severity: 'critical',
          source: 'physiological',
          title: 'Gagal napas',
          rationale: 'SpO2 < 90% dengan RR > 30.',
        },
      ],
    } as unknown as HybridTrajectoryResult;

    const alerts = extractSafetyAlertsFromTrajectory(mockTrajectory);
    expect(alerts.length).toBe(3); // 2 flags + 1 summary
    expect(alerts[0].id).toBe('trajectory-summary-critical');
    expect(alerts[0].severity).toBe('emergency');
  });

  it('returns empty for null trajectory', () => {
    const alerts = extractSafetyAlertsFromTrajectory(null);
    expect(alerts.length).toBe(0);
  });

  it('skips non-critical flags', () => {
    const mockTrajectory = {
      integratedAssessment: {
        calibratedSeverity: 'high',
        recommendedAction: 'Monitor ketat.',
      },
      redFlags: [
        {
          id: 'low-risk-flag',
          severity: 'low',
          source: 'data-quality',
          title: 'Data tidak lengkap',
          rationale: 'Beberapa vital signs tidak tersedia.',
        },
      ],
    } as unknown as HybridTrajectoryResult;

    const alerts = extractSafetyAlertsFromTrajectory(mockTrajectory);
    expect(alerts.length).toBe(0);
  });
});
