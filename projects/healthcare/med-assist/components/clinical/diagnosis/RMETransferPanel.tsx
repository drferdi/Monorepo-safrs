import type { ReactNode } from 'react';

import { formatClinicalText, formatTransferState, isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisWorkspaceProps } from './DiagnosisWorkspace';
import { StagedSection } from './StagedSection';

export function RMETransferPanel({
  viewModel,
  onAutoFillRME,
  onTransferDiagnosis,
  onTransferResep,
  onTransferAnamnesa,
  onRetryTransfer,
  onCancelTransfer,
}: Pick<
  DiagnosisWorkspaceProps,
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

  return (
    <StagedSection
      label="RME Transfer"
      stageIndex={4}
      open={isDiagnosisChosen(viewModel)}
      header={<SectionHeader title="RME Transfer" status={formatTransferState(transfer.state)} />}
    >
      <div className="form-row-dual form-row-dual--symmetric diagnosis-field-grid">
        <StaticField value={diagnosisReady ? 'Diagnosis siap' : 'Diagnosis belum siap'} />
        <StaticField value={resepReady ? 'Resep siap' : 'Resep belum siap'} />
      </div>
      <StaticField value={`Obat ${transfer.medicationSelectionLabel}`} />

      {transfer.error ? <ReadOnlyPanel tone="danger">{transfer.error}</ReadOnlyPanel> : null}
      {transfer.reasonLabels.length > 0 ? (
        <ReadOnlyPanel>
          {`Alasan: ${transfer.reasonLabels.map(formatClinicalText).join(' | ')}`}
        </ReadOnlyPanel>
      ) : null}
      {transfer.resultSummary ? (
        <ReadOnlyPanel>{formatClinicalText(transfer.resultSummary)}</ReadOnlyPanel>
      ) : null}

      <div className="action-bar action-bar--tri-tabs diagnosis-action-bar">
        <button
          type="button"
          className="action-btn action-btn--primary"
          disabled={!canAutoFill || isRunning}
          onClick={onAutoFillRME}
        >
          Isi otomatis RME
        </button>
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
      </div>
      <div className="action-bar action-bar--tri-tabs diagnosis-action-bar">
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={!canAutoFill || isRunning}
          onClick={onTransferAnamnesa}
        >
          Anamnesis
        </button>
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={isRunning}
          onClick={onRetryTransfer}
        >
          Ulangi
        </button>
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={!isRunning}
          onClick={onCancelTransfer}
        >
          Batal
        </button>
      </div>

      <details className="diagnosis-details diagnosis-details--inline">
        <summary>Rincian transfer</summary>
        <div className="diagnosis-list">
          {transfer.steps.map((step) => (
            <div key={step.key} className="neu-select diagnosis-selected-row">
              <div>
                <div className="diagnosis-row-title">{formatClinicalText(step.label)}</div>
                <div className="diagnosis-row-meta">
                  {formatTransferState(step.state)} | {formatClinicalText(step.detail)}
                </div>
                {step.reason ? (
                  <div className="diagnosis-warning">{formatClinicalText(step.reason)}</div>
                ) : null}
                {step.message ? (
                  <div className="diagnosis-row-meta">{formatClinicalText(step.message)}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
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

function StaticField({ value }: { value: string }) {
  return (
    <div className="neu-select field-summary-prominent select-prominent diagnosis-static-field">
      {value}
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
