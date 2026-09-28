import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { formatShortDate } from '../diagnosisDisplayUtils';
import { DiagnosisStep } from './DiagnosisStep';
import { resetDiseaseNotesCache } from '../useDiseaseNotes';
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

const handlers = () => ({ onToggleCandidate: vi.fn(), onToggleManualDiagnosisInput: vi.fn(), onManualIcdChange: vi.fn(), onManualNameChange: vi.fn(), onSubmitManualDiagnosis: vi.fn(), onCompleteData: vi.fn(), onRecordBedsideFinding: vi.fn() });

// The select control carries data-testid="dx-flow-card"; "Lihat alasan" and the reasons sit beside it in the card.
function cardOf(select: HTMLElement): HTMLElement {
  const card = select.parentElement;
  if (!card) throw new Error('dx-flow-card wrapper missing');
  return card;
}

const titles = () => screen.getAllByTestId('dx-flow-card').map((el) => el.querySelector('.diagnosis-row-title')?.textContent);
const differentialLabels = () => screen.getAllByTestId('dx-flow-differential-label').map((el) => el.textContent);
/** The card in the primary slot, found by structure (the card under the primary label), not by index. */
const primaryCard = () => {
  const card = screen.getByTestId('dx-flow-primary-label').parentElement?.querySelector<HTMLElement>('[data-testid="dx-flow-card"]');
  if (!card) throw new Error('no card under the primary label');
  return card;
};
const mustNotMissTitles = () =>
  [...(screen.getByTestId('dx-flow-mnm-label').parentElement?.querySelectorAll('[data-testid="dx-flow-card"] .diagnosis-row-title') ?? [])].map((el) => el.textContent);
const openReasons = (select: HTMLElement, name = 'Lihat alasan') =>
  fireEvent.click(within(cardOf(select)).getByRole('button', { name }));

describe('formatShortDate', () => {
  it('formats a date-only ISO string using UTC getters', () => {
    expect(formatShortDate('2026-08-12')).toBe('12 Agu 2026');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatShortDate('not-a-date')).toBe('');
  });
});

