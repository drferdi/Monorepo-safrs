import type { DiagnosisStepState } from './diagnosisSteps';

export function StepReceipt({ step, summary, onReopen }: { step: DiagnosisStepState; summary: string; onReopen: () => void }) {
  return (
    <div className="dx-flow-receipt" data-testid={`dx-flow-receipt-${step.key}`}>
      <span className="dx-flow-receipt__text">{`✓ ${step.label} · ${summary}`}</span>
      <button type="button" className="dx-flow-link" aria-label={`ubah ${step.label}`} onClick={onReopen}>ubah</button>
    </div>
  );
}

export function StepGhost({ step }: { step: DiagnosisStepState }) {
  return (
    <div className="dx-flow-ghost" data-testid={`dx-flow-ghost-${step.key}`} aria-hidden="true">
      {`${step.index} · ${step.label}`}
    </div>
  );
}
