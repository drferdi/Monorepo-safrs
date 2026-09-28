import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClinicalDifferential } from './ClinicalDifferential';

/**
 * Acceptance regression for Temuan #1 (audit E2E): the live Diagnosis surface
 * must let a physician send diagnosis + resep to RME. Drives the REAL
 * ClinicalDifferential -> DiagnosisStepFlow subtree from suggestion data
 * through diagnosis selection, therapy load, medication selection, to the RME
 * transfer buttons — proving the data path reaches "ready", not just that a
 * hand-built view model renders. (Follows LESSONS [2026-07-05]: drive the real
 * parent->child subtree, not the child in isolation.)
 */

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
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
          matchedSymptoms: ['nyeri tenggorokan'],
          vitalDrivers: ['suhu 38.0'],
          supportingExamPlan: {
            needLevel: 'recommended',
            summary: 'Evaluasi faring',
            tests: ['Pemeriksaan tenggorokan'],
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

vi.mock('@/components/ui/ConsoleFrame', () => ({
  ConsoleFrame: ({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) => (
    <section aria-label={ariaLabel}>{children}</section>
  ),
}));

vi.mock('./CTHeader', () => ({
  CTHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
}));

vi.mock('./ClinicalScreenTabs', () => ({
  ClinicalScreenTabs: () => <div data-testid="clinical-screen-tabs" />,
}));

vi.mock('./ClinicalImpressionPanel', () => ({
  ClinicalImpressionPanel: () => <div data-testid="clinical-impression-panel" />,
}));

const MEDICATION = {
  nama_obat: 'Amoksisilin 500mg',
  dosis: '3x1',
  aturan_pakai: 'sesudah makan',
  durasi: '5 hari',
  rationale: 'Antibiotik lini pertama faringitis bakterial',
  safety_check: 'safe',
  contraindications: [],
};

function primeMessaging() {
  mockSendMessage.mockReset();
  mockSendMessage.mockImplementation((type: string) => {
    if (type === 'getSuggestions') {
      return Promise.resolve({
        success: true,
        data: {
          diagnosis_suggestions: [
            {
              rank: 1,
              icd_x: 'J02',
              nama: 'Faringitis akut',
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
            timestamp: '2026-07-05T00:00:00.000Z',
          },
        },
      });
    }
    if (type === 'getRecommendations') {
      return Promise.resolve({
        success: true,
        data: {
          diagnosis_suggestions: [],
          medication_recommendations: [MEDICATION],
          alerts: [],
          clinical_guidelines: [],
          meta: {
            processing_time_ms: 1,
            model_version: 'test',
            timestamp: '2026-07-05T00:00:00.000Z',
          },
        },
      });
    }
    if (type === 'transferRME') {
      const step = (name: string) => ({
        step: name,
        state: 'success',
        attempt: 1,
        latencyMs: 4,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
      });
      return Promise.resolve({
        state: 'success',
        runId: 'run-test',
        totalLatencyMs: 12,
        reasonCodes: [],
        steps: { anamnesa: step('anamnesa'), diagnosa: step('diagnosa'), resep: step('resep') },
      });
    }
    return Promise.resolve({ success: true });
  });
}

function renderSurface() {
  return render(
    <ClinicalDifferential
      keluhanUtama="Nyeri tenggorokan dan demam"
      patientAge={28}
      patientGender="L"
      patientRM="RM-J02"
      allergies={[]}
      confirmedPregnancyStatus={false}
      vitals={{ sbp: 118, dbp: 76, hr: 88, rr: 18, temp: 38, glucose: 0 }}
      chronicTherapies={[]}
      hasVisitHistory={false}
      onBack={() => undefined}
    />
  );
}

describe('ClinicalDifferential live RME transfer (Diagnosis surface)', () => {
  beforeEach(() => {
    primeMessaging();
  });

  it('lets the physician select a diagnosis, pick a medication, and uplink diagnosis + resep to RME', async () => {
    renderSurface();

    // Select the working diagnosis.
    const selectPrimary = (await screen.findByText('J02 - Faringitis akut')).closest(
      '[data-testid="dx-flow-card"]'
    );
    expect(selectPrimary).not.toBeNull();
    if (!selectPrimary) throw new Error('diagnosis card not found');
    fireEvent.click(selectPrimary);

    // Choosing a diagnosis must move the flow on to Terapi, rendered in full,
    // not just leave it as a one-line ghost.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Terapi' })).toBeInTheDocument();
      expect(screen.queryByTestId('dx-flow-ghost-therapy')).toBeNull();
    });

    // Therapy for the selected diagnosis must render on the live surface.
    const findMedicationRow = async () => {
      const row = (await screen.findByText(/Amoksisilin 500mg/)).closest('[data-testid="dx-flow-med"]');
      expect(row).not.toBeNull();
      if (!row) throw new Error('medication row not found');
      return row;
    };
    expect(await findMedicationRow()).toBeInTheDocument();

    // A diagnosis-only transfer stays reachable: continue without medication to RME.
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa obat' }));

    // "Kirim diagnosis" is enabled once a valid diagnosis is selected.
    const kirimDiagnosis = screen.getByRole('button', { name: 'Kirim diagnosis' });
    expect(kirimDiagnosis).toBeEnabled();

    // "Kirim resep" is gated until at least one medication is selected.
    const kirimResep = screen.getByRole('button', { name: 'Kirim resep' });
    expect(kirimResep).toBeDisabled();

    // Select the proposed medication.
    fireEvent.click(screen.getByRole('button', { name: 'ubah Terapi' }));
    fireEvent.click(await findMedicationRow());
    fireEvent.click(await screen.findByRole('button', { name: 'Lanjut' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Kirim resep' })).toBeEnabled());

    // Uplink resep dispatches an RME transfer for the resep step.
    fireEvent.click(screen.getByRole('button', { name: 'Kirim resep' }));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'transferRME',
        expect.objectContaining({
          options: expect.objectContaining({ onlyStep: 'resep' }),
        })
      );
    });

    // Uplink diagnosis dispatches an RME transfer for the diagnosa step.
    fireEvent.click(screen.getByRole('button', { name: 'Kirim diagnosis' }));
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'transferRME',
        expect.objectContaining({
          options: expect.objectContaining({ onlyStep: 'diagnosa' }),
        })
      );
    });
  });
});
