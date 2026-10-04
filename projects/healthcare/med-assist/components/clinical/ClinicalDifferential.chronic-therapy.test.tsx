import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClinicalDifferential } from './ClinicalDifferential';

import type { RecurrentDiagnosisCandidate } from '@/lib/clinical/recurrent-diagnosis';

const { mockSendMessage, recurrentState } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  recurrentState: { candidates: [] as RecurrentDiagnosisCandidate[] },
}));

vi.mock('./diagnosis/useRecurrentDiagnoses', () => ({
  useRecurrentDiagnoses: () => ({ candidates: recurrentState.candidates, loaded: true }),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalDifferential: vi.fn().mockRejectedValue(new Error('canonical unavailable')),
}));

vi.mock('@/lib/iskandar-diagnosis-engine/diagnosis-algorithm', () => ({
  runDiagnosisAlgorithm: vi.fn(
    (input: {
      suggestions: Array<{
        icd_x: string;
        nama: string;
        confidence: number;
        rationale?: string;
        red_flags?: string[];
        recommended_actions?: string[];
        rank?: number;
      }>;
    }) =>
      input.suggestions.slice(0, 1).map((suggestion, index) => ({
        rank: index + 1,
        suggestion,
        diagnosisScore: 82,
        adjustedConfidence: suggestion.confidence,
        confidenceBand: 'high',
        scoreBreakdown: {
          baseConfidence: 82,
          symptomFit: 70,
          vitalFit: 75,
          safetyPriority: 40,
          trajectoryFit: 50,
          confirmedChronicFit: 0,
          chronicPriorityBonus: 0,
          clinicalMismatchPenalty: 0,
        },
        insight: {
          matchedSymptoms: ['kontrol tekanan darah'],
          vitalDrivers: ['tekanan darah 150/90'],
          supportingExamPlan: {
            needLevel: 'recommended',
            summary: 'Evaluasi tekanan darah serial',
            tests: ['Tekanan darah ulang'],
          },
        },
      }))
  ),
}));

vi.mock('@/lib/iskandar-diagnosis-engine/symptom-matcher', () => ({
  searchPenyakitByName: vi.fn(() => Promise.resolve([])),
  getPenyakitByIcd: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/components/ui/AssistShell', () => ({
  AssistShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="assist-shell-wrapper">{children}</div>
  ),
}));

vi.mock('./ClinicalImpressionPanel', () => ({
  ClinicalImpressionPanel: () => <div data-testid="clinical-impression-panel" />,
}));

describe('ClinicalDifferential chronic therapy context', () => {
  beforeEach(() => {
    recurrentState.candidates = [];
    mockSendMessage.mockReset();
    mockSendMessage.mockImplementation((type: string) => {
      if (type === 'getSuggestions') {
        return Promise.resolve({
          success: true,
          data: {
            diagnosis_suggestions: [
              {
                rank: 1,
                icd_x: 'I10',
                nama: 'Hipertensi esensial',
                confidence: 0.82,
                rationale: 'Fixture diagnosis',
                red_flags: [],
                recommended_actions: [],
              },
            ],
            medication_recommendations: [],
            alerts: [],
            meta: {
              processing_time_ms: 1,
              model_version: 'test',
              timestamp: '2026-06-30T00:00:00.000Z',
            },
          },
        });
      }

      if (type === 'getRecommendations') {
        return Promise.resolve({
          success: true,
          data: {
            diagnosis_suggestions: [],
            medication_recommendations: [],
            alerts: [],
            clinical_guidelines: [],
            meta: {
              processing_time_ms: 1,
              model_version: 'test',
              timestamp: '2026-06-30T00:00:00.000Z',
            },
          },
        });
      }

      return Promise.resolve({ success: true });
    });
  });

  it('passes chronic therapy names as current medications for pharmacotherapy review', async () => {
    render(
      <ClinicalDifferential
        keluhanUtama="Kontrol tekanan darah"
        patientAge={54}
        patientGender="L"
        patientRM="RM-123"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 150, dbp: 90, hr: 82, rr: 20, temp: 36.8, glucose: 0 }}
        chronicTherapies={['Amlodipin', 'Metformin']}
        hasVisitHistory
        onBack={() => undefined}
      />
    );

    // Auto-promote diagnosis utama sudah dihapus dari desain: dokter harus
    // memilih aktif sebelum farmakoterapi diambil.
    const selectPrimary = (await screen.findByText('I10 - Hipertensi esensial')).closest(
      '[data-testid="dx-flow-card"]'
    );
    expect(selectPrimary).not.toBeNull();
    if (!selectPrimary) throw new Error('diagnosis card not found');
    fireEvent.click(selectPrimary);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'getRecommendations',
        expect.objectContaining({
          current_medications: ['Amlodipin', 'Metformin'],
        })
      );
    });
  });

  it('passes the chronic conditions the Diagnosis page shows as penyakit_kronis', async () => {
    recurrentState.candidates = [
      { icd: 'E11', name: 'Diabetes melitus tipe 2', count: 3, visitsConsidered: 6, lastSeen: '2026-09-01', label: 'Kronis' },
      { icd: 'J06', name: 'ISPA', count: 3, visitsConsidered: 6, lastSeen: '2026-09-01', label: 'Berulang' },
    ];
    render(
      <ClinicalDifferential
        keluhanUtama="Kontrol tekanan darah"
        patientAge={54}
        patientGender="L"
        patientRM="RM-123"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 150, dbp: 90, hr: 82, rr: 20, temp: 36.8, glucose: 0 }}
        chronicTherapies={[]}
        hasVisitHistory
        onBack={() => undefined}
      />
    );

    // The test engine keeps one row; whichever diagnosis is chosen, the request carries the history.
    const [card] = await screen.findAllByTestId('dx-flow-card');
    fireEvent.click(card);

    // Only the history the page labels "Kronis" is a chronic condition; "Berulang" is not.
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'getRecommendations',
        expect.objectContaining({ penyakit_kronis: ['Diabetes melitus tipe 2'] })
      );
    });
  });
});