describe('DiagnosisStep', () => {
  it('shows the history card as the proposed primary first, then two numbered banding cards and no more', () => {
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
    // The proposed primary comes first; the numbered banding cards follow, with no section title
    // repeating "Diagnosis banding" above them.
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Usulan diagnosis utama');
    expect(primaryCard()).toBe(shown[0]);
    expect(within(shown[0]).getByText('Kronis')).toBeInTheDocument();
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2']);
    expect(shown[0].compareDocumentPosition(screen.getAllByTestId('dx-flow-differential-label')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Diagnosis banding')).toBeNull();
    // The recurrence rule is one tap away, as the Riwayat entry of the reasons.
    openReasons(shown[0]);
    expect(within(cardOf(shown[0])).getByText('3× dalam 12 bulan · terakhir 12 Agu 2026')).toBeInTheDocument();
    // Two banding cards at most (Chief, 2026-09-28): the fourth card is not shown, and nothing hides it behind a button.
    expect(titles()).not.toContain('R51 - Nyeri kepala');
    expect(screen.queryByRole('button', { name: /^Lainnya/ })).toBeNull();
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
    expect(titles()).toEqual(['I10 - Hipertensi', 'J06.9 - ISPA', 'G44.2 - Sakit kepala tegang']);
    fireEvent.click(screen.getAllByTestId('dx-flow-card')[1]);
    expect(h.onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    rerender(<DiagnosisStep viewModel={vm(cards(true))} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    expect(titles()).toEqual(['J06.9 - ISPA', 'I10 - Hipertensi', 'G44.2 - Sakit kepala tegang']);
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2']);
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Diagnosis utama');
    expect(primaryCard()).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts a MIRA cannot-miss card in MUST NOT MISS, outside the three-card cap, and repeats no "Jangan terlewat:" line', () => {
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
    // Primary, then MUST NOT MISS, then the banding cards.
    expect(titles()).toEqual(['I10 - Hipertensi', 'I16 - Krisis hipertensi', 'G44.2 - Sakit kepala tegang', 'G43.9 - Migren']);
    expect(screen.getByTestId('dx-flow-mnm-label')).toHaveTextContent('Must not miss');
    expect(mustNotMissTitles()).toEqual(['I16 - Krisis hipertensi']);
    expect(differentialLabels()).toEqual(['Diagnosis banding 1', 'Diagnosis banding 2']);
    // The MUST NOT MISS label is the only cannot-miss marker: no chip and no do-not-miss line repeats it (Chief, 2026-09-28).
    expect(within(screen.getAllByTestId('dx-flow-card')[1]).queryByText('Jangan terlewat')).toBeNull();
    expect(screen.queryByText(/^Jangan terlewat:/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^Lainnya/ })).toBeNull();
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
    // The history card is the proposal; two of the three engine cards follow as banding.
    expect(shown).toHaveLength(3);
    expect(primaryCard().querySelector('.diagnosis-row-title')?.textContent).toBe('I16 - Krisis hipertensi');
    expect(within(primaryCard()).getByText('Kronis')).toHaveClass('diagnosis-rank-label');
    openReasons(primaryCard());
    expect(within(cardOf(primaryCard())).getByText('3× dalam 12 bulan · terakhir 12 Agu 2026')).toBeInTheDocument();
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Usulan diagnosis utama');
    expect(screen.queryByTestId('dx-flow-mnm-label')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Lainnya/ })).toBeNull();
  });

  it('puts a history card tagged cannot-miss in MUST NOT MISS, outside the two-card banding cap', () => {
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
    // The first history card is the proposal; the other history cards lead the banding list.
    expect(titles()).toEqual(['J06.9 - ISPA', 'I16 - Krisis hipertensi', 'K29.7 - Gastritis', 'M54.5 - Nyeri punggung bawah']);
    expect(mustNotMissTitles()).toEqual(['I16 - Krisis hipertensi']);
    expect(screen.queryByRole('button', { name: /^Lainnya/ })).toBeNull();
  });

  it('selects on tap, marks aria-pressed, and opens the reasons only from "Lihat alasan"', () => {
    const h = handlers();
    render(<DiagnosisStep viewModel={vm([candidate({ isSelected: true }), candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'x', displayLabel: 'G44.2 - x' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    // The chosen card sits in the primary slot, before the banding card.
    const [chosen, banding] = screen.getAllByTestId('dx-flow-card');
    expect(banding).toHaveAttribute('aria-pressed', 'false');
    expect(chosen).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dx-flow-primary-label')).toHaveTextContent('Diagnosis utama');
    fireEvent.click(chosen);
    expect(h.onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    expect(screen.queryByText('Auskultasi')).toBeNull();
    const toggle = within(cardOf(chosen)).getByRole('button', { name: 'Lihat alasan' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Auskultasi')).toBeInTheDocument();
    // The reasons open as the activity timeline, inside the card.
    expect(within(cardOf(chosen)).getByRole('list', { name: 'Alasan' })).toContainElement(screen.getByText('Auskultasi'));
    expect(h.onToggleCandidate).toHaveBeenCalledTimes(1);
  });

  it('names the reason groups Mendukung, Menentang, Data kurang and Catatan, with the history rule as Riwayat', () => {
    const history = { label: 'Kronis' as const, count: 4, visitsConsidered: 5, lastSeen: '2026-09-10', engineAgrees: false, engineSource: null };
    render(<DiagnosisStep viewModel={vm([candidate({ supports: ['Sesak'], against: ['Afebris'], missing: ['Auskultasi'], review: ['Kontrol 3 hari'], history })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    openReasons(primaryCard());
    const list = screen.getByRole('list', { name: 'Alasan' });
    expect([...list.querySelectorAll('.diagnosis-list-title')].map((el) => el.textContent)).toEqual(['Riwayat', 'Mendukung', 'Menentang', 'Data kurang', 'Catatan']);
    expect(within(list).getByText('4× dalam 12 bulan · terakhir 10 Sep 2026')).toBeInTheDocument();
  });

  it('shows the history-only message when the engine had nothing, and no "Jangan terlewat:" line', () => {
    const cards = [candidate({ id: '0-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 2, visitsConsidered: 3, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null } })];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" recurrentOnlyMessage="Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut." showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.queryByText(/^Jangan terlewat:/)).toBeNull();
    expect(screen.getByText('Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut.')).toBeInTheDocument();
    openReasons(primaryCard());
    expect(screen.getByText('2× dalam 12 bulan · terakhir 12 Agu 2026')).toBeInTheDocument();
  });

  it('explains the disease under the title, then the tally row, then "Lihat alasan"', async () => {
    resetDiseaseNotesCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ penyakit: [{ icd10: 'I50', definisi: 'Gagal jantung adalah sindrom klinis.' }] }))));
    try {
      const history = { label: 'Kronis' as const, count: 4, visitsConsidered: 5, lastSeen: '2026-09-10', engineAgrees: true, engineSource: 'mira' as const };
      render(<DiagnosisStep viewModel={vm([candidate({ id: 'h-I50', code: 'I50', name: 'Heart failure', displayLabel: 'I50 - Heart failure', supports: ['Sesak', 'Edema', 'Ortopnea', 'JVP naik'], against: ['Afebris'], missing: ['Auskultasi', 'EKG'], history })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
      const card = cardOf(screen.getByTestId('dx-flow-card'));
      const explanation = await within(card).findByText('Gagal jantung adalah sindrom klinis.');
      expect(explanation).toHaveClass('line-clamp-3');
      const title = within(card).getByText('I50 - Heart failure');
      const tally = within(card).getByTestId('dx-flow-tally');
      expect([...tally.children].map((el) => el.textContent)).toEqual(['✓ Mendukung 4', '− Menentang 1', '? Data kurang 2']);
      const toggle = within(card).getByRole('button', { name: 'Lihat alasan' });
      expect(title.compareDocumentPosition(explanation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(explanation.compareDocumentPosition(tally) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(tally.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // The rule line is no longer on the face, and the engine's agreement is not shown.
      expect(card).not.toHaveTextContent(/dalam 12 bulan/);
      expect(card).not.toHaveTextContent(/setuju/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('writes Catatan as practical bedside guidance from the knowledge base: what to look for and when to refer', async () => {
    resetDiseaseNotesCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ penyakit: [{ icd10: 'J06', definisi: 'ISPA atas.', pemeriksaan_fisik: ['Faring hiperemis', 'Tonsil hiperemis atau membesar.'], kriteria_rujukan: 'Rujuk jika sesak nafas berat.' }] }))));
    try {
      render(<DiagnosisStep viewModel={vm([candidate({ review: ['Lakukan pemeriksaan fisik terarah dan monitoring TTV serial'] })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
      await within(cardOf(screen.getByTestId('dx-flow-card'))).findByText('ISPA atas.');
      openReasons(screen.getByTestId('dx-flow-card'));
      const list = screen.getByRole('list', { name: 'Alasan' });
      const catatan = [...list.children].find((entry) => entry.querySelector('.diagnosis-list-title')?.textContent === 'Catatan');
      expect([...(catatan?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual([
        'Cari saat pemeriksaan: Faring hiperemis; Tonsil hiperemis atau membesar.',
        'Rujuk bila: sesak nafas berat.',
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('without a knowledge-base entry, keeps only the engine notes that say something new', () => {
    const review = ['Lakukan pemeriksaan fisik terarah dan monitoring TTV serial', 'Terapi PPK: amoksisilin', 'Correlate with examination', 'Auskultasi', 'Nilai ulang demam dalam 48 jam'];
    render(<DiagnosisStep viewModel={vm([candidate({ code: 'Z99.1', displayLabel: 'Z99.1 - Uji', review })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    openReasons(screen.getByTestId('dx-flow-card'));
    const list = screen.getByRole('list', { name: 'Alasan' });
    const catatan = [...list.children].find((entry) => entry.querySelector('.diagnosis-list-title')?.textContent === 'Catatan');
    // Generic, therapy and already-missing ("Auskultasi" is under Data kurang) lines are dropped.
    expect([...(catatan?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual(['Nilai ulang demam dalam 48 jam']);
  });

  it('shows no explanation line when the knowledge base has no entry for the code', () => {
    render(<DiagnosisStep viewModel={vm([candidate({ id: 'm-K65.0', code: 'K65.0', name: 'Acute peritonitis', displayLabel: 'K65.0 - Acute peritonitis · MIRA' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(cardOf(screen.getByTestId('dx-flow-card')).querySelector('.line-clamp-3')).toBeNull();
  });

  it('opens a MUST NOT MISS card with why it matters and, without a knowledge-base exam, its own missing data to tick, with no second "Masukkan hasil"', async () => {
    resetDiseaseNotesCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ penyakit: [{ icd10: 'K65', definisi: 'Peradangan peritoneum.', komplikasi: ['Sepsis', 'Syok'] }] }))));
    try {
      const h = handlers();
      const cards = [
        candidate({ id: '1-K35.8', code: 'K35.8', name: 'Apendisitis akut', displayLabel: 'K35.8 - Apendisitis akut · MIRA' }),
        candidate({ id: '3-K65.0', code: 'K65.0', name: 'Acute peritonitis', displayLabel: 'K65.0 - Acute peritonitis · MIRA · jangan terlewat', supports: ['Nyeri perut kanan bawah'], missing: ['Nyeri tekan abdomen', 'Defans muskular'] }),
      ];
      const enginePlan = {
        actions: [
          { kind: 'exam' as const, item: 'Palpasi abdomen', reason: 'Mencari nyeri tekan McBurney.' },
          { kind: 'exam' as const, item: 'Rovsing sign', reason: 'Mendukung apendisitis.' },
        ],
        missing: ['Riwayat demam'],
      };
      render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" enginePlan={enginePlan} {...h} />);
      const mnm = screen.getAllByTestId('dx-flow-card')[1];
      await within(cardOf(mnm)).findByText('Peradangan peritoneum.');
      openReasons(mnm, 'Mengapa perlu dipertimbangkan');
      const list = within(cardOf(mnm)).getByRole('list', { name: 'Alasan' });
      // The groups answer the button's question without repeating it. Without a knowledge-base
      // exam the missing data is what "Apa yang perlu diperiksa" lists, so it is not listed here too.
      expect([...list.querySelectorAll('.diagnosis-list-title')].map((el) => el.textContent)).toEqual(['Temuan yang relevan', 'Bila terlewat']);
      expect(within(list).getByText('Nyeri perut kanan bawah')).toBeInTheDocument();
      expect(within(list).getByText('Sepsis')).toBeInTheDocument();
      expect(within(list).getByText('Syok')).toBeInTheDocument();
      expect(within(list).queryByText('Defans muskular')).toBeNull();
      // The checks are this card's own gaps plus what MIRA still lacks, ticked as found; MIRA's
      // plan for the whole differential stays the page's one Next best step.
      const panel = cardOf(mnm);
      fireEvent.click(within(panel).getByRole('button', { name: 'Apa yang perlu diperiksa' }));
      const group = within(panel).getByRole('group', { name: 'Hasil Pemeriksaan K65.0 - Acute peritonitis' });
      expect(within(group).getAllByRole('button').map((el) => el.textContent)).toEqual(['Tidak ditemukan', 'Nyeri tekan abdomen', 'Defans muskular', 'Riwayat demam']);
      expect(within(panel).queryByText('Rovsing sign')).toBeNull();
      expect(screen.getAllByRole('button', { name: 'Masukkan hasil' })).toHaveLength(1);
      fireEvent.click(within(group).getByRole('button', { name: 'Defans muskular' }));
      fireEvent.click(within(panel).getByRole('button', { name: 'Simpan' }));
      expect(h.onRecordBedsideFinding).toHaveBeenCalledWith({ kind: 'exam', item: 'Pemeriksaan K65.0 - Acute peritonitis', findings: ['Defans muskular'] });
      expect(h.onCompleteData).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('still offers a MUST NOT MISS card\'s checks when it has nothing else to explain', () => {
    const cards = [candidate({}), candidate({ id: 'm-K65.0', code: 'K65.0', name: 'Acute peritonitis', displayLabel: 'K65.0 - Acute peritonitis · MIRA · jangan terlewat', supports: [], missing: ['Nyeri tekan abdomen'] })];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const mnm = screen.getAllByTestId('dx-flow-card')[1];
    openReasons(mnm, 'Mengapa perlu dipertimbangkan');
    expect(within(cardOf(mnm)).queryByRole('list', { name: 'Alasan' })).toBeNull();
    fireEvent.click(within(cardOf(mnm)).getByRole('button', { name: 'Apa yang perlu diperiksa' }));
    expect(within(cardOf(mnm)).getByRole('button', { name: 'Nyeri tekan abdomen' })).toBeInTheDocument();
  });

  it('opens a MUST NOT MISS card\'s checks as the knowledge base\'s bedside findings to tick, with "Tidak ditemukan" first', async () => {
    resetDiseaseNotesCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ penyakit: [{ icd10: 'I16', definisi: 'Tekanan darah sangat tinggi.', pemeriksaan_fisik: ['Papiledema.', 'Defisit neurologis fokal'] }] }))));
    try {
      const h = handlers();
      const cards = [candidate({}), candidate({ id: 'm-I16', code: 'I16', name: 'Krisis hipertensi', displayLabel: 'I16 - Krisis hipertensi · MIRA · jangan terlewat' })];
      render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
      const mnm = screen.getAllByTestId('dx-flow-card')[1];
      await within(cardOf(mnm)).findByText('Tekanan darah sangat tinggi.');
      openReasons(mnm, 'Mengapa perlu dipertimbangkan');
      fireEvent.click(within(cardOf(mnm)).getByRole('button', { name: 'Apa yang perlu diperiksa' }));
      const group = within(cardOf(mnm)).getByRole('group', { name: /^Hasil Pemeriksaan / });
      expect(within(group).getAllByRole('button').map((el) => el.textContent)).toEqual(['Tidak ditemukan', 'Papiledema', 'Defisit neurologis fokal']);
      fireEvent.click(within(group).getByRole('button', { name: 'Papiledema' }));
      fireEvent.click(within(cardOf(mnm)).getByRole('button', { name: 'Simpan' }));
      expect(h.onRecordBedsideFinding).toHaveBeenCalledWith(expect.objectContaining({ kind: 'exam', findings: ['Papiledema'] }));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows the engine next best step with a tick list behind "Masukkan hasil" instead of a text field, and no section without one', () => {
    const h = handlers();
    const plan = { actions: [{ kind: 'exam' as const, item: 'Auskultasi paru', reason: 'Membedakan CAP dan ISPA.' }], missing: [] };
    const { rerender } = render(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" enginePlan={plan} {...h} />);
    expect(screen.getByTestId('dx-flow-next-label')).toHaveTextContent('Next best step');
    const section = screen.getByTestId('dx-flow-next-label').parentElement as HTMLElement;
    expect(within(section).getByText('Auskultasi paru')).toHaveClass('diagnosis-row-title');
    expect(within(section).getByText('Membedakan CAP dan ISPA.')).toHaveClass('diagnosis-row-meta');
    const enter = within(section).getByRole('button', { name: 'Masukkan hasil' });
    fireEvent.click(enter);
    expect(enter).toHaveAttribute('aria-expanded', 'true');
    expect(within(section).queryByRole('textbox')).toBeNull();
    const group = within(section).getByRole('group', { name: 'Hasil Auskultasi paru' });
    expect(within(group).getByRole('button', { name: 'Wheezing' })).toBeInTheDocument();
    const save = within(section).getByRole('button', { name: 'Simpan' });
    expect(save).toBeDisabled();
    fireEvent.click(within(group).getByRole('button', { name: 'Ronki basah halus' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Wheezing' }));
    expect(within(group).getByRole('button', { name: 'Wheezing' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(save);
    expect(h.onRecordBedsideFinding).toHaveBeenCalledWith({ kind: 'exam', item: 'Auskultasi paru', findings: ['Ronki basah halus', 'Wheezing'] });
    expect(h.onCompleteData).not.toHaveBeenCalled();
    rerender(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" enginePlan={null} {...h} />);
    expect(screen.queryByTestId('dx-flow-next-label')).toBeNull();
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

  it('opens the reasons inside the button\'s own grid child, so the card gains no grid gap on open', () => {
    render(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const card = cardOf(screen.getByTestId('dx-flow-card'));
    expect(card.children).toHaveLength(2);
    openReasons(screen.getByTestId('dx-flow-card'));
    expect(card.children).toHaveLength(2);
    expect(card.children[1]).toContainElement(within(card).getByRole('list', { name: 'Alasan' }));
  });

  it('keeps "Lihat alasan" outside the role="button" select control so assistive tech can reach it', () => {
    render(<DiagnosisStep viewModel={vm([candidate({})])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    const [select] = screen.getAllByTestId('dx-flow-card');
    const reasons = within(cardOf(select)).getByRole('button', { name: 'Lihat alasan' });
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

  it('marks a MIRA card "MIRA" in the card chip and gives a cannot-miss card no chip under the MUST NOT MISS label', () => {
    render(<DiagnosisStep viewModel={vm([candidate({ id: '3-K65.0', rank: 3, code: 'K65.0', name: 'Acute peritonitis', displayLabel: 'K65.0 - Acute peritonitis · MIRA · jangan terlewat' }), candidate({ id: '1-K35.8', rank: 1, code: 'K35.8', name: 'Acute appendicitis', displayLabel: 'K35.8 - Acute appendicitis · MIRA' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    // The MIRA card is the proposed primary (first); the cannot-miss card stands in MUST NOT MISS.
    const [mira, cannotMiss] = screen.getAllByTestId('dx-flow-card');
    expect(mustNotMissTitles()).toEqual(['K65.0 - Acute peritonitis']);
    expect(within(cannotMiss).getByText('K65.0 - Acute peritonitis')).toHaveClass('diagnosis-row-title');
    expect(cannotMiss.querySelector('.diagnosis-rank-label')).toBeNull();
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
