import { describe, expect, it } from 'vitest';

import type { HybridTrajectoryResult } from './hybrid-trajectory';
import type { TrajectoryVisualizationViewModel } from './trajectory-visualization-view-model';
import { buildClinicalReasoningWorkflowFromTrajectoryV2 } from './clinical-reasoning-workflow';

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
          id: 'T-59',
          label: 'Cardiovascular shock trajectory',
          severity: 'high',
          rationale: 'Shock trajectory watch.',
          evidence: ['Shock index meningkat'],
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
        {
          id: 'T-51',
          label: 'Respons terapi baik',
          severity: 'low',
          rationale: 'Sebagian parameter membaik.',
          evidence: ['HR slope membaik'],
        },
        {
          id: 'T-52',
          label: 'Treatment response poor',
          severity: 'high',
          rationale: 'Perburukan tetap berlanjut.',
          evidence: ['RR tetap naik setelah terapi'],
        },
        {
          id: 'T-25',
          label: 'DM-to-renal baseline proxy',
          severity: 'low',
          rationale: 'Konteks DM dan renal.',
          evidence: ['Riwayat DM', 'Riwayat renal'],
        },
        {
          id: 'T-38',
          label: '30-day readmission risk proxy',
          severity: 'moderate',
          rationale: 'Konteks follow-up dan readmission.',
          evidence: ['Kunjungan berulang'],
        },
        {
          id: 'T-58',
          label: 'Mortality risk usia lanjut proxy',
          severity: 'high',
          rationale: 'Usia lanjut dan severity tinggi.',
          evidence: ['Usia 74', 'Severity tinggi'],
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
      complaintSignals: [],
      historicalDiagnosisSignals: [],
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
        complaint: 'Demam dan sesak',
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
  const coverage = [
    'T-45',
    'T-46',
    'T-54',
    'T-50',
    'T-16',
    'T-59',
    'T-13',
    'T-52',
    'T-51',
    'T-25',
    'T-38',
    'T-58',
  ] as const;

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
      {
        driver: 'Treatment response poor',
        contribution: 78,
        severity: 'high',
        explanation: 'T-52: RR tetap naik setelah terapi.',
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
    priorityTrajectoryCoverage: coverage.map((id) => ({
      id,
      label: `Coverage ${id}`,
      status: id === 'T-38' ? 'supported' : 'active',
      evidence: [`${id}: evidence preserved`],
    })),
    timeToCritical: [],
    dataQualityWarnings: ['SpO2 pada kunjungan terbaru belum tersedia.'],
    uncertaintyNotes: ['Riwayat kunjungan kurang dari 5 titik.'],
  };
}

describe('buildClinicalReasoningWorkflowFromTrajectoryV2', () => {
  it('ties trajectory, evidence, differential, arbiter, physician selection gate, therapy lock, and audit trail', () => {
    const workflow = buildClinicalReasoningWorkflowFromTrajectoryV2({
      hybridResult: makeHybridResult(),
      viewModel: makeViewModel(),
    });

    expect(workflow.workflowStatus).toBe('awaiting_physician_selection');
    expect(workflow.evidencePack.clinicalFacts.length).toBeGreaterThan(0);
    expect(workflow.differentialCandidates.length).toBeGreaterThan(0);
    expect(workflow.arbiterResult.therapyGate.status).toBe('locked');
    expect(workflow.therapyReasoningPack.status).toBe('locked');
    expect(workflow.auditTrail.map((event) => event.stage)).toEqual([
      'trajectory_evidence',
      'differential_candidates',
      'reasoning_arbiter',
      'physician_selection',
      'therapy_reasoning',
    ]);
    expect(workflow.auditTrail.find((event) => event.stage === 'physician_selection')?.status).toBe(
      'ready'
    );
    expect(JSON.stringify(workflow)).not.toMatch(/"therapyPlan"/);
  });

  it('opens review-only therapy reasoning after physician working diagnosis selection', () => {
    const workflow = buildClinicalReasoningWorkflowFromTrajectoryV2({
      hybridResult: makeHybridResult(),
      viewModel: makeViewModel(),
      physicianConfirmedCandidateId: 'candidate-sepsis-concern',
    });

    expect(workflow.workflowStatus).toBe('therapy_reasoning_ready');
    expect(workflow.arbiterResult.selectedWorkingDiagnosis?.id).toBe('candidate-sepsis-concern');
    expect(workflow.therapyReasoningPack.status).toBe('ready');
    expect(workflow.therapyReasoningPack.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'safety-stabilization-review',
        'protocol-antimicrobial-review',
      ])
    );
    expect(workflow.auditTrail.find((event) => event.stage === 'physician_selection')?.status).toBe(
      'completed'
    );
    expect(workflow.auditTrail.find((event) => event.stage === 'therapy_reasoning')?.status).toBe(
      'ready'
    );
    expect(JSON.stringify(workflow)).not.toMatch(/"therapyPlan"/);
  });
});
