import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import { ClinicalReasoningDifferentialPanel } from './trajectory/v2/ClinicalReasoningDifferentialPanel';

function makeHybridResult(): HybridTrajectoryResult {
  return {
    clinicalIntelligence: {
      news2: {
        aggregateScore: 6,
        riskLevel: 'medium',
        parameterScores: [],
        hasExtremeSingle: false,
        monitoringRecommendation: 'Review dokter.',
        clinicalResponse: 'Korelasi klinis diperlukan.',
        scoreableParameters: 5,
      },
      earlyWarnings: [],
      selectedPatterns: [],
      trajectorySignals: [
        {
          id: 'T-45',
          label: 'Respiratory worsening concern',
          severity: 'high',
          rationale: 'Respiratory trajectory memburuk.',
          evidence: ['RR naik', 'SpO2 turun'],
        },
        {
          id: 'T-16',
          label: 'Sepsis no-return proxy concern',
          severity: 'high',
          rationale: 'Sepsis-like trajectory perlu review.',
          evidence: ['qSOFA-style pattern', 'NEWS2 high'],
        },
      ],
      shockIndex: {
        value: 1.0,
        severity: 'warning',
        criteriaMet: ['HR/SBP borderline'],
      },
    },
    redFlags: [],
    missingDataWarnings: [],
    uncertaintyNotes: ['history_depth_lt5'],
    integratedAssessment: {
      physiologicalSeverity: 'high',
      contextReviewFloor: 'high',
      calibratedSeverity: 'high',
      physiologicalState: 'deteriorating',
      finalState: 'deteriorating',
      physiologicalDeteriorationScore: 65,
      calibratedDeteriorationScore: 68,
      confidence: 0.61,
      rationale: ['Trajectory evidence perlu review.'],
      recommendedAction: 'Review klinis.',
    },
    clinicalContext: {
      complaintSignals: [
        {
          id: 'infectious-complaint',
          label: 'Demam dan sesak',
          reviewSeverityFloor: 'high',
          matchedKeywords: ['demam', 'sesak'],
          rationale: 'Keluhan aktif terbaru.',
        },
      ],
      historicalDiagnosisSignals: [],
      therapySignals: [],
      clinicianContext: {
        sourceBreakdown: { scrapeCount: 2, uplinkCount: 0 },
        clinicianAttributionCount: 0,
        latestClinicianNames: [],
        hasHistoricalClinicianContext: false,
      },
      dataQualityScore: 0.8,
      dataQualityWarnings: [],
      confirmedChronicDiagnoses: [],
    },
    longitudinalFrames: [
      {
        visitLabel: 'Kunjungan 1',
        observedAt: '2026-06-01T08:00:00.000Z',
        source: 'scrape',
        complaint: 'Demam dan sesak',
        diagnosisCode: 'J06.9',
        diagnosisLabel: 'Infeksi saluran napas atas',
        therapySummary: 'Terapi simptomatik',
        vitalsSnapshot: {
          systolicBp: 124,
          diastolicBp: 78,
          heartRate: 98,
          respiratoryRate: 22,
          temperatureC: 37.9,
          glucoseMgDl: 154,
          spo2: 93,
        },
        trajectorySummary: {
          overallTrend: 'declining',
          physiologyState: 'deteriorating',
          riskLevel: 'high',
          deteriorationScore: 66,
          confidence: 0.61,
          news2AggregateScore: 6,
        },
        redFlagTitles: ['Respiratory worsening concern'],
        hypothesisLabels: ['Infeksi saluran napas atas'],
      },
    ],
    physiologicalInput: [],
    physiologicalResult: {} as HybridTrajectoryResult['physiologicalResult'],
  };
}

function makeViewModel(): TrajectoryVisualizationViewModel {
  return {
    trajectoryTimeline: [],
    vitalTrends: [],
    vitalTrendMeta: {
      primaryVitalDrivers: ['Respiratory rate'],
      missingVitalWarnings: [],
    },
    keyDriverContributions: [],
    baselineDeviation: [],
    baselineAvailability: {
      available: false,
      message: 'Baseline belum cukup.',
    },
    mortalityProxy: {
      tier: 'moderate',
      score: 44,
      clinicalUrgencyTier: 'high',
    },
    priorityTrajectoryCoverage: [],
    timeToCritical: [],
    dataQualityWarnings: [],
    uncertaintyNotes: ['Riwayat terbatas.'],
  };
}

describe('DiagnosisSuggestions legacy surface replacement', () => {
  it('uses a physician-review differential panel instead of legacy inline suggestions UI', () => {
    render(
      <ClinicalReasoningDifferentialPanel
        hybridResult={makeHybridResult()}
        viewModel={makeViewModel()}
        onOpenDifferential={() => undefined}
      />
    );

    const panel = screen.getByTestId('clinical-reasoning-differential-panel');
    expect(within(panel).getByText('Physician action')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Open diagnosis review' })).toBeEnabled();
    expect(
      within(panel).getByText('Therapy support locked until physician selection.')
    ).toBeInTheDocument();
    expect(within(panel).queryByText(/confidence|probability|percentage/i)).not.toBeInTheDocument();
    expect(
      within(panel).queryByText(/fill diagnosa|sekunder|refresh suggestions/i)
    ).not.toBeInTheDocument();
  });
});
