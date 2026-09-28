import { useEffect, useState } from 'react';

import {
  buildClinicalSignals,
  cleanClinicalSummary,
  dedupeSignals,
  getVisibleSafetyItems,
  isGenericDiagnosisUiText,
} from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { resolveActiveStep, resolveDiagnosisSteps, type DiagnosisStepKey } from './diagnosisSteps';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';
import { SafetyStrip } from './SafetyStrip';
import { StepGhost, StepReceipt } from './StepReceipt';
import { DiagnosisStep, diagnosisSummary } from './steps/DiagnosisStep';
import { FindingStep, findingSummary } from './steps/FindingStep';
import { RmeStep, rmeSummary } from './steps/RmeStep';
import { TherapyStep, therapySummary } from './steps/TherapyStep';

function getVisibleExamItems(items: string[]): string[] {
  return dedupeSignals(
    items.map(cleanClinicalSummary).filter((item) => item && !isGenericDiagnosisUiText(item))
  ).slice(0, 4);
}

export function DiagnosisStepFlow(props: DiagnosisPageProps) {
  const { viewModel, phase, triage } = props;
  const [therapySkipped, setTherapySkipped] = useState(false);
  const [therapyConfirmed, setTherapyConfirmed] = useState(false);
  // Temuan is the doctor's own input, so it is a receipt even while the engine is loading.
  // Terapi advances only on an explicit "Lanjut" or "Lanjut tanpa obat", never on a tap.
  const steps = resolveDiagnosisSteps(phase, viewModel).map((step) => {
    if (step.key === 'finding') return { ...step, done: true };
    if (step.key === 'therapy') return { ...step, done: therapyConfirmed || therapySkipped };
    return step;
  });
  const [reopened, setReopened] = useState<DiagnosisStepKey | null>(null);
  const active = resolveActiveStep(steps, reopened);
  const safetyItems = getVisibleSafetyItems(viewModel.evidence.redFlags, viewModel.evidence.doNotMiss);
  const signals = buildClinicalSignals({
    complaintSummary: props.complaintSummary,
    secondaryComplaint: props.secondaryComplaint,
    allergySummary: viewModel.context.allergySummary,
    chronicDiagnosisSummary: viewModel.context.chronicDiagnosisSummary,
  });
  const summaries: Record<DiagnosisStepKey, string> = {
    finding: findingSummary(signals),
    diagnosis: diagnosisSummary(viewModel),
    therapy: therapySkipped ? 'tanpa obat' : therapySummary(viewModel),
    rme: rmeSummary(viewModel),
  };

  // A reopened step closes itself when the flow moves past it (e.g. the doctor picked a new diagnosis).
  useEffect(() => {
    setReopened(null);
  }, [viewModel.therapy.selectedDiagnosisCount, viewModel.transfer.state]);

  // The Terapi decision holds only for the diagnosis basis it was made on. "Lanjut tanpa obat"
  // ends when a medication is chosen, "Lanjut" when the last medication is removed.
  const selectedDiagnosisKeys = viewModel.selectedDiagnoses.map((diagnosis) => diagnosis.key).join('|');
  const medicationChosen = viewModel.therapy.selectedMedicationCount > 0;
  useEffect(() => {
    setTherapySkipped(false);
    setTherapyConfirmed(false);
  }, [selectedDiagnosisKeys]);
  useEffect(() => {
    if (medicationChosen) setTherapySkipped(false);
    else setTherapyConfirmed(false);
  }, [medicationChosen]);

  const activeIndex = steps.find((s) => s.key === active)?.index ?? 2;
  // Every finished step other than the active one is a receipt, in step order around it.
  const receipt = (s: (typeof steps)[number]) => (
    <StepReceipt key={s.key} step={s} summary={summaries[s.key]} onReopen={() => setReopened(s.key)} />
  );
  return (
    <div
      className="dx-flow diagnosis-content"
      data-testid="diagnosis-workspace"
      data-diagnosis-view-state={viewModel.primary.isInsufficient ? 'insufficient' : 'review'}
      data-diagnosis-selected-count={viewModel.therapy.selectedDiagnosisCount}
      data-diagnosis-medication-count={viewModel.transfer.medicationSelectionLabel}
      data-diagnosis-transfer-state={viewModel.transfer.state}
    >
      <SafetyStrip safetyItems={safetyItems} triage={triage ?? null} />
      {steps.filter((s) => s.done && s.index < activeIndex).map(receipt)}
      {active === 'finding' ? (
        <FindingStep
          complaintSummary={props.complaintSummary}
          secondaryComplaint={props.secondaryComplaint}
          allergySummary={viewModel.context.allergySummary}
          chronicDiagnosisSummary={viewModel.context.chronicDiagnosisSummary}
        />
      ) : null}
      {active === 'diagnosis' ? <DiagnosisStep {...props} /> : null}
      {active === 'therapy' ? (
        <TherapyStep
          {...props}
          onConfirm={() => {
            setTherapyConfirmed(true);
            setReopened(null);
          }}
          onSkip={() => {
            setTherapySkipped(true);
            setReopened(null);
          }}
        />
      ) : null}
      {active === 'rme' ? <RmeStep {...props} /> : null}
      {reopened ? (
        <button type="button" className="dx-flow-link" onClick={() => setReopened(null)}>
          selesai
        </button>
      ) : null}
      {steps.filter((s) => s.done && s.index > activeIndex).map(receipt)}
      <SideLinks viewModel={viewModel} />
      {steps
        .filter((s) => s.index > activeIndex && !s.done)
        .map((s) => (
          <StepGhost key={s.key} step={s} />
        ))}
    </div>
  );
}

function SideLinks({ viewModel }: { viewModel: DiagnosisPageViewModel }) {
  const [showExams, setShowExams] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const examItems = getVisibleExamItems(viewModel.evidence.missing);
  const examKeys = new Set(examItems.map((item) => item.toLowerCase()));
  const educationItems = viewModel.evidence.review
    .map(cleanClinicalSummary)
    .filter((item) => item && !examKeys.has(item.toLowerCase()));
  if (examItems.length === 0 && educationItems.length === 0) return null;

  return (
    <>
      <div className="dx-flow-links">
        {examItems.length > 0 ? (
          <button
            type="button"
            className="dx-flow-link"
            aria-expanded={showExams}
            onClick={() => setShowExams((v) => !v)}
          >
            {`Penunjang (${examItems.length})`}
          </button>
        ) : null}
        {educationItems.length > 0 ? (
          <button
            type="button"
            className="dx-flow-link"
            aria-expanded={showEducation}
            onClick={() => setShowEducation((v) => !v)}
          >
            {`Edukasi (${educationItems.length})`}
          </button>
        ) : null}
      </div>
      {showExams ? (
        <ul className="dx-flow-list" data-testid="dx-flow-exams">
          {examItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {showEducation ? (
        <ul className="dx-flow-list" data-testid="dx-flow-education">
          {educationItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
