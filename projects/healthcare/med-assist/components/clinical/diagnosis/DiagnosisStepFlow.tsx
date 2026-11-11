import { useEffect, useState } from 'react';

import {
  cleanClinicalSummary,
  dedupeSignals,
  isGenericDiagnosisUiText,
} from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { resolveActiveStep, resolveDiagnosisSteps, type DiagnosisStepKey } from './diagnosisSteps';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';
import { StepGhost, StepReceipt } from './StepReceipt';
import { DiagnosisStep, diagnosisSummary } from './steps/DiagnosisStep';
import { FindingStep, findingSignals, findingSummary } from './steps/FindingStep';
import { RmeDiagnosisStep, rmeDiagnosisSummary } from './steps/RmeDiagnosisStep';
import { RmeStep, rmeSummary } from './steps/RmeStep';
import { TatalaksanaStep, tatalaksanaSummary } from './steps/TatalaksanaStep';

// No motion (Chief, 2026-09-29: steady like a console, "gak suka ... gerak gerak kaya karet"):
// a step replaces the one before it in place, and a finished step is its receipt at once.
/** Three pages: Temuan, Diagnosis and RME Diagnosa; Tatalaksana; RME Terapi (Chief, 2026-09-29). */
const pageOf = (index: number): number => (index <= 3 ? 1 : index === 4 ? 2 : 3);

function getVisibleExamItems(items: string[]): string[] {
  return dedupeSignals(
    items.map(cleanClinicalSummary).filter((item) => item && !isGenericDiagnosisUiText(item))
  ).slice(0, 4);
}

