import { describe, expect, it } from 'vitest';

import type { ClinicalReasoningWorkflowResult } from './clinical-reasoning-workflow';
import { evaluateClinicalReasoningWorkflowFixtures } from './clinical-reasoning-workflow-evaluation';

const REQUIRED_STAGES = [
  'trajectory_evidence',
  'differential_candidates',
  'reasoning_arbiter',
  'physician_selection',
  'therapy_reasoning',
] as const;

function makeWorkflow(
  overrides: Partial<ClinicalReasoningWorkflowResult> = {}
): ClinicalReasoningWorkflowResult {
  return {
    workflowStatus: 'therapy_reasoning_ready',
    auditTrail: REQUIRED_STAGES.map((stage, index) => ({
      id: `audit-${stage}`,
      sequence: index + 1,
      stage,
      status:
        stage === 'therapy_reasoning'
          ? 'ready'
          : stage === 'physician_selection'
            ? 'completed'
            : 'completed',
      summary: `${stage} complete`,
      sourceRefs: [],
    })),
    arbiterResult: {
      decision: 'physician_confirmed_working_diagnosis',
      selectedWorkingDiagnosis: { id: 'candidate-sepsis-concern', name: 'Sepsis concern' },
      reviewQueue: [{ id: 'candidate-sepsis-concern' }],
      mustNotMissCandidates: [{ id: 'candidate-sepsis-concern' }],
      leadingCandidate: { id: 'candidate-sepsis-concern' },
      rationale: [],
      blockingFactors: [],
      therapyGate: {
        status: 'ready',
        reason: 'physician_confirmed_working_diagnosis',
        physicianConfirmedCandidateId: 'candidate-sepsis-concern',
      },
    },
    therapyReasoningPack: {
      status: 'ready',
      automationLevel: 'review_only',
      autoSubmit: false,
      requiresPhysicianOrder: true,
      actions: [{ id: 'safety-stabilization-review' }],
      safetyChecks: [],
      blockers: [],
    },
    ...overrides,
  } as unknown as ClinicalReasoningWorkflowResult;
}

describe('evaluateClinicalReasoningWorkflowFixtures', () => {
  it('passes fixtures that preserve workflow order, physician gate, and review-only therapy', () => {
    const report = evaluateClinicalReasoningWorkflowFixtures([
      {
        id: 'fixture-sepsis-selected',
        description: 'Sepsis concern with physician-selected working diagnosis.',
        workflow: makeWorkflow(),
        expectations: {
          workflowStatus: 'therapy_reasoning_ready',
          selectedWorkingDiagnosisId: 'candidate-sepsis-concern',
          therapyStatus: 'ready',
          requiredStages: [...REQUIRED_STAGES],
          requiredActionIds: ['safety-stabilization-review'],
        },
      },
    ]);

    expect(report.passed).toBe(true);
    expect(report.totalFixtures).toBe(1);
    expect(report.passedFixtures).toBe(1);
    expect(report.failedFixtures).toBe(0);
    expect(report.results[0]?.failures).toEqual([]);
  });

  it('fails fixtures that bypass physician selection or introduce autonomous therapy output', () => {
    const badWorkflow = {
      ...makeWorkflow({
        workflowStatus: 'therapy_reasoning_ready',
        auditTrail: REQUIRED_STAGES.map((stage, index) => ({
          id: `audit-${stage}`,
          sequence: index + 1,
          stage,
          status: stage === 'physician_selection' ? 'ready' : 'completed',
          summary: `${stage} complete`,
          sourceRefs: [],
        })),
      }),
      therapyReasoningPack: {
        status: 'ready',
        automationLevel: 'review_only',
        autoSubmit: true,
        requiresPhysicianOrder: false,
        actions: [],
        safetyChecks: [],
        blockers: [],
      },
      therapyPlan: 'Start medication automatically',
    } as unknown as ClinicalReasoningWorkflowResult;

    const report = evaluateClinicalReasoningWorkflowFixtures([
      {
        id: 'fixture-unsafe-autotherapy',
        description: 'Unsafe autonomous therapy output.',
        workflow: badWorkflow,
        expectations: {
          workflowStatus: 'therapy_reasoning_ready',
          therapyStatus: 'ready',
          requiredStages: [...REQUIRED_STAGES],
          forbiddenSerializedTerms: ['therapyPlan'],
        },
      },
    ]);

    expect(report.passed).toBe(false);
    expect(report.failedFixtures).toBe(1);
    expect(report.results[0]?.failures).toEqual(
      expect.arrayContaining([
        'therapy_ready_requires_completed_physician_selection',
        'auto_submit_forbidden',
        'physician_order_required',
        'forbidden_term_present:therapyPlan',
      ])
    );
  });
});
