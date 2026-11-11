import type { DiagnosisStepState } from './diagnosisSteps';

/** A finished step shown as its title and one summary line; "ubah" opens it again in place. */
export function StepReceipt({
  step,
  summary,
  onReopen,
}: {
  step: DiagnosisStepState;
  summary: string;
  onReopen: () => void;
}) {
  return (
    <div className="ct-v2-panel ct-v2-panel--secondary" data-testid={`dx-flow-receipt-${step.key}`}>
      <div className="ct-v2-panel-head">
        <div className="min-w-0">
          <div className="ttv-section-title">{step.label}</div>
          <div className="text-small text-muted">{summary}</div>
        </div>
        <button type="button" className="diagnosis-text-button" aria-label={`ubah ${step.label}`} onClick={onReopen}>
          ubah
        </button>
      </div>
    </div>
  );
}

export function StepGhost({ step }: { step: DiagnosisStepState }) {
  return (
    <div
      className="ct-v2-panel ct-v2-panel--secondary dx-step--ghost"
      data-testid={`dx-flow-ghost-${step.key}`}
      aria-hidden="true"
    >
      <div className="ttv-section-title">{`${step.index} · ${step.label}`}</div>
    </div>
  );
}
