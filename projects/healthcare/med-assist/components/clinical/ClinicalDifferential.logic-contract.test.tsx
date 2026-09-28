import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildTransferEligibleDiagnosisInput,
  buildUiFallbackDiagnoses,
  ClinicalDifferential,
} from './ClinicalDifferential';

import type { RankedDiagnosis } from '@/lib/iskandar-diagnosis-engine/diagnosis-algorithm';
import type { DiagnosisSuggestion, MedicationRecommendation } from '@/types/api';

const { mockEvaluateCanonicalDifferential } = vi.hoisted(() => ({
  mockEvaluateCanonicalDifferential: vi.fn(),
}));

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

const { mockRunDiagnosisAlgorithm } = vi.hoisted(() => ({
  mockRunDiagnosisAlgorithm: vi.fn(),
}));

const { mockBuildRMETransferPayload } = vi.hoisted(() => ({
  mockBuildRMETransferPayload: vi.fn(),
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalDifferential: mockEvaluateCanonicalDifferential,
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/lib/iskandar-diagnosis-engine/diagnosis-algorithm', () => ({
  runDiagnosisAlgorithm: mockRunDiagnosisAlgorithm,
}));

vi.mock('@/lib/rme/payload-mapper', () => ({
  buildRMETransferPayload: mockBuildRMETransferPayload,
}));

vi.mock('./ClinicalScreenTabs', () => ({
  ClinicalScreenTabs: () => <nav data-testid="clinical-screen-tabs" />,
}));

function makeSuggestion(overrides: Partial<DiagnosisSuggestion>): DiagnosisSuggestion {
  return {
    rank: 1,
    icd_x: 'J06.9',
    nama: 'Infeksi saluran napas atas',
    confidence: 0.72,
    rationale: 'Rasional klinis fixture.',
    red_flags: [],
    recommended_actions: ['Review pemeriksaan fisik'],
    ...overrides,
  };
}

function makeRankedDiagnosis(
  suggestion: DiagnosisSuggestion,
  overrides: Partial<RankedDiagnosis> = {}
): RankedDiagnosis {
  const rank = overrides.rank ?? suggestion.rank ?? 1;
  return {
    rank,
    suggestion: {
      ...suggestion,
      rank,
    },
    diagnosisScore: overrides.diagnosisScore ?? Math.round(suggestion.confidence * 100),
    adjustedConfidence: overrides.adjustedConfidence ?? suggestion.confidence,
    confidenceBand: overrides.confidenceBand ?? 'high',
    scoreBreakdown: {
      baseConfidence: Math.round(suggestion.confidence * 100),
      symptomFit: 72,
      vitalFit: 66,
      safetyPriority: 40,
      trajectoryFit: 50,
      confirmedChronicFit: 0,
      chronicPriorityBonus: 0,
      clinicalMismatchPenalty: 0,
      ...overrides.scoreBreakdown,
    },
    insight: {
      matchedSymptoms: ['batuk', 'demam'],
      vitalDrivers: ['RR meningkat'],
      supportingExamPlan: {
        needLevel: 'recommended',
        summary: 'Pemeriksaan fisik terarah direkomendasikan.',
        tests: ['Auskultasi paru'],
      },
      ...overrides.insight,
    },
    ...overrides,
  };
}

function makeTransferResult() {
  return {
    runId: 'rme-test-run',
    state: 'success',
    totalLatencyMs: 12,
    reasonCodes: [],
    steps: {
      anamnesa: {
        step: 'anamnesa',
        state: 'success',
        attempt: 1,
        latencyMs: 4,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
      },
      diagnosa: {
        step: 'diagnosa',
        state: 'success',
        attempt: 1,
        latencyMs: 4,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
      },
      resep: {
        step: 'resep',
        state: 'success',
        attempt: 1,
        latencyMs: 4,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
      },
    },
  };
}

const readySuggestions = [
  makeSuggestion({
    rank: 1,
    icd_x: 'J06.9',
    nama: 'Infeksi Saluran Napas Atas',
    confidence: 0.55,
  }),
  makeSuggestion({
    rank: 2,
    icd_x: 'J18.9',
    nama: 'Community Acquired Pneumonia',
    confidence: 0.87,
    red_flags: ['Hipoksemia perlu dievaluasi'],
  }),
];

