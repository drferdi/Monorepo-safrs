import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import {
  buildClinicalReasoningWorkflowFromTrajectoryV2,
  type TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine';

import { ClinicalReasoningDifferentialPanel } from './trajectory/v2/ClinicalReasoningDifferentialPanel';

function makeHybridResult(): HybridTrajectoryResult {
  return {
    clinicalIntelligence: {
      news2: {
        aggregateScore: 7,
        riskLevel: 'high',
        parameterScores: [],
        hasExtremeSingle: false,
        monitoringRecommendation: 'Review segera.',
        clinicalResponse: 'Perlu korelasi klinis.',
        scoreableParameters: 5,
      },
      earlyWarnings: [],
      selectedPatterns: [
        {
          id: 'CP-014',
          gate: 'GATE_RESP_FAILURE',
          severity: 'critical',
          title: 'Respiratory deterioration',
          reasoning: 'Respiratory failure proxy aktif.',
          criteriaMet: ['RR tinggi', 'SpO2 rendah'],
          trajectoryIds: ['T-45', 'T-13'],
        },
      ],
      trajectorySignals: [
        {
          id: 'T-45',
          label: 'Respiratory worsening concern',
          severity: 'high',
          rationale: 'Respiratory trajectory memburuk.',
          evidence: ['RR naik', 'SpO2 turun'],
        },
        {
          id: 'T-46',
          label: 'Hemodynamic instability',
          severity: 'high',
          rationale: 'Hemodynamic trajectory perlu review.',
          evidence: ['SBP turun', 'HR naik'],
        },
        {
          id: 'T-13',
          label: 'Imminent cardiac arrest proxy concern',
          severity: 'critical',
          rationale: 'Critical deterioration proxy aktif.',
          evidence: ['CP-014 selected', 'Hypoxemia trajectory'],
        },
        {
          id: 'T-16',
          label: 'Sepsis no-return proxy concern',
          severity: 'high',
          rationale: 'Sepsis-like trajectory perlu review.',
          evidence: ['qSOFA-style pattern', 'NEWS2 high'],
        },
        {
          id: 'T-54',
          label: 'Fever burden',
          severity: 'moderate',
          rationale: 'Demam berulang.',
          evidence: ['Suhu >=38.5C pada 2 titik'],
        },
        {
          id: 'T-50',
          label: 'NEWS2 aggregate proxy',
          severity: 'high',
          rationale: 'NEWS2 mendukung physiologic concern.',
          evidence: ['NEWS2 aggregate 7'],
        },
      ],
      shockIndex: {
        value: 1.18,
        severity: 'high',
        criteriaMet: ['HR/SBP meningkat'],
      },
    },
    redFlags: [
      {
        id: 'clinical-trajectory-t13',
        severity: 'critical',
        source: 'physiological',
        title: 'Imminent cardiac arrest proxy concern',
        rationale: 'T-13: Critical deterioration proxy aktif.',
      },
    ],
    missingDataWarnings: ['latest_spo2_missing'],
    uncertaintyNotes: ['history_depth_lt5'],
    integratedAssessment: {
      physiologicalSeverity: 'high',
      contextReviewFloor: 'high',
      calibratedSeverity: 'critical',
      physiologicalState: 'critical',
      finalState: 'critical',
      physiologicalDeteriorationScore: 72,
      calibratedDeteriorationScore: 80,
      confidence: 0.62,
      rationale: ['Critical trajectory support.'],
      recommendedAction: 'Review klinis segera.',
    },
    clinicalContext: {
      complaintSignals: [
        {
          id: 'resp-complaint',
          label: 'Sesak memberat',
          reviewSeverityFloor: 'high',
          matchedKeywords: ['sesak', 'napas'],
          rationale: 'Keluhan napas memburuk pada kunjungan terbaru.',
        },
      ],
      historicalDiagnosisSignals: [
        {
          id: 'resp-history',
          label: 'Pneumonia',
          reviewSeverityFloor: 'high',
          diagnoses: [],
          rationale: 'Diagnosis historis respirasi tetap aktif.',
        },
      ],
      therapySignals: [],
      clinicianContext: {
        sourceBreakdown: { scrapeCount: 3, uplinkCount: 1 },
        clinicianAttributionCount: 1,
        latestClinicianNames: ['dr. A'],
        hasHistoricalClinicianContext: true,
      },
      dataQualityScore: 0.7,
      dataQualityWarnings: ['current_complaint_sparse'],
      confirmedChronicDiagnoses: [],
    },
    longitudinalFrames: [
      {
        visitLabel: 'Kunjungan 1',
        observedAt: '2026-06-01T08:00:00.000Z',
        source: 'scrape',
        complaint: 'Sesak dan demam',
        diagnosisCode: 'J18.9',
        diagnosisLabel: 'Pneumonia',
        therapySummary: 'Terapi suportif dan observasi',
        vitalsSnapshot: {
          systolicBp: 128,
          diastolicBp: 82,
          heartRate: 104,
          respiratoryRate: 24,
          temperatureC: 38.1,
          glucoseMgDl: 166,
          spo2: 91,
        },
        trajectorySummary: {
          overallTrend: 'declining',
          physiologyState: 'deteriorating',
          riskLevel: 'high',
          deteriorationScore: 72,
          confidence: 0.62,
          news2AggregateScore: 7,
        },
        redFlagTitles: ['Respiratory worsening concern'],
        hypothesisLabels: ['Pneumonia'],
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
      primaryVitalDrivers: ['SpO2', 'Laju napas'],
      missingVitalWarnings: ['SpO2 pada kunjungan terbaru belum tersedia.'],
    },
    keyDriverContributions: [
      {
        driver: 'Respiratory worsening concern',
        contribution: 80,
        severity: 'high',
        explanation: 'T-45: RR naik dan SpO2 turun.',
      },
    ],
    baselineDeviation: [],
    baselineAvailability: {
      available: false,
      message: 'Baseline personal belum cukup karena riwayat kunjungan masih terbatas.',
    },
    mortalityProxy: {
      tier: 'high',
      score: 68,
      clinicalUrgencyTier: 'high',
    },
    priorityTrajectoryCoverage: [],
    timeToCritical: [],
    dataQualityWarnings: ['SpO2 pada kunjungan terbaru belum tersedia.'],
    uncertaintyNotes: ['Riwayat kunjungan kurang dari 5 titik.'],
  };
}

describe('ClinicalDifferential legacy auto-promote replacement', () => {
  it('keeps diagnosis review in physician-review mode instead of auto-promoting therapy', () => {
    const hybridResult = makeHybridResult();
    const viewModel = makeViewModel();

    render(
      <ClinicalReasoningDifferentialPanel hybridResult={hybridResult} viewModel={viewModel} />
    );

    const panel = screen.getByTestId('clinical-reasoning-differential-panel');
    expect(within(panel).getByText('Review next')).toBeInTheDocument();
    expect(
      within(panel).getByText('Select a working diagnosis to unlock therapy support.')
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('Therapy support locked until physician selection.')
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Diagnosis review unavailable' })
    ).toBeDisabled();
  });

  it('opens review-only therapy support only after physician-confirmed working diagnosis', () => {
    const workflow = buildClinicalReasoningWorkflowFromTrajectoryV2({
      hybridResult: makeHybridResult(),
      viewModel: makeViewModel(),
      physicianConfirmedCandidateId: 'candidate-sepsis-concern',
    });

    expect(workflow.arbiterResult.selectedWorkingDiagnosis?.id).toBe('candidate-sepsis-concern');
    expect(workflow.therapyReasoningPack.status).toBe('ready');
    expect(workflow.therapyReasoningPack.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'safety-stabilization-review',
        'sepsis-source-control-review',
        'protocol-antimicrobial-review',
      ])
    );
    expect(workflow.therapyReasoningPack.autoSubmit).toBe(false);
    expect(workflow.therapyReasoningPack.requiresPhysicianOrder).toBe(true);
  });
});
