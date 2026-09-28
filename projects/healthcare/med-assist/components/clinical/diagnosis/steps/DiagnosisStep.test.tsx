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
});
