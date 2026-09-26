import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  createDiagnosisPageViewModel,
  type DiagnosisPageViewModelInput,
} from './diagnosisViewModel';

function makeInput(
  overrides: Partial<DiagnosisPageViewModelInput> = {}
): DiagnosisPageViewModelInput {
  return {
    context: {
      patientRM: 'RM-VM-001',
      patientAge: 32,
      patientGender: 'P',
      pregnancyLabel: 'Confirmed: Not Pregnant',
      allergySummary: 'Tidak ada alergi',
      chronicTherapySummary: 'Tidak ada terapi kronis',
    },
    primary: {
      code: 'J18.9',
      name: 'Community Acquired Pneumonia',
      displayLabel: 'J18.9 - Community Acquired Pneumonia',
      confidenceLabel: 'High confidence',
      isSelected: true,
      isSelectionBlocked: false,
      isInsufficient: false,
      missingEvidence: ['Foto toraks bila perlu'],
      reviewItems: ['Review auskultasi paru'],
      redFlags: [],
    },
    evidence: {
      supports: ['Demam', 'Batuk'],
      against: ['Tidak ada wheezing'],
      missing: ['Foto toraks bila perlu'],
      review: ['Review auskultasi paru'],
      redFlags: [],
      doNotMiss: ['Pneumonia berat'],
    },
    candidates: [
      {
        id: '1-J18.9',
        rank: 1,
        code: 'J18.9',
        name: 'Community Acquired Pneumonia',
        displayLabel: 'J18.9 - Community Acquired Pneumonia',
        confidenceLabel: 'High confidence',
        source: 'suggested',
        isSelected: true,
        isSelectionBlocked: false,
        supports: ['Demam'],
        against: [],
        missing: ['Foto toraks bila perlu'],
        review: ['Review auskultasi paru'],
      },
    ],
    selectedDiagnoses: [
      {
        key: 'suggested:1:J18.9',
        displayLabel: 'J18.9 - Community Acquired Pneumonia',
        sourceLabel: 'Rekomendasi sistem',
      },
    ],
    therapy: {
      state: 'ready',
      hasDiagnosisBasis: true,
      selectedDiagnosisCount: 1,
      selectedMedicationCount: 1,
      candidateMedicationCount: 2,
      manualMedicationAvailable: true,
      reviewOnly: true,
      diagnosisBasisLabel: 'J18.9',
      groups: [
        {
          diagnosisKey: 'suggested:1:J18.9',
          diagnosisLabel: 'J18.9 - Community Acquired Pneumonia',
          sourceLabel: 'Rekomendasi sistem',
          statusText: 'ready',
          detailItems: ['Review 24h'],
          medications: [
            {
              key: 'Paracetamol 500 mg|3x1|Sesudah makan',
              name: 'Paracetamol 500 mg',
              doseLine: '3x1 • Sesudah makan • 3 hari',
              rationale: 'Simptomatik demam',
              safetyLabel: 'SAFE',
              contraindications: [],
              isSelected: true,
              sourceLabel: 'PROPOSAL',
            },
          ],
        },
      ],
    },
    transfer: {
      state: 'idle',
      diagnosisReady: true,
      resepReady: true,
      canAutoFill: true,
      selectedDiagnosisLabel: 'J18.9 - Community Acquired Pneumonia',
      selectedMedicationCount: 1,
      candidateMedicationCount: 2,
      reasonLabels: [],
      error: '',
      resultSummary: null,
      readinessMessage: null,
      steps: [
        {
          key: 'diagnosa',
          label: 'Diagnosis',
          state: 'idle',
          detail: 'ok:0 fail:0 skip:0',
          reason: null,
          message: null,
        },
      ],
    },
    ...overrides,
  };
}

