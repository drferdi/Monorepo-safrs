import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DiagnosisWorkspace, splitReferralGuidance, type DiagnosisWorkspaceProps } from './DiagnosisWorkspace';

function makeViewModel(
  overrides: Partial<DiagnosisWorkspaceProps['viewModel']> = {}
): DiagnosisWorkspaceProps['viewModel'] {
  const viewModel: DiagnosisWorkspaceProps['viewModel'] = {
    context: {
      patientSummary: 'RM RM-TEST · 44th · P · Tidak hamil terkonfirmasi',
      allergySummary: 'Tidak ada alergi',
      chronicTherapySummary: 'Tidak ada terapi kronis',
      chronicDiagnosisSummary: '',
    },
    primary: {
      canLock: true,
      isInsufficient: false,
      candidateLabel: 'J18.9 - Community Acquired Pneumonia',
      confidenceLabel: 'High confidence',
      safestNextAction: 'Pilih Diagnosis Utama',
      primaryCtaLabel: 'Pilih Diagnosis Utama',
      missingEvidence: [],
    },
    evidence: {
      supports: ['Demam', 'Batuk'],
      against: [],
      missing: ['SpO2'],
      review: ['Review auskultasi paru'],
      redFlags: ['Hipoksemia perlu dinilai'],
      doNotMiss: ['Pneumonia berat'],
    },
    candidates: [
      {
        id: '2-J06.9',
        rank: 2,
        code: 'J06.9',
        name: 'ISPA',
        displayLabel: 'J06.9 - ISPA',
        confidenceLabel: 'Moderate confidence',
        source: 'suggested',
        isSelected: false,
        isSelectionBlocked: false,
        supports: ['Batuk'],
        against: [],
        missing: ['Auskultasi'],
        review: ['Review faring'],
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
      candidateMedicationCount: 1,
      manualMedicationAvailable: true,
      reviewOnly: true,
      diagnosisBasisLabel: 'J18.9 - Community Acquired Pneumonia',
      groups: [
        {
          diagnosisKey: 'suggested:1:J18.9',
          diagnosisLabel: 'J18.9 - Community Acquired Pneumonia',
          sourceLabel: 'Rekomendasi sistem',
          statusText: 'ready',
          detailItems: ['Review 24h'],
          medications: [
            {
              key: 'paracetamol',
              name: 'Paracetamol 500 mg',
              doseLine: '3x1 | Sesudah makan | 3 hari',
              rationale: 'Simptomatik demam',
              safetyLabel: 'safe',
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
      medicationSelectionLabel: '1/1',
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

  return viewModel;
}

function makeProps(overrides: Partial<DiagnosisWorkspaceProps> = {}): DiagnosisWorkspaceProps {
  return {
    viewModel: makeViewModel(),
    phase: 'ready',
    errorMessage: '',
    complaintSummary: 'Demam dan batuk',
    secondaryComplaint: 'Sesak',
    showManualDiagnosisInput: false,
    manualIcd: '',
    manualName: '',
    showManualMedicationInput: false,
    manualMedicationDraft: {
      nama_obat: '',
      dosis: '',
      aturan_pakai: 'Sesudah makan',
      durasi: '',
      rationale: '',
    },
    manualMedicationOptions: ['Sesudah makan'],
    triage: null,
    onCompleteData: vi.fn(),
    onTogglePrimaryCandidate: vi.fn(),
    onToggleManualDiagnosisInput: vi.fn(),
    onManualIcdChange: vi.fn(),
    onManualNameChange: vi.fn(),
    onSubmitManualDiagnosis: vi.fn(),
    onToggleCandidate: vi.fn(),
    onRemoveDiagnosis: vi.fn(),
    onSelectAllMedications: vi.fn(),
    onClearMedications: vi.fn(),
    onToggleManualMedicationInput: vi.fn(),
    onManualMedicationDraftChange: vi.fn(),
    onAddManualMedication: vi.fn(),
    onToggleMedication: vi.fn(),
    onRemoveManualMedication: vi.fn(),
    onAutoFillRME: vi.fn(),
    onTransferDiagnosis: vi.fn(),
    onTransferResep: vi.fn(),
    onTransferAnamnesa: vi.fn(),
    onRetryTransfer: vi.fn(),
    onCancelTransfer: vi.fn(),
    ...overrides,
  };
}

describe('DiagnosisWorkspace', () => {
  it('renders the clinical workspace in the expected order and wires actions', () => {
    const props = makeProps();
    render(<DiagnosisWorkspace {...props} />);

    const workspace = screen.getByTestId('diagnosis-workspace');
    const orderedLabels = [
      'Clinical Finding',
      'Diagnosis Banding',
      'Diagnosis Utama',
      'Pemeriksaan Penunjang',
    ];
    const positions = orderedLabels.map((label) => workspace.textContent?.indexOf(label) ?? -1);
    positions.forEach((position) => expect(position).toBeGreaterThanOrEqual(0));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('keeps insufficient data unmistakable without presenting R69 as confirmed', () => {
    const onCompleteData = vi.fn();
    render(
      <DiagnosisWorkspace
        {...makeProps({
          onCompleteData,
          viewModel: makeViewModel({
            primary: {
              canLock: false,
              isInsufficient: true,
              candidateLabel: 'Data diagnosis belum lengkap',
              confidenceLabel: 'Insufficient data',
              safestNextAction: 'Lengkapi anamnesis dan pemeriksaan fisik',
              primaryCtaLabel: 'Lengkapi Data Diagnosis',
              missingEvidence: ['Lengkapi anamnesis'],
            },
            candidates: [
              {
                id: '1-R69',
                rank: 1,
                code: 'R69',
                name: 'Data klinis belum cukup',
                displayLabel: 'R69 - Data klinis belum cukup',
                confidenceLabel: 'Insufficient data',
                source: 'suggested',
                isSelected: false,
                isSelectionBlocked: false,
                supports: [],
                against: [],
                missing: ['Lengkapi anamnesis'],
                review: ['Review fisik'],
              },
            ],
          }),
        })}
      />
    );

    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace).toHaveAttribute('data-diagnosis-view-state', 'insufficient');
    expect(workspace).toHaveTextContent(/Lengkapi Data Diagnosis/i);
    expect(workspace).toHaveTextContent(/Lengkapi anamnesis/i);
    expect(workspace).not.toHaveTextContent(/R69/i);

    fireEvent.click(within(workspace).getByRole('button', { name: /Lengkapi Data Diagnosis/i }));
    expect(onCompleteData).toHaveBeenCalledTimes(1);
  });
});

describe('splitReferralGuidance', () => {
  it('splits numbered items and joins wrapped lines', () => {
    expect(
      splitReferralGuidance(
        '1. Bila tidak membaik maka dirujuk ke fasilitas sekunder\nyang memiliki dokter spesialis saraf.\n2. Bila depresi berat.'
      )
    ).toEqual([
      'Bila tidak membaik maka dirujuk ke fasilitas sekunder yang memiliki dokter spesialis saraf.',
      'Bila depresi berat.',
    ]);
  });

  it('treats a leading space as a lost bullet', () => {
    expect(
      splitReferralGuidance('Apabila kejang tidak membaik.\n Apabila kejang demam sering berulang.')
    ).toEqual(['Apabila kejang tidak membaik.', 'Apabila kejang demam sering berulang.']);
  });

  it('keeps a wrapped paragraph as one item', () => {
    expect(
      splitReferralGuidance('Pasien perlu dirujuk jika migren berlanjut dan tidak hilang dengan\nanalgesik.')
    ).toEqual(['Pasien perlu dirujuk jika migren berlanjut dan tidak hilang dengan analgesik.']);
  });
});

describe('DiagnosisWorkspace triage section', () => {
  const triage = {
    outcome: 'refer' as const,
    headline: 'Pertimbangkan rujukan',
    tone: 'warning' as const,
    firedCriteria: ['Kompetensi SKDI 3A'],
    referralGuidance: '1. Bila tidak membaik.\n2. Bila komplikasi.',
  };

  it('keeps the headline visible and folds reasons, referral and red flags into dropdowns', () => {
    const props = makeProps({ triage });
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);

    const section = screen.getByLabelText('Triase & Rujukan');
    const statusChip = section.querySelector('.form-group-header .field-extracted-indicator');
    expect(statusChip).toHaveTextContent('Pertimbangkan rujukan');
    const summaries = Array.from(section.querySelectorAll('details > summary')).map((s) => s.textContent);
    expect(summaries).toEqual(['Alasan', 'Indikasi rujukan', 'Tanda bahaya (2)']);
    section.querySelectorAll('details').forEach((d) => expect(d).not.toHaveAttribute('open'));
    expect(within(section).getByText('Bila komplikasi.')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).queryByText('Tanda bahaya')
    ).toBeNull();
  });

  it('shows every de-duplicated danger sign once, with no cap', () => {
    const props = makeProps({ triage });
    props.viewModel.evidence.redFlags = ['SpO2 < 90%', 'RR > 30x/menit', 'Penurunan kesadaran', 'Hemoptisis masif'];
    props.viewModel.evidence.doNotMiss = ['SpO2 < 90%', 'Tanda gagal napas'];
    render(<DiagnosisWorkspace {...props} />);

    const workspace = screen.getByTestId('diagnosis-workspace');
    const section = screen.getByLabelText('Triase & Rujukan');
    expect(within(section).getByText('Tanda bahaya (5)')).toBeInTheDocument();
    ['SpO2 < 90%', 'RR > 30x/menit', 'Penurunan kesadaran', 'Hemoptisis masif', 'Tanda gagal napas'].forEach(
      (item) => expect(within(workspace).getAllByText(item)).toHaveLength(1)
    );
    expect(workspace).not.toHaveTextContent(/Safety-net/);
    expect(workspace).not.toHaveTextContent(/Jangan lewatkan:/);
  });

  it('raises the triage summary contrast to AA via a dedicated modifier class', () => {
    const props = makeProps({ triage });
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);

    const section = screen.getByLabelText('Triase & Rujukan');
    const details = Array.from(section.querySelectorAll('details'));
    expect(details).toHaveLength(3);
    details.forEach((d) => {
      expect(d).toHaveClass('diagnosis-details--inline');
      expect(d).toHaveClass('diagnosis-details--triage');
    });

    const css = readFileSync(
      resolve(process.cwd(), 'entrypoints/sidepanel/style.css'),
      'utf8'
    );
    expect(css).toMatch(/\.diagnosis-details--triage\s*>\s*summary\s*\{[^}]*color:\s*var\(--text-main\)/);
  });

  it('keeps red flags in Pemeriksaan Penunjang when there is no triage result', () => {
    const props = makeProps({ triage: null });
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).getByText('Tanda bahaya')
    ).toBeInTheDocument();
  });
});
