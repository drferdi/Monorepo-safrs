import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

import { toggleFinding, type BedsideKind, type FindingChoice } from './bedsideFindings';
import { PANEL_CLOSE, PANEL_OPEN } from './ReasonTimeline';

import type { BedsideFindingRecord } from '@/types/api';

/**
 * The tick list for one next best step: the doctor taps what was found instead of typing, then
 * "Simpan" records it for the engine. It opens like the reasons panel (height on a no-bounce
 * spring, nothing else moves). The step's name is already shown above it, so it is not repeated.
 */
export function BedsideCheck({
  step,
  choice,
  onSave,
  onCancel,
}: {
  step: { kind: BedsideKind; item: string };
  choice: FindingChoice;
  onSave: (record: BedsideFindingRecord) => void;
  onCancel: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <motion.div
      className="overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: 'auto',
        opacity: 1,
        transition: reduceMotion ? { duration: 0.2 } : { height: PANEL_OPEN, opacity: { duration: 0.25 } },
      }}
      exit={{
        height: 0,
        opacity: 0,
        transition: reduceMotion ? { duration: 0.15 } : { height: PANEL_CLOSE, opacity: { duration: 0.18 } },
      }}
    >
      <div className="flex flex-col gap-2 pt-2">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Hasil ${step.item}`}>
          {choice.options.map((option) => (
            <button
              key={option}
              type="button"
              className="neu-select diagnosis-medication-row"
              aria-pressed={selected.includes(option)}
              onClick={() => setSelected((current) => toggleFinding(choice, current, option))}
            >
              <span className="diagnosis-row-title">{option}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-ac-inline btn-ac-inline--sharp"
            disabled={selected.length === 0}
            onClick={() => onSave({ kind: step.kind, item: step.item, findings: selected })}
          >
            Simpan
          </button>
          <button type="button" className="diagnosis-text-button" onClick={onCancel}>
            Batal
          </button>
        </div>
      </div>
    </motion.div>
  );
}
