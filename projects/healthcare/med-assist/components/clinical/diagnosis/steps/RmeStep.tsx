import { formatTransferState } from '../diagnosisDisplayUtils';
import type { DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisPageViewModel } from '../diagnosisViewModel';
import { RMETransferPanel } from '../RMETransferPanel';

type Props = Pick<
  DiagnosisPageProps,
  | 'viewModel'
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
  onTransferResep,
  onTransferAnamnesa,
  onRetryTransfer,
  onCancelTransfer,
}: Props) {
  return (
    // The last page fills the resep and the anamnesa (education, "Kontrol …", vital signs); the
    // diagnosis went in on its own step (Chief, 2026-09-29).
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="RME Terapi">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">RME Terapi</h2>
        <span className="ttv-label">5 / 5</span>
      </div>
      <RMETransferPanel
        viewModel={viewModel}
        onTransferResep={onTransferResep}
        onTransferAnamnesa={onTransferAnamnesa}
        onRetryTransfer={onRetryTransfer}
        onCancelTransfer={onCancelTransfer}
      />
    </section>
  );
}