const therapyMedication: MedicationRecommendation = {
  nama_obat: 'Paracetamol 500 mg',
  dosis: '3x1',
  aturan_pakai: 'Sesudah makan',
  durasi: '3 hari',
  rationale: 'Simptomatik demam.',
  safety_check: 'safe',
};

/** The proposed primary: the card under the primary label on the Diagnosis step. */
async function findPrimaryCard(): Promise<HTMLElement> {
  const label = await screen.findByTestId('dx-flow-primary-label');
  const card = label.parentElement?.querySelector<HTMLElement>('[data-testid="dx-flow-card"]');
  if (!card) throw new Error('no card under the primary label');
  return card;
}

function renderClinicalDifferential(
  overrides: Partial<React.ComponentProps<typeof ClinicalDifferential>> = {}
) {
  return render(
    <ClinicalDifferential
      keluhanUtama="Demam dan batuk sejak 3 hari"
      keluhanTambahan="Nafsu makan menurun"
      patientAge={32}
      patientGender="P"
      patientRM="RM-LOGIC-001"
      allergies={[]}
      confirmedPregnancyStatus={false}
      vitals={{ sbp: 118, dbp: 76, hr: 96, rr: 22, temp: 38.1, glucose: 112 }}
      canonicalOutput={null}
      hasVisitHistory={false}
      onBack={() => undefined}
      onDiagnosisChange={() => undefined}
      onMedicationsChange={() => undefined}
      {...overrides}
    />
  );
}

