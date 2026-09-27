import { useAnimate, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { formatChartDate } from '../charts/chart-shared';

import { ClinicalEvidenceDrawer } from './ClinicalEvidenceDrawer';
import {
  ClinicalReasoningAuditTrail,
  ClinicalReasoningDifferentialPanel,
} from './ClinicalReasoningDifferentialPanel';
import { ClinicalTrajectoryChartTabs } from './ClinicalTrajectoryChartTabs';
import { ClinicalTrajectoryHeader } from './ClinicalTrajectoryHeader';
import { DisclosureHint } from './DisclosureHint';

import type { CanonicalClinicalEngineOutput } from '@/lib/api/bridge-client';
import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import { sanitizeTrajectoryPresentationText } from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import type { PhysicianSafeTrajectoryPresentation } from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

type PatientContext = {
  name: string;
  gender: 'L' | 'P';
  age: number;
  rm: string;
  dob?: string;
  bpjsStatus?: 'aktif' | 'nonaktif' | 'mandiri' | null;
  kelurahan?: string;
  facilityName?: string;
  payerLabel?: string;
  visitCount: number;
};

type ClinicalLensTarget = 'details' | 'evidence' | null;
const CLINICAL_LENS_REVEAL_MS = 420;

function sanitizeDriverExplanations(
  viewModel: TrajectoryVisualizationViewModel
): TrajectoryVisualizationViewModel {
  return {
    ...viewModel,
    keyDriverContributions: viewModel.keyDriverContributions.map((driver) => ({
      ...driver,
      driver: sanitizeTrajectoryPresentationText(driver.driver),
      explanation: sanitizeTrajectoryPresentationText(driver.explanation),
    })),
    dataQualityWarnings: viewModel.dataQualityWarnings.map((item) =>
      sanitizeTrajectoryPresentationText(item)
    ),
    uncertaintyNotes: viewModel.uncertaintyNotes.map((item) =>
      sanitizeTrajectoryPresentationText(item)
    ),
    priorityTrajectoryCoverage: viewModel.priorityTrajectoryCoverage.map((item) => ({
      ...item,
      label: sanitizeTrajectoryPresentationText(item.label),
      evidence: item.evidence.map((evidence) => sanitizeTrajectoryPresentationText(evidence)),
    })),
  };
}

function sanitizeHybridSafety(result: HybridTrajectoryResult): HybridTrajectoryResult {
  return {
    ...result,
    redFlags: result.redFlags.map((flag) => ({
      ...flag,
      title: sanitizeTrajectoryPresentationText(flag.title),
      rationale: sanitizeTrajectoryPresentationText(flag.rationale),
    })),
  };
}

function buildStatusChip(finalState: HybridTrajectoryResult['integratedAssessment']['finalState']) {
  if (finalState === 'critical') {
    return { label: 'High Concern', className: 'sentra-state-danger' };
  }
  if (finalState === 'deteriorating') {
    return { label: 'Concern', className: 'sentra-state-warning' };
  }
  if (finalState === 'stable') {
    return { label: 'Stable', className: 'sentra-state-safe' };
  }
  return { label: 'Watch', className: 'sentra-state-info' };
}

function buildTrendChip(finalState: HybridTrajectoryResult['integratedAssessment']['finalState']) {
  if (finalState === 'critical') return 'Escalating';
  if (finalState === 'deteriorating') return 'Worsening';
  if (finalState === 'stable') return 'Flat';
  return 'Improving';
}

function buildPriorityChip(urgencyTier: PhysicianSafeTrajectoryPresentation['urgencyTier']) {
  if (urgencyTier === 'immediate') return 'Immediate';
  if (urgencyTier === 'high') return 'Urgent';
  if (urgencyTier === 'moderate') return 'Today';
  return 'Routine';
}

function countUniqueLongitudinalPoints(result: HybridTrajectoryResult): number {
  return new Set(
    result.longitudinalFrames
      .map((frame) => frame.observedAt || frame.visitLabel)
      .filter((value): value is string => Boolean(value))
  ).size;
}

export function ClinicalTrajectoryV2({
  hybridResult,
  viewModel,
  physicianPresentation,
  canonicalOutput,
  canonicalError,
  isCanonicalLoading,
  visitCount,
  workflowAuditSessionId,
  patientContext,
  onBack: _onBack,
  onOpenDifferential,
}: {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
  physicianPresentation: PhysicianSafeTrajectoryPresentation;
  canonicalOutput: CanonicalClinicalEngineOutput | null;
  canonicalError: string;
  isCanonicalLoading: boolean;
  visitCount: number;
  workflowAuditSessionId?: string;
  patientContext?: PatientContext;
  onBack?: () => void;
  onOpenDifferential?: () => void;
}) {
  const [lensScope, animate] = useAnimate();
  const [clinicalLensTarget, setClinicalLensTarget] = useState<ClinicalLensTarget>(null);
  const [clinicalLensRun, setClinicalLensRun] = useState(0);
  const reduceMotion = useReducedMotion() === true;
  const safeViewModel = sanitizeDriverExplanations(viewModel);
  const safeHybridResult = sanitizeHybridSafety(hybridResult);
  const latestTrajectoryPoint = safeViewModel.trajectoryTimeline.at(-1);
  const statusChip = buildStatusChip(safeHybridResult.integratedAssessment.finalState);
  const trendChip = buildTrendChip(safeHybridResult.integratedAssessment.finalState);
  const priorityChip = buildPriorityChip(physicianPresentation.urgencyTier);
  const uniqueLongitudinalPointCount = countUniqueLongitudinalPoints(safeHybridResult);
  const hasSufficientLongitudinalEvidence = uniqueLongitudinalPointCount >= 2;
  const dataQualityLimitations = safeViewModel.dataQualityWarnings.filter((warning) =>
    /Usia pasien belum tersedia|Status kesadaran belum tersedia/i.test(warning)
  );
  useEffect(() => {
    if (!clinicalLensTarget) return;

    const timeoutId = window.setTimeout(() => {
      setClinicalLensTarget(null);
    }, CLINICAL_LENS_REVEAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [clinicalLensTarget]);

  useEffect(() => {
    if (!clinicalLensTarget || reduceMotion) return;

    const animateReveal = async () => {
      await Promise.all([
        animate(
          "[data-clinical-lens-segment='latest']",
          { strokeWidth: [3.5, 4.2, 4] },
          { duration: 0.3, ease: 'easeOut' }
        ),
        animate(
          "[data-clinical-lens-point='latest'] .ct-v2-compact-point__core",
          { scale: [1, 1.12, 1] },
          { duration: 0.26, ease: 'easeOut' }
        ),
        animate(
          "[data-clinical-lens-point='latest'] .ct-v2-compact-point__ring",
          { opacity: [0.18, 0.48, 0.32], scale: [0.94, 1] },
          { duration: 0.32, ease: 'easeOut' }
        ),
      ]);

      const rowSelector =
        clinicalLensTarget === 'details'
          ? "[data-testid='clinical-review-details'] .ct-v2-review-details .grid > *"
          : "[data-testid='clinical-evidence-drawer'] .ct-v2-lens-reveal-grid > *";
      const scopeNode = lensScope.current as HTMLElement | SVGElement | null;
      const rows = Array.from(scopeNode?.querySelectorAll(rowSelector) ?? []) as HTMLElement[];

      await Promise.all(
        rows.map((row, index) =>
          animate(
            row,
            { opacity: [0.72, 1], y: [4, 0] },
            {
              duration: 0.22,
              delay: index * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }
          )
        )
      );
    };

    void animateReveal();
  }, [animate, clinicalLensRun, clinicalLensTarget, lensScope, reduceMotion]);

  if (!hasSufficientLongitudinalEvidence) {
    return (
      <div
        ref={lensScope}
        className="ct-neu-shell ct-v2-layout flex flex-col gap-3"
        data-testid="clinical-reasoning-workbench"
      >
        <section className="ct-v2-primary-card" data-testid="clinical-trajectory-v2-guarded">
          <div className="ct-v2-status-strip" data-testid="clinical-trajectory-status-strip">
            <span className="ct-v2-status-token sentra-state-info">Watch</span>
          </div>
          <div className="ct-v2-panel">
            <div className="ttv-section-title mb-1">Data trajectory belum cukup</div>
            <p className="text-small text-muted leading-relaxed">
              Trajectory longitudinal membutuhkan minimal 2 titik kunjungan unik sebelum review
              klinis ditampilkan.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const activateClinicalLens = (target: Exclude<ClinicalLensTarget, null>) => {
    setClinicalLensRun((previous) => previous + 1);
    setClinicalLensTarget(target);
  };

  const openDetailSection = () => {
    activateClinicalLens('details');
    const detailSection = document.querySelector<HTMLDetailsElement>(
      '[data-testid="clinical-review-details"]'
    );
    if (!detailSection) return;
    detailSection.open = true;
    detailSection.scrollIntoView?.({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };
  return (
    <div
      ref={lensScope}
      className="ct-neu-shell ct-v2-layout flex flex-col gap-3"
      data-testid="clinical-reasoning-workbench"
    >
      <section
        className="ct-v2-primary-card"
        data-testid="clinical-trajectory-v2"
        data-clinical-lens-active={clinicalLensTarget ? 'true' : 'false'}
        data-clinical-lens-target={clinicalLensTarget ?? 'idle'}
        data-clinical-lens-run={clinicalLensRun}
      >
        <div className="ct-v2-status-strip" data-testid="clinical-trajectory-status-strip">
          <span className={`ct-v2-status-token ${statusChip.className}`}>{statusChip.label}</span>
          <span className="ct-v2-status-separator" aria-hidden="true">
            ·
          </span>
          <span className="ct-v2-status-token">{trendChip}</span>
          <span className="ct-v2-status-separator" aria-hidden="true">
            ·
          </span>
          <span className="ct-v2-status-token">
            {priorityChip === 'Immediate' ? 'Review now' : priorityChip}
          </span>
        </div>
        <ClinicalTrajectoryHeader
          hybridResult={safeHybridResult}
          physicianPresentation={physicianPresentation}
        />
        <div key={`clinical-lens-${clinicalLensRun}`}>
          <ClinicalTrajectoryChartTabs hybridResult={safeHybridResult} viewModel={safeViewModel} />
        </div>
        <div className="ct-v2-action-row">
          <button type="button" className="ct-v2-inline-action" onClick={openDetailSection}>
            Review details
          </button>
        </div>
        {patientContext || latestTrajectoryPoint ? (
          <div className="ct-v2-context-line">
            <div className="ct-v2-context-line__item">
              {[
                `${visitCount} visits reviewed`,
                latestTrajectoryPoint?.date
                  ? `Last visit ${formatChartDate(latestTrajectoryPoint.date)}`
                  : null,
                patientContext?.payerLabel,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        ) : null}
        {dataQualityLimitations.length > 0 ? (
          <div className="ct-v2-context-line">
            {dataQualityLimitations.map((warning) => (
              <div key={warning} className="ct-v2-context-line__item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <details
        className="ct-v2-panel ct-v2-panel--secondary"
        data-testid="clinical-review-details"
        data-clinical-lens-active={clinicalLensTarget === 'details' ? 'true' : 'false'}
      >
        <summary className="cursor-pointer list-none">
          <div className="ct-v2-panel-head">
            <div className="ttv-section-title">Review details</div>
            <DisclosureHint />
          </div>
        </summary>
        <div className="mt-3 ct-v2-lens-reveal-shell">
          <ClinicalReasoningDifferentialPanel
            hybridResult={safeHybridResult}
            viewModel={safeViewModel}
            onOpenDifferential={onOpenDifferential}
          />
        </div>
      </details>

      <ClinicalEvidenceDrawer
        hybridResult={safeHybridResult}
        canonicalOutput={canonicalOutput}
        canonicalError={canonicalError}
        isCanonicalLoading={isCanonicalLoading}
        visitCount={visitCount}
        keyDrivers={safeViewModel.keyDriverContributions}
        priorityTrajectoryCoverage={safeViewModel.priorityTrajectoryCoverage}
        clinicalLensActive={clinicalLensTarget === 'evidence'}
      />

      <ClinicalReasoningAuditTrail
        hybridResult={safeHybridResult}
        viewModel={safeViewModel}
        workflowAuditSessionId={workflowAuditSessionId}
      />
    </div>
  );
}
