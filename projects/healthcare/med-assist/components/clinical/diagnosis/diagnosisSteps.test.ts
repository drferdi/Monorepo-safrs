import { describe, expect, it } from 'vitest';

import { resolveActiveStep, resolveDiagnosisSteps } from './diagnosisSteps';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

function vm(overrides: { selectedDiagnosisCount?: number; selectedMedicationCount?: number; transferState?: string } = {}): DiagnosisPageViewModel {
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: '', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: '', confidenceLabel: '', safestNextAction: '', primaryCtaLabel: '', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: [] },
    candidates: [],
    selectedDiagnoses: [],
    therapy: { state: 'idle', hasDiagnosisBasis: false, selectedDiagnosisCount: overrides.selectedDiagnosisCount ?? 0, selectedMedicationCount: overrides.selectedMedicationCount ?? 0, candidateMedicationCount: 0, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: '', groups: [] },
    transfer: { state: overrides.transferState ?? 'idle', diagnosisReady: false, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: null, medicationSelectionLabel: '0/0', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
  };
}

describe('resolveDiagnosisSteps', () => {
  it('marks steps done from phase, diagnosis, medication and transfer state', () => {
    expect(resolveDiagnosisSteps('loading', vm()).map((s) => s.done)).toEqual([false, false, false, false, false]);
    // Edukasi has no view-model signal; only the doctor's "Lanjut" in the flow ends it.
    expect(resolveDiagnosisSteps('ready', vm({ selectedDiagnosisCount: 1, selectedMedicationCount: 2, transferState: 'success' })).map((s) => s.done)).toEqual([true, true, true, false, true]);
    expect(resolveDiagnosisSteps('ready', vm()).map((s) => [s.index, s.label])).toEqual([[1, 'Temuan'], [2, 'Diagnosis'], [3, 'Terapi'], [4, 'Edukasi'], [5, 'RME']]);
  });
});

describe('resolveActiveStep', () => {
  it('is the first unfinished step, the reopened step when set, and rme when all are done', () => {
    expect(resolveActiveStep(resolveDiagnosisSteps('ready', vm()), null)).toBe('diagnosis');
    expect(resolveActiveStep(resolveDiagnosisSteps('ready', vm({ selectedDiagnosisCount: 1 })), 'finding')).toBe('finding');
    const allDone = resolveDiagnosisSteps('ready', vm({ selectedDiagnosisCount: 1, selectedMedicationCount: 1, transferState: 'success' })).map((s) =>
      s.key === 'education' ? { ...s, done: true } : s
    );
    expect(resolveActiveStep(allDone, null)).toBe('rme');
  });
});
