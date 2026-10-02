import type { ReactNode } from 'react';

import { formatClinicalText } from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { TransferStepTracker } from './TransferStepTracker';

export function RMETransferPanel({
  viewModel,
  onTransferResep,
  onTransferAnamnesa,
  onRetryTransfer,
  onCancelTransfer,
}: Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'onTransferResep'
  | 'onTransferAnamnesa'
  | 'onRetryTransfer'
  | 'onCancelTransfer'
>) {
  const transfer = viewModel.transfer;
  const canTransferClinicalPayload = !viewModel.primary.isInsufficient;
  const resepReady = canTransferClinicalPayload && transfer.resepReady;
  const canAutoFill = canTransferClinicalPayload && transfer.canAutoFill;
  const isRunning = transfer.state === 'running';
  // One transfer state serves both RME pages: a run from RME Diagnosa is not this page's.
  const ownRun = transfer.lastStep !== 'diagnosa';
  // A medication out of stock is left out, not failed; Ulangi would add the others a second time.
  const outOfStockOnly = Boolean(transfer.outOfStockOnly);
  const canRetry =
    ownRun && !outOfStockOnly && ['failed', 'error', 'partial'].includes(transfer.state);

  return (
    <>
      <p className="diagnosis-transfer-status">
        {[
          resepReady ? 'Resep siap' : 'Resep belum siap',
          `Obat ${transfer.medicationSelectionLabel}`,
        ].join(' · ')}
      </p>

      {ownRun && transfer.error ? (
        <ReadOnlyPanel tone={outOfStockOnly ? 'warning' : 'danger'}>{transfer.error}</ReadOnlyPanel>
      ) : null}
      {ownRun && transfer.reasonLabels.length > 0 ? (
        <ReadOnlyPanel>
          {`Alasan: ${transfer.reasonLabels.map(formatClinicalText).join(' | ')}`}
        </ReadOnlyPanel>
      ) : null}
      {ownRun && transfer.resultSummary ? (
        <ReadOnlyPanel>{formatClinicalText(transfer.resultSummary)}</ReadOnlyPanel>
      ) : null}

      {/* Each button fills one ePuskesmas page; open that page first. */}
      <div className="diagnosis-transfer-primary">
        <button
          type="button"
          className="action-btn action-btn--primary diagnosis-autofill-btn"
          data-state={ownRun && transfer.lastStep !== 'anamnesa' ? transfer.state : 'idle'}
          disabled={!resepReady || isRunning}
          onClick={onTransferResep}
        >
          <span className="diagnosis-autofill-btn__label">Isi resep ke RME</span>
          <span className="diagnosis-autofill-btn__icon" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={!canAutoFill || isRunning}
          onClick={onTransferAnamnesa}
        >
          Isi anamnesa ke RME
        </button>
        {isRunning ? (
          <button type="button" className="action-btn action-btn--secondary" onClick={onCancelTransfer}>
            Batal
          </button>
        ) : null}
        {canRetry ? (
          <button type="button" className="action-btn action-btn--secondary" onClick={onRetryTransfer}>
            Ulangi
          </button>
        ) : null}
      </div>

      <details className="diagnosis-details diagnosis-details--inline">
        <summary>Rincian transfer</summary>
        <TransferStepTracker steps={transfer.steps} />
      </details>
    </>
  );
}

export function ReadOnlyPanel({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'warning' | 'danger';
}) {
  return (
    <div
      className={`neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--${tone}`}
    >
      {children}
    </div>
  );
}
