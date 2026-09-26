import type { CanonicalClinicalEngineOutput } from '@/lib/api/bridge-client';
import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

function formatSourceContext(result: HybridTrajectoryResult): string {
  const { clinicianContext } = result.clinicalContext;
  const actorText =
    clinicianContext.latestClinicianNames.length > 0
      ? `Terakhir tercatat oleh ${clinicianContext.latestClinicianNames.join(', ')}. `
      : '';

  return `${actorText}Sumber data mencakup ${clinicianContext.sourceBreakdown.scrapeCount} kunjungan scrape dan ${clinicianContext.sourceBreakdown.uplinkCount} kunjungan uplink.`;
}

function renderCanonicalSummary(
  canonicalOutput: CanonicalClinicalEngineOutput | null,
  canonicalError: string,
  isCanonicalLoading: boolean
): string {
  if (isCanonicalLoading) {
    return 'Canonical engine sedang sinkronisasi.';
  }

  if (canonicalOutput?.trajectory?.available) {
    return (
      canonicalOutput.trajectory.narrative || 'Canonical trajectory tersedia tanpa narasi tambahan.'
    );
  }

  if (canonicalError) {
    return canonicalError;
  }

  return '';
}

function renderSignalList(signals: Array<{ label: string; rationale: string }>, limit = 4) {
  return (
    <ul className="flex flex-col gap-2">
      {signals.slice(0, limit).map((signal) => (
        <li key={`${signal.label}:${signal.rationale}`} className="ct-v2-copy-stack">
          <span className="ct-v2-copy-label ct-v2-copy-label--body">{signal.label}</span>
          <span className="ct-v2-copy-detail">{signal.rationale}</span>
        </li>
      ))}
    </ul>
  );
}

function titleCaseRisk(value: string): string {
  return value.replace(/_/g, ' ');
}

function buildPrimitiveEvidence(
  result: HybridTrajectoryResult
): Array<{ label: string; rationale: string }> {
  const primitiveRows: Array<{ label: string; rationale: string }> = [];
  const news2 = result.clinicalIntelligence.news2;
  const activeNews2Parameters = news2.parameterScores
    .filter((parameter) => parameter.score > 0)
    .slice(0, 4)
    .map((parameter) => `${parameter.parameter} skor ${parameter.score}`);

  if (news2.scoreableParameters >= 2 && news2.riskLevel !== 'low') {
    primitiveRows.push({
      label: `NEWS2 aggregate ${news2.aggregateScore}`,
      rationale: `Risk ${titleCaseRisk(news2.riskLevel)}; parameter aktif ${activeNews2Parameters.join(', ') || 'tidak ada'}.`,
    });
  }

  for (const warning of result.clinicalIntelligence.earlyWarnings.slice(0, 2)) {
    primitiveRows.push({
      label: warning.patternName,
      rationale: `${warning.condition}. ${warning.criteriaMet.slice(0, 3).join('; ')}.`,
    });
  }

  if (result.clinicalIntelligence.shockIndex) {
    primitiveRows.push({
      label: `Shock Index ${result.clinicalIntelligence.shockIndex.value}`,
      rationale: `${titleCaseRisk(result.clinicalIntelligence.shockIndex.severity)} concern; ${result.clinicalIntelligence.shockIndex.criteriaMet.join('; ')}.`,
    });
  }

  const respiratorySignal = result.clinicalIntelligence.trajectorySignals.find(
    (signal) => signal.id === 'T-45'
  );
  if (respiratorySignal) {
    primitiveRows.push({
      label: 'Respiratory deterioration evidence',
      rationale: respiratorySignal.evidence.slice(0, 3).join('; '),
    });
  }

  return primitiveRows;
}

function buildPriorityPatternEvidence(
  priorityTrajectoryCoverage: TrajectoryVisualizationViewModel['priorityTrajectoryCoverage']
): Array<{ label: string; rationale: string }> {
  const rows = new Map<string, { label: string; rationale: string }>();

  for (const item of priorityTrajectoryCoverage) {
    if (item.status === 'inactive') continue;

    for (const evidence of item.evidence) {
      const match = evidence.match(/\b(CP-\d+)\b\s*:\s*(.+)$/i);
      if (!match) continue;

      const [, cpId, summary] = match;
      if (rows.has(cpId)) continue;

      rows.set(cpId, {
        label: cpId.toUpperCase(),
        rationale: summary.trim(),
      });
    }
  }

  return Array.from(rows.values());
}