export function DiagnosisStepFlow(props: DiagnosisPageProps) {
  const { viewModel, phase } = props;
  const [therapySkipped, setTherapySkipped] = useState(false);
  const [therapyConfirmed, setTherapyConfirmed] = useState(false);
  // RME Diagnosa ends once the diagnosa fill succeeded (kept through later transfer runs, which
  // reset the step list) or on "Lanjut tanpa mengisi".
  const [rmeDiagnosisSent, setRmeDiagnosisSent] = useState(false);
  const [rmeDiagnosisSkipped, setRmeDiagnosisSkipped] = useState(false);
  // Temuan is the doctor's own input, so it is a receipt even while the engine is loading.
  // Tatalaksana ends only on its "Selesai", never on a tap; "Lanjut tanpa terapi tambahan" is a
  // decision on the page, not a way past it.
  const steps = resolveDiagnosisSteps(phase, viewModel).map((step) => {
    if (step.key === 'finding') return { ...step, done: true };
    if (step.key === 'rmeDiagnosis') return { ...step, done: rmeDiagnosisSent || rmeDiagnosisSkipped };
    if (step.key === 'therapy') return { ...step, done: therapyConfirmed };
    return step;
  });
  const [reopened, setReopened] = useState<DiagnosisStepKey | null>(null);
  const active = resolveActiveStep(steps, reopened);
  const signals = findingSignals({
    complaintSummary: props.complaintSummary,
    secondaryComplaint: props.secondaryComplaint,
    allergySummary: viewModel.context.allergySummary,
    chronicDiagnosisSummary: viewModel.context.chronicDiagnosisSummary,
    bedsideFindings: props.bedsideFindings,
  });
  const summaries: Record<DiagnosisStepKey, string> = {
    finding: findingSummary(signals),
    diagnosis: diagnosisSummary(viewModel),
    therapy: tatalaksanaSummary(
      viewModel,
      props.education,
      therapySkipped,
      props.chronicMedications
        .filter((medication) => props.continuedChronicKeys.includes(medication.key))
        .map((medication) => medication.name)
    ),
    rmeDiagnosis: rmeDiagnosisSummary(rmeDiagnosisSent, rmeDiagnosisSkipped),
    rme: rmeSummary(viewModel),
  };

  // A reopened step closes itself when the flow moves past it (e.g. the doctor picked a new diagnosis).
  useEffect(() => {
    setReopened(null);
  }, [viewModel.therapy.selectedDiagnosisCount, viewModel.transfer.state]);

  // The Tatalaksana decisions hold only for the diagnosis basis they were made on. "Lanjut tanpa
  // terapi tambahan" ends when a medication is chosen.
  const selectedDiagnosisKeys = viewModel.selectedDiagnoses.map((diagnosis) => diagnosis.key).join('|');
  const medicationChosen = viewModel.therapy.selectedMedicationCount > 0;
  useEffect(() => {
    setTherapySkipped(false);
    setTherapyConfirmed(false);
    setRmeDiagnosisSent(false);
    setRmeDiagnosisSkipped(false);
  }, [selectedDiagnosisKeys]);
  const diagnosaSent = viewModel.transfer.steps.some((step) => step.key === 'diagnosa' && step.state === 'success');
  useEffect(() => {
    if (diagnosaSent) setRmeDiagnosisSent(true);
  }, [diagnosaSent]);
  useEffect(() => {
    if (medicationChosen) setTherapySkipped(false);
  }, [medicationChosen]);

  const activeIndex = steps.find((s) => s.key === active)?.index ?? 2;
  // Pages (Chief, 2026-09-28, 2026-09-29): a page carries nothing of the pages after it; a later
  // page keeps the earlier pages' receipts on top, and their "ubah" goes back.
  const onThisPage = (s: (typeof steps)[number]) => pageOf(s.index) === pageOf(activeIndex);

  // Every finished step other than the active one is a receipt, in step order around it.
  const receipt = (s: (typeof steps)[number]) => (
    <StepReceipt key={s.key} step={s} summary={summaries[s.key]} onReopen={() => setReopened(s.key)} />
  );
  return (
    <div
      className="diagnosis-content ct-v2-layout"
      data-testid="diagnosis-workspace"
      data-diagnosis-view-state={viewModel.primary.isInsufficient ? 'insufficient' : 'review'}
      data-diagnosis-selected-count={viewModel.therapy.selectedDiagnosisCount}
      data-diagnosis-medication-count={viewModel.transfer.medicationSelectionLabel}
      data-diagnosis-transfer-state={viewModel.transfer.state}
    >
      {steps.filter((s) => s.done && s.index < activeIndex).map(receipt)}
      <div key={active} className="flex flex-col gap-3">
        {active === 'finding' ? (
          <FindingStep
            complaintSummary={props.complaintSummary}
            secondaryComplaint={props.secondaryComplaint}
            allergySummary={viewModel.context.allergySummary}
            chronicDiagnosisSummary={viewModel.context.chronicDiagnosisSummary}
            bedsideFindings={props.bedsideFindings}
          />
        ) : null}
        {active === 'diagnosis' ? <DiagnosisStep {...props} /> : null}
        {active === 'rmeDiagnosis' ? (
          <RmeDiagnosisStep
            {...props}
            onSkip={() => {
              setRmeDiagnosisSkipped(true);
              setReopened(null);
            }}
          />
        ) : null}
        {active === 'therapy' ? (
          <TatalaksanaStep
            {...props}
            skipped={therapySkipped}
            onSkip={() => setTherapySkipped(true)}
            onConfirm={() => {
              setTherapyConfirmed(true);
              setReopened(null);
            }}
          />
        ) : null}
        {active === 'rme' ? <RmeStep {...props} /> : null}
        {/* Tatalaksana closes on its own "Selesai"; a second one would be two doors to one action. */}
        {reopened && reopened !== 'therapy' ? (
          <div className="flex">
            <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={() => setReopened(null)}>
              selesai
            </button>
          </div>
        ) : null}
      </div>
      {steps.filter((s) => s.done && s.index > activeIndex && onThisPage(s)).map(receipt)}
      <SideLinks viewModel={viewModel} />
      {steps
        .filter((s) => s.index > activeIndex && !s.done && onThisPage(s))
        .map((s) => (
          <StepGhost key={s.key} step={s} />
        ))}
    </div>
  );
}

// Edukasi lives on the Tatalaksana page (Chief, 2026-09-29): it follows the chosen diagnosis.
function SideLinks({ viewModel }: { viewModel: DiagnosisPageViewModel }) {
  const [showExams, setShowExams] = useState(false);
  const examItems = getVisibleExamItems(viewModel.evidence.missing);
  if (examItems.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="diagnosis-text-button"
          aria-expanded={showExams}
          onClick={() => setShowExams((v) => !v)}
        >
          {`Penunjang (${examItems.length})`}
        </button>
      </div>
      {showExams ? (
        <ul className="diagnosis-line-list text-small text-muted" data-testid="dx-flow-exams">
          {examItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
