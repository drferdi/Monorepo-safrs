import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DiagnosisWorkspaceProps } from './DiagnosisWorkspace';
import { RMETransferPanel } from './RMETransferPanel';

function makeViewModel(
  transferOverrides: Partial<DiagnosisWorkspaceProps['viewModel']['transfer']> = {},
  primaryOverrides: Partial<DiagnosisWorkspaceProps['viewModel']['primary']> = {}
): DiagnosisWorkspaceProps['viewModel'] {
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
      DiagnosisWorkspaceProps,
      | 'onAutoFillRME'
      | 'onTransferDiagnosis'
      | 'onTransferResep'
      | 'onTransferAnamnesa'
      | 'onRetryTransfer'
      | 'onCancelTransfer'
    >
  > = {},
  viewModel = makeViewModel()
): Pick<
  DiagnosisWorkspaceProps,
  | 'viewModel'
  | 'onAutoFillRME'
  | 'onTransferDiagnosis'
  | 'onTransferResep'
  | 'onTransferAnamnesa'
  | 'onRetryTransfer'
  | 'onCancelTransfer'
> {
  return {
    viewModel,
    onAutoFillRME: vi.fn(),
    onTransferDiagnosis: vi.fn(),
    onTransferResep: vi.fn(),
    onTransferAnamnesa: vi.fn(),
    onRetryTransfer: vi.fn(),
    onCancelTransfer: vi.fn(),
    ...overrides,
  };
}

describe('RMETransferPanel', () => {
  it('disables transfer actions while running and keeps cancel available', () => {
    const onCancelTransfer = vi.fn();
    const props = makeProps({ onCancelTransfer }, makeViewModel({ state: 'running' }));

    render(<RMETransferPanel {...props} />);

    const panel = screen.getByLabelText('RME Transfer');
    expect(within(panel).getByRole('button', { name: /Isi otomatis RME/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Kirim diagnosis/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Kirim resep/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Anamnesis/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Ulangi/i })).toBeDisabled();

    const cancelButton = within(panel).getByRole('button', { name: /Batal/i });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    expect(onCancelTransfer).toHaveBeenCalledTimes(1);
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

    render(<RMETransferPanel {...props} />);

    const panel = screen.getByLabelText('RME Transfer');
    expect(panel).toHaveTextContent(/Diagnosis belum siap/i);
    expect(panel).toHaveTextContent(/Resep belum siap/i);
    expect(panel).toHaveTextContent(/Obat 0\/2/i);
    expect(panel).toHaveTextContent(/Transfer RME gagal/i);
    expect(panel).toHaveTextContent(/DIAGNOSA_PAYLOAD_EMPTY/i);
    expect(panel).toHaveTextContent(/attempt:1 latency:42ms ok:1 fail:0 skip:0/i);
    expect(panel).toHaveTextContent(/attempt:2 latency:120ms ok:0 fail:1 skip:0/i);
    expect(within(panel).getByRole('button', { name: /Kirim diagnosis/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Kirim resep/i })).toBeDisabled();
  });
});
