import type { ReactNode } from 'react';

import { formatClinicalText, formatTransferState, isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { StagedSection } from './StagedSection';
import { TransferStepTracker } from './TransferStepTracker';

export function RMETransferPanel({
  viewModel,
  onAutoFillRME,
  onTransferDiagnosis,
  onTransferResep,
  onTransferAnamnesa,
  onRetryTransfer,
  onCancelTransfer,
}: Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'onAutoFillRME'
  | 'onTransferDiagnosis'
  | 'onTransferResep'
  | 'onTransferAnamnesa'
  | 'onRetryTransfer'
  | 'onCancelTransfer'
>) {
  const transfer = viewModel.transfer;
  const canTransferClinicalPayload = !viewModel.primary.isInsufficient;
  const diagnosisReady = canTransferClinicalPayload && transfer.diagnosisReady;
  const resepReady = canTransferClinicalPayload && transfer.resepReady;
  const canAutoFill = canTransferClinicalPayload && transfer.canAutoFill;
  const isRunning = transfer.state === 'running';
  const canRetry = ['failed', 'error', 'partial'].includes(transfer.state);

  return (
    <StagedSection
      label="RME Transfer"
      stageIndex={4}
      open={isDiagnosisChosen(viewModel)}
      header={<SectionHeader title="RME Transfer" status={formatTransferState(transfer.state)} />}
    >
      <p className="diagnosis-transfer-status">
        {[
          diagnosisReady ? 'Diagnosis siap' : 'Diagnosis belum siap',
          resepReady ? 'Resep siap' : 'Resep belum siap',
          `Obat ${transfer.medicationSelectionLabel}`,
        ].join(' · ')}
      </p>

      {transfer.error ? <ReadOnlyPanel tone="danger">{transfer.error}</ReadOnlyPanel> : null}
      {transfer.reasonLabels.length > 0 ? (
        <ReadOnlyPanel>
          {`Alasan: ${transfer.reasonLabels.map(formatClinicalText).join(' | ')}`}
        </ReadOnlyPanel>
      ) : null}
      {transfer.resultSummary ? (
        <ReadOnlyPanel>{formatClinicalText(transfer.resultSummary)}</ReadOnlyPanel>
      ) : null}

      <div className="diagnosis-transfer-primary">
        <button
          type="button"
          className="action-btn action-btn--primary diagnosis-autofill-btn"
          data-state={transfer.state}
          disabled={!canAutoFill || isRunning}
          onClick={onAutoFillRME}
        >
          <span className="diagnosis-autofill-btn__label">Isi otomatis RME</span>
          <span className="diagnosis-autofill-btn__icon" aria-hidden="true" />
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
        <div className="diagnosis-transfer-secondary">
          <button
            type="button"
            className="action-btn action-btn--secondary"
            disabled={!diagnosisReady || isRunning}
            onClick={onTransferDiagnosis}
          >
            Kirim diagnosis
          </button>
          <button
            type="button"
            className="action-btn action-btn--secondary"
            disabled={!resepReady || isRunning}
            onClick={onTransferResep}
          >
            Kirim resep
          </button>
          <button
            type="button"
            className="action-btn action-btn--secondary"
            disabled={!canAutoFill || isRunning}
            onClick={onTransferAnamnesa}
          >
            Anamnesis
          </button>
        </div>
        <TransferStepTracker steps={transfer.steps} />
      </details>
    </StagedSection>
  );
}

function SectionHeader({ title, status }: { title: string; status?: string }) {
  return (
    <div className="form-group-header form-group-header--cta">
      <div className="form-group-header__title-block">
        <div className="console-label console-label-prominent">{title}</div>
      </div>
      {status ? <span className="field-extracted-indicator">{status}</span> : null}
    </div>
  );
}

function ReadOnlyPanel({
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
