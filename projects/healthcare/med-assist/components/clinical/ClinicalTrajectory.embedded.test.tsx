import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  analyzeHybridTrajectory: vi.fn(),
  mapHybridTrajectoryToLegacyAnalysis: vi.fn(),
  buildPhysicianSafeTrajectoryPresentation: vi.fn(),
  buildTrajectoryVisualizationViewModel: vi.fn(),
  evaluateCanonicalClinicalEngine: vi.fn(async () => ({
    request_id: 'req-test',
    processed_at: '2026-06-21T08:00:00.000Z',
    source: {
      engine: 'dashboard-clinical-engine' as const,
      engine_version: 'test',
      mode: 'canonical' as const,
    },
    scoring: {},
    alerts: [],
    recommendations: {
      immediate_actions: [],
      monitoring_actions: [],
      referral_actions: [],
      next_best_questions: [],
    },
    governance: {
      disclaimer: 'support only',
      review_required: true,
      authoritative_engine: 'dashboard' as const,
    },
    trajectory: {
      available: false,
      visit_count: 3,
    },
  })),
}));

vi.mock('@/components/ui/AssistShell', () => ({
  AssistShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: vi.fn(),
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalClinicalEngine: mocks.evaluateCanonicalClinicalEngine,
}));

vi.mock('@/lib/iskandar-diagnosis-engine/hybrid-trajectory', () => ({
  analyzeHybridTrajectory: mocks.analyzeHybridTrajectory,
  compareTrajectoryEngines: vi.fn(),
  isTrajectoryCompareModeEnabled: vi.fn(() => false),
  mapHybridTrajectoryToLegacyAnalysis: mocks.mapHybridTrajectoryToLegacyAnalysis,
}));

vi.mock('@/lib/iskandar-diagnosis-engine/presentation-safety', () => ({
  buildPhysicianSafeTrajectoryPresentation: mocks.buildPhysicianSafeTrajectoryPresentation,
}));

vi.mock('@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model', () => ({
  buildTrajectoryVisualizationViewModel: mocks.buildTrajectoryVisualizationViewModel,
}));

vi.mock('@/components/clinical/trajectory/v2', () => ({
  ClinicalTrajectoryV2: ({ patientContext }: { patientContext?: { name?: string } }) => (
    <div
      data-testid="mock-trajectory-v2"
      data-has-patient-context={patientContext ? 'yes' : 'no'}
      data-patient-name={patientContext?.name ?? ''}
    />
  ),
}));

import { ClinicalTrajectory } from './ClinicalTrajectory';

const HYBRID_RESULT = {
  integratedAssessment: {
    finalState: 'stable',
    confidence: 0.7,
  },
  physiologicalResult: {
    mortalityProxy: {
      tier: 'low',
      score: 0.2,
      clinicalUrgencyTier: 'routine',
    },
  },
  redFlags: [],
  missingDataWarnings: [],
  uncertaintyNotes: [],
};

const LEGACY_ANALYSIS = {
  overallTrend: 'stable',
  overallRisk: 'moderate',
};

const PHYSICIAN_PRESENTATION = {
  urgencyTier: 'moderate',
};

const VIEW_MODEL = {
  trajectoryTimeline: [],
};

const PREFETCHED_VISITS = [
  {
    patient_id: 'RM-CT-001',
    encounter_id: 'enc-1',
    timestamp: '2026-06-19T08:00:00.000Z',
    vitals: { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 },
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape' as const,
  },
  {
    patient_id: 'RM-CT-001',
    encounter_id: 'enc-2',
    timestamp: '2026-06-20T08:00:00.000Z',
    vitals: { sbp: 152, dbp: 96, hr: 98, rr: 21, temp: 37.7, glucose: 212 },
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape' as const,
  },
];

function renderTrajectory(shellMode: 'standalone' | 'embedded') {
  return render(
    <ClinicalTrajectory
      shellMode={shellMode}
      vitals={{
        sbp: 166,
        dbp: 104,
        hr: 112,
        rr: 24,
        temp: 38.2,
        spo2: 92,
        glucose: 286,
      }}
      keluhanUtama="Nyeri dada"
      keluhanTambahan="Sesak"
      narrative={{
        keluhan_utama: 'Nyeri dada',
        lama_sakit: '2 hari',
        is_akut: true,
        confidence: 0.84,
      }}
      alerts={[]}
      patientAge={57}
      patientGender="L"
      patientName="Tn. Sentra"
      patientRM="RM-CT-001"
      prefetchedVisits={PREFETCHED_VISITS}
      prefetchedDiagnostics={['OK']}
      prefetchedVisitStatus="ready"
    />
  );
}

describe('ClinicalTrajectory embedded patient context boundary', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.analyzeHybridTrajectory.mockReturnValue(HYBRID_RESULT);
    mocks.mapHybridTrajectoryToLegacyAnalysis.mockReturnValue(LEGACY_ANALYSIS);
    mocks.buildPhysicianSafeTrajectoryPresentation.mockReturnValue(PHYSICIAN_PRESENTATION);
    mocks.buildTrajectoryVisualizationViewModel.mockReturnValue(VIEW_MODEL);
  });

  it('does not pass patient context into ClinicalTrajectoryV2 when shellMode is embedded', async () => {
    mocks.analyzeHybridTrajectory.mockReturnValue(HYBRID_RESULT);
    mocks.mapHybridTrajectoryToLegacyAnalysis.mockReturnValue(LEGACY_ANALYSIS);
    mocks.buildPhysicianSafeTrajectoryPresentation.mockReturnValue(PHYSICIAN_PRESENTATION);
    mocks.buildTrajectoryVisualizationViewModel.mockReturnValue(VIEW_MODEL);

    renderTrajectory('embedded');

    const marker = await screen.findByTestId('mock-trajectory-v2');
    expect(marker).toHaveAttribute('data-has-patient-context', 'no');
    expect(marker).toHaveAttribute('data-patient-name', '');
  });

  it('keeps patient context for standalone trajectory rendering', async () => {
    mocks.analyzeHybridTrajectory.mockReturnValue(HYBRID_RESULT);
    mocks.mapHybridTrajectoryToLegacyAnalysis.mockReturnValue(LEGACY_ANALYSIS);
    mocks.buildPhysicianSafeTrajectoryPresentation.mockReturnValue(PHYSICIAN_PRESENTATION);
    mocks.buildTrajectoryVisualizationViewModel.mockReturnValue(VIEW_MODEL);

    renderTrajectory('standalone');

    const marker = await screen.findByTestId('mock-trajectory-v2');
    expect(marker).toHaveAttribute('data-has-patient-context', 'yes');
    expect(marker).toHaveAttribute('data-patient-name', 'Tn. Sentra');
  });
});
