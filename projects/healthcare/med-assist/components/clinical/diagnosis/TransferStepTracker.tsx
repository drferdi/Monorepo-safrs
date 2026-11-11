import { formatClinicalText, formatTransferState } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

type TransferStep = DiagnosisPageViewModel['transfer']['steps'][number];
export type TransferStepMark = 'done' | 'failed' | 'running' | 'skipped' | 'waiting';

export function resolveStepMark(state: string): TransferStepMark {
  if (state === 'success') return 'done';
  if (state === 'failed' || state === 'error') return 'failed';
  if (state === 'running') return 'running';
  if (state === 'skipped' || state === 'cancelled') return 'skipped';
  return 'waiting';
}

export function TransferStepTracker({ steps }: { steps: TransferStep[] }) {
  if (steps.length === 0) return null;

  const marks = steps.map((step) => resolveStepMark(step.state));
  const filled =
    marks.reduce((last, mark, index) => (mark === 'done' || mark === 'failed' || mark === 'skipped' ? index + 1 : last), 0);

  return (
    <ol className="transfer-tracker" aria-label="Langkah transfer" data-filled={filled}>
      {steps.map((step, index) => (
        <li
          key={step.key}
          className={`transfer-tracker__step${index < filled ? ' transfer-tracker__step--reached' : ''}`}
          data-mark={marks[index]}
        >
          <span className="transfer-tracker__node" aria-hidden="true" />
          <div className="transfer-tracker__body">
            <div className="diagnosis-row-title">{formatClinicalText(step.label)}</div>
            <div className="diagnosis-row-meta">
              {formatTransferState(step.state)} | {formatClinicalText(step.detail)}
            </div>
            {step.reason ? <div className="diagnosis-warning">{formatClinicalText(step.reason)}</div> : null}
            {step.message ? <div className="diagnosis-row-meta">{formatClinicalText(step.message)}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
