import type { ReasoningEvidencePack } from './clinical-reasoning-evidence';
import type {
  DifferentialCandidateCategory,
  DifferentialDiagnosisCandidate,
} from './clinical-reasoning-differential';

export type ClinicalReasoningArbiterDecision =
  | 'insufficient_evidence'
  | 'safety_first_review'
  | 'single_best_candidate_review'
  | 'differential_review'
  | 'physician_confirmed_working_diagnosis';

export type ClinicalReasoningTherapyGateStatus = 'locked' | 'ready';

export type ClinicalReasoningTherapyGateReason =
  'physician_selected_working_diagnosis_required' | 'physician_confirmed_working_diagnosis';

export interface ClinicalReasoningTherapyGate {
  status: ClinicalReasoningTherapyGateStatus;
  reason: ClinicalReasoningTherapyGateReason;
  physicianConfirmedCandidateId?: string;
}

export interface RunClinicalReasoningArbiterInput {
  evidencePack: ReasoningEvidencePack;
  candidates: DifferentialDiagnosisCandidate[];
  physicianConfirmedCandidateId?: string;
}

export interface ClinicalReasoningArbiterResult {
  decision: ClinicalReasoningArbiterDecision;
  leadingCandidate: DifferentialDiagnosisCandidate | null;
  selectedWorkingDiagnosis: DifferentialDiagnosisCandidate | null;
  mustNotMissCandidates: DifferentialDiagnosisCandidate[];
  reviewQueue: DifferentialDiagnosisCandidate[];
  rationale: string[];
  blockingFactors: string[];
  therapyGate: ClinicalReasoningTherapyGate;
}

const CATEGORY_PRIORITY: Record<DifferentialCandidateCategory, number> = {
  must_not_miss: 0,
  most_compatible: 1,
  possible: 2,
  less_likely: 3,
};

function candidateEvidenceScore(candidate: DifferentialDiagnosisCandidate): number {
  return (
    candidate.evidenceFor.length * 10 +
    candidate.trajectorySignalsLinked.length * 2 -
    candidate.evidenceAgainst.length * 3
  );
}

function sortReviewQueue(
  candidates: DifferentialDiagnosisCandidate[]
): DifferentialDiagnosisCandidate[] {
  return [...candidates].sort((left, right) => {
    const categoryDelta = CATEGORY_PRIORITY[left.category] - CATEGORY_PRIORITY[right.category];
    if (categoryDelta !== 0) return categoryDelta;

    const scoreDelta = candidateEvidenceScore(right) - candidateEvidenceScore(left);
    if (scoreDelta !== 0) return scoreDelta;

    return left.id.localeCompare(right.id);
  });
}

function buildLockedGate(): ClinicalReasoningTherapyGate {
  return {
    status: 'locked',
    reason: 'physician_selected_working_diagnosis_required',
  };
}

function buildReadyGate(candidateId: string): ClinicalReasoningTherapyGate {
  return {
    status: 'ready',
    reason: 'physician_confirmed_working_diagnosis',
    physicianConfirmedCandidateId: candidateId,
  };
}

function reviewDecisionForQueue(
  reviewQueue: DifferentialDiagnosisCandidate[],
  mustNotMissCandidates: DifferentialDiagnosisCandidate[]
): ClinicalReasoningArbiterDecision {
  if (mustNotMissCandidates.length > 0) return 'safety_first_review';
  if (reviewQueue.length === 0) return 'insufficient_evidence';
  if (reviewQueue.length === 1) return 'single_best_candidate_review';

  const [first, second] = reviewQueue;
  if (!first || !second) return 'single_best_candidate_review';

  const firstPriority = CATEGORY_PRIORITY[first.category];
  const secondPriority = CATEGORY_PRIORITY[second.category];
  const firstScore = candidateEvidenceScore(first);
  const secondScore = candidateEvidenceScore(second);

  if (firstPriority < secondPriority || firstScore > secondScore) {
    return 'single_best_candidate_review';
  }

  return 'differential_review';
}

export function runClinicalReasoningArbiter({
  evidencePack,
  candidates,
  physicianConfirmedCandidateId,
}: RunClinicalReasoningArbiterInput): ClinicalReasoningArbiterResult {
  const reviewQueue = sortReviewQueue(candidates);
  const mustNotMissCandidates = reviewQueue.filter(
    (candidate) => candidate.category === 'must_not_miss'
  );
  const leadingCandidate = reviewQueue[0] ?? null;
  const blockingFactors: string[] = [];
  const rationale: string[] = [];

  if (reviewQueue.length === 0) {
    blockingFactors.push('no_differential_candidate_available');
    rationale.push('Trajectory evidence is insufficient for a differential review queue.');

    return {
      decision: 'insufficient_evidence',
      leadingCandidate: null,
      selectedWorkingDiagnosis: null,
      mustNotMissCandidates: [],
      reviewQueue: [],
      rationale,
      blockingFactors,
      therapyGate: buildLockedGate(),
    };
  }

  if (mustNotMissCandidates.length > 0 || evidencePack.safetyDominance.mustNotMissPresent) {
    blockingFactors.push('must_not_miss_candidate_requires_physician_review');
    rationale.push('Safety-dominant trajectory evidence is prioritized before routine fit review.');
  }

  if (evidencePack.safetyDominance.treatmentResponseConflict) {
    blockingFactors.push('conflicting_treatment_response_requires_review');
    rationale.push(
      'Treatment response conflict must be reconciled before relying on therapy support.'
    );
  }

  rationale.push('Top candidate has the highest review priority from trajectory-linked evidence.');

  const selectedWorkingDiagnosis = physicianConfirmedCandidateId
    ? (reviewQueue.find((candidate) => candidate.id === physicianConfirmedCandidateId) ?? null)
    : null;

  if (physicianConfirmedCandidateId && !selectedWorkingDiagnosis) {
    blockingFactors.push('physician_confirmed_candidate_not_in_review_queue');
  }

  const selectedBypassesSafety =
    selectedWorkingDiagnosis &&
    mustNotMissCandidates.length > 0 &&
    selectedWorkingDiagnosis.category !== 'must_not_miss';

  if (selectedBypassesSafety) {
    blockingFactors.push('unresolved_must_not_miss_candidate_blocks_therapy_support');
  }

  if (selectedWorkingDiagnosis && !selectedBypassesSafety) {
    return {
      decision: 'physician_confirmed_working_diagnosis',
      leadingCandidate,
      selectedWorkingDiagnosis,
      mustNotMissCandidates,
      reviewQueue,
      rationale,
      blockingFactors,
      therapyGate: buildReadyGate(selectedWorkingDiagnosis.id),
    };
  }

  return {
    decision: reviewDecisionForQueue(reviewQueue, mustNotMissCandidates),
    leadingCandidate,
    selectedWorkingDiagnosis: null,
    mustNotMissCandidates,
    reviewQueue,
    rationale,
    blockingFactors,
    therapyGate: buildLockedGate(),
  };
}
