import { bedsideFindingLine } from '../bedsideFindings';
import { buildClinicalSignals } from '../diagnosisDisplayUtils';

import type { BedsideFindingRecord } from '@/types/api';

/** The page shows at most three findings; everything else stays on the Syn Patient page. */
export const MAX_FINDINGS = 3;

type FindingInput = {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
  /** Results the doctor ticked for next best steps. */
  bedsideFindings: BedsideFindingRecord[];
};

/**
 * Signals in reading order: the main complaint first, then what the doctor found at the bedside
 * (inside the three the page shows, so a ticked result is never hidden behind "+n"), then the
 * rest of the complaint, allergy and chronic context.
 */
export function findingSignals(input: FindingInput): string[] {
  const fromComplaint = buildClinicalSignals({ ...input, allergySummary: '', chronicDiagnosisSummary: '' });
  const fromBedside = input.bedsideFindings.map(bedsideFindingLine);
  const all = buildClinicalSignals(input);
  return [
    ...fromComplaint.slice(0, 1),
    ...fromBedside,
    ...fromComplaint.slice(1),
    ...all.filter((signal) => !fromComplaint.includes(signal)),
  ];
}

export function findingSummary(signals: string[]): string {
  if (signals.length === 0) return 'belum ada sinyal';
  const head = signals.slice(0, MAX_FINDINGS).join(' · ');
  return signals.length > MAX_FINDINGS ? `${head} · +${signals.length - MAX_FINDINGS}` : head;
}

export function FindingStep(props: FindingInput) {
  const signals = findingSignals(props).slice(0, MAX_FINDINGS);
  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Temuan">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">Temuan</h2>
        <span className="ttv-label">1 / 5</span>
      </div>
      <div className="diagnosis-context__grid" data-testid="diagnosis-clinical-signals">
        {signals.map((signal) => (
          <span key={signal} className="diagnosis-chip">
            {signal}
          </span>
        ))}
      </div>
    </section>
  );
}
