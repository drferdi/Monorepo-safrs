import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisPageViewModel } from '../diagnosisViewModel';
import type { ChronicMedicationView } from '../tatalaksana';
import { TatalaksanaStep, tatalaksanaSummary } from './TatalaksanaStep';

type Medication = DiagnosisPageViewModel['therapy']['groups'][number]['medications'][number];

const med = (key: string, name: string, isSelected: boolean, sourceLabel = 'PROPOSAL', extra: Partial<Medication> = {}): Medication => ({
  key,
  name,
  doseLine: '1x1 | Sesudah makan | 30 hari',
  rationale: '',
  safetyLabel: 'safe',
  contraindications: [],
  isSelected,
  sourceLabel,
  ...extra,
});

function vm(medications: Medication[] = [med('kandesartan', 'Kandesartan 8 mg', true), med('paracetamol', 'Paracetamol 500 mg', false), med('manual-1', 'Vitamin B', false, 'MANUAL')], state = 'ready'): DiagnosisPageViewModel {
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: 'Amlodipin 10 mg', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: 'I10 - Hipertensi', confidenceLabel: 'High confidence', safestNextAction: '', primaryCtaLabel: '', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: [] },
    candidates: [],
    selectedDiagnoses: [{ key: 'suggested:1:I10', displayLabel: 'I10 - Hipertensi', sourceLabel: 'Rekomendasi sistem' }],
    therapy: { state, hasDiagnosisBasis: true, selectedDiagnosisCount: 1, selectedMedicationCount: medications.filter((m) => m.isSelected).length, candidateMedicationCount: medications.length, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: 'I10', groups: [{ diagnosisKey: 'suggested:1:I10', diagnosisLabel: 'I10 - Hipertensi', sourceLabel: 'Rekomendasi sistem', statusText: state, detailItems: [], medications }] },
    transfer: { state: 'idle', diagnosisReady: true, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: 'I10', medicationSelectionLabel: '1/3', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
  };
}

const amlodipin: ChronicMedicationView = {
  key: 'amlodipin',
  name: 'Amlodipin 10 mg',
  doseLine: '1x1 · Sesudah makan',
  indication: 'Hipertensi esensial',
  visits: [
    { date: '2026-09-01T08:00:00Z', dose: '1x1 · Sesudah makan', diagnosis: 'Hipertensi esensial' },
    { date: '2026-08-01T08:00:00Z', dose: '1x1 · Sesudah makan', diagnosis: 'Hipertensi esensial' },
  ],
};

type StepProps = Parameters<typeof TatalaksanaStep>[0];

