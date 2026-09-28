import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

export type DiagnosisStepKey = 'finding' | 'diagnosis' | 'therapy' | 'education' | 'rme';

export interface DiagnosisStepState {
  key: DiagnosisStepKey;
  index: number;
  label: string;
  done: boolean;
}

export function resolveDiagnosisSteps(
  phase: 'loading' | 'error' | 'ready',
  viewModel: DiagnosisPageViewModel
): DiagnosisStepState[] {
  return [
    { key: 'finding', index: 1, label: 'Temuan', done: phase === 'ready' },
    { key: 'diagnosis', index: 2, label: 'Diagnosis', done: isDiagnosisChosen(viewModel) },
    { key: 'therapy', index: 3, label: 'Terapi', done: viewModel.therapy.selectedMedicationCount > 0 },
    // Edukasi ends only on the doctor's "Lanjut" (DiagnosisStepFlow); the view model has no signal for it.
    { key: 'education', index: 4, label: 'Edukasi', done: false },
    { key: 'rme', index: 5, label: 'RME', done: viewModel.transfer.state === 'success' },
  ];
}

export function resolveActiveStep(steps: DiagnosisStepState[], reopened: DiagnosisStepKey | null): DiagnosisStepKey {
  if (reopened) return reopened;
  return steps.find((step) => !step.done)?.key ?? 'rme';
}