beforeEach(() => {
  mockEvaluateCanonicalDifferential.mockResolvedValue({
    diagnosis_suggestions: [],
    alerts: [],
    meta: {
      processing_time_ms: 1,
    },
  });

  mockBuildRMETransferPayload.mockReturnValue({
    payload: {
      anamnesa: {},
      diagnosa: {},
      resep: {},
      options: {},
      meta: {},
    },
    reasonCodes: [],
  });

  mockRunDiagnosisAlgorithm.mockImplementation(
    ({ suggestions }: { suggestions: DiagnosisSuggestion[] }) =>
      suggestions.map((suggestion, index) => makeRankedDiagnosis(suggestion, { rank: index + 1 }))
  );

  mockSendMessage.mockImplementation(async (type: string, payload?: Record<string, unknown>) => {
    if (type === 'resolveTenagaMedis') {
      return {
        success: true,
        tenagaMedis: {
          dokterNama: 'dr. Sentra',
          perawatNama: 'Ns. Assist',
          source: ['test'],
          capturedAt: '2026-07-02T08:00:00.000Z',
        },
      };
    }

    if (type === 'getSuggestions') {
      return {
        success: true,
        data: {
          diagnosis_suggestions: readySuggestions,
          meta: {
            processing_time_ms: 24,
          },
        },
      };
    }

    if (type === 'getRecommendations') {
      return {
        success: true,
        data: {
          medication_recommendations: [therapyMedication],
          alerts: [],
          clinical_guidelines: ['Review dokter sebelum resep dikirim.'],
          pharmacotherapy_explainability: {
            confidence: 68,
            drivers: ['demam'],
            missing_data: ['fungsi_renal'],
            risk_tier: 'routine',
            review_window: '48h',
            pathway: 'knowledge-only',
          },
        },
      };
    }

    if (type === 'transferRME') {
      return makeTransferResult();
    }

    throw new Error(`Unhandled mock message type: ${type} ${JSON.stringify(payload)}`);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ClinicalDifferential secure logic contract', () => {
  it('fails closed to a single insufficient-data fallback even for chest-pain complaints', () => {
    const fallback = buildUiFallbackDiagnoses('Nyeri dada sejak tadi pagi', {
      sbp: 182,
      dbp: 96,
      hr: 126,
      rr: 28,
      temp: 36.8,
      glucose: 118,
    });

    expect(fallback).toEqual([
      expect.objectContaining({
        rank: 1,
        icd_x: 'R69',
        nama: 'Data belum cukup untuk diagnosis spesifik',
        confidence: 0.12,
      }),
    ]);
    expect(fallback).toHaveLength(1);
    expect(fallback.map((item) => item.icd_x)).not.toContain('I20.9');
    expect(fallback.map((item) => item.icd_x)).not.toContain('M94.0');
    expect(fallback[0].rationale).toMatch(/canonical\/CDSS|bukti klinis belum cukup/i);
  });

  it('keeps R69 fallback display-only by excluding it from transfer/autofill diagnosis payload', () => {
    expect(
      buildTransferEligibleDiagnosisInput(
        {
          icd_x: 'R69',
          nama: 'Data belum cukup untuk diagnosis spesifik',
        },
        'PRIMER'
      )
    ).toBeUndefined();
  });

  it('keeps evidence-backed diagnosis candidates eligible for transfer/autofill payload', () => {
    expect(
      buildTransferEligibleDiagnosisInput(
        {
          icd_x: 'J18.9',
          nama: 'Community Acquired Pneumonia',
        },
        'PRIMER'
      )
    ).toEqual({
      icd_x: 'J18.9',
      nama: 'Community Acquired Pneumonia',
      jenis: 'PRIMER',
    });
  });

  it('uses ranked diagnosis output for the primary diagnosis card', async () => {
    mockRunDiagnosisAlgorithm.mockReturnValue([
      makeRankedDiagnosis(readySuggestions[1], {
        rank: 1,
        diagnosisScore: 88,
        adjustedConfidence: 0.88,
        confidenceBand: 'very_high',
      }),
      makeRankedDiagnosis(readySuggestions[0], {
        rank: 2,
        diagnosisScore: 52,
        adjustedConfidence: 0.52,
        confidenceBand: 'moderate',
      }),
    ]);

    renderClinicalDifferential();

    const primaryCard = await findPrimaryCard();
    expect(primaryCard).toHaveTextContent(/J18\.9 - Community Acquired Pneumonia/i);
    expect(primaryCard).not.toHaveTextContent(/J06\.9 - Infeksi Saluran Napas Atas/i);
  });

  it('keeps insufficient-data state detectable without upgrading it to high confidence', async () => {
    const insufficientSuggestion = makeSuggestion({
      rank: 1,
      icd_x: 'R69',
      nama: 'Data klinis belum cukup',
      confidence: 0.12,
      rationale: 'Data belum cukup untuk diagnosis kerja.',
      recommended_actions: ['Lengkapi anamnesis dan pemeriksaan fisik'],
    });

    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'resolveTenagaMedis') {
        return {
          success: true,
          tenagaMedis: {
            dokterNama: 'dr. Sentra',
            perawatNama: 'Ns. Assist',
            source: ['test'],
            capturedAt: '2026-07-02T08:00:00.000Z',
          },
        };
      }
      if (type === 'getSuggestions') {
        return {
          success: true,
          data: {
            diagnosis_suggestions: [insufficientSuggestion],
            meta: {
              processing_time_ms: 14,
            },
          },
        };
      }
      if (type === 'getRecommendations') {
        return {
          success: true,
          data: {
            medication_recommendations: [],
            alerts: [],
            clinical_guidelines: [],
          },
        };
      }
      if (type === 'transferRME') {
        return makeTransferResult();
      }
      throw new Error(`Unhandled mock message type: ${type}`);
    });
    mockRunDiagnosisAlgorithm.mockReturnValue([
      makeRankedDiagnosis(insufficientSuggestion, {
        adjustedConfidence: 0.12,
        confidenceBand: 'low',
        insight: {
          matchedSymptoms: [],
          vitalDrivers: [],
          supportingExamPlan: {
            needLevel: 'recommended',
            summary: 'Lengkapi anamnesis dan pemeriksaan fisik.',
            tests: ['Anamnesis terarah'],
          },
        },
      }),
    ]);

    renderClinicalDifferential();

    const primaryCard = await screen.findByLabelText('Diagnosis');
    await within(primaryCard).findByTestId('dx-flow-complete-data');
    expect(primaryCard).toBeInTheDocument();
    expect(primaryCard).toHaveTextContent(/Data belum cukup/i);
    expect(primaryCard).toHaveTextContent(/Data belum cukup untuk menetapkan diagnosis utama/i);
    expect(primaryCard).not.toHaveTextContent(/High confidence|Very high confidence/i);
  });

  it('keeps successful engine-backed diagnosis results instead of replacing them with fallback', async () => {
    renderClinicalDifferential();

    const primaryCard = await findPrimaryCard();
    expect(primaryCard).toHaveTextContent(/J06\.9 - Infeksi Saluran Napas Atas/i);
    expect(primaryCard).not.toHaveTextContent(/Data belum cukup untuk diagnosis spesifik/i);
    expect(primaryCard).not.toHaveTextContent(/\bR69\b/i);
  });

  it('keeps manual diagnosis controls available and submits the typed ICD and name', async () => {
    const onDiagnosisChange = vi.fn();

    renderClinicalDifferential({ onDiagnosisChange });

    const diagnosisStep = await screen.findByLabelText('Diagnosis');
    fireEvent.click(await within(diagnosisStep).findByRole('button', { name: /diagnosis manual/i }));
    const manualCodeInput = screen.getByPlaceholderText(/ICD-X manual/i);
    const manualInputPanel = manualCodeInput.parentElement;
    expect(manualInputPanel).toBeTruthy();

    fireEvent.change(manualCodeInput, {
      target: { value: 'Z99.9' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Nama diagnosis manual/i), {
      target: { value: 'Diagnosis manual uji' },
    });
    fireEvent.click(
      within(manualInputPanel as HTMLElement).getByRole('button', {
        name: /gunakan diagnosis manual/i,
      })
    );

    await waitFor(() => {
      expect(onDiagnosisChange).toHaveBeenCalledWith({
        icd_x: 'Z99.9',
        nama: 'Diagnosis manual uji',
      });
    });
  });

  // Temuan #1 restore (2026-07-05): pharmacotherapy + RME transfer are now wired
  // onto the focused Diagnosis surface. The security contract is no longer
  // "keep them out" but "render them fail-closed" — no proposed medication and
  // no enabled transfer until a physician selects an evidence-backed diagnosis.
  it('surfaces pharmacotherapy review fail-closed until a diagnosis is selected', async () => {
    renderClinicalDifferential();

    const workspace = await screen.findByTestId('diagnosis-workspace');
    // Therapy review is the next page, reached only once a diagnosis is selected
    // (2026-09-28: Terapi and RME moved off the Diagnosis page)...
    expect(within(workspace).queryByTestId('dx-flow-ghost-therapy')).toBeNull();
    expect(within(workspace).queryByLabelText('Terapi')).toBeNull();
    // ...so no medication is proposed until a working diagnosis is selected.
    expect(within(workspace).queryByText(/Paracetamol 500 mg/i)).toBeNull();
    fireEvent.click((await within(workspace).findAllByTestId('dx-flow-card'))[0]);
    expect(await within(workspace).findByLabelText('Terapi')).toBeTruthy();
  });

  it('renders RME transfer controls with resep fail-closed until a medication is selected', async () => {
    renderClinicalDifferential();

    const workspace = await screen.findByTestId('diagnosis-workspace');
    // RME is on the next page with Terapi, not on the Diagnosis page.
    expect(within(workspace).queryByTestId('dx-flow-ghost-rme')).toBeNull();
    // Resep uplink stays fail-closed until the physician selects a medication: reach the
    // RME step with a diagnosis and no medication, and no transfer is dispatched merely
    // by rendering the surface.
    fireEvent.click((await within(workspace).findAllByTestId('dx-flow-card'))[0]);
    fireEvent.click(await within(workspace).findByRole('button', { name: 'Lanjut tanpa obat' }));
    const rmeStep = within(workspace).getByLabelText('RME');
    expect(within(rmeStep).getByRole('button', { name: 'Kirim resep' })).toBeDisabled();
    expect(mockSendMessage).not.toHaveBeenCalledWith('transferRME', expect.anything());
  });
});
