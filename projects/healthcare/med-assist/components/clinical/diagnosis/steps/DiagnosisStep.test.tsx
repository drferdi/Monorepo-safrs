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

// The select control carries data-testid="dx-flow-card"; "Tap here" and the reasons sit beside it in the card.
function cardOf(select: HTMLElement): HTMLElement {
  const card = select.parentElement;
  if (!card) throw new Error('dx-flow-card wrapper missing');
  return card;
}

const titles = () => screen.getAllByTestId('dx-flow-card').map((el) => el.querySelector('.diagnosis-row-title')?.textContent);
const differentialLabels = () => screen.getAllByTestId('dx-flow-differential-label').map((el) => el.textContent);

describe('formatShortDate', () => {
  it('formats a date-only ISO string using UTC getters', () => {
    expect(formatShortDate('2026-08-12')).toBe('12 Agu 2026');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatShortDate('not-a-date')).toBe('');
  });
});

describe('DiagnosisStep', () => {
  it('shows two numbered banding cards, then the history card as the proposed primary, and the rest behind Lainnya', () => {
    const cards = [
      candidate({ id: '1-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: true, engineSource: 'mira' } }),
      candidate({}),
      candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'Sakit kepala tegang', displayLabel: 'G44.2 - Sakit kepala tegang' }),
      candidate({ id: '4-R51', rank: 4, code: 'R51', name: 'Nyeri kepala', displayLabel: 'R51 - Nyeri kepala' }),
    ];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByRole('heading', { name: 'Diagnosis' })).toBeInTheDocument();
    const shown = screen.getAllByTestId('dx-flow-card');
    expect(shown).toHaveLength(3);
    // The banding cards come first, numbered; the history card is the proposed primary, last, until the doctor agrees.
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2']);
    expect(within(shown[2]).getByText('Kronis')).toBeInTheDocument();
    expect(within(shown[2]).getByText('3× dalam 12 bulan · terakhir 12 Agu 2026')).toBeInTheDocument();
    const primaryLabel = screen.getByTestId('dx-flow-primary-label');
    expect(primaryLabel).toHaveTextContent('Usulan diagnosis utama');
    expect(shown[1].compareDocumentPosition(primaryLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primaryLabel.compareDocumentPosition(shown[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lainnya (1)' }));
    expect(screen.getAllByTestId('dx-flow-card')).toHaveLength(4);
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2', 'Diagnosis banding 3']);
    expect(titles().at(-1)).toBe('I10 - Hipertensi');
  });

  it('moves a tapped banding card into the primary slot and the former proposal back into the banding list', () => {
    const history = { label: 'Kronis' as const, count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null };
    const cards = (chosen: boolean) => [
      candidate({ id: '1-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history }),
      candidate({ isSelected: chosen }),
      candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'Sakit kepala tegang', displayLabel: 'G44.2 - Sakit kepala tegang' }),
    ];
    const h = handlers();
    const { rerender } = render(<DiagnosisStep viewModel={vm(cards(false))} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    expect(titles()).toEqual(['J06.9 - ISPA', 'G44.2 - Sakit kepala tegang', 'I10 - Hipertensi']);
    fireEvent.click(screen.getAllByTestId('dx-flow-card')[0]);
    expect(h.onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    rerender(<DiagnosisStep viewModel={vm(cards(true))} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    expect(titles()).toEqual(['I10 - Hipertensi', 'G44.2 - Sakit kepala tegang', 'J06.9 - ISPA']);
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2']);
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Diagnosis utama');
    expect(screen.getAllByTestId('dx-flow-card')[2]).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps a MIRA cannot-miss card outside the three-card cap, before "Lainnya"', () => {
    const mira = (code: string, name: string, tag: string) =>
      candidate({ id: `m-${code}`, code, name, displayLabel: `${code} - ${name} · ${tag}` });
    const cards = [
      candidate({ id: '0-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null } }),
      mira('G44.2', 'Sakit kepala tegang', 'MIRA'),
      mira('G43.9', 'Migren', 'MIRA'),
      mira('R51', 'Nyeri kepala', 'MIRA'),
      mira('J01.9', 'Sinusitis akut', 'MIRA'),
      mira('I16', 'Krisis hipertensi', 'MIRA · jangan terlewat'),
    ];
    render(<DiagnosisStep viewModel={vm(cards, { evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: ['Krisis hipertensi (I16)', 'Sinusitis komplikasi (J01.9)'] } })} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    // Banding cards first (the cannot-miss card closes the list, numbered 3), the history proposal last.
    expect(titles()).toEqual(['G44.2 - Sakit kepala tegang', 'G43.9 - Migren', 'I16 - Krisis hipertensi', 'I10 - Hipertensi']);
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2', 'Diagnosis banding 3']);
    expect(within(screen.getAllByTestId('dx-flow-card')[2]).getByText('MIRA · jangan terlewat')).toBeInTheDocument();
    // The cannot-miss card is shown, so its do-not-miss line is not repeated; the hidden card's is.
    expect(screen.queryByText('Jangan terlewat: Krisis hipertensi (I16)')).toBeNull();
    expect(screen.getByText('Jangan terlewat: Sinusitis komplikasi (J01.9)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lainnya (2)' }));
    expect(titles()).toEqual(['G44.2 - Sakit kepala tegang', 'G43.9 - Migren', 'I16 - Krisis hipertensi', 'R51 - Nyeri kepala', 'J01.9 - Sinusitis akut', 'I10 - Hipertensi']);
    expect(screen.queryByText('Jangan terlewat: Sinusitis komplikasi (J01.9)')).toBeNull();
  });

  it('keeps a history card as the proposed primary even when its merged engine tag is cannot-miss', () => {
    const cards = [
      candidate({ id: 'm-G44.2', code: 'G44.2', name: 'Sakit kepala tegang', displayLabel: 'G44.2 - Sakit kepala tegang · MIRA' }),
      candidate({ id: 'm-G43.9', code: 'G43.9', name: 'Migren', displayLabel: 'G43.9 - Migren · MIRA' }),
      candidate({ id: 'm-R51', code: 'R51', name: 'Nyeri kepala', displayLabel: 'R51 - Nyeri kepala · MIRA' }),
      candidate({ id: '0-I16', rank: 1, code: 'I16', name: 'Krisis hipertensi', displayLabel: 'I16 - Krisis hipertensi · MIRA · jangan terlewat', history: { label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: true, engineSource: 'mira' } }),
    ];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const shown = screen.getAllByTestId('dx-flow-card');
    // Exempt from the cap too: the three engine cards stay visible as banding, the proposal last.
    expect(shown).toHaveLength(4);
    expect(shown[3].querySelector('.diagnosis-row-title')?.textContent).toBe('I16 - Krisis hipertensi');
    expect(within(shown[3]).getByText('Kronis')).toHaveClass('diagnosis-rank-label');
    expect(within(shown[3]).getByText('3× dalam 12 bulan · terakhir 12 Agu 2026')).toBeInTheDocument();
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Usulan diagnosis utama');
    expect(screen.queryByRole('button', { name: /^Lainnya/ })).toBeNull();
  });

  it('never hides a history card tagged cannot-miss behind "Lainnya", keeping it with the banding cards', () => {
    const hist = (code: string, name: string, tag: string) =>
      candidate({ id: `h-${code}`, code, name, displayLabel: `${code} - ${name}${tag}`, history: { label: 'Berulang', count: 2, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null } });
    const cards = [
      hist('J06.9', 'ISPA', ''),
      hist('K29.7', 'Gastritis', ''),
      hist('M54.5', 'Nyeri punggung bawah', ''),
      hist('I16', 'Krisis hipertensi', ' · MIRA · jangan terlewat'),
      candidate({ id: 'm-G44.2', code: 'G44.2', name: 'Sakit kepala tegang', displayLabel: 'G44.2 - Sakit kepala tegang · MIRA' }),
      candidate({ id: 'm-G43.9', code: 'G43.9', name: 'Migren', displayLabel: 'G43.9 - Migren · MIRA' }),
    ];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    // The first history card is the proposal (last); the other history cards lead the banding list.
    expect(titles()).toEqual(['K29.7 - Gastritis', 'M54.5 - Nyeri punggung bawah', 'I16 - Krisis hipertensi', 'J06.9 - ISPA']);
    fireEvent.click(screen.getByRole('button', { name: 'Lainnya (2)' }));
    expect(titles()).toEqual(['K29.7 - Gastritis', 'M54.5 - Nyeri punggung bawah', 'I16 - Krisis hipertensi', 'G44.2 - Sakit kepala tegang', 'G43.9 - Migren', 'J06.9 - ISPA']);
  });

  it('selects on tap, marks aria-pressed, and opens the reasons only from "Tap here"', () => {
    const h = handlers();
    render(<DiagnosisStep viewModel={vm([candidate({ isSelected: true }), candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'x', displayLabel: 'G44.2 - x' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    // The chosen card sits in the primary slot, after the banding card.
    const [banding, chosen] = screen.getAllByTestId('dx-flow-card');
    expect(banding).toHaveAttribute('aria-pressed', 'false');
    expect(chosen).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Diagnosis utama');
    fireEvent.click(chosen);
    expect(h.onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    expect(screen.queryByText('Auskultasi')).toBeNull();
    fireEvent.click(within(cardOf(chosen)).getByRole('button', { name: 'Tap here' }));
    expect(screen.getByText('Auskultasi')).toBeInTheDocument();
    expect(h.onToggleCandidate).toHaveBeenCalledTimes(1);
  });

  it('lists cannot-miss items uncapped and shows the history-only message when the engine had nothing', () => {
    const cards = [candidate({ id: '0-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 2, visitsConsidered: 3, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null } })];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" recurrentOnlyMessage="Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut." showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Jangan terlewat: Krisis hipertensi (I16)')).toBeInTheDocument();
    expect(screen.getByText('Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut.')).toBeInTheDocument();
    expect(screen.getByText('2× dalam 12 bulan · terakhir 12 Agu 2026')).toBeInTheDocument();
  });

  it('explains the disease in at most three lines under the title, then the rule line, then "Tap here"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ penyakit: [{ icd10: 'I50', definisi: 'Gagal jantung adalah sindrom klinis.' }] }))));
    try {
      const history = { label: 'Kronis' as const, count: 4, visitsConsidered: 5, lastSeen: '2026-09-10', engineAgrees: true, engineSource: 'mira' as const };
      render(<DiagnosisStep viewModel={vm([candidate({ id: 'h-I50', code: 'I50', name: 'Heart failure', displayLabel: 'I50 - Heart failure', history })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
      const card = cardOf(screen.getByTestId('dx-flow-card'));
      const explanation = await within(card).findByText('Gagal jantung adalah sindrom klinis.');
      expect(explanation).toHaveClass('line-clamp-3');
      const title = within(card).getByText('I50 - Heart failure');
      const rule = within(card).getByText('4× dalam 12 bulan · terakhir 10 Sep 2026');
      const tap = within(card).getByRole('button', { name: 'Tap here' });
      expect(title.compareDocumentPosition(explanation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(explanation.compareDocumentPosition(rule) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(rule.compareDocumentPosition(tap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // The engine's agreement is not repeated on the card.
      expect(card).not.toHaveTextContent(/setuju/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows no explanation line when the knowledge base has no entry for the code', () => {
    render(<DiagnosisStep viewModel={vm([candidate({ id: 'm-K65.0', code: 'K65.0', name: 'Acute peritonitis', displayLabel: 'K65.0 - Acute peritonitis · MIRA' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(cardOf(screen.getByTestId('dx-flow-card')).querySelector('.line-clamp-3')).toBeNull();
  });

  it('puts the pixel loader to the left of the "Diagnosis" title', () => {
    render(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const heading = screen.getByRole('heading', { name: 'Diagnosis' });
    const loader = screen.getByTestId('dx-pixel-loader');
    expect(loader.parentElement).toBe(heading.parentElement);
    expect(loader.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a two-card skeleton with a live text while loading', () => {
    render(<DiagnosisStep viewModel={vm([])} phase="loading" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Menyusun diagnosis banding...')).toHaveClass('sr-only');
    expect(document.querySelectorAll('.diagnosis-skeleton__card')).toHaveLength(2);
  });

  it('keeps "Tap here" outside the role="button" select control so assistive tech can reach it', () => {
    render(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const [select] = screen.getAllByTestId('dx-flow-card');
    const reasons = within(cardOf(select)).getByRole('button', { name: 'Tap here' });
    expect(select).toHaveAttribute('role', 'button');
    expect(select).not.toContainElement(reasons);
    expect(select.querySelector('button')).toBeNull();
    expect(cardOf(select)).toHaveClass('diagnosis-candidate-row');
    expect(cardOf(select)).not.toHaveAttribute('role');
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
    // The MIRA card is the proposed primary (last); the cannot-miss card is banding 1.
    const [cannotMiss, mira] = screen.getAllByTestId('dx-flow-card');
    expect(differentialLabels()).toEqual(['Diagnosis banding 1']);
    expect(within(cannotMiss).getByText('K65.0 - Acute peritonitis')).toHaveClass('diagnosis-row-title');
    expect(within(cannotMiss).getByText('MIRA · jangan terlewat')).toHaveClass('diagnosis-rank-label');
    expect(within(mira).getByText('MIRA')).toHaveClass('diagnosis-rank-label');
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
