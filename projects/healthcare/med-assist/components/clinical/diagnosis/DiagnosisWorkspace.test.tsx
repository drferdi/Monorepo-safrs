import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DiagnosisProgressStepper, resolveDiagnosisSteps } from './DiagnosisProgressStepper';
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
  it('renders sections in clinical order with Diagnosis Utama above Diagnosis Banding', () => {
    render(<DiagnosisWorkspace {...makeProps()} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    const labels = Array.from(workspace.querySelectorAll(':scope > section[aria-label]')).map((s) =>
      s.getAttribute('aria-label')
    );
    expect(labels).toEqual([
      'Clinical Finding',
      'Diagnosis Utama',
      'Diagnosis Banding',
      'Pemeriksaan Penunjang',
      'Therapy + Resep',
      'Edukasi',
      'RME Transfer',
    ]);
  });

  it('states confidence once per card, without a confidence rail', () => {
    render(<DiagnosisWorkspace {...makeProps()} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace.querySelector('.diagnosis-confidence-rail')).toBeNull();
    const primary = screen.getByTestId('clinical-diagnosis-primary-card');
    expect(within(primary).getAllByText('Tinggi')).toHaveLength(1);
    const row = screen.getByTestId('diagnosis-candidate-row');
    expect(within(row).getAllByText('Sedang')).toHaveLength(1);
  });

  it('gives each card one action and moves the primary evidence into the primary card', () => {
    const onToggleCandidate = vi.fn();
    const onToggleManualDiagnosisInput = vi.fn();
    render(<DiagnosisWorkspace {...makeProps({ onToggleCandidate, onToggleManualDiagnosisInput })} />);

    const row = screen.getByTestId('diagnosis-candidate-row');
    fireEvent.click(within(row).getByRole('button', { name: 'Pilih' }));
    expect(onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    expect(screen.queryByText(/Pilih sebagai diagnosis utama/i)).toBeNull();

    const primary = screen.getByTestId('clinical-diagnosis-primary-card');
    fireEvent.click(within(primary).getByRole('button', { name: /Diagnosis manual/ }));
    expect(onToggleManualDiagnosisInput).toHaveBeenCalledTimes(1);
    expect(within(primary).getByText('Alasan')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Pemeriksaan Penunjang')).queryByText('Alasan')).toBeNull();
  });

  it('marks the selected cards for the selection style', () => {
    const viewModel = makeViewModel();
    viewModel.candidates = [
      { ...viewModel.candidates[0], id: '1-J18.9', rank: 1, code: 'J18.9', isSelected: true },
      { ...viewModel.candidates[0], isSelected: true },
    ];
    render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    expect(screen.getByTestId('clinical-diagnosis-primary-card')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('diagnosis-candidate-row')).toHaveAttribute('data-selected', 'true');
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
    expect(within(workspace).queryByRole('button', { name: 'Pilih' })).toBeNull();

    fireEvent.click(within(workspace).getByRole('button', { name: /Lengkapi Data Diagnosis/i }));
    expect(onCompleteData).toHaveBeenCalledTimes(1);
  });

  const STAGED = ['Pemeriksaan Penunjang', 'Therapy + Resep', 'Edukasi', 'RME Transfer'];

  it('keeps the late sections collapsed with a one-line summary until a diagnosis is chosen', () => {
    const viewModel = makeViewModel();
    viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 };
    // Isolated from the F1 fallback-danger-signs behavior (covered by its own
    // tests above): no red flags/do-not-miss here, so Pemeriksaan Penunjang
    // collapses purely on "no diagnosis chosen" like the other staged sections.
    viewModel.evidence = { ...viewModel.evidence, redFlags: [], doNotMiss: [] };
    const { rerender } = render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);

    STAGED.forEach((label) => {
      const details = screen.getByLabelText(label).querySelector('details.diagnosis-stage__details');
      expect(details).not.toHaveAttribute('open');
    });
    expect(
      within(screen.getByLabelText('Therapy + Resep')).getByText('pilih diagnosis dulu')
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).getByText('1 disarankan')
    ).toBeInTheDocument();

    const chosen = makeViewModel();
    rerender(<DiagnosisWorkspace {...makeProps({ viewModel: chosen })} />);
    STAGED.forEach((label) => {
      const details = screen.getByLabelText(label).querySelector('details.diagnosis-stage__details');
      expect(details).toHaveAttribute('open');
    });

    rerender(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    STAGED.forEach((label) => {
      const details = screen.getByLabelText(label).querySelector('details.diagnosis-stage__details');
      expect(details).not.toHaveAttribute('open');
    });
  });

  it('numbers the staged sections for the opening stagger', () => {
    render(<DiagnosisWorkspace {...makeProps()} />);
    STAGED.forEach((label, index) =>
      expect(screen.getByLabelText(label)).toHaveClass(`diagnosis-stage--i${index + 1}`)
    );
  });

  it('drops the repeated therapy notices', () => {
    const viewModel = makeViewModel();
    viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount: 0, groups: [] };
    render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    const therapy = screen.getByLabelText('Therapy + Resep');
    expect(therapy).not.toHaveTextContent(/Hanya untuk ditinjau/);
    expect(therapy).not.toHaveTextContent(/Pilih diagnosis terlebih dahulu/);
  });

  it('does not repeat supporting-exam items in Edukasi', () => {
    const viewModel = makeViewModel();
    viewModel.evidence = {
      ...viewModel.evidence,
      missing: ['SpO2 dan auskultasi paru'],
      review: ['SpO2 dan auskultasi paru', 'Minum cukup air'],
    };
    render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    const education = screen.getByLabelText('Edukasi');
    expect(within(education).queryByText('SpO2 dan auskultasi paru')).toBeNull();
    expect(within(education).getByText('Minum cukup air')).toBeInTheDocument();
    expect(within(education).getByText('1 catatan')).toBeInTheDocument();
  });

  it('shows the stepper first and a skeleton while loading', () => {
    render(<DiagnosisWorkspace {...makeProps({ phase: 'loading' })} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace.firstElementChild).toHaveAttribute('aria-label', 'Langkah diagnosis');
    expect(workspace.querySelectorAll('.diagnosis-skeleton__card')).toHaveLength(2);
    expect(screen.getByText('Menyusun diagnosis banding...')).toBeInTheDocument();
  });

  it('does not pair aria-busy with aria-live on the loading section, which can suppress the announcement', () => {
    render(<DiagnosisWorkspace {...makeProps({ phase: 'loading' })} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    const loadingSection = within(workspace).getByText('Menyusun diagnosis banding...').closest('section');
    expect(loadingSection).toHaveAttribute('aria-live', 'polite');
    expect(loadingSection).not.toHaveAttribute('aria-busy');
  });

  it('surfaces evidence.review through the Alasan dropdown even when the primary diagnosis is insufficient', () => {
    render(
      <DiagnosisWorkspace
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

    const primary = screen.getByTestId('clinical-diagnosis-primary-card');
    expect(within(primary).getByText('Alasan')).toBeInTheDocument();
    expect(within(primary).getByText('Review fisik')).toBeInTheDocument();
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
    expect(resolveDiagnosisSteps('ready', stepperModel(1, 1, 'success')).map((s) => s.done)).toEqual([true, true, true, true]);
    expect(resolveDiagnosisSteps('ready', stepperModel(1, 0, 'idle')).map((s) => s.done)).toEqual([true, true, false, false]);
    expect(resolveDiagnosisSteps('loading', stepperModel(0, 0, 'idle')).map((s) => s.done)).toEqual([false, false, false, false]);
    expect(resolveDiagnosisSteps('ready', stepperModel(0, 0, 'idle')).map((s) => s.label)).toEqual(['Temuan', 'Diagnosis', 'Terapi', 'RME']);
  });
});

