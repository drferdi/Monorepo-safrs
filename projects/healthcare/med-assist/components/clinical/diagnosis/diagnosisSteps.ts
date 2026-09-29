import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

export type DiagnosisStepKey = 'finding' | 'diagnosis' | 'rmeDiagnosis' | 'therapy' | 'rme';

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
    // ePuskesmas keeps the Diagnosa page apart from the therapy (Chief, 2026-09-29), so the
    // diagnosis goes to the RME right after it is chosen and the resep after Tatalaksana.
    {
      key: 'rmeDiagnosis',
      index: 3,
      label: 'RME Diagnosa',
      done: viewModel.transfer.steps.some((step) => step.key === 'diagnosa' && step.state === 'success'),
    },
    // Tatalaksana (Chief, 2026-09-29): therapy, safety, education, follow-up and safety net on one page.
    { key: 'therapy', index: 4, label: 'Tatalaksana', done: viewModel.therapy.selectedMedicationCount > 0 },
    { key: 'rme', index: 5, label: 'RME Terapi', done: viewModel.transfer.state === 'success' },
  ];
}

export function resolveActiveStep(steps: DiagnosisStepState[], reopened: DiagnosisStepKey | null): DiagnosisStepKey {
  if (reopened) return reopened;
  return steps.find((step) => !step.done)?.key ?? 'rme';
}
