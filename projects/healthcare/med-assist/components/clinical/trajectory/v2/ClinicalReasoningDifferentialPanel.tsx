import { useEffect, useMemo, useState } from 'react';

import { formatChartDate } from '../charts/chart-shared';

import { DisclosureHint } from './DisclosureHint';

import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import {
  buildClinicalReasoningWorkflowFromTrajectoryV2,
  persistClinicalReasoningWorkflowAudit,
  type ClinicalReasoningWorkflowAuditEvent,
} from '@/lib/iskandar-diagnosis-engine';
import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

function sentenceCase(text: string): string {
  const normalized = text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return normalized;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function findComplaintOnsetSentence(
  hybridResult: HybridTrajectoryResult,
  matchedKeywords: string[]
): string {
  const onsetIndex = hybridResult.longitudinalFrames.findIndex((frame) => {
    const complaint = frame.complaint?.toLowerCase() ?? '';
    return matchedKeywords.some((keyword) => complaint.includes(keyword));
  });
  if (onsetIndex < 0) return 'Keluhan ini tercatat pada kunjungan saat ini.';
  const onsetFrame = hybridResult.longitudinalFrames[onsetIndex];
  return `Keluhan ini muncul sejak kunjungan ke-${onsetIndex + 1} (${formatChartDate(onsetFrame.observedAt)}).`;
}

function buildReviewNarrative(
  hybridResult: HybridTrajectoryResult,
  viewModel: TrajectoryVisualizationViewModel
): string {
  const { complaintSignals, historicalDiagnosisSignals, therapySignals } =
    hybridResult.clinicalContext;
  const latestComplaint = complaintSignals[0];
  const latestDiagnosis = historicalDiagnosisSignals[0];
  const latestTherapy = therapySignals[0];
  const vitalDrivers = viewModel.vitalTrendMeta.primaryVitalDrivers;
  const { finalState } = hybridResult.integratedAssessment;
  const needsPrimarySurvey =
    complaintSignals.length > 0 || finalState === 'deteriorating' || finalState === 'critical';

  return [
    ...(latestComplaint
      ? [
          `Pada pasien ditemukan adanya ${latestComplaint.label.toLowerCase()}.`,
          findComplaintOnsetSentence(hybridResult, latestComplaint.matchedKeywords),
          latestComplaint.rationale,
        ]
      : ['Belum ada sinyal keluhan yang menonjol; tinjau keluhan terakhir pada kunjungan saat ini.']),
    vitalDrivers.length > 0
      ? `Tren tanda vital yang perlu diperhatikan: ${vitalDrivers.join(', ')}.`
      : 'Tren tanda vital belum menunjukkan perubahan yang menonjol.',
    ...(latestDiagnosis ? [`${latestDiagnosis.label}. ${latestDiagnosis.rationale}`] : []),
    ...(latestTherapy ? [`${latestTherapy.label}. ${latestTherapy.rationale}`] : []),
    ...(needsPrimarySurvey
      ? ['Sentra menyarankan survei primer A-B-C-D (Airway, Breathing, Circulation, Disability).']
      : []),
  ].join(' ');
}

function renderAuditTrail(auditTrail: ClinicalReasoningWorkflowAuditEvent[]) {
  return (
    <ol className="ct-audit-timeline">
      {auditTrail.map((event) => (
        <li key={event.id} className="ct-audit-timeline__event">
          <span className="ct-audit-timeline__node" aria-hidden="true" />
          <div className="ct-v2-detail-card px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-platinum">
                Step {event.sequence}
              </span>
              <span className="text-[10px] uppercase tracking-[0.04em] text-muted">
                {sentenceCase(event.stage)} · {sentenceCase(event.status)}
              </span>
            </div>
            <div className="mt-1 text-small leading-relaxed text-muted">
              {sentenceCase(event.summary)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ClinicalReasoningDifferentialPanel({
  hybridResult,
  viewModel,
  onOpenDifferential,
}: {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
  onOpenDifferential?: () => void;
}) {
  const workflow = useMemo(
    () =>
      buildClinicalReasoningWorkflowFromTrajectoryV2({
        hybridResult,
        viewModel,
        physicianConfirmedCandidateId: undefined,
      }),
    [hybridResult, viewModel]
  );
  const { arbiterResult, therapyReasoningPack } = workflow;
  const narrative = buildReviewNarrative(hybridResult, viewModel);
  const selectedWorkingDiagnosis = arbiterResult.selectedWorkingDiagnosis;

  const actionMessage = selectedWorkingDiagnosis
    ? `Working diagnosis selected: ${selectedWorkingDiagnosis.name}. Therapy support can be reviewed on the next step.`
    : 'Select a working diagnosis to unlock therapy support.';
  const therapySummary =
    therapyReasoningPack.status === 'ready'
      ? 'Therapy support is available for physician review only.'
      : 'Therapy support locked until physician selection.';

  return (
    <section className="ct-v2-review-details" data-testid="clinical-reasoning-differential-panel">
      <div className="grid gap-4">
        <div>
          <div className="ttv-section-title mb-2">Penjelasan</div>
          <div className="ct-v2-review-item">
            <p className="ct-v2-copy-detail" data-testid="clinical-review-narrative">
              {narrative}
            </p>
          </div>
        </div>

        <div className="ct-v2-review-action">
          <div className="ct-v2-review-action-head flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="ttv-section-title mb-2">Physician action</div>
              <p className="text-small leading-relaxed text-platinum">{actionMessage}</p>
            </div>
            <span
              className={`ct-neu-chip ct-v2-review-action-chip whitespace-nowrap ${
                therapyReasoningPack.status === 'ready' ? 'sentra-state-safe' : 'ct-neu-chip--muted'
              }`}
            >
              {therapyReasoningPack.status === 'ready'
                ? 'Therapy support ready'
                : 'Working diagnosis required'}
            </span>
          </div>

          <p className="mt-3 text-small leading-relaxed text-muted">{therapySummary}</p>

          <button
            type="button"
            onClick={onOpenDifferential}
            disabled={!onOpenDifferential}
            className="engine-btn mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {onOpenDifferential ? 'Open diagnosis review' : 'Diagnosis review unavailable'}
          </button>
        </div>
      </div>
    </section>
  );
}

export function ClinicalReasoningAuditTrail({
  hybridResult,
  viewModel,
  workflowAuditSessionId,
}: {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
  workflowAuditSessionId?: string;
}) {
  const [auditPersistenceStatus, setAuditPersistenceStatus] = useState<'persisted' | 'unavailable'>(
    'persisted'
  );
  const workflow = useMemo(
    () =>
      buildClinicalReasoningWorkflowFromTrajectoryV2({
        hybridResult,
        viewModel,
        physicianConfirmedCandidateId: undefined,
      }),
    [hybridResult, viewModel]
  );

  useEffect(() => {
    let cancelled = false;

    persistClinicalReasoningWorkflowAudit({
      workflow,
      encounterId: workflowAuditSessionId ?? 'clinical-trajectory-v2-session',
    }).catch(() => {
      if (!cancelled) setAuditPersistenceStatus('unavailable');
    });

    return () => {
      cancelled = true;
    };
  }, [workflow, workflowAuditSessionId]);

  return (
    <details className="ct-v2-panel" data-testid="clinical-reasoning-audit-trail">
      <summary className="cursor-pointer list-none">
        <div className="ct-v2-panel-head">
          <div className="min-w-0">
            <div className="ttv-section-title mb-1">Audit trail</div>
          </div>
          <div className="text-tiny text-muted whitespace-nowrap">
            {auditPersistenceStatus === 'persisted' ? 'Audit stored' : 'Audit unavailable'}
          </div>
          <DisclosureHint />
        </div>
      </summary>

      <div className="mt-3">{renderAuditTrail(workflow.auditTrail)}</div>
    </details>
  );
}
