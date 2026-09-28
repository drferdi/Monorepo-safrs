import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

export type DiagnosisStepKey = 'finding' | 'diagnosis' | 'therapy' | 'rme';

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
    // Tatalaksana (Chief, 2026-09-29): therapy, safety, education, follow-up and safety net on one page.
    { key: 'therapy', index: 3, label: 'Tatalaksana', done: viewModel.therapy.selectedMedicationCount > 0 },
    { key: 'rme', index: 4, label: 'RME', done: viewModel.transfer.state === 'success' },
  ];
}

export function resolveActiveStep(steps: DiagnosisStepState[], reopened: DiagnosisStepKey | null): DiagnosisStepKey {
  if (reopened) return reopened;
  return steps.find((step) => !step.done)?.key ?? 'rme';
}
