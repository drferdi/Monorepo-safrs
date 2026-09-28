import { useState } from 'react';

import { splitReferralGuidance } from './diagnosisDisplayUtils';
import type { DiagnosisTriageView } from './diagnosisPageProps';

export function SafetyStrip({ safetyItems, triage }: { safetyItems: string[]; triage: DiagnosisTriageView | null }) {
  const [showSigns, setShowSigns] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  if (safetyItems.length === 0 && !triage) return null;
  const referral = triage?.outcome === 'refer' || triage?.outcome === 'emergency';
  const reasons = triage ? [...triage.firedCriteria, ...(triage.referralGuidance ? splitReferralGuidance(triage.referralGuidance) : [])] : [];

  return (
    <section className="dx-flow-safety" aria-label="Keselamatan">
      {safetyItems.length > 0 ? (
        <div className="dx-flow-safety__line dx-flow-safety__line--danger" data-testid="dx-flow-danger">
          <span>{`⚠ ${safetyItems.length} tanda bahaya`}</span>
          <button type="button" className="dx-flow-link" aria-expanded={showSigns} onClick={() => setShowSigns((v) => !v)}>lihat</button>
        </div>
      ) : null}
      {showSigns ? (
        <ul className="dx-flow-list dx-flow-list--danger">{safetyItems.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : null}
      {triage ? (
        <div className="dx-flow-safety__line" data-testid="dx-flow-triage" data-tone={triage.tone}>
          <span>{referral ? `Rujuk: ${triage.headline}` : `Triase: ${triage.headline}`}</span>
          {reasons.length > 0 ? (
            <button type="button" className="dx-flow-link" aria-expanded={showReasons} onClick={() => setShowReasons((v) => !v)}>alasan</button>
          ) : null}
        </div>
      ) : null}
      {showReasons ? <ul className="dx-flow-list">{reasons.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </section>
  );
}
