import { describe, expect, it } from 'vitest';

import type { ClinicalReasoningWorkflowResult } from './clinical-reasoning-workflow';
import {
  createMemoryClinicalWorkflowAuditStorage,
  listClinicalReasoningWorkflowAuditRecords,
  persistClinicalReasoningWorkflowAudit,
} from './clinical-reasoning-workflow-audit';

function makeWorkflow(
  overrides: Partial<ClinicalReasoningWorkflowResult> = {}
): ClinicalReasoningWorkflowResult {
  return {
    workflowStatus: 'therapy_reasoning_ready',
    evidencePack: {
      clinicalFacts: [],
      activeTrajectorySignals: [],
      redFlags: [],
      driverContributions: [],
      trajectoryCoverage: [],
      missingCriticalInputs: [],
      sourceMap: [],
      safetyDominance: {
        criticalAlert: true,
        unstablePatient: true,
        mustNotMissPresent: true,
        treatmentResponseConflict: false,
      },
      therapySupportReady: false,
      therapySupportRequirement: 'physician_selected_working_diagnosis_required',
    },
    differentialCandidates: [
      {
        id: 'candidate-sepsis-concern',
        name: 'Sepsis concern',
        category: 'must_not_miss',
        fitBand: 'must_not_miss',
        evidenceFor: [],
        evidenceAgainst: [],
        missingToConfirm: [],
        redFlagsLinked: [],
        trajectorySignalsLinked: [],
        nextQuestions: [],
        suggestedExam: [],
        suggestedInvestigations: [],
        explanation: 'Review support only.',
        safetyNote: 'Physician review required.',
        requiresPhysicianSelectionForTherapy: true,
      },
    ],
    arbiterResult: {
      decision: 'physician_confirmed_working_diagnosis',
      leadingCandidate: null,
      selectedWorkingDiagnosis: {
        id: 'candidate-sepsis-concern',
        name: 'Sepsis concern',
        category: 'must_not_miss',
        fitBand: 'must_not_miss',
        evidenceFor: [],
        evidenceAgainst: [],
        missingToConfirm: [],
        redFlagsLinked: [],
        trajectorySignalsLinked: [],
        nextQuestions: [],
        suggestedExam: [],
        suggestedInvestigations: [],
        explanation: 'Review support only.',
        safetyNote: 'Physician review required.',
        requiresPhysicianSelectionForTherapy: true,
      },
      mustNotMissCandidates: [],
      reviewQueue: [],
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
      selectedWorkingDiagnosis: null,
      therapyGate: {
        status: 'ready',
        reason: 'physician_confirmed_working_diagnosis',
        physicianConfirmedCandidateId: 'candidate-sepsis-concern',
      },
      actions: [
        {
          id: 'safety-stabilization-review',
          label: 'Review stabilisasi dan eskalasi segera',
          category: 'stabilization_review',
          priority: 'immediate',
          rationale: 'Review support only.',
          evidenceFactKeys: ['critical_deterioration'],
          sourceRefs: ['trajectory_signal:T-13'],
        },
      ],
      safetyChecks: [],
      blockers: [],
      explanation: 'Review-only therapy reasoning.',
      automationLevel: 'review_only',
      autoSubmit: false,
      requiresPhysicianOrder: true,
    },
    auditTrail: [
      {
        id: 'workflow-audit-1-trajectory_evidence',
        sequence: 1,
        stage: 'trajectory_evidence',
        status: 'completed',
        summary: 'Evidence built.',
        sourceRefs: ['trajectory_signal:T-13'],
      },
      {
        id: 'workflow-audit-2-differential_candidates',
        sequence: 2,
        stage: 'differential_candidates',
        status: 'completed',
        summary: 'Candidates prepared.',
        sourceRefs: ['trajectory_signal:T-13'],
      },
      {
        id: 'workflow-audit-3-reasoning_arbiter',
        sequence: 3,
        stage: 'reasoning_arbiter',
        status: 'completed',
        summary: 'Arbiter complete.',
        sourceRefs: ['trajectory_signal:T-13'],
      },
      {
        id: 'workflow-audit-4-physician_selection',
        sequence: 4,
        stage: 'physician_selection',
        status: 'completed',
        summary: 'Physician working diagnosis selected.',
        sourceRefs: ['trajectory_signal:T-13'],
      },
      {
        id: 'workflow-audit-5-therapy_reasoning',
        sequence: 5,
        stage: 'therapy_reasoning',
        status: 'ready',
        summary: 'Review-only therapy reasoning ready.',
        sourceRefs: ['trajectory_signal:T-13'],
      },
    ],
    ...overrides,
  };
}

describe('clinical reasoning workflow audit persistence', () => {
  it('persists a de-identified workflow audit record without raw encounter id or full clinical payload', async () => {
    const storage = createMemoryClinicalWorkflowAuditStorage();

    const record = await persistClinicalReasoningWorkflowAudit({
      workflow: makeWorkflow(),
      encounterId: 'RM-12345-RAW',
      storage,
      now: () => '2026-06-20T02:00:00.000Z',
      idFactory: () => 'audit-record-1',
    });

    expect(record.id).toBe('audit-record-1');
    expect(record.encounterHash).not.toContain('RM-12345-RAW');
    expect(record.workflowStatus).toBe('therapy_reasoning_ready');
    expect(record.selectedWorkingDiagnosisId).toBe('candidate-sepsis-concern');
    expect(record.stageTrail.map((event) => event.stage)).toEqual([
      'trajectory_evidence',
      'differential_candidates',
      'reasoning_arbiter',
      'physician_selection',
      'therapy_reasoning',
    ]);
    expect(record.therapySummary).toEqual({
      status: 'ready',
      automationLevel: 'review_only',
      autoSubmit: false,
      requiresPhysicianOrder: true,
      actionIds: ['safety-stabilization-review'],
    });

    const persisted = await listClinicalReasoningWorkflowAuditRecords({ storage });
    expect(persisted).toHaveLength(1);
    expect(JSON.stringify(persisted[0])).not.toContain('RM-12345-RAW');
    expect(JSON.stringify(persisted[0])).not.toMatch(/clinicalFacts|differentialCandidates/);
  });

  it('keeps newest audit records first and respects maxRecords', async () => {
    const storage = createMemoryClinicalWorkflowAuditStorage();

    await persistClinicalReasoningWorkflowAudit({
      workflow: makeWorkflow({ workflowStatus: 'awaiting_physician_selection' }),
      encounterId: 'encounter-a',
      storage,
      maxRecords: 1,
      now: () => '2026-06-20T02:00:00.000Z',
      idFactory: () => 'audit-record-old',
    });
    await persistClinicalReasoningWorkflowAudit({
      workflow: makeWorkflow(),
      encounterId: 'encounter-b',
      storage,
      maxRecords: 1,
      now: () => '2026-06-20T02:05:00.000Z',
      idFactory: () => 'audit-record-new',
    });

    const records = await listClinicalReasoningWorkflowAuditRecords({ storage });

    expect(records.map((record) => record.id)).toEqual(['audit-record-new']);
  });
});
