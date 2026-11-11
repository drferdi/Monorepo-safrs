import type {
  ClinicalReasoningWorkflowResult,
  ClinicalReasoningWorkflowStage,
  ClinicalReasoningWorkflowStatus,
} from './clinical-reasoning-workflow';
import type { TherapyReasoningPackStatus } from './clinical-reasoning-therapy';

export interface ClinicalReasoningWorkflowEvaluationExpectations {
  workflowStatus?: ClinicalReasoningWorkflowStatus;
  selectedWorkingDiagnosisId?: string;
  therapyStatus?: TherapyReasoningPackStatus;
  requiredStages?: ClinicalReasoningWorkflowStage[];
  requiredActionIds?: string[];
  forbiddenSerializedTerms?: string[];
}

export interface ClinicalReasoningWorkflowEvaluationFixture {
  id: string;
  description: string;
  workflow: ClinicalReasoningWorkflowResult;
  expectations: ClinicalReasoningWorkflowEvaluationExpectations;
}

export interface ClinicalReasoningWorkflowEvaluationResult {
  fixtureId: string;
  description: string;
  passed: boolean;
  failures: string[];
}

export interface ClinicalReasoningWorkflowEvaluationReport {
  passed: boolean;
  totalFixtures: number;
  passedFixtures: number;
  failedFixtures: number;
  results: ClinicalReasoningWorkflowEvaluationResult[];
}

const DEFAULT_FORBIDDEN_TERMS = ['therapyPlan', 'probability', 'percentage'];

function assertRequiredStages(
  workflow: ClinicalReasoningWorkflowResult,
  requiredStages: ClinicalReasoningWorkflowStage[] | undefined,
  failures: string[]
): void {
  if (!requiredStages) return;

  const stages = workflow.auditTrail.map((event) => event.stage);
  if (stages.length < requiredStages.length) {
    failures.push('audit_stage_count_too_low');
    return;
  }

  for (let index = 0; index < requiredStages.length; index += 1) {
    if (stages[index] !== requiredStages[index]) {
      failures.push(`audit_stage_order_mismatch:${requiredStages[index]}`);
      return;
    }
  }
}

function assertTherapyGate(workflow: ClinicalReasoningWorkflowResult, failures: string[]): void {
  if (workflow.therapyReasoningPack.status !== 'ready') return;

  const physicianSelection = workflow.auditTrail.find(
    (event) => event.stage === 'physician_selection'
  );

  if (physicianSelection?.status !== 'completed') {
    failures.push('therapy_ready_requires_completed_physician_selection');
  }

  if (workflow.therapyReasoningPack.automationLevel !== 'review_only') {
    failures.push('therapy_must_remain_review_only');
  }

  if (workflow.therapyReasoningPack.autoSubmit !== false) {
    failures.push('auto_submit_forbidden');
  }

  if (workflow.therapyReasoningPack.requiresPhysicianOrder !== true) {
    failures.push('physician_order_required');
  }
}

function assertExpectations(
  fixture: ClinicalReasoningWorkflowEvaluationFixture,
  failures: string[]
): void {
  const { workflow, expectations } = fixture;

  if (expectations.workflowStatus && workflow.workflowStatus !== expectations.workflowStatus) {
    failures.push(`workflow_status_mismatch:${expectations.workflowStatus}`);
  }

  const selectedId = workflow.arbiterResult.selectedWorkingDiagnosis?.id ?? null;
  if (
    expectations.selectedWorkingDiagnosisId &&
    selectedId !== expectations.selectedWorkingDiagnosisId
  ) {
    failures.push(`selected_working_diagnosis_mismatch:${expectations.selectedWorkingDiagnosisId}`);
  }

  if (
    expectations.therapyStatus &&
    workflow.therapyReasoningPack.status !== expectations.therapyStatus
  ) {
    failures.push(`therapy_status_mismatch:${expectations.therapyStatus}`);
  }

  if (expectations.requiredActionIds) {
    const actionIds = new Set(workflow.therapyReasoningPack.actions.map((action) => action.id));
    for (const requiredActionId of expectations.requiredActionIds) {
      if (!actionIds.has(requiredActionId)) {
        failures.push(`required_action_missing:${requiredActionId}`);
      }
    }
  }
}

function assertForbiddenTerms(
  workflow: ClinicalReasoningWorkflowResult,
  terms: string[] | undefined,
  failures: string[]
): void {
  const serialized = JSON.stringify(workflow);
  const forbiddenTerms = [...DEFAULT_FORBIDDEN_TERMS, ...(terms ?? [])];

  for (const term of new Set(forbiddenTerms)) {
    if (serialized.includes(term)) {
      failures.push(`forbidden_term_present:${term}`);
    }
  }
}

function evaluateFixture(
  fixture: ClinicalReasoningWorkflowEvaluationFixture
): ClinicalReasoningWorkflowEvaluationResult {
  const failures: string[] = [];

  assertRequiredStages(fixture.workflow, fixture.expectations.requiredStages, failures);
  assertTherapyGate(fixture.workflow, failures);
  assertExpectations(fixture, failures);
  assertForbiddenTerms(fixture.workflow, fixture.expectations.forbiddenSerializedTerms, failures);

  return {
    fixtureId: fixture.id,
    description: fixture.description,
    passed: failures.length === 0,
    failures,
  };
}

export function evaluateClinicalReasoningWorkflowFixtures(
  fixtures: ClinicalReasoningWorkflowEvaluationFixture[]
): ClinicalReasoningWorkflowEvaluationReport {
  const results = fixtures.map(evaluateFixture);
  const passedFixtures = results.filter((result) => result.passed).length;
  const failedFixtures = results.length - passedFixtures;

  return {
    passed: failedFixtures === 0,
    totalFixtures: results.length,
    passedFixtures,
    failedFixtures,
    results,
  };
}
