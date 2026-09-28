import { useState } from 'react';

import { splitReferralGuidance } from './diagnosisDisplayUtils';
import type { DiagnosisTriageView } from './diagnosisPageProps';

/**
 * One quiet line with the triage verdict. The danger-sign list belongs to the Triage page and is
 * never repeated here; a referral is the only thing loud enough to sit above the diagnosis.
 */
export function SafetyStrip({ triage }: { triage: DiagnosisTriageView | null }) {
  const [showReasons, setShowReasons] = useState(false);
  if (!triage) return null;
  const referral = triage.outcome === 'refer' || triage.outcome === 'emergency';
  const reasons = [
    ...triage.firedCriteria,
    ...(triage.referralGuidance ? splitReferralGuidance(triage.referralGuidance) : []),
  ];

  return (
    <section className="flex flex-col gap-1" aria-label="Keselamatan">
      <div
        className={`flex items-center justify-between gap-3 text-small ${referral ? 'ct-v2-danger-text' : 'text-muted'}`}
        data-testid="dx-flow-triage"
        data-tone={triage.tone}
      >
        <span>{referral ? `Rujuk: ${triage.headline}` : `Triase: ${triage.headline}`}</span>
        {reasons.length > 0 ? (
          <button
            type="button"
            className="diagnosis-text-button"
            aria-expanded={showReasons}
            onClick={() => setShowReasons((v) => !v)}
          >
            alasan
          </button>
        ) : null}
      </div>
      {showReasons ? (
        <ul className="diagnosis-line-list text-small text-muted">
          {reasons.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
