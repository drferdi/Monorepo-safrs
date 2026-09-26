import { describe, expect, it } from 'vitest';

import type {
  ClinicalFact,
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from './clinical-reasoning-evidence';
import { buildDifferentialCandidatesFromEvidencePack } from './clinical-reasoning-differential';
import { runClinicalReasoningArbiter } from './clinical-reasoning-arbiter';

function fact(
  key: ClinicalReasoningFactKey,
  overrides: Partial<ClinicalFact> = {}
): ClinicalFact {
  const acuteDeterioration =
    key !== 'baseline_or_planning_risk_context' && key !== 'treatment_response_good';

  return {
    key,
    label: key.replace(/_/g, ' '),
    category:
      key === 'baseline_or_planning_risk_context'
        ? 'baseline_planning_context'
        : key === 'treatment_response_good' || key === 'treatment_response_poor'
          ? 'treatment_response'
          : key === 'infection_or_physiologic_burden'
            ? 'infection_or_physiologic_burden'
            : 'acute_deterioration',
    severity: key === 'critical_deterioration' ? 'critical' : 'high',
    value: true,
    acuteDeterioration,
    trajectoryIds:
      key === 'respiratory_worsening'
        ? ['T-45']
        : key === 'infection_or_physiologic_burden'
          ? ['T-16', 'T-54', 'T-50']
          : key === 'hemodynamic_instability'
            ? ['T-46']
            : key === 'shock_watch'
              ? ['T-59']
              : key === 'critical_deterioration'
                ? ['T-13']
                : key === 'baseline_or_planning_risk_context'
                  ? ['T-25', 'T-38', 'T-58']
                  : key === 'treatment_response_poor'
                    ? ['T-52']
                    : ['T-51'],
    evidence: [`${key} evidence`],
    sourceRefs: [`trajectory_signal:${key}`],
    ...overrides,
  };
}

function makePack(facts: ClinicalFact[]): ReasoningEvidencePack {
  return {
    clinicalFacts: facts,
    activeTrajectorySignals: [],
    redFlags: [
      {
        id: 'clinical-red-flag',
        severity: 'critical',
        source: 'physiological',
        title: 'Critical trajectory support',
        rationale: 'Critical signal must remain visible.',
      },
    ],
    driverContributions: [],
    missingCriticalInputs: ['Auskultasi paru belum terdokumentasi'],
    trajectoryCoverage: [],
    sourceMap: facts.flatMap((item) =>
      item.sourceRefs.map((sourceRef) => ({
        sourceRef,
        targetFactKeys: [item.key],
      }))
    ),
    safetyDominance: {
      criticalAlert: facts.some((item) => item.key === 'critical_deterioration'),
      mustNotMissPresent: facts.some(
        (item) => item.key === 'critical_deterioration' || item.key === 'shock_watch'
      ),
      unstablePatient: facts.some((item) => item.acuteDeterioration && item.severity !== 'low'),
      treatmentResponseConflict:
        facts.some((item) => item.key === 'treatment_response_good') &&
        facts.some((item) => item.key === 'treatment_response_poor'),
    },
    therapySupportReady: false,
    therapySupportRequirement: 'physician_selected_working_diagnosis_required',
  };
}

function runWithFacts(
  facts: ClinicalFact[],
  physicianConfirmedCandidateId?: string
) {
  const evidencePack = makePack(facts);
  const candidates = buildDifferentialCandidatesFromEvidencePack(evidencePack);

  return runClinicalReasoningArbiter({
    evidencePack,
    candidates,
    physicianConfirmedCandidateId,
  });
}

describe('runClinicalReasoningArbiter', () => {
  it('surfaces the strongest compatible candidate without unlocking therapy support', () => {
    const result = runWithFacts([
      fact('respiratory_worsening'),
      fact('infection_or_physiologic_burden'),
      fact('treatment_response_poor'),
    ]);

    expect(result.decision).toBe('single_best_candidate_review');
    expect(result.leadingCandidate?.id).toBe('candidate-pneumonia-bronchopneumonia');
    expect(result.selectedWorkingDiagnosis).toBeNull();
    expect(result.therapyGate).toMatchObject({
      status: 'locked',
      reason: 'physician_selected_working_diagnosis_required',
    });
    expect(result.rationale).toEqual(
      expect.arrayContaining([
        'Top candidate has the highest review priority from trajectory-linked evidence.',
      ])
    );
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['confidence', 'probability', 'percentage'])
    );
  });

  it('lets must-not-miss safety dominate the review queue', () => {
    const result = runWithFacts([
      fact('infection_or_physiologic_burden'),
      fact('hemodynamic_instability'),
      fact('critical_deterioration'),
    ]);

    expect(result.decision).toBe('safety_first_review');
    expect(result.leadingCandidate?.id).toBe('candidate-sepsis-concern');
    expect(result.mustNotMissCandidates.map((item) => item.id)).toContain(
      'candidate-sepsis-concern'
    );
    expect(result.reviewQueue[0]?.category).toBe('must_not_miss');
    expect(result.blockingFactors).toEqual(
      expect.arrayContaining(['must_not_miss_candidate_requires_physician_review'])
    );
  });

  it('unlocks therapy support only after physician-confirmed working diagnosis', () => {
    const result = runWithFacts(
      [fact('respiratory_worsening'), fact('infection_or_physiologic_burden')],
      'candidate-pneumonia-bronchopneumonia'
    );

    expect(result.decision).toBe('physician_confirmed_working_diagnosis');
    expect(result.selectedWorkingDiagnosis?.id).toBe('candidate-pneumonia-bronchopneumonia');
    expect(result.therapyGate).toMatchObject({
      status: 'ready',
      reason: 'physician_confirmed_working_diagnosis',
      physicianConfirmedCandidateId: 'candidate-pneumonia-bronchopneumonia',
    });
  });

  it('keeps therapy support locked for unknown physician-confirmed ids', () => {
    const result = runWithFacts(
      [fact('respiratory_worsening'), fact('infection_or_physiologic_burden')],
      'candidate-not-in-review-queue'
    );

    expect(result.therapyGate.status).toBe('locked');
    expect(result.selectedWorkingDiagnosis).toBeNull();
    expect(result.blockingFactors).toEqual(
      expect.arrayContaining(['physician_confirmed_candidate_not_in_review_queue'])
    );
  });

  it('returns insufficient evidence when no candidate is available', () => {
    const result = runWithFacts([
      fact('baseline_or_planning_risk_context'),
      fact('treatment_response_good', { severity: 'low' }),
    ]);

    expect(result.decision).toBe('insufficient_evidence');
    expect(result.leadingCandidate).toBeNull();
    expect(result.reviewQueue).toEqual([]);
    expect(result.therapyGate.status).toBe('locked');
  });
});