export function ClinicalEvidenceDrawer({
  hybridResult,
  canonicalOutput,
  canonicalError,
  isCanonicalLoading,
  visitCount,
  keyDrivers,
  priorityTrajectoryCoverage,
  clinicalLensActive = false,
}: {
  hybridResult: HybridTrajectoryResult;
  canonicalOutput: CanonicalClinicalEngineOutput | null;
  canonicalError: string;
  isCanonicalLoading: boolean;
  visitCount: number;
  keyDrivers: TrajectoryVisualizationViewModel['keyDriverContributions'];
  priorityTrajectoryCoverage: TrajectoryVisualizationViewModel['priorityTrajectoryCoverage'];
  clinicalLensActive?: boolean;
}) {
  const complaintEvidence = hybridResult.clinicalContext.complaintSignals;
  const diagnosisEvidence = hybridResult.clinicalContext.historicalDiagnosisSignals;
  const therapyEvidence = hybridResult.clinicalContext.therapySignals;
  const canonicalSummary = renderCanonicalSummary(
    canonicalOutput,
    canonicalError,
    isCanonicalLoading
  );
  const primitiveEvidence = buildPrimitiveEvidence(hybridResult);
  const priorityPatternEvidence = buildPriorityPatternEvidence(priorityTrajectoryCoverage);

  return (
    <details
      className="ct-v2-panel ct-v2-panel--drawer ct-v2-panel--secondary"
      data-testid="clinical-evidence-drawer"
      data-clinical-lens-active={clinicalLensActive ? 'true' : 'false'}
    >
      <summary className="cursor-pointer list-none">
        <div className="ct-v2-panel-head">
          <div className="min-w-0">
            <div className="ttv-section-title mb-1">Evidence map</div>
          </div>
          <div className="text-tiny text-muted whitespace-nowrap">
            Supporting facts · {visitCount} visits
          </div>
        </div>
      </summary>

      <div className="ct-v2-lens-reveal-grid ct-v2-evidence-grid pt-4">
        {primitiveEvidence.length > 0 ? (
          <div
            className="ct-v2-detail-card ct-v2-detail-card--wide"
            data-testid="clinical-trajectory-primitives"
          >
            <div className="ttv-label text-tertiary mb-2">Clinical review primitives</div>
            {renderSignalList(primitiveEvidence, 6)}
          </div>
        ) : null}

        {complaintEvidence.length > 0 ? (
          <div className="ct-v2-detail-card">
            <div className="ttv-label text-tertiary mb-2">Keluhan saat ini</div>
            {renderSignalList(complaintEvidence)}
          </div>
        ) : null}

        {diagnosisEvidence.length > 0 ? (
          <div className="ct-v2-detail-card">
            <div className="ttv-label text-tertiary mb-2">Diagnosis historis</div>
            {renderSignalList(diagnosisEvidence)}
          </div>
        ) : null}

        {therapyEvidence.length > 0 ? (
          <div className="ct-v2-detail-card">
            <div className="ttv-label text-tertiary mb-2">Riwayat terapi</div>
            {renderSignalList(therapyEvidence)}
          </div>
        ) : null}

        {keyDrivers.length > 0 ? (
          <div className="ct-v2-detail-card ct-v2-detail-card--wide">
            <div className="ttv-label text-tertiary mb-2">Driver signals</div>
            <ul className="flex flex-col gap-2">
              {keyDrivers.slice(0, 4).map((driver) => (
                <li
                  key={`${driver.driver}:${driver.explanation}`}
                  className="text-small text-muted leading-relaxed"
                >
                  <span className="font-medium text-platinum">{driver.driver}</span>
                  <span className="block">{driver.explanation}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {priorityPatternEvidence.length > 0 ? (
          <div
            className="ct-v2-detail-card ct-v2-detail-card--wide"
            data-testid="priority-clinical-pattern-evidence"
          >
            <div className="ttv-label text-tertiary mb-2">Priority clinical pattern evidence</div>
            {renderSignalList(priorityPatternEvidence, 12)}
          </div>
        ) : (
          <div className="ct-v2-detail-card ct-v2-detail-card--wide">
            <div className="ttv-label text-tertiary mb-2">Clinical pattern evidence</div>
            <p className="ct-v2-copy-detail">
              No supporting clinical pattern evidence is available from CP or T-signal inputs yet.
            </p>
            <p className="ct-v2-copy-detail">
              Use this as physician-support context only; source context alone is not sufficient
              evidence.
            </p>
          </div>
        )}

        <div className="ct-v2-detail-card ct-v2-detail-card--wide">
          <div className="ttv-label text-tertiary mb-2">Sumber data dan tim klinis</div>
          <div className="ct-v2-copy-detail">{formatSourceContext(hybridResult)}</div>
        </div>

        {canonicalSummary ? (
          <div className="ct-v2-detail-card ct-v2-detail-card--wide">
            <div className="ttv-label text-tertiary mb-2">Konteks canonical</div>
            <div className="ct-v2-copy-detail">{canonicalSummary}</div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
