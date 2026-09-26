import { useEffect, useMemo, useState } from 'react';

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

function buildReviewChecklist(
  hybridResult: HybridTrajectoryResult,
  viewModel: TrajectoryVisualizationViewModel
): Array<{ label: string; detail: string }> {
  const latestComplaint = hybridResult.clinicalContext.complaintSignals[0];
  const latestDiagnosis = hybridResult.clinicalContext.historicalDiagnosisSignals[0];
  const latestTherapy = hybridResult.clinicalContext.therapySignals[0];
  const vitalDriver = viewModel.vitalTrendMeta.primaryVitalDrivers[0];
  return [
    {
      label: 'Latest complaint',
      detail: latestComplaint
        ? `${latestComplaint.label}. ${latestComplaint.rationale}`
        : 'Review the latest complaint directly from the current visit.',
    },
    {
      label: 'Vital trend',
      detail: vitalDriver || 'Review vital trend directly from the chart tabs.',
    },
    {
      label: 'Active diagnosis',
      detail: latestDiagnosis
        ? `${latestDiagnosis.label}. ${latestDiagnosis.rationale}`
        : 'No active diagnosis signal extracted yet.',
    },
    {
      label: 'Active therapy',
      detail: latestTherapy
        ? `${latestTherapy.label}. ${latestTherapy.rationale}`
        : 'No active therapy signal extracted yet.',
    },
  ].slice(0, 4);
}

function renderAuditTrail(auditTrail: ClinicalReasoningWorkflowAuditEvent[]) {
  return (
    <div className="grid gap-2">
      {auditTrail.map((event) => (
        <div
          key={event.id}
          className="ct-v2-detail-card px-3 py-2"
        >
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
      ))}
    </div>
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
  const checklist = buildReviewChecklist(hybridResult, viewModel);
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
          <div className="ttv-section-title mb-2">Review next</div>
          <ol className="ct-v2-review-checklist">
            {checklist.map((item, index) => (
              <li key={item.label} className="ct-v2-review-item">
                <div className="ct-v2-copy-label">
                  {index + 1}. {item.label}
                </div>
                <div className="ct-v2-copy-detail">{item.detail}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="ct-v2-review-action">
          <div className="ct-v2-review-action-head flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="ttv-section-title mb-2">Physician action</div>
              <p className="text-small leading-relaxed text-platinum">{actionMessage}</p>
            </div>
            <span
              className={`ct-neu-chip ct-v2-review-action-chip whitespace-nowrap ${
                therapyReasoningPack.status === 'ready'
                  ? 'sentra-state-safe'
                  : 'ct-neu-chip--muted'
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
  const [auditPersistenceStatus, setAuditPersistenceStatus] = useState<
    'persisted' | 'unavailable'
  >('persisted');
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
    <details
      className="ct-v2-panel"
      data-testid="clinical-reasoning-audit-trail"
    >
      <summary className="cursor-pointer list-none">
        <div className="ct-v2-panel-head">
          <div className="min-w-0">
            <div className="ttv-section-title mb-1">Audit trail</div>
          </div>
          <div className="text-tiny text-muted whitespace-nowrap">
            {auditPersistenceStatus === 'persisted' ? 'Audit stored' : 'Audit unavailable'}
          </div>
        </div>
      </summary>

      <div className="mt-3">{renderAuditTrail(workflow.auditTrail)}</div>
    </details>
  );
}
