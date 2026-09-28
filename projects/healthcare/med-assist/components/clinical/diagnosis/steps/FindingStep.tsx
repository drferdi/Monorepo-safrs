import { buildClinicalSignals } from '../diagnosisDisplayUtils';

export function findingSummary(signals: string[]): string {
  if (signals.length === 0) return 'belum ada sinyal';
  const head = signals.slice(0, 4).join(' · ');
  return signals.length > 4 ? `${head} · +${signals.length - 4}` : head;
}

export function FindingStep(props: {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
}) {
  const signals = buildClinicalSignals(props);
  return (
    <section className="dx-flow-step" aria-label="Temuan">
      <h2 className="dx-flow-step__heading">Temuan</h2>
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
