import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DiagnosisPageProps } from './diagnosisPageProps';
import { RMETransferPanel } from './RMETransferPanel';

function makeViewModel(
  transferOverrides: Partial<DiagnosisPageProps['viewModel']['transfer']> = {},
  primaryOverrides: Partial<DiagnosisPageProps['viewModel']['primary']> = {}
): DiagnosisPageProps['viewModel'] {
  return {
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
      ...primaryOverrides,
    },
    evidence: {
      supports: [],
      against: [],
      missing: [],
      review: [],
      redFlags: [],
      doNotMiss: [],
    },
    candidates: [],
    selectedDiagnoses: [],
    therapy: {
      state: 'ready',
      hasDiagnosisBasis: true,
      selectedDiagnosisCount: 1,
      selectedMedicationCount: 1,
      candidateMedicationCount: 1,
      manualMedicationAvailable: true,
      reviewOnly: true,
      diagnosisBasisLabel: 'J18.9',
      groups: [],
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
          state: 'success',
          detail: 'attempt:1 latency:42ms ok:1 fail:0 skip:0',
          reason: null,
          message: 'Diagnosis terkirim',
        },
        {
          key: 'resep',
          label: 'Resep',
          state: 'failed',
          detail: 'attempt:2 latency:120ms ok:0 fail:1 skip:0',
          reason: 'Field target RME tidak ditemukan.',
          message: 'Resep gagal',
        },
      ],
      ...transferOverrides,
    },
  };
}

function makeProps(
  overrides: Partial<
    Pick<
      DiagnosisPageProps,
      | 'onTransferResep'
      | 'onTransferAnamnesa'
      | 'onRetryTransfer'
      | 'onCancelTransfer'
    >
  > = {},
  viewModel = makeViewModel()
): Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'onTransferResep'
  | 'onTransferAnamnesa'
  | 'onRetryTransfer'
  | 'onCancelTransfer'
> {
  return {
    viewModel,
    onTransferResep: vi.fn(),
    onTransferAnamnesa: vi.fn(),
    onRetryTransfer: vi.fn(),
    onCancelTransfer: vi.fn(),
    ...overrides,
  };
}

// Migrated (Chief, 2026-09-29: the ePuskesmas Diagnosa page is apart from the therapy): this panel
// is the last page, "RME Terapi". Its primary button is "Isi resep ke RME" (was "Isi otomatis
// RME"), "Isi anamnesa ke RME" sits beside it (was "Anamnesis" in Rincian transfer), "Kirim resep"
// is that primary, and "Kirim diagnosis" moved to the RME Diagnosa step.
describe('RMETransferPanel', () => {
  it('while running shows only the morphing primary button and Batal', () => {
    const onCancelTransfer = vi.fn();
    const { container: panel } = render(<RMETransferPanel {...makeProps({ onCancelTransfer }, makeViewModel({ state: 'running' }))} />);

    const primary = within(panel).getByRole('button', { name: /Isi resep ke RME/i });
    expect(primary).toBeDisabled();
    expect(primary).toHaveAttribute('data-state', 'running');
    expect(within(panel).queryByRole('button', { name: /Kirim diagnosis/i })).toBeNull();
    expect(within(panel).getByRole('button', { name: /Isi anamnesa ke RME/i })).toBeDisabled();
    expect(within(panel).queryByRole('button', { name: /Ulangi/i })).toBeNull();

    fireEvent.click(within(panel).getByRole('button', { name: /Batal/i }));
    expect(onCancelTransfer).toHaveBeenCalledTimes(1);
  });

  it.each(['failed', 'error', 'partial'])('offers Ulangi beside the primary button when %s', (state) => {
    const onRetryTransfer = vi.fn();
    const { container: panel } = render(<RMETransferPanel {...makeProps({ onRetryTransfer }, makeViewModel({ state }))} />);
    fireEvent.click(within(panel).getByRole('button', { name: /Ulangi/i }));
    expect(onRetryTransfer).toHaveBeenCalledTimes(1);
    expect(within(panel).queryByRole('button', { name: /Batal/i })).toBeNull();
  });

  it.each(['idle', 'success', 'cancelled'])('shows neither Ulangi nor Batal when %s', (state) => {
    const { container: panel } = render(<RMETransferPanel {...makeProps({}, makeViewModel({ state }))} />);
    expect(within(panel).queryByRole('button', { name: /Ulangi/i })).toBeNull();
    expect(within(panel).queryByRole('button', { name: /Batal/i })).toBeNull();
    expect(within(panel).getByRole('button', { name: /Isi resep ke RME/i })).toBeEnabled();
  });

  // Migrated: the line no longer says "Diagnosis siap" (the diagnosis is a receipt above), and
  // Rincian transfer holds only the step tracker; its buttons became the two page actions.
  it('puts the readiness in one line, the two page actions up front and only the tracker inside Rincian transfer', () => {
    const { container: panel } = render(<RMETransferPanel {...makeProps({}, makeViewModel())} />);
    expect(panel.querySelector('.diagnosis-transfer-status')).toHaveTextContent('Resep siap · Obat 1/1');
    expect(panel.querySelector('.diagnosis-transfer-status')).not.toHaveTextContent('Diagnosis');
    expect(panel.querySelectorAll('.diagnosis-static-field')).toHaveLength(0);
    const details = within(panel).getByText('Rincian transfer').closest('details');
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).queryAllByRole('button')).toHaveLength(0);
    ['Isi resep ke RME', 'Isi anamnesa ke RME'].forEach((name) =>
      expect(within(panel).getByRole('button', { name })).toBeInTheDocument()
    );
  });

  it('shows readiness and step details without enabling payload actions when diagnosis is incomplete', () => {
    const props = makeProps(
      {},
      makeViewModel(
        {
          diagnosisReady: false,
          resepReady: false,
          canAutoFill: false,
          medicationSelectionLabel: '0/2',
          reasonLabels: ['DIAGNOSA_PAYLOAD_EMPTY'],
          error: 'Transfer RME gagal.',
        },
        {
          canLock: false,
          isInsufficient: true,
          candidateLabel: 'Data diagnosis belum lengkap',
          confidenceLabel: 'Insufficient data',
          primaryCtaLabel: 'Lengkapi Data Diagnosis',
        }
      )
    );

    const { container: panel } = render(<RMETransferPanel {...props} />);

    expect(panel).not.toHaveTextContent(/Diagnosis belum siap/i);
    expect(panel).toHaveTextContent(/Resep belum siap/i);
    expect(panel).toHaveTextContent(/Obat 0\/2/i);
    expect(panel).toHaveTextContent(/Transfer RME gagal/i);
    expect(panel).toHaveTextContent(/DIAGNOSA_PAYLOAD_EMPTY/i);
    expect(panel).toHaveTextContent(/attempt:1 latency:42ms ok:1 fail:0 skip:0/i);
    expect(panel).toHaveTextContent(/attempt:2 latency:120ms ok:0 fail:1 skip:0/i);
    expect(within(panel).getByRole('button', { name: /Isi resep ke RME/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Isi anamnesa ke RME/i })).toBeDisabled();
  });
});
