import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { formatShortDate } from '../diagnosisDisplayUtils';
import { DiagnosisStep } from './DiagnosisStep';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

function candidate(over: Partial<DiagnosisCandidateView>): DiagnosisCandidateView {
  return { id: '2-J06.9', rank: 2, code: 'J06.9', name: 'ISPA', displayLabel: 'J06.9 - ISPA', confidenceLabel: 'Moderate confidence', source: 'suggested', isSelected: false, isSelectionBlocked: false, supports: ['Batuk'], against: [], missing: ['Auskultasi'], review: [], ...over };
}

function vm(candidates: DiagnosisCandidateView[], over: Partial<DiagnosisPageViewModel> = {}): DiagnosisPageViewModel {
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: '', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: candidates[0]?.displayLabel ?? '', confidenceLabel: 'High confidence', safestNextAction: '', primaryCtaLabel: 'Pilih Diagnosis Utama', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: ['Krisis hipertensi (I16)'] },
    candidates,
    selectedDiagnoses: [],
    therapy: { state: 'idle', hasDiagnosisBasis: false, selectedDiagnosisCount: 0, selectedMedicationCount: 0, candidateMedicationCount: 0, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: '', groups: [] },
    transfer: { state: 'idle', diagnosisReady: false, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: null, medicationSelectionLabel: '0/0', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
    ...over,
  };
}

const handlers = () => ({ onToggleCandidate: vi.fn(), onToggleManualDiagnosisInput: vi.fn(), onManualIcdChange: vi.fn(), onManualNameChange: vi.fn(), onSubmitManualDiagnosis: vi.fn(), onCompleteData: vi.fn() });

describe('formatShortDate', () => {
  it('formats a date-only ISO string using UTC getters', () => {
    expect(formatShortDate('2026-08-12')).toBe('12 Agu 2026');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatShortDate('not-a-date')).toBe('');
  });
});

