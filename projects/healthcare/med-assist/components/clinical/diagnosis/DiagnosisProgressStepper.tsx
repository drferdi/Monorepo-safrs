import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

type StepKey = 'finding' | 'diagnosis' | 'therapy' | 'rme';

export function resolveDiagnosisSteps(
  phase: 'loading' | 'error' | 'ready',
  viewModel: DiagnosisPageViewModel
): Array<{ key: StepKey; label: string; done: boolean }> {
  return [
    { key: 'finding', label: 'Temuan', done: phase === 'ready' },
    { key: 'diagnosis', label: 'Diagnosis', done: isDiagnosisChosen(viewModel) },
    { key: 'therapy', label: 'Terapi', done: viewModel.therapy.selectedMedicationCount > 0 },
    { key: 'rme', label: 'RME', done: viewModel.transfer.state === 'success' },
  ];
}

export function DiagnosisProgressStepper({
  phase,
  viewModel,
}: {
  phase: 'loading' | 'error' | 'ready';
  viewModel: DiagnosisPageViewModel;
}) {
  const steps = resolveDiagnosisSteps(phase, viewModel);
  const firstOpen = steps.findIndex((step) => !step.done);
  const current = firstOpen === -1 ? steps.length - 1 : firstOpen;
  const filled = firstOpen === -1 ? steps.length - 1 : firstOpen;

  return (
    <nav className="diagnosis-stepper" aria-label="Langkah diagnosis">
      <span className="diagnosis-stepper__track" aria-hidden="true">
        <span className="diagnosis-stepper__fill" data-filled={filled} />
      </span>
      <ol className="diagnosis-stepper__list">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="diagnosis-stepper__step"
            data-done={step.done ? 'true' : 'false'}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="diagnosis-stepper__dot" aria-hidden="true" />
            <span className="diagnosis-stepper__label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
