import type { DiagnosisPageProps } from '../diagnosisPageProps';
import { ReadOnlyPanel } from '../RMETransferPanel';

type Props = Pick<DiagnosisPageProps, 'viewModel' | 'onTransferDiagnosis' | 'onRetryTransfer' | 'onCancelTransfer'> & {
  /** "Lanjut tanpa mengisi": on to Tatalaksana without filling the Diagnosa page. */
  onSkip: () => void;
};

export function rmeDiagnosisSummary(sent: boolean, skipped: boolean): string {
  return sent ? 'terkirim' : skipped ? 'dilewati' : 'belum dikirim';
}

/**
 * ePuskesmas keeps the Diagnosa page apart from the therapy (Chief, 2026-09-29), so the chosen
 * diagnosis goes to the RME right after it is chosen, before Tatalaksana.
 */
export function RmeDiagnosisStep({ viewModel, onTransferDiagnosis, onRetryTransfer, onCancelTransfer, onSkip }: Props) {
  const transfer = viewModel.transfer;
  const ready = !viewModel.primary.isInsufficient && transfer.diagnosisReady;
  const isRunning = transfer.state === 'running';
  // One transfer state serves both RME pages: a resep or anamnesa run is not this page's.
  const ownRun = transfer.lastStep !== 'resep' && transfer.lastStep !== 'anamnesa';
  const canRetry = ownRun && ['failed', 'error', 'partial'].includes(transfer.state);
  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="RME Diagnosa">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">RME Diagnosa</h2>
        <span className="ttv-label">3 / 5</span>
      </div>
      <p className="diagnosis-row-meta">Buka halaman Diagnosa di ePuskesmas, lalu isi diagnosis yang dipilih.</p>
      {ownRun && transfer.error ? <ReadOnlyPanel tone="danger">{transfer.error}</ReadOnlyPanel> : null}
      <div className="diagnosis-transfer-primary">
        <button
          type="button"
          className="action-btn action-btn--primary diagnosis-autofill-btn"
          data-state={ownRun ? transfer.state : 'idle'}
          disabled={!ready || isRunning}
          onClick={onTransferDiagnosis}
        >
          <span className="diagnosis-autofill-btn__label">Isi diagnosis ke RME</span>
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
      <div>
        <button type="button" className="diagnosis-text-button" onClick={onSkip}>
          Lanjut tanpa mengisi
        </button>
      </div>
    </section>
  );
}