describe('diagnosisViewModel', () => {
  it('keeps insufficient-data presentation safe without mutating clinical input', () => {
    const input = makeInput({
      primary: {
        code: 'R69',
        name: 'Data klinis belum cukup',
        displayLabel: 'R69 - Data klinis belum cukup',
        confidenceLabel: 'Insufficient data',
        isSelected: false,
        isSelectionBlocked: false,
        isInsufficient: true,
        missingEvidence: ['Lengkapi anamnesis'],
        reviewItems: ['Review pemeriksaan fisik'],
        redFlags: [],
      },
      evidence: {
        supports: [],
        against: [],
        missing: ['Lengkapi anamnesis'],
        review: ['Review pemeriksaan fisik'],
        redFlags: [],
        doNotMiss: [],
      },
    });

    const originalPrimary = input.primary;
    const view = createDiagnosisPageViewModel(input);

    expect(view.primary.isInsufficient).toBe(true);
    expect(view.primary.canLock).toBe(false);
    expect(view.primary.candidateLabel).not.toMatch(/R69/);
    expect(view.primary.primaryCtaLabel).toMatch(/Lengkapi Data Diagnosis/i);
    expect(view.evidence.missing).toEqual(['Lengkapi anamnesis']);
    expect(input.primary).toBe(originalPrimary);
  });

  it('preserves ranked diagnosis and candidate selection display data', () => {
    const view = createDiagnosisPageViewModel(makeInput());

    expect(view.primary).toEqual(
      expect.objectContaining({
        canLock: true,
        candidateLabel: 'J18.9 - Community Acquired Pneumonia',
        confidenceLabel: 'High confidence',
        primaryCtaLabel: 'Batalkan Diagnosis Utama',
      })
    );
    expect(view.candidates[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        code: 'J18.9',
        confidenceLabel: 'High confidence',
        isSelected: true,
        isSelectionBlocked: false,
      })
    );
    expect(view.selectedDiagnoses[0]).toEqual(
      expect.objectContaining({
        displayLabel: 'J18.9 - Community Acquired Pneumonia',
      })
    );
  });

  it('preserves manual diagnosis override semantics as selected primary display data', () => {
    const view = createDiagnosisPageViewModel(
      makeInput({
        primary: {
          code: 'Z99.9',
          name: 'Diagnosis manual uji',
          displayLabel: 'Z99.9 - Diagnosis manual uji',
          confidenceLabel: 'Manual review',
          isSelected: true,
          isSelectionBlocked: false,
          isInsufficient: false,
          missingEvidence: [],
          reviewItems: ['Review dokter'],
          redFlags: [],
        },
        candidates: [
          {
            id: 'manual-Z99.9',
            rank: 1,
            code: 'Z99.9',
            name: 'Diagnosis manual uji',
            displayLabel: 'Z99.9 - Diagnosis manual uji',
            confidenceLabel: 'Manual review',
            source: 'manual',
            isSelected: true,
            isSelectionBlocked: false,
            supports: [],
            against: [],
            missing: [],
            review: ['Review dokter'],
          },
        ],
      })
    );

    expect(view.primary.candidateLabel).toBe('Z99.9 - Diagnosis manual uji');
    expect(view.candidates[0]).toEqual(
      expect.objectContaining({
        source: 'manual',
        isSelected: true,
      })
    );
  });

  it('preserves therapy, medication selection, and RME readiness counters', () => {
    const view = createDiagnosisPageViewModel(makeInput());

    expect(view.therapy).toEqual(
      expect.objectContaining({
        state: 'ready',
        hasDiagnosisBasis: true,
        selectedDiagnosisCount: 1,
        selectedMedicationCount: 1,
        candidateMedicationCount: 2,
        manualMedicationAvailable: true,
        reviewOnly: true,
      })
    );
    expect(view.therapy.groups[0].medications[0]).toEqual(
      expect.objectContaining({
        name: 'Paracetamol 500 mg',
        isSelected: true,
      })
    );
    expect(view.transfer).toEqual(
      expect.objectContaining({
        state: 'idle',
        diagnosisReady: true,
        resepReady: true,
        canAutoFill: true,
        selectedDiagnosisLabel: 'J18.9 - Community Acquired Pneumonia',
        medicationSelectionLabel: '1/2',
      })
    );
  });

  it('does not import or call clinical engines, APIs, pharmacotherapy, search, or RME utilities', () => {
    const source = readFileSync('components/clinical/diagnosis/diagnosisViewModel.ts', 'utf8');

    expect(source).not.toMatch(/runDiagnosisAlgorithm/);
    expect(source).not.toMatch(/sendMessage/);
    expect(source).not.toMatch(/buildRMETransferPayload/);
    expect(source).not.toMatch(/searchPenyakitByName/);
    expect(source).not.toMatch(/evaluateCanonicalDifferential/);
    expect(source).not.toMatch(/pharmacotherapy/i);
    expect(source).not.toMatch(/@\/lib\/|@\/utils\/|@\/types\//);
  });
});
