import { LayoutGroup, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import {
  cleanClinicalSummary,
  dedupeSignals,
  isGenericDiagnosisUiText,
} from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { resolveActiveStep, resolveDiagnosisSteps, type DiagnosisStepKey } from './diagnosisSteps';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';
import { StepGhost, StepReceipt, stepLayoutId } from './StepReceipt';
import { DiagnosisStep, diagnosisSummary } from './steps/DiagnosisStep';
import { FindingStep, findingSignals, findingSummary } from './steps/FindingStep';
import { RmeStep, rmeSummary } from './steps/RmeStep';
import { TherapyStep, therapySummary } from './steps/TherapyStep';

// Motion after lab.xevrion.dev: the open step and its receipt share a layoutId, so a finished
// panel folds into its receipt and unfolds again on "ubah" ("Expanding card"); the step's content
// slides in from the side it comes from, slightly blurred, and settles with an ease-out
// ("Multi-step form"). Reduced motion keeps only the cross-fade.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SHIFT = 36;
const slide: Variants = {
  enter: (direction: number) => ({ x: direction * SHIFT, opacity: 0, filter: 'blur(4px)' }),
  // `transitionEnd` drops the filter once settled, so the step's text is not rasterised on a
  // compositing layer for the rest of its life.
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.3, ease: EASE_OUT },
    transitionEnd: { filter: 'none' },
  },
};
const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
};

function getVisibleExamItems(items: string[]): string[] {
  return dedupeSignals(
    items.map(cleanClinicalSummary).filter((item) => item && !isGenericDiagnosisUiText(item))
  ).slice(0, 4);
}

export function DiagnosisStepFlow(props: DiagnosisPageProps) {
  const { viewModel, phase } = props;
  const reduceMotion = useReducedMotion();
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
  // Slide direction follows the step order: forward from the right, back (a reopened step) from the left.
  const previousIndex = useRef(activeIndex);
  const direction = activeIndex >= previousIndex.current ? 1 : -1;
  useEffect(() => {
    previousIndex.current = activeIndex;
  }, [activeIndex]);

  // Every finished step other than the active one is a receipt, in step order around it.
  const receipt = (s: (typeof steps)[number]) => (
    <StepReceipt key={s.key} step={s} summary={summaries[s.key]} onReopen={() => setReopened(s.key)} layoutKey={active} />
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
      <LayoutGroup>
        {steps.filter((s) => s.done && s.index < activeIndex).map(receipt)}
        {/* Layout animates only when the step changes (fold into / unfold from its receipt); a
            card growing inside the step must not scale the whole column (Chief, 2026-09-28). */}
        <motion.div
          key={active}
          layout
          layoutId={stepLayoutId(active)}
          layoutDependency={active}
          className="flex flex-col gap-3"
        >
          <motion.div
            className="flex flex-col gap-3"
            custom={direction}
            variants={reduceMotion ? fade : slide}
            initial="enter"
            animate="center"
          >
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
              <div className="flex">
                <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={() => setReopened(null)}>
                  selesai
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
        {steps.filter((s) => s.done && s.index > activeIndex).map(receipt)}
        <SideLinks viewModel={viewModel} />
        {steps
          .filter((s) => s.index > activeIndex && !s.done)
          .map((s) => (
            <StepGhost key={s.key} step={s} layoutKey={active} />
          ))}
      </LayoutGroup>
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
      <div className="flex flex-wrap gap-3">
        {examItems.length > 0 ? (
          <button
            type="button"
            className="diagnosis-text-button"
            aria-expanded={showExams}
            onClick={() => setShowExams((v) => !v)}
          >
            {`Penunjang (${examItems.length})`}
          </button>
        ) : null}
        {educationItems.length > 0 ? (
          <button
            type="button"
            className="diagnosis-text-button"
            aria-expanded={showEducation}
            onClick={() => setShowEducation((v) => !v)}
          >
            {`Edukasi (${educationItems.length})`}
          </button>
        ) : null}
      </div>
      {showExams ? (
        <ul className="diagnosis-line-list text-small text-muted" data-testid="dx-flow-exams">
          {examItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {showEducation ? (
        <ul className="diagnosis-line-list text-small text-muted" data-testid="dx-flow-education">
          {educationItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
