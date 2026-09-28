import { motion } from 'framer-motion';

import type { DiagnosisStepState } from './diagnosisSteps';

export const stepLayoutId = (key: DiagnosisStepState['key']) => `dx-step-${key}`;

/**
 * A finished step folded to its title and one summary line. It shares a `layoutId` with the open
 * step, so the panel visibly folds into this receipt and unfolds again on "ubah" (the
 * "Expanding card" experiment on lab.xevrion.dev).
 */
export function StepReceipt({ step, summary, onReopen }: { step: DiagnosisStepState; summary: string; onReopen: () => void }) {
  return (
    <motion.div
      layout
      layoutId={stepLayoutId(step.key)}
      className="ct-v2-panel ct-v2-panel--secondary"
      data-testid={`dx-flow-receipt-${step.key}`}
    >
      <motion.div className="ct-v2-panel-head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.1 }}>
        <div className="min-w-0">
          <div className="ttv-section-title">{step.label}</div>
          <div className="text-small text-muted">{summary}</div>
        </div>
        <button type="button" className="diagnosis-text-button" aria-label={`ubah ${step.label}`} onClick={onReopen}>
          ubah
        </button>
      </motion.div>
    </motion.div>
  );
}

export function StepGhost({ step }: { step: DiagnosisStepState }) {
  return (
    <motion.div
      layout
      layoutId={stepLayoutId(step.key)}
      className="ct-v2-panel ct-v2-panel--secondary dx-step--ghost"
      data-testid={`dx-flow-ghost-${step.key}`}
      aria-hidden="true"
    >
      <div className="ttv-section-title">{`${step.index} · ${step.label}`}</div>
    </motion.div>
  );
}
