import { formatTransferState } from '../diagnosisDisplayUtils';
import type { DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisPageViewModel } from '../diagnosisViewModel';
import { RMETransferPanel } from '../RMETransferPanel';

type Props = Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'onAutoFillRME'
  | 'onTransferDiagnosis'
  | 'onTransferResep'
  | 'onTransferAnamnesa'
  | 'onRetryTransfer'
  | 'onCancelTransfer'
>;

export function rmeSummary(viewModel: DiagnosisPageViewModel): string {
  return viewModel.transfer.state === 'success' ? 'terkirim' : formatTransferState(viewModel.transfer.state);
}

export function RmeStep({
  viewModel,
  onAutoFillRME,
  onTransferDiagnosis,
  onTransferResep,
  onTransferAnamnesa,
  onRetryTransfer,
  onCancelTransfer,
}: Props) {
  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="RME">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">RME</h2>
        <span className="ttv-label">4 / 4</span>
      </div>
      <RMETransferPanel
        viewModel={viewModel}
        onAutoFillRME={onAutoFillRME}
        onTransferDiagnosis={onTransferDiagnosis}
        onTransferResep={onTransferResep}
        onTransferAnamnesa={onTransferAnamnesa}
        onRetryTransfer={onRetryTransfer}
        onCancelTransfer={onCancelTransfer}
      />
    </section>
  );
}
