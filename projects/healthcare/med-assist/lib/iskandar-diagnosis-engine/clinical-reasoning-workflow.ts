import type { HybridTrajectoryResult } from './hybrid-trajectory';
import type { TrajectoryVisualizationViewModel } from './trajectory-visualization-view-model';
import type { ReasoningEvidencePack } from './clinical-reasoning-evidence';
import { buildReasoningEvidencePackFromTrajectoryV2 } from './clinical-reasoning-evidence';
import type { DifferentialDiagnosisCandidate } from './clinical-reasoning-differential';
import { buildDifferentialCandidatesFromEvidencePack } from './clinical-reasoning-differential';
import type { ClinicalReasoningArbiterResult } from './clinical-reasoning-arbiter';
import { runClinicalReasoningArbiter } from './clinical-reasoning-arbiter';
import type { TherapyReasoningPack } from './clinical-reasoning-therapy';
import { buildTherapyReasoningPackFromArbiter } from './clinical-reasoning-therapy';

export type ClinicalReasoningWorkflowStage =
  | 'trajectory_evidence'
  | 'differential_candidates'
  | 'reasoning_arbiter'
  | 'physician_selection'
  | 'therapy_reasoning';

export type ClinicalReasoningWorkflowAuditStatus = 'completed' | 'ready' | 'locked' | 'skipped';

export type ClinicalReasoningWorkflowStatus =
  'insufficient_evidence' | 'awaiting_physician_selection' | 'therapy_reasoning_ready';

export interface ClinicalReasoningWorkflowAuditEvent {
  id: string;
  sequence: number;
  stage: ClinicalReasoningWorkflowStage;
  status: ClinicalReasoningWorkflowAuditStatus;
  summary: string;
  sourceRefs: string[];
}

export interface BuildClinicalReasoningWorkflowInput {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
  physicianConfirmedCandidateId?: string;
}