describe('DiagnosisStep', () => {
  it('asks one question, shows at most three cards, history first, and the rest behind Lainnya', () => {
    const cards = [
      candidate({ id: '1-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: true, engineSource: 'mira' } }),
      candidate({}),
      candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'Sakit kepala tegang', displayLabel: 'G44.2 - Sakit kepala tegang' }),
      candidate({ id: '4-R51', rank: 4, code: 'R51', name: 'Nyeri kepala', displayLabel: 'R51 - Nyeri kepala' }),
    ];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByRole('heading', { name: 'Apa diagnosis utama hari ini?' })).toBeInTheDocument();
    const shown = screen.getAllByTestId('dx-flow-card');
    expect(shown).toHaveLength(3);
    expect(within(shown[0]).getByText('Kronis')).toBeInTheDocument();
    expect(within(shown[0]).getByText('3 dari 5 kunjungan · terakhir 12 Agu 2026 · MIRA setuju')).toBeInTheDocument();
    expect(screen.queryByText('Diagnosis Utama')).toBeNull();
    expect(screen.queryByText('Diagnosis Banding')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lainnya (1)' }));
    expect(screen.getAllByTestId('dx-flow-card')).toHaveLength(4);
  });

  it('selects on tap, marks aria-pressed, and opens the reasons only from "alasan"', () => {
    const h = handlers();
    render(<DiagnosisStep viewModel={vm([candidate({ isSelected: true }), candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'x', displayLabel: 'G44.2 - x' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    const [first] = screen.getAllByTestId('dx-flow-card');
    expect(first).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(first);
    expect(h.onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    expect(screen.queryByText('Auskultasi')).toBeNull();
    fireEvent.click(within(first).getByRole('button', { name: 'alasan' }));
    expect(screen.getByText('Auskultasi')).toBeInTheDocument();
    expect(h.onToggleCandidate).toHaveBeenCalledTimes(1);
  });

  it('lists cannot-miss items uncapped and shows the history-only message when the engine had nothing', () => {
    const cards = [candidate({ id: '0-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 2, visitsConsidered: 3, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null } })];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" recurrentOnlyMessage="Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut." showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Jangan terlewat: Krisis hipertensi (I16)')).toBeInTheDocument();
    expect(screen.getByText('Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut.')).toBeInTheDocument();
    expect(screen.getByText('2 dari 3 kunjungan · terakhir 12 Agu 2026')).toBeInTheDocument();
  });

  it('shows a two-card skeleton with a live text while loading', () => {
    render(<DiagnosisStep viewModel={vm([])} phase="loading" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Menyusun diagnosis banding...')).toHaveClass('sr-only');
    expect(document.querySelectorAll('.diagnosis-skeleton__card')).toHaveLength(2);
  });

  it('does not toggle a selection-blocked candidate on tap or on Enter, and marks it aria-disabled', () => {
    const h = handlers();
    render(<DiagnosisStep viewModel={vm([candidate({ isSelectionBlocked: true })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    const [card] = screen.getAllByTestId('dx-flow-card');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(card);
    expect(h.onToggleCandidate).not.toHaveBeenCalled();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(h.onToggleCandidate).not.toHaveBeenCalled();
  });

  it('shows the complete-data CTA and calls onCompleteData exactly once when the primary diagnosis is insufficient', () => {
    const h = handlers();
    const insufficientVm = vm([], {
      primary: {
        canLock: false,
        isInsufficient: true,
        candidateLabel: 'Data diagnosis belum lengkap',
        confidenceLabel: 'Pending review',
        safestNextAction: 'Lengkapi data diagnosis dan bukti klinis sebelum menetapkan diagnosis utama.',
        primaryCtaLabel: 'Lengkapi Data Diagnosis',
        missingEvidence: [],
      },
    });
    render(<DiagnosisStep viewModel={insufficientVm} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    const cta = screen.getByTestId('dx-flow-complete-data');
    expect(cta).toHaveTextContent('Lengkapi Data Diagnosis');
    fireEvent.click(cta);
    expect(h.onCompleteData).toHaveBeenCalledTimes(1);
  });

  // Migrated from DiagnosisWorkspace "keeps insufficient data unmistakable without presenting R69 as confirmed".
  it('renders the complete-data button and no card for an R69-only view model', () => {
    const h = handlers();
    const r69Vm = vm(
      [candidate({ id: '1-R69', rank: 1, code: 'R69', name: 'Data klinis belum cukup', displayLabel: 'R69 - Data klinis belum cukup', confidenceLabel: 'Insufficient data', missing: ['Lengkapi anamnesis'], review: ['Review fisik'] })],
      {
        primary: {
          canLock: false,
          isInsufficient: true,
          candidateLabel: 'Data diagnosis belum lengkap',
          confidenceLabel: 'Insufficient data',
          safestNextAction: 'Lengkapi anamnesis dan pemeriksaan fisik',
          primaryCtaLabel: 'Lengkapi Data Diagnosis',
          missingEvidence: ['Lengkapi anamnesis'],
        },
        evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: [] },
      }
    );
    const { container } = render(<DiagnosisStep viewModel={r69Vm} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    expect(screen.queryAllByTestId('dx-flow-card')).toHaveLength(0);
    expect(container).not.toHaveTextContent(/R69/i);
    fireEvent.click(screen.getByRole('button', { name: 'Lengkapi Data Diagnosis' }));
    expect(h.onCompleteData).toHaveBeenCalledTimes(1);
  });

  // Migrated from DiagnosisWorkspace "does not pair aria-busy with aria-live on the loading section".
  it('does not pair aria-busy with aria-live on the loading section, which can suppress the announcement', () => {
    render(<DiagnosisStep viewModel={vm([])} phase="loading" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const loadingSection = screen.getByText('Menyusun diagnosis banding...').closest('section');
    expect(loadingSection).toHaveAttribute('aria-live', 'polite');
    expect(loadingSection).not.toHaveAttribute('aria-busy');
  });

  it('shows the full engine tag, including the cannot-miss word, in the card chip', () => {
    render(<DiagnosisStep viewModel={vm([candidate({ id: '3-K65.0', rank: 3, code: 'K65.0', name: 'Acute peritonitis', displayLabel: 'K65.0 - Acute peritonitis · MIRA · jangan terlewat' }), candidate({ id: '1-K35.8', rank: 1, code: 'K35.8', name: 'Acute appendicitis', displayLabel: 'K35.8 - Acute appendicitis · MIRA' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const [cannotMiss, mira] = screen.getAllByTestId('dx-flow-card');
    expect(within(cannotMiss).getByText('K65.0 - Acute peritonitis')).toHaveClass('dx-flow-card__title');
    expect(within(cannotMiss).getByText('MIRA · jangan terlewat')).toHaveClass('dx-flow-chip');
    expect(within(mira).getByText('MIRA')).toHaveClass('dx-flow-chip');
  });

  it('states the insufficient data, the next action and each missing item above the CTA, with no candidate card', () => {
    const insufficientVm = vm([], {
      primary: {
        canLock: false,
        isInsufficient: true,
        candidateLabel: 'Data diagnosis belum lengkap',
        confidenceLabel: 'Insufficient data',
        safestNextAction: 'Lengkapi anamnesis dan pemeriksaan fisik',
        primaryCtaLabel: 'Lengkapi Data Diagnosis',
        missingEvidence: ['Anamnesis terarah', 'Pemeriksaan fisik terfokus'],
      },
    });
    render(<DiagnosisStep viewModel={insufficientVm} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Data belum cukup untuk menetapkan diagnosis utama')).toBeInTheDocument();
    expect(screen.getByText('Lengkapi anamnesis dan pemeriksaan fisik')).toBeInTheDocument();
    expect(screen.getByText('Perlu dilengkapi')).toBeInTheDocument();
    expect(screen.getByText('Anamnesis terarah')).toBeInTheDocument();
    expect(screen.getByText('Pemeriksaan fisik terfokus')).toBeInTheDocument();
    const cta = screen.getByTestId('dx-flow-complete-data');
    expect(cta).toHaveTextContent('Lengkapi Data Diagnosis');
    expect(screen.getByText('Data belum cukup untuk menetapkan diagnosis utama').compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Anamnesis terarah').compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryAllByTestId('dx-flow-card')).toHaveLength(0);
  });

  it('hides the complete-data CTA when the primary diagnosis is not insufficient', () => {
    render(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.queryByTestId('dx-flow-complete-data')).toBeNull();
  });
});
