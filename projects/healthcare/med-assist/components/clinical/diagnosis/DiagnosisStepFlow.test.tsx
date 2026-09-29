import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { splitReferralGuidance } from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { resolveDiagnosisSteps } from './diagnosisSteps';
import { DiagnosisStepFlow } from './DiagnosisStepFlow';

function makeViewModel(
  overrides: Partial<DiagnosisPageProps['viewModel']> = {}
): DiagnosisPageProps['viewModel'] {
  const viewModel: DiagnosisPageProps['viewModel'] = {
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

function makeProps(overrides: Partial<DiagnosisPageProps> = {}): DiagnosisPageProps {
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
    bedsideFindings: [],
    onRecordBedsideFinding: vi.fn(),
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
    education: [],
    onToggleEducation: vi.fn(),
    chronicMedications: [],
    interactionCheck: { state: 'done', interactions: [] },
    allergies: [],
    followUp: { visit: [], routine: [] },
    safetyNet: [],
    onDismissMedication: vi.fn(),
    onAutoFillRME: vi.fn(),
    onTransferDiagnosis: vi.fn(),
    onTransferResep: vi.fn(),
    onTransferAnamnesa: vi.fn(),
    onRetryTransfer: vi.fn(),
    onCancelTransfer: vi.fn(),
    ...overrides,
  };
}

/** Closes Tatalaksana from its "Selesai", which first morphs into its check. */
async function finishTatalaksana() {
  fireEvent.click(screen.getByTestId('dx-tx-finish'));
  await screen.findByTestId('dx-flow-receipt-therapy');
}

describe('DiagnosisStepFlow', () => {
  it('shows no danger-sign list, the finished Temuan as a receipt, Diagnosis active and nothing of Terapi or RME on this first page', () => {
    const vm = makeViewModel({ therapy: { ...makeViewModel().therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 } });
    render(<DiagnosisStepFlow {...makeProps({ viewModel: vm })} />);
    expect(screen.queryByText(/tanda bahaya/)).toBeNull();
    expect(screen.getByTestId('dx-flow-receipt-finding')).toHaveTextContent('Temuan');
    expect(screen.getByTestId('dx-flow-receipt-finding')).toHaveTextContent('Demam · Batuk · Sesak');
    expect(screen.getByRole('heading', { name: 'Diagnosis' })).toBeInTheDocument();
    // Terapi and RME are the next page (Chief, 2026-09-28), so not even their ghosts show here.
    expect(screen.queryByTestId('dx-flow-ghost-therapy')).toBeNull();
    expect(screen.queryByTestId('dx-flow-ghost-rme')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Terapi' })).toBeNull();
  });

  // Migrated (Chief, 2026-09-29): the second page is Tatalaksana alone, so "Edukasi next" (its
  // ghost) became "no ghost at all".
  it('moves to the second page once a diagnosis is chosen: Temuan and Diagnosis as receipts above Tatalaksana, nothing of RME', () => {
    const vm = makeViewModel({ therapy: { ...makeViewModel().therapy, selectedMedicationCount: 0 } });
    render(<DiagnosisStepFlow {...makeProps({ viewModel: vm })} />);
    const findingReceipt = screen.getByTestId('dx-flow-receipt-finding');
    const diagnosisReceipt = screen.getByTestId('dx-flow-receipt-diagnosis');
    expect(diagnosisReceipt).toHaveTextContent('J18.9 - Community Acquired Pneumonia');
    const tatalaksana = screen.getByRole('heading', { name: 'Tatalaksana' });
    expect(findingReceipt.compareDocumentPosition(diagnosisReceipt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(diagnosisReceipt.compareDocumentPosition(tatalaksana) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('[data-testid^="dx-flow-ghost-"]')).toBeNull();
    expect(screen.queryByTestId('dx-flow-ghost-rme')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Diagnosis' })).toBeNull();
  });

  // Migrated (2026-09-29): the step after Diagnosis is Tatalaksana, reached with no "Lanjut".
  it('reopens a finished step from "ubah" and returns to the flow from "selesai"', () => {
    render(<DiagnosisStepFlow {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'ubah Diagnosis' }));
    expect(screen.getByRole('heading', { name: 'Diagnosis' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'selesai' }));
    expect(screen.getByRole('heading', { name: 'Tatalaksana' })).toBeInTheDocument();
  });

  // Migrated (2026-09-29): Tatalaksana closes from "Selesai" (was Terapi's "Lanjut"), and the flow
  // returns to RME (was Edukasi).
  it('keeps the first page\'s later receipt below a reopened Temuan, and nothing of the second page', async () => {
    render(<DiagnosisStepFlow {...makeProps()} />);
    await finishTatalaksana();
    expect(screen.getByRole('heading', { name: 'RME' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ubah Temuan' }));
    expect(screen.getByRole('heading', { name: 'Temuan' })).toBeInTheDocument();
    expect(screen.getByTestId('diagnosis-clinical-signals')).toHaveTextContent('Sesak');
    expect(screen.queryByTestId('dx-flow-receipt-finding')).toBeNull();
    const diagnosisReceipt = screen.getByTestId('dx-flow-receipt-diagnosis');
    expect(diagnosisReceipt).toHaveTextContent('J18.9 - Community Acquired Pneumonia');
    // In step order, below the reopened step.
    const temuan = screen.getByRole('heading', { name: 'Temuan' });
    expect(temuan.compareDocumentPosition(diagnosisReceipt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Terapi's receipt and Edukasi belong to the second page.
    expect(screen.queryByTestId('dx-flow-receipt-therapy')).toBeNull();
    expect(screen.queryByTestId('dx-flow-ghost-therapy')).toBeNull();
    expect(screen.queryByTestId('dx-flow-ghost-rme')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'selesai' }));
    expect(screen.getByTestId('dx-flow-receipt-therapy')).toHaveTextContent('Paracetamol 500 mg');
    expect(screen.getByRole('heading', { name: 'RME' })).toBeInTheDocument();
  });

  it('shows Temuan as a receipt and only the Diagnosis step, with its skeleton, while loading', () => {
    const vm = makeViewModel({ therapy: { ...makeViewModel().therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 } });
    render(<DiagnosisStepFlow {...makeProps({ phase: 'loading', viewModel: vm })} />);
    expect(screen.getByTestId('dx-flow-receipt-finding')).toHaveTextContent('Demam · Batuk · Sesak');
    expect(document.querySelectorAll('.diagnosis-skeleton__card')).toHaveLength(2);
    expect(screen.getByText('Menyusun diagnosis banding...')).toHaveClass('sr-only');
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['Diagnosis']);
    expect(screen.queryByTestId('dx-flow-ghost-therapy')).toBeNull();
    expect(screen.queryByTestId('dx-flow-ghost-rme')).toBeNull();
  });

  // Migrated (2026-09-29): cards are dx-tx-visit-med, the page is Tatalaksana, it closes from
  // "Selesai" (was "Lanjut") and RME follows (was Edukasi).
  it('keeps Tatalaksana open while medications are tapped and closes it only from "Selesai"', async () => {
    const onToggleMedication = vi.fn();
    const base = makeViewModel();
    const [group] = base.therapy.groups;
    const [paracetamol] = group.medications;
    const withSelected = (keys: string[]): DiagnosisPageProps['viewModel'] => ({
      ...base,
      therapy: {
        ...base.therapy,
        selectedMedicationCount: keys.length,
        groups: [
          {
            ...group,
            medications: [
              { ...paracetamol, isSelected: keys.includes('paracetamol') },
              { ...paracetamol, key: 'ambroxol', name: 'Ambroxol 30 mg', isSelected: keys.includes('ambroxol') },
            ],
          },
        ],
      },
    });
    const card = (name: string) => screen.getAllByTestId('dx-tx-visit-med').find((el) => el.textContent?.includes(name))!;
    const { rerender } = render(<DiagnosisStepFlow {...makeProps({ viewModel: withSelected([]), onToggleMedication })} />);
    fireEvent.click(card('Paracetamol'));
    expect(onToggleMedication).toHaveBeenLastCalledWith('paracetamol');
    rerender(<DiagnosisStepFlow {...makeProps({ viewModel: withSelected(['paracetamol']), onToggleMedication })} />);
    expect(screen.getByRole('heading', { name: 'Tatalaksana' })).toBeInTheDocument();
    fireEvent.click(card('Ambroxol'));
    expect(onToggleMedication).toHaveBeenLastCalledWith('ambroxol');
    rerender(<DiagnosisStepFlow {...makeProps({ viewModel: withSelected(['paracetamol', 'ambroxol']), onToggleMedication })} />);
    expect(screen.getByRole('heading', { name: 'Tatalaksana' })).toBeInTheDocument();
    expect(screen.queryByTestId('dx-flow-receipt-therapy')).toBeNull();

    await finishTatalaksana();
    expect(screen.getByTestId('dx-flow-receipt-therapy')).toHaveTextContent('Paracetamol 500 mg, Ambroxol 30 mg');
    expect(screen.getByRole('heading', { name: 'RME' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tatalaksana' })).toBeNull();
  });

  // Migrated (2026-09-29): "Lanjut tanpa obat" became the page decision "Lanjut tanpa terapi
  // tambahan", the receipt reads "tanpa terapi tambahan" (was "tanpa obat") and RME follows.
  it('continues without additional therapy and shows Tatalaksana as a "tanpa terapi tambahan" receipt', async () => {
    const vm = makeViewModel({ therapy: { ...makeViewModel().therapy, selectedMedicationCount: 0 } });
    vm.therapy.groups = vm.therapy.groups.map((group) => ({
      ...group,
      medications: group.medications.map((medication) => ({ ...medication, isSelected: false })),
    }));
    render(<DiagnosisStepFlow {...makeProps({ viewModel: vm })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    expect(screen.getByRole('heading', { name: 'Tatalaksana' })).toBeInTheDocument();
    await finishTatalaksana();
    expect(screen.getByTestId('dx-flow-receipt-therapy')).toHaveTextContent('tanpa terapi tambahan');
    expect(screen.getByRole('heading', { name: 'RME' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tatalaksana' })).toBeNull();
  });

  // Migrated (2026-09-29): Edukasi has no receipt of its own; Tatalaksana's receipt says what was
  // given ("edukasi 2 poin", was "2 poin diberikan").
  it('puts RME on a third page after Tatalaksana: every earlier step a receipt, education summarised by what was given', async () => {
    const education = [
      { key: 'a', text: 'Istirahat cukup.', isSelected: true },
      { key: 'b', text: 'Minum air putih.', isSelected: true },
      { key: 'c', text: 'Cuci tangan.', isSelected: false },
    ];
    render(<DiagnosisStepFlow {...makeProps({ education })} />);
    expect(screen.queryByTestId('dx-flow-ghost-rme')).toBeNull();
    await finishTatalaksana();
    expect(screen.getByRole('heading', { name: 'RME' })).toBeInTheDocument();
    const receipts = ['finding', 'diagnosis', 'therapy'].map((key) => screen.getByTestId(`dx-flow-receipt-${key}`));
    receipts.slice(1).forEach((receipt, i) =>
      expect(receipts[i].compareDocumentPosition(receipt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    );
    expect(screen.getByTestId('dx-flow-receipt-therapy')).toHaveTextContent('edukasi 2 poin');
    expect(screen.queryByText('Istirahat cukup.')).toBeNull();
  });

  // Migrated (Chief, 2026-09-29): Edukasi moved to its own step on the second page, so only
  // Penunjang stays a link.
  it('keeps Penunjang as a one-line link under the active step, and Edukasi is no link', () => {
    render(<DiagnosisStepFlow {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Penunjang (1)' }));
    expect(screen.getByText('SpO2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edukasi/ })).toBeNull();
    expect(screen.queryByText('Review auskultasi paru')).toBeNull();
  });

  it('renders no safety section at all without a triage result', () => {
    render(<DiagnosisStepFlow {...makeProps({ triage: null })} />);
    expect(screen.queryByLabelText('Keselamatan')).toBeNull();
    expect(screen.queryByText(/tanda bahaya/)).toBeNull();
  });

  it('inherits the side panel type scale from the Trajectory panels: no page-level font size, no stepper', () => {
    render(<DiagnosisStepFlow {...makeProps()} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace).toHaveClass('ct-v2-layout');
    expect(workspace).not.toHaveClass('dx-flow');
    expect(workspace.querySelector('.dx-flow-step__heading')).toBeNull();
    expect(workspace.querySelector('[class*="stepper"]')).toBeNull();
  });
});

describe('DiagnosisStepFlow migrated assertions', () => {
  // Migrated from DiagnosisWorkspace "keeps insufficient data unmistakable without presenting R69 as confirmed".
  it('marks the insufficient view state on the page root', () => {
    const viewModel = makeViewModel({
      primary: {
        canLock: false,
        isInsufficient: true,
        candidateLabel: 'Data diagnosis belum lengkap',
        confidenceLabel: 'Insufficient data',
        safestNextAction: 'Lengkapi anamnesis dan pemeriksaan fisik',
        primaryCtaLabel: 'Lengkapi Data Diagnosis',
        missingEvidence: ['Lengkapi anamnesis'],
      },
    });
    viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 };
    render(<DiagnosisStepFlow {...makeProps({ viewModel })} />);
    expect(screen.getByTestId('diagnosis-workspace')).toHaveAttribute('data-diagnosis-view-state', 'insufficient');
  });

  // Migrated from DiagnosisWorkspace "drops the repeated therapy notices" (Tatalaksana, was
  // Terapi, is the active step here).
  it('drops the repeated therapy notices', () => {
    const viewModel = makeViewModel();
    viewModel.therapy = { ...viewModel.therapy, selectedMedicationCount: 0, groups: [] };
    render(<DiagnosisStepFlow {...makeProps({ viewModel })} />);
    const therapy = screen.getByLabelText('Tatalaksana');
    expect(therapy).not.toHaveTextContent(/Hanya untuk ditinjau/);
    expect(therapy).not.toHaveTextContent(/Pilih diagnosis terlebih dahulu/);
  });

  // Migrated from DiagnosisWorkspace "does not repeat supporting-exam items in Edukasi"; since
  // 2026-09-29 Edukasi lists only the chosen diagnosis's education, never the review items. It is
  // a part of Tatalaksana (no "Lanjut" to reach it); points not yet given are the cards of its deck.
  it('does not repeat supporting-exam items in Edukasi', () => {
    const viewModel = makeViewModel();
    viewModel.evidence = {
      ...viewModel.evidence,
      missing: ['SpO2 dan auskultasi paru'],
      review: ['SpO2 dan auskultasi paru', 'Minum cukup air'],
    };
    render(
      <DiagnosisStepFlow
        {...makeProps({ viewModel, education: [{ key: 'a', text: 'Minum cukup air', isSelected: false }] })}
      />
    );
    const education = screen.getByTestId('dx-tx-education');
    expect(within(education).queryByText('SpO2 dan auskultasi paru')).toBeNull();
    expect(within(education).getByText('Minum cukup air')).toBeInTheDocument();
  });

  // Migrated from DiagnosisWorkspace "surfaces evidence.review through the Alasan dropdown even
  // when the primary diagnosis is insufficient"; since 2026-09-29 the first page has no Edukasi.
  it('shows no Edukasi on the first page, also when the primary diagnosis is insufficient', () => {
    render(
      <DiagnosisStepFlow
        {...makeProps({
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
            evidence: {
              supports: [],
              against: [],
              missing: [],
              review: ['Review fisik'],
              redFlags: [],
              doNotMiss: [],
            },
          }),
        })}
      />
    );
    expect(screen.queryByRole('button', { name: /^Edukasi/ })).toBeNull();
    expect(screen.queryByText('Review fisik')).toBeNull();
  });

  // The Triage page owns the danger-sign list; the diagnosis page never repeats it (Chief, 2026-09-28).
  // Migrated (2026-09-29): rendered on the first page (no diagnosis chosen), since Chief's
  // Tatalaksana page now carries a safety net from the knowledge base on the second.
  it('never lists the red flags on the diagnosis page', () => {
    const props = makeProps({ triage: null });
    props.viewModel.therapy = { ...props.viewModel.therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 };
    props.viewModel.evidence.redFlags = ['SpO2 < 90%', 'RR > 30x/menit', 'Penurunan kesadaran', 'Hemoptisis masif'];
    props.viewModel.evidence.doNotMiss = ['SpO2 < 90%', 'Tanda gagal napas'];
    render(<DiagnosisStepFlow {...props} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace).not.toHaveTextContent(/tanda bahaya/);
    expect(screen.queryByRole('button', { name: 'lihat' })).toBeNull();
    ['RR > 30x/menit', 'Penurunan kesadaran', 'Hemoptisis masif'].forEach((item) =>
      expect(within(workspace).queryByText(item)).toBeNull()
    );
    expect(workspace).not.toHaveTextContent(/Safety-net/);
    expect(workspace).not.toHaveTextContent(/Jangan lewatkan:/);
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

function stepperModel(selectedDiagnosisCount: number, selectedMedicationCount: number, state: string) {
  const viewModel = makeViewModel();
  viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount, selectedMedicationCount };
  viewModel.transfer = { ...viewModel.transfer, state };
  return viewModel;
}

describe('resolveDiagnosisSteps', () => {
  it('marks steps done from phase, diagnosis, medication and transfer state', () => {
    // Migrated (2026-09-29): four steps, Terapi and Edukasi joined as Tatalaksana.
    expect(resolveDiagnosisSteps('ready', stepperModel(1, 1, 'success')).map((s) => s.done)).toEqual([true, true, true, true]);
    expect(resolveDiagnosisSteps('ready', stepperModel(1, 0, 'idle')).map((s) => s.done)).toEqual([true, true, false, false]);
    expect(resolveDiagnosisSteps('loading', stepperModel(0, 0, 'idle')).map((s) => s.done)).toEqual([false, false, false, false]);
    expect(resolveDiagnosisSteps('ready', stepperModel(0, 0, 'idle')).map((s) => s.label)).toEqual(['Temuan', 'Diagnosis', 'Tatalaksana', 'RME']);
  });
});

function extractBalancedBlocks(css: string, needle: string): string[] {
  const blocks: string[] = [];
  let searchFrom = 0;
  for (;;) {
    const start = css.indexOf(needle, searchFrom);
    if (start === -1) break;
    const braceStart = css.indexOf('{', start);
    if (braceStart === -1) break;
    let depth = 1;
    let i = braceStart + 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    blocks.push(css.slice(braceStart + 1, i - 1));
    searchFrom = i;
  }
  return blocks;
}

describe('diagnosis page motion stylesheet', () => {
  const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');

  it('unfolds details content with the shared curve and staggers the staged sections', () => {
    expect(css).toMatch(/\.diagnosis-content\s*\{[^}]*interpolate-size:\s*allow-keywords/);
    expect(css).toMatch(/\.diagnosis-stage__details::details-content/);
    expect(css).toMatch(/\.diagnosis-details::details-content/);
    expect(css).toMatch(/cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
    expect(css).toMatch(/\.diagnosis-stage--i2[^{]*\{[^}]*transition-delay:\s*40ms/);
    expect(css).toMatch(/\.diagnosis-stage--i4[^{]*\{[^}]*transition-delay:\s*120ms/);
    expect(css).toMatch(/\[data-selected='true'\][^{]*\{[^}]*var\(--sentra-safe\)/);
  });

  it('keeps only opacity under reduced motion for the unfold', () => {
    const reducedMotionBlocks = extractBalancedBlocks(css, '@media (prefers-reduced-motion: reduce)');
    const targetBlock = reducedMotionBlocks.find((block) =>
      block.includes('.diagnosis-stage__details::details-content')
    );
    expect(targetBlock).toBeDefined();

    const ruleMatch = targetBlock!.match(/\.diagnosis-stage__details::details-content[^{]*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    const ruleBody = ruleMatch![1];
    expect(ruleBody).toMatch(/block-size:\s*auto/);

    const transitionMatch = ruleBody.match(/\btransition:\s*([^;]+);/);
    expect(transitionMatch).not.toBeNull();
    const transitionValue = transitionMatch![1];
    expect(transitionValue).not.toMatch(/block-size/);
    expect(transitionValue).toMatch(/opacity/);
  });

  it('neutralises the autofill label opacity fade under reduced motion (F4)', () => {
    const reducedMotionBlocks = extractBalancedBlocks(css, '@media (prefers-reduced-motion: reduce)');
    const targetBlock = reducedMotionBlocks.find((block) =>
      block.includes('.diagnosis-autofill-btn .diagnosis-autofill-btn__label')
    );
    expect(targetBlock).toBeDefined();
    expect(targetBlock).toMatch(
      /\.diagnosis-autofill-btn \.diagnosis-autofill-btn__label\s*\{[^}]*transition:\s*none/
    );
  });

  it('beats the audit-timeline stagger delays under reduced motion with higher specificity (F5)', () => {
    const reducedMotionBlocks = extractBalancedBlocks(css, '@media (prefers-reduced-motion: reduce)');
    const targetBlock = reducedMotionBlocks.find((block) =>
      block.includes(".ct-audit-timeline .ct-audit-timeline__event:nth-child(n)")
    );
    expect(targetBlock).toBeDefined();
    expect(targetBlock).toMatch(
      /details\[open\] \.ct-audit-timeline \.ct-audit-timeline__event:nth-child\(n\)\s*\{[^}]*animation-delay:\s*0ms/
    );
  });

  it('lets the selected-card border win over hover and the base transition duration (F6)', () => {
    expect(css).toMatch(
      /\.diagnosis-candidate-row\.neu-select\[data-selected='true'\]\s*\{[^}]*border-color:\s*var\(--sentra-safe\)/
    );
    expect(css).toMatch(
      /\.diagnosis-candidate-row\.neu-select\[data-selected='true'\]:hover\s*\{[^}]*border-color:\s*var\(--sentra-safe\)/
    );
    expect(css).toMatch(
      /\.diagnosis-block\[data-selected='true'\]\s*\.diagnosis-readonly-field--primary\.neu-textarea\s*\{[^}]*border-color:\s*var\(--sentra-safe\)/
    );

    const reducedMotionBlocks = extractBalancedBlocks(css, '@media (prefers-reduced-motion: reduce)');
    const targetBlock = reducedMotionBlocks.find((block) =>
      block.includes(".diagnosis-candidate-row.neu-select[data-selected='true']:hover")
    );
    expect(targetBlock).toBeDefined();
    expect(targetBlock).toMatch(/transition:\s*none/);
  });
});
