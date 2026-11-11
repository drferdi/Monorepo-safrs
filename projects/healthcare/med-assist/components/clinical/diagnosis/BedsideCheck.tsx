import { useState } from 'react';

import { nextState, STATE_LABEL, type BedsideKind, type FindingChoice } from './bedsideFindings';

import type { BedsideFindingRecord, BedsideFindingState } from '@/types/api';

/**
 * The panel for one next best step: the doctor records each finding as ditemukan, tidak
 * ditemukan or belum diperiksa instead of typing, then "Simpan" records it for the engine. Every
 * finding starts as belum diperiksa and stays so unless the doctor changes it, so nothing
 * untouched reaches the engine as absent. It appears in place like the reasons panel (no motion,
 * Chief's console rule). The step's name is already shown above it.
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
  const names = choice.type === 'list' ? choice.findings : [choice.finding];
  const [states, setStates] = useState<Record<string, BedsideFindingState>>({});
  const stateOf = (name: string): BedsideFindingState => states[name] ?? 'unknown';
  const set = (name: string, state: BedsideFindingState) => setStates((current) => ({ ...current, [name]: state }));
  const unknown = names.filter((name) => stateOf(name) === 'unknown');
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Hasil ${step.item}`}>
        {choice.type === 'list'
          ? choice.findings.map((name) => (
              // A tap moves the finding on: belum diperiksa, ditemukan, tidak ditemukan, and back.
              <button
                key={name}
                type="button"
                className="neu-select diagnosis-medication-row"
                aria-pressed={stateOf(name) !== 'unknown'}
                aria-label={`${name}: ${STATE_LABEL[stateOf(name)]}`}
                onClick={() => set(name, nextState(stateOf(name)))}
              >
                <span className="min-w-0 text-left">
                  <span className="diagnosis-row-title block">{name}</span>
                  <span className="diagnosis-row-meta block">{STATE_LABEL[stateOf(name)]}</span>
                </span>
              </button>
            ))
          : (['present', 'absent'] as const).map((state) => (
              <button
                key={state}
                type="button"
                className="neu-select diagnosis-medication-row"
                aria-pressed={stateOf(choice.finding) === state}
                onClick={() => set(choice.finding, stateOf(choice.finding) === state ? 'unknown' : state)}
              >
                <span className="diagnosis-row-title">{choice[state]}</span>
              </button>
            ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-ac-inline btn-ac-inline--sharp"
          disabled={unknown.length === names.length}
          onClick={() =>
            onSave({ kind: step.kind, item: step.item, findings: names.map((name) => ({ name, state: stateOf(name) })) })
          }
        >
          Simpan
        </button>
        {/* Absent only on the doctor's word: this marks the findings still belum diperiksa. */}
        {choice.type === 'list' && unknown.length > 0 ? (
          <button
            type="button"
            className="diagnosis-text-button"
            onClick={() => setStates((current) => ({ ...current, ...Object.fromEntries(unknown.map((name) => [name, 'absent' as const])) }))}
          >
            {unknown.length === names.length ? 'Semua tidak ditemukan' : 'Sisanya tidak ditemukan'}
          </button>
        ) : null}
        <button type="button" className="diagnosis-text-button" onClick={onCancel}>
          Batal
        </button>
      </div>
    </div>
  );
}