export interface ClinicalReasoningWorkflowResult {
  workflowStatus: ClinicalReasoningWorkflowStatus;
  evidencePack: ReasoningEvidencePack;
  differentialCandidates: DifferentialDiagnosisCandidate[];
  arbiterResult: ClinicalReasoningArbiterResult;
  therapyReasoningPack: TherapyReasoningPack;
  auditTrail: ClinicalReasoningWorkflowAuditEvent[];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function firstSourceRefs(evidencePack: ReasoningEvidencePack, limit = 12): string[] {
  return uniqueStrings(evidencePack.sourceMap.map((entry) => entry.sourceRef)).slice(0, limit);
}

function candidateSourceRefs(candidates: DifferentialDiagnosisCandidate[], limit = 12): string[] {
  return uniqueStrings(
    candidates.flatMap((candidate) => [
      ...candidate.evidenceFor.flatMap((item) => item.sourceRefs),
      ...candidate.evidenceAgainst.flatMap((item) => item.sourceRefs),
    ])
  ).slice(0, limit);
}

function selectedCandidateLabel(
  arbiterResult: ClinicalReasoningArbiterResult,
  physicianConfirmedCandidateId?: string
): string {
  if (arbiterResult.selectedWorkingDiagnosis) {
    return `Physician working diagnosis selected: ${arbiterResult.selectedWorkingDiagnosis.name}.`;
  }

  if (physicianConfirmedCandidateId) {
    return 'Physician selected candidate is not available in the current review queue.';
  }

  return 'Physician working diagnosis selection is required before therapy reasoning.';
}

function getWorkflowStatus(
  arbiterResult: ClinicalReasoningArbiterResult,
  therapyReasoningPack: TherapyReasoningPack
): ClinicalReasoningWorkflowStatus {
  if (arbiterResult.reviewQueue.length === 0) return 'insufficient_evidence';
  if (therapyReasoningPack.status === 'ready') return 'therapy_reasoning_ready';
  return 'awaiting_physician_selection';
}

function buildAuditTrail(input: {
  evidencePack: ReasoningEvidencePack;
  differentialCandidates: DifferentialDiagnosisCandidate[];
  arbiterResult: ClinicalReasoningArbiterResult;
  therapyReasoningPack: TherapyReasoningPack;
  physicianConfirmedCandidateId?: string;
}): ClinicalReasoningWorkflowAuditEvent[] {
  const {
    evidencePack,
    differentialCandidates,
    arbiterResult,
    therapyReasoningPack,
    physicianConfirmedCandidateId,
  } = input;
  const evidenceRefs = firstSourceRefs(evidencePack);
  const differentialRefs = candidateSourceRefs(differentialCandidates);
  const selectedRefs = arbiterResult.selectedWorkingDiagnosis
    ? candidateSourceRefs([arbiterResult.selectedWorkingDiagnosis])
    : [];
  const therapyRefs = uniqueStrings(
    therapyReasoningPack.actions.flatMap((action) => action.sourceRefs)
  );

  const events: Omit<ClinicalReasoningWorkflowAuditEvent, 'id' | 'sequence'>[] = [
    {
      stage: 'trajectory_evidence',
      status: 'completed',
      summary: `${evidencePack.clinicalFacts.length} clinical facts built from ${evidencePack.activeTrajectorySignals.length} active trajectory signals.`,
      sourceRefs: evidenceRefs,
    },
    {
      stage: 'differential_candidates',
      status: differentialCandidates.length > 0 ? 'completed' : 'skipped',
      summary:
        differentialCandidates.length > 0
          ? `${differentialCandidates.length} trajectory-supported differential candidates prepared for review.`
          : 'No trajectory-supported differential candidate is available yet.',
      sourceRefs: differentialRefs,
    },
    {
      stage: 'reasoning_arbiter',
      status: arbiterResult.reviewQueue.length > 0 ? 'completed' : 'locked',
      summary:
        arbiterResult.reviewQueue.length > 0
          ? `Arbiter decision: ${arbiterResult.decision.replace(/_/g, ' ')}.`
          : 'Arbiter is locked because no review queue is available.',
      sourceRefs: differentialRefs,
    },
    {
      stage: 'physician_selection',
      status: arbiterResult.selectedWorkingDiagnosis ? 'completed' : 'ready',
      summary: selectedCandidateLabel(arbiterResult, physicianConfirmedCandidateId),
      sourceRefs: selectedRefs,
    },
    {
      stage: 'therapy_reasoning',
      status: therapyReasoningPack.status === 'ready' ? 'ready' : 'locked',
      summary:
        therapyReasoningPack.status === 'ready'
          ? 'Review-only therapy reasoning is ready and still requires physician order.'
          : 'Therapy reasoning is locked until physician working diagnosis selection is complete.',
      sourceRefs: therapyRefs,
    },
  ];

  return events.map((event, index) => ({
    ...event,
    id: `workflow-audit-${index + 1}-${event.stage}`,
    sequence: index + 1,
  }));
}

export function buildClinicalReasoningWorkflowFromTrajectoryV2({
  hybridResult,
  viewModel,
  physicianConfirmedCandidateId,
}: BuildClinicalReasoningWorkflowInput): ClinicalReasoningWorkflowResult {
  const evidencePack = buildReasoningEvidencePackFromTrajectoryV2({ hybridResult, viewModel });
  const differentialCandidates = buildDifferentialCandidatesFromEvidencePack(evidencePack);
  const arbiterResult = runClinicalReasoningArbiter({
    evidencePack,
    candidates: differentialCandidates,
    physicianConfirmedCandidateId,
  });
  const therapyReasoningPack = buildTherapyReasoningPackFromArbiter({
    evidencePack,
    arbiterResult,
  });

  return {
    workflowStatus: getWorkflowStatus(arbiterResult, therapyReasoningPack),
    evidencePack,
    differentialCandidates,
    arbiterResult,
    therapyReasoningPack,
    auditTrail: buildAuditTrail({
      evidencePack,
      differentialCandidates,
      arbiterResult,
      therapyReasoningPack,
      physicianConfirmedCandidateId,
    }),
  };
}
