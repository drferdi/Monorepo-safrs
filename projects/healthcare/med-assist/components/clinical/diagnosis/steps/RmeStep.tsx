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
    <section className="dx-flow-step" aria-label="RME">
      <h2 className="dx-flow-step__heading">RME</h2>
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