function props(overrides: Partial<StepProps> = {}): StepProps {
  return {
    viewModel: vm(),
    manualMedicationDraft: { nama_obat: '', dosis: '', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' },
    manualMedicationOptions: ['Sesudah makan'],
    onSelectAllMedications: vi.fn(),
    onClearMedications: vi.fn(),
    onManualMedicationDraftChange: vi.fn(),
    onAddManualMedication: vi.fn(),
    onToggleMedication: vi.fn(),
    onRemoveManualMedication: vi.fn(),
    education: [],
    onToggleEducation: vi.fn(),
    chronicMedications: [amlodipin],
    interactionCheck: { state: 'done', interactions: [] },
    allergies: [],
    controlAfter: '3 hari',
    onControlAfterChange: vi.fn(),
    safetyNet: [],
    onDismissMedication: vi.fn(),
    skipped: false,
    onSkip: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

const visitCard = (name: string) => screen.getAllByTestId('dx-tx-visit-med').find((card) => card.textContent?.includes(name))!;

/** Holds "Hapus" until its fill has run (the transition end the browser would send). */
function hold(button: HTMLElement) {
  // jsdom has no PointerEvent; a MouseEvent of the same type carries the primary button.
  fireEvent(button, new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  const fill = button.querySelector('.dx-hold-fill')!;
  const end = new Event('transitionend', { bubbles: true });
  Object.defineProperty(end, 'propertyName', { value: 'clip-path' });
  act(() => {
    fill.dispatchEvent(end);
  });
}

describe('TatalaksanaStep', () => {
  it('is headed "Tatalaksana 3 / 4" and lays out Chief\'s parts in order', () => {
    render(<TatalaksanaStep {...props()} />);
    expect(screen.getByRole('heading', { name: 'Tatalaksana' })).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    // Migrated (Chief, 2026-09-29: "hilangkan Keamanan terapi"): 'dx-tx-safety' left the order.
    const parts = ['dx-tx-chronic-part', 'dx-tx-visit-part', 'dx-tx-education', 'dx-tx-follow-up', 'dx-tx-safety-net', 'dx-tx-summary'].map((id) => screen.getByTestId(id));
    parts.slice(1).forEach((part, i) => expect(parts[i].compareDocumentPosition(part) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    expect(screen.queryByTestId('dx-tx-safety')).toBeNull();
    expect(screen.queryByText('Keamanan terapi')).toBeNull();
  });

  it('shows each chronic medication with its dose, indication, DDI and contraindication, and its visits under "Review"', () => {
    render(<TatalaksanaStep {...props({ allergies: ['Amlodipin'] })} />);
    const card = screen.getByTestId('dx-tx-chronic');
    expect(card).toHaveTextContent('Amlodipin 10 mg');
    expect(card).toHaveTextContent('1x1 · Sesudah makan');
    expect(card).toHaveTextContent('IndikasiHipertensi esensial');
    expect(card).toHaveTextContent('DDItidak ada');
    expect(card).toHaveTextContent('Kontraindikasialergi Amlodipin');
    expect(screen.queryByTestId('dx-tx-chronic-review')).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: /Review/ }));
    expect(within(screen.getByTestId('dx-tx-chronic-review')).getAllByRole('listitem')).toHaveLength(2);
  });

  // Chief, 2026-09-29: each therapy runs name, dose, DDI, contraindication as an activity timeline.
  it('draws each therapy as a timeline: name, dose, (indication,) DDI, contraindication', () => {
    render(<TatalaksanaStep {...props({ viewModel: vm([med('amoks', 'Amoksisilin 500 mg', false, 'PROPOSAL', { doseLine: '3x500mg • Sesudah makan • 5 hari' })]) })} />);
    const steps = (card: HTMLElement) => [...card.closest('.diagnosis-candidate-row')!.querySelectorAll('.dx-tx-timeline > li')].map((li) => li.getAttribute('data-step'));
    expect(steps(screen.getByTestId('dx-tx-chronic').querySelector('li')!)).toEqual(['obat', 'dosis', 'indikasi', 'ddi', 'kontra']);
    const visit = visitCard('Amoksisilin');
    expect(steps(visit)).toEqual(['obat', 'dosis', 'ddi', 'kontra']);
    // The dose carries the strength, so the name does not repeat it.
    expect(within(visit).getByText('Amoksisilin')).toHaveClass('diagnosis-row-title');
    expect(visit).toHaveTextContent('Dosis3x500mg • Sesudah makan • 5 hari');
  });

  it('says so when the visit history holds no chronic medication', () => {
    render(<TatalaksanaStep {...props({ chronicMedications: [] })} />);
    expect(screen.getByText('Tidak ada terapi kronis dalam riwayat kunjungan.')).toBeInTheDocument();
  });

  // Carries TherapyStep "is headed "Terapi" and shows one row per medication": one card per
  // medication, now under its regimen slot, and a tap still toggles it.
  it('puts each visit medication in its slot (01 Utama, 02 Adjuvant, 03 Vitamin) and toggles it on a tap', () => {
    const p = props();
    render(<TatalaksanaStep {...p} />);
    expect(within(screen.getByTestId('dx-tx-slot-utama')).getByText('Kandesartan 8 mg')).toBeInTheDocument();
    expect(within(screen.getByTestId('dx-tx-slot-adjuvant')).getByText('Paracetamol 500 mg')).toBeInTheDocument();
    expect(within(screen.getByTestId('dx-tx-slot-vitamin')).getByText('Vitamin B')).toBeInTheDocument();
    expect(screen.getByText('01 · Utama')).toBeInTheDocument();
    expect(screen.getByText('03 · Vitamin')).toBeInTheDocument();
    expect(visitCard('Kandesartan')).toHaveAttribute('aria-pressed', 'true');
    expect(visitCard('Vitamin B')).toHaveTextContent('input dokter');
    fireEvent.click(visitCard('Paracetamol'));
    expect(p.onToggleMedication).toHaveBeenCalledWith('paracetamol');
  });

  it('takes the engine\'s role over the name rule when it sent one', () => {
    render(<TatalaksanaStep {...props({ viewModel: vm([med('p', 'Paracetamol 500 mg', false, 'PROPOSAL', { role: 'utama' })]) })} />);
    expect(within(screen.getByTestId('dx-tx-slot-utama')).getByText('Paracetamol 500 mg')).toBeInTheDocument();
    expect(screen.queryByTestId('dx-tx-slot-adjuvant')).toBeNull();
  });

  it('removes a proposal only after a hold on "Hapus", and a manual one through its own remove', () => {
    const p = props();
    render(<TatalaksanaStep {...p} />);
    const hapus = screen.getByRole('button', { name: 'Tahan untuk menghapus Paracetamol 500 mg' });
    fireEvent.click(hapus);
    expect(p.onDismissMedication).not.toHaveBeenCalled();
    hold(hapus);
    expect(p.onDismissMedication).toHaveBeenCalledWith('paracetamol');
    hold(screen.getByRole('button', { name: 'Tahan untuk menghapus Vitamin B' }));
    expect(p.onRemoveManualMedication).toHaveBeenCalledWith('manual-1');
  });

  it('replaces a card from "Ganti": the form opens under it and the card goes once the new medication is added', () => {
    // A filled draft: "Ganti obat" takes a medicine only with its name and dose (2026-09-29).
    const p = props({ manualMedicationDraft: { nama_obat: 'Ibuprofen tablet 400 mg', dosis: '3x1', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' } });
    const { rerender } = render(<TatalaksanaStep {...p} />);
    fireEvent.click(within(visitCard('Paracetamol').parentElement!).getByRole('button', { name: 'Ganti' }));
    expect(screen.getByTestId('dx-tx-med-form')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ganti obat' }));
    expect(p.onAddManualMedication).toHaveBeenCalledTimes(1);
    expect(p.onDismissMedication).not.toHaveBeenCalled();
    rerender(<TatalaksanaStep {...p} viewModel={vm([...vm().therapy.groups[0].medications, med('manual-2', 'Ibuprofen 400 mg', true, 'MANUAL')])} />);
    expect(p.onDismissMedication).toHaveBeenCalledWith('paracetamol');
  });

  // Carries TherapyStep "opens the manual form from "+ Obat"": the page's own "+ Tambah obat".
  it('opens the manual form from "+ Tambah obat"', () => {
    render(<TatalaksanaStep {...props()} />);
    expect(screen.queryByTestId('dx-tx-med-form')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah obat' }));
    expect(screen.getByTestId('dx-tx-med-form')).toBeInTheDocument();
  });

  // Chief, 2026-09-29: "tambah obat belum jalan?" — without a dose the add failed silently.
  it('adds a medicine only with its name and dose, and says what is missing', () => {
    const { rerender } = render(<TatalaksanaStep {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah obat' }));
    expect(screen.getByRole('button', { name: 'Tambah obat' })).toBeDisabled();
    expect(screen.getByText('Isi nama obat dan dosis.')).toBeInTheDocument();
    const named = props({ manualMedicationDraft: { nama_obat: 'Amlodipin tablet 10 mg', dosis: '', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' } });
    rerender(<TatalaksanaStep {...named} />);
    expect(screen.getByRole('button', { name: 'Tambah obat' })).toBeDisabled();
    const p = props({ manualMedicationDraft: { ...named.manualMedicationDraft, dosis: '1x1' } });
    rerender(<TatalaksanaStep {...p} />);
    expect(screen.queryByText('Isi nama obat dan dosis.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tambah obat' }));
    expect(p.onAddManualMedication).toHaveBeenCalledTimes(1);
  });

  // Chief, 2026-09-29: "ketik Am... keluar lodipin", the name comes from the Puskesmas stock.
  it('offers the Puskesmas stock as the medicine name is typed, and fills the name picked', () => {
    function Page() {
      const [draft, setDraft] = useState(props().manualMedicationDraft);
      return <TatalaksanaStep {...props({ manualMedicationDraft: draft, onManualMedicationDraftChange: (field, value) => setDraft((current) => ({ ...current, [field]: value })) })} />;
    }
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah obat' }));
    const name = screen.getByPlaceholderText('Nama obat');
    fireEvent.change(name, { target: { value: 'Am' } });
    const option = within(screen.getByRole('listbox', { name: 'Stok obat Puskesmas' })).getByRole('option', { name: /Amlodipin tablet 10 mg/ });
    expect(option).toHaveTextContent(/\d+ Tablet$/);
    fireEvent.click(option);
    expect(name).toHaveValue('Amlodipin tablet 10 mg');
    expect(screen.queryByRole('listbox')).toBeNull();
    // The keyboard picks too: down to the second match, Enter.
    fireEvent.change(name, { target: { value: 'amlo' } });
    fireEvent.keyDown(name, { key: 'ArrowDown' });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(name).toHaveValue('Amlodipin tablet 5 mg');
  });

  // Chief, 2026-09-29: "keduanya terisi otomatis dengan dosis minimal dan standard sesudah/ sebelum
  // makan atau signa lain".
  it('fills the standard dose and signa of the medicine picked, and clears a dose it has none for', () => {
    function Page() {
      const [draft, setDraft] = useState(props().manualMedicationDraft);
      return (
        <TatalaksanaStep
          {...props({
            manualMedicationDraft: draft,
            manualMedicationOptions: ['Sesudah makan', 'Sebelum makan', 'Pemakaian luar'],
            onManualMedicationDraftChange: (field, value) => setDraft((current) => ({ ...current, [field]: value })),
          })}
        />
      );
    }
    const pick = (typed: string, stockName: RegExp) => {
      fireEvent.change(screen.getByPlaceholderText('Nama obat'), { target: { value: typed } });
      fireEvent.click(within(screen.getByRole('listbox', { name: 'Stok obat Puskesmas' })).getByRole('option', { name: stockName }));
    };
    const { container } = render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah obat' }));
    const dose = screen.getByPlaceholderText('Dosis (contoh: 3x1)');
    const signa = container.querySelector('select');

    pick('Amlo', /^Amlodipin tablet 10 mg/);
    expect(dose).toHaveValue('1x1');
    expect(signa).toHaveValue('Sesudah makan');

    pick('Omepra', /Omeprazol kapsul\/kaplet 20 mg/);
    expect(dose).toHaveValue('1x1');
    expect(signa).toHaveValue('Sebelum makan');

    pick('Permetrin', /Permetrin Krim 5%/);
    expect(dose).toHaveValue('1x aplikasi');
    expect(signa).toHaveValue('Pemakaian luar');
    expect(screen.getByPlaceholderText('Durasi (contoh: 3 hari)')).toHaveValue('1 hari');

    pick('Haloper', /^Haloperidol tablet 5 mg\b(?! \(program\))/);
    expect(dose).toHaveValue('');
  });

  // Chief, 2026-09-29: "Gunakan motion futuristic single line bergerak mengitari kotak", instead
  // of a green frame.
  it('circles only the selected therapy card with one line', () => {
    render(<TatalaksanaStep {...props({ viewModel: vm([med('amox', 'Amoksisilin 500 mg', true), med('paracetamol', 'Paracetamol 500 mg', false)]) })} />);
    const [chosen, other] = screen.getAllByTestId('dx-tx-visit-med').map((card) => card.parentElement as HTMLElement);
    expect(chosen.querySelectorAll('.dx-trace rect')).toHaveLength(1);
    expect(other.querySelector('.dx-trace')).toBeNull();
  });

  it('uses every proposal from "Gunakan semua usulan"', () => {
    const p = props();
    render(<TatalaksanaStep {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gunakan semua usulan' }));
    expect(p.onSelectAllMedications).toHaveBeenCalledTimes(1);
  });

  // Carries TherapyStep "continues without medication from "Lanjut tanpa obat"": now a decision
  // on the page; the page itself closes only from "Selesai".
  it('decides "Lanjut tanpa terapi tambahan" without leaving the page', () => {
    const p = props();
    render(<TatalaksanaStep {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    expect(p.onClearMedications).toHaveBeenCalledTimes(1);
    expect(p.onSkip).toHaveBeenCalledTimes(1);
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  // Carries TherapyStep "continues from "Lanjut" once a medication is selected".
  it('closes from "Selesai" once decided, and not before', async () => {
    const undecided = props({ viewModel: vm([med('paracetamol', 'Paracetamol 500 mg', false)]) });
    const { unmount } = render(<TatalaksanaStep {...undecided} />);
    expect(screen.getByTestId('dx-tx-finish')).toBeDisabled();
    expect(screen.getByText('Pilih obat kunjungan ini, atau lanjut tanpa terapi tambahan.')).toBeInTheDocument();
    unmount();

    const p = props();
    render(<TatalaksanaStep {...p} />);
    fireEvent.click(screen.getByTestId('dx-tx-finish'));
    await vi.waitFor(() => expect(p.onConfirm).toHaveBeenCalledTimes(1));
  });

  // Carries TherapyStep "says the prescription service proposed nothing" and "shows no such line".
  it('says the prescription service proposed nothing instead of an empty list, and only then', () => {
    const { rerender } = render(<TatalaksanaStep {...props({ viewModel: vm([med('manual-1', 'Vitamin B', false, 'MANUAL')], 'error') })} />);
    expect(screen.getByText('Tidak ada usulan obat dari layanan resep.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gunakan semua usulan' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' })).toBeInTheDocument();
    rerender(<TatalaksanaStep {...props()} />);
    expect(screen.queryByText('Tidak ada usulan obat dari layanan resep.')).toBeNull();
  });

  // Migrated (Chief, 2026-09-29: "hilangkan Keamanan terapi"): the three ticked lines
  // (dx-tx-safety-lines) and the warning box are gone; each card says it, the summary counts it.
  it('says on each card that nothing was found, and the summary says "Aman"', () => {
    render(<TatalaksanaStep {...props()} />);
    expect(visitCard('Kandesartan')).toHaveTextContent('DDItidak adaKontraindikasitidak terdeteksi');
    expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Safety check✓ Aman');
  });

  // Audit 2026-09-29: the same drug twice was said only in the removed part; now on the cards.
  it('names the same drug elsewhere in the plan on the card, in orange', () => {
    const chosenAmlodipin = med('amlo', 'BLUD Amlodipin tablet 5 mg', true);
    render(<TatalaksanaStep {...props({ viewModel: vm([chosenAmlodipin, med('paracetamol', 'Paracetamol 500 mg', false)]) })} />);
    expect(screen.getByTestId('dx-tx-chronic')).toHaveTextContent('DDIduplikasi: BLUD Amlodipin tablet 5 mg');
    expect(visitCard('Amlodipin')).toHaveTextContent('DDIduplikasi: Amlodipin 10 mg');
    expect(within(visitCard('Amlodipin')).getByText('duplikasi: Amlodipin 10 mg')).toHaveClass('dx-tx-warning');
    expect(visitCard('Paracetamol')).toHaveTextContent('DDItidak ada');
    expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Safety check⚠ 1 perlu review');
  });

  // Migrated (Chief, 2026-09-29: "DDI : beri penjelasan kenapa"): the reason moved from the
  // "Lihat detail" panel (dx-tx-safety-detail) to the DDI node of the first card holding the pair,
  // written once; "Lihat detail" now scrolls to it.
  it('flags a major interaction between a chronic and a chosen medication, explained once on the first card that holds it', () => {
    const interactions = [{ drug_a: 'Amlodipin 10 mg', drug_b: 'Kandesartan 8 mg', severity: 'major' as const, description: 'Interaksi signifikan.', recommendation: 'Pantau tekanan darah.' }];
    render(<TatalaksanaStep {...props({ interactionCheck: { state: 'done', interactions } })} />);
    // DDInter names no mechanism for this pair and the curated table has none: said, not composed.
    expect(screen.getByTestId('dx-tx-chronic')).toHaveTextContent('Kandesartan 8 mg (major)Mekanisme tidak tercatat di DDInter.Saran: Pantau tekanan darah.');
    expect(visitCard('Kandesartan')).toHaveTextContent('DDIAmlodipin 10 mg (major)Kontraindikasi');
    expect(screen.getAllByText('Saran: Pantau tekanan darah.')).toHaveLength(1);
    // Migrated (Chief, 2026-09-29: "hilangkan Keamanan terapi"): the warning box line "Interaksi
    // major: …", its "Lihat detail" scroll and the missing "Tidak ada interaksi mayor" tick are gone
    // with the part; the orange DDI node of both cards now carries it.
    expect(screen.getByTestId('dx-tx-chronic').querySelector('[data-step="ddi"] .dx-tx-node--warning')).not.toBeNull();
    expect(visitCard('Kandesartan').querySelector('[data-step="ddi"] .dx-tx-node--warning')).not.toBeNull();
    expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Safety check⚠ 1 perlu review');
  });

  // Chief, 2026-09-29: "warna merah di ganti orange". Findings on this page are orange.
  it('marks findings orange, never red', () => {
    const interactions = [{ drug_a: 'Amlodipin 10 mg', drug_b: 'Kandesartan 8 mg', severity: 'major' as const, description: '', recommendation: '' }];
    const { container } = render(<TatalaksanaStep {...props({ allergies: ['Amlodipin'], safetyNet: ['Sesak napas'], interactionCheck: { state: 'done', interactions } })} />);
    expect(container.querySelector('[class*="danger"]')).toBeNull();
    // Migrated: the removed warning box (dx-tx-safety-warning) was the orange example; now the summary's.
    expect(within(screen.getByTestId('dx-tx-summary')).getByText(/perlu review/)).toHaveClass('dx-tx-warning');
    expect(container.querySelectorAll('.dx-tx-node--warning').length).toBeGreaterThan(0);
  });

  it('explains a pair the curated table knows: why, and what to do', () => {
    const interactions = [{ drug_a: 'Amlodipin 10 mg', drug_b: 'Simvastatin 20 mg', severity: 'major' as const, description: 'Interaksi signifikan.', recommendation: 'Evaluasi kebutuhan terapi.' }];
    render(<TatalaksanaStep {...props({ chronicMedications: [amlodipin, { ...amlodipin, key: 'simvastatin', name: 'Simvastatin 20 mg' }], interactionCheck: { state: 'done', interactions } })} />);
    const [first, second] = screen.getAllByTestId('dx-tx-chronic');
    expect(first).toHaveTextContent('Simvastatin 20 mg (major)Amlodipine meningkatkan kadar simvastatinSaran: Batasi dosis simvastatin maksimal 20mg/hari.');
    expect(second).toHaveTextContent('DDIAmlodipin 10 mg (major)Kontraindikasi');
  });

  // Migrated (Chief, 2026-09-29: "hilangkan Keamanan terapi"): "Memeriksa interaksi obat…" and
  // "Interaksi obat tidak dapat dicek saat ini" were the part's lines; the cards and the summary say it.
  // Audit the same day: the summary said "✓ Aman" when the interaction check could not run.
  it('never says the interaction check passed while it runs or when it could not run', () => {
    const { rerender } = render(<TatalaksanaStep {...props({ interactionCheck: { state: 'checking', interactions: [] } })} />);
    expect(visitCard('Kandesartan')).toHaveTextContent('DDImemeriksa…');
    expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Safety checkmemeriksa…');
    rerender(<TatalaksanaStep {...props({ interactionCheck: { state: 'unavailable', interactions: [] } })} />);
    expect(visitCard('Kandesartan')).toHaveTextContent('DDItidak dapat dicek');
    expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Safety checkinteraksi obat tidak dapat dicek');
    expect(screen.getByTestId('dx-tx-summary')).not.toHaveTextContent('Aman');
    // A finding does not hide that the interactions were not checked.
    rerender(<TatalaksanaStep {...props({ allergies: ['Amlodipin'], interactionCheck: { state: 'unavailable', interactions: [] } })} />);
    expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Safety check⚠ 1 perlu review · interaksi obat tidak dapat dicek');
  });

  // Carries EducationStep "lists the points to tick, marking only the given ones".
  it('holds every education point in the deck; the tick on a card marks and gives it, a swipe only moves on', () => {
    const onToggleEducation = vi.fn();
    const education: DiagnosisPageProps['education'] = [
      { key: 'a', text: 'Patuhi obat setiap hari.', isSelected: true },
      { key: 'b', text: 'Diet rendah garam.', isSelected: false },
    ];
    render(<TatalaksanaStep {...props({ education, onToggleEducation })} />);
    expect(screen.queryByTestId('dx-tx-education-given')).toBeNull();
    expect(screen.queryByRole('button', { name: '+ Tambah edukasi' })).toBeNull();
    const cards = screen.getAllByTestId('dx-edu-card');
    expect(cards).toHaveLength(2);
    const top = () => screen.getAllByTestId('dx-edu-card').find((card) => card.getAttribute('data-top') === 'true') as HTMLElement;
    const tick = () => top().querySelector('button.dx-edu-card__tick') as HTMLButtonElement;
    expect(top()).toHaveTextContent('Patuhi obat setiap hari.');
    expect(tick()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tick());
    expect(onToggleEducation).toHaveBeenLastCalledWith('a');
    fireEvent.click(screen.getByRole('button', { name: 'Geser ke kanan' }));
    expect(top()).toHaveTextContent('Diet rendah garam.');
    expect(tick()).toHaveAttribute('aria-pressed', 'false');
    expect(onToggleEducation).toHaveBeenCalledTimes(1);
    fireEvent.click(tick());
    expect(onToggleEducation).toHaveBeenLastCalledWith('b');
  });

  // Carries EducationStep "says so when the knowledge base has no education for the diagnosis".
  it('says so when the knowledge base has no education or red flags, instead of composing any', () => {
    render(<TatalaksanaStep {...props()} />);
    expect(screen.queryByTestId('dx-tx-education-deck')).toBeNull();
    expect(screen.getByText('Basis pengetahuan belum punya edukasi untuk diagnosis ini.')).toBeInTheDocument();
    expect(screen.getByText('Basis pengetahuan belum mencatat kapan pasien harus segera kembali.')).toBeInTheDocument();
  });

  // Chief, 2026-09-29: "Tindak lanjut simplified, cukup kontrol 3 hari atau sejenisnya".
  it('says the follow-up in one short row, "Kontrol 3 hari", with a choice of interval, and shows the safety net', () => {
    const onControlAfterChange = vi.fn();
    render(<TatalaksanaStep {...props({ onControlAfterChange, safetyNet: ['Sesak napas', 'Penurunan kesadaran'] })} />);
    const followUp = screen.getByTestId('dx-tx-follow-up');
    const interval = within(followUp).getByRole('combobox', { name: 'Kontrol' });
    expect(interval).toHaveValue('3 hari');
    expect(within(interval).getAllByRole('option').map((option) => option.textContent)).toEqual(['3 hari', '1 minggu', '2 minggu', '1 bulan']);
    expect(followUp).toHaveTextContent(/^Tindak lanjutKontrol/);
    fireEvent.change(interval, { target: { value: '1 minggu' } });
    expect(onControlAfterChange).toHaveBeenCalledWith('1 minggu');
    expect(screen.getByTestId('dx-tx-summary')).not.toHaveTextContent('Tindak lanjut');
    const net = screen.getByTestId('dx-tx-safety-net');
    expect(net).toHaveTextContent('Segera kembali / rujuk bila');
    expect(within(net).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('tatalaksanaSummary', () => {
  // Carries TherapyStep "summarises selected medications" and EducationStep "summarises the receipt by what was given".
  it('names the chosen medications, or no additional therapy, and the education given', () => {
    const education = [{ key: 'a', text: 'x', isSelected: true }];
    expect(tatalaksanaSummary(vm(), [], false)).toBe('Kandesartan 8 mg');
    expect(tatalaksanaSummary(vm(), education, false)).toBe('Kandesartan 8 mg · edukasi 1 poin');
    expect(tatalaksanaSummary(vm([med('p', 'Paracetamol 500 mg', false)]), [], true)).toBe('tanpa terapi tambahan');
    expect(tatalaksanaSummary(vm([med('p', 'Paracetamol 500 mg', false)]), [], false)).toBe('belum ada obat');
  });
});