describe('DiagnosisProgressStepper', () => {
  it('marks the first unfinished step as current and fills the line to it', () => {
    const { rerender } = render(<DiagnosisProgressStepper phase="ready" viewModel={stepperModel(0, 0, 'idle')} />);
    const nav = screen.getByRole('navigation', { name: 'Langkah diagnosis' });
    expect(within(nav).getByText('Diagnosis').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(nav.querySelector('.diagnosis-stepper__fill')).toHaveAttribute('data-filled', '1');

    rerender(<DiagnosisProgressStepper phase="ready" viewModel={stepperModel(1, 1, 'idle')} />);
    expect(within(nav).getByText('RME').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(nav.querySelector('.diagnosis-stepper__fill')).toHaveAttribute('data-filled', '3');

    rerender(<DiagnosisProgressStepper phase="ready" viewModel={stepperModel(0, 1, 'idle')} />);
    expect(within(nav).getByText('Diagnosis').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(nav.querySelector('.diagnosis-stepper__fill')).toHaveAttribute('data-filled', '1');
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

  it('opens Pemeriksaan Penunjang for fallback danger signs when no diagnosis is chosen and there is no triage', () => {
    const props = makeProps({ triage: null });
    props.viewModel.therapy = { ...props.viewModel.therapy, selectedDiagnosisCount: 0 };
    props.viewModel.evidence = {
      ...props.viewModel.evidence,
      redFlags: ['Penurunan kesadaran', 'Hipoksemia perlu dinilai'],
      doNotMiss: [],
    };
    render(<DiagnosisWorkspace {...props} />);

    const section = screen.getByLabelText('Pemeriksaan Penunjang');
    const details = section.querySelector('details.diagnosis-stage__details');
    expect(details).toHaveAttribute('open');
    expect(within(section).getByText(/Tanda bahaya \(2\)/)).toBeInTheDocument();
  });

  it('keeps Pemeriksaan Penunjang closed when a triage result is present, even with no diagnosis chosen', () => {
    const props = makeProps({ triage });
    props.viewModel.therapy = { ...props.viewModel.therapy, selectedDiagnosisCount: 0 };
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);

    const section = screen.getByLabelText('Pemeriksaan Penunjang');
    const details = section.querySelector('details.diagnosis-stage__details');
    expect(details).not.toHaveAttribute('open');
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

  it('raises the stepper step label contrast to AA (F3)', () => {
    expect(css).toMatch(
      /\.diagnosis-stepper\s+\.diagnosis-stepper__step\s*\{[^}]*color:\s*var\(--text-main\)/
    );
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
