import { describe, expect, it } from 'vitest';

import type {
  ClinicalFact,
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from './clinical-reasoning-evidence';
import { runClinicalReasoningArbiter } from './clinical-reasoning-arbiter';
import { buildDifferentialCandidatesFromEvidencePack } from './clinical-reasoning-differential';
import { buildTherapyReasoningPackFromArbiter } from './clinical-reasoning-therapy';

function fact(key: ClinicalReasoningFactKey, overrides: Partial<ClinicalFact> = {}): ClinicalFact {
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
    missingCriticalInputs: ['Alergi obat belum terdokumentasi'],
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

function buildArbiterForFacts(facts: ClinicalFact[], physicianConfirmedCandidateId?: string) {
  const evidencePack = makePack(facts);
  const candidates = buildDifferentialCandidatesFromEvidencePack(evidencePack);
  const arbiterResult = runClinicalReasoningArbiter({
    evidencePack,
    candidates,
    physicianConfirmedCandidateId,
  });

  return { evidencePack, arbiterResult };
}

describe('buildTherapyReasoningPackFromArbiter', () => {
  it('keeps therapy reasoning locked until physician working diagnosis is selected', () => {
    const { evidencePack, arbiterResult } = buildArbiterForFacts([
      fact('respiratory_worsening'),
      fact('infection_or_physiologic_burden'),
    ]);

    const pack = buildTherapyReasoningPackFromArbiter({ evidencePack, arbiterResult });

    expect(pack.status).toBe('locked');
    expect(pack.selectedWorkingDiagnosis).toBeNull();
    expect(pack.actions).toEqual([]);
    expect(pack.blockers).toEqual(
      expect.arrayContaining(['physician_selected_working_diagnosis_required'])
    );
    expect(pack.automationLevel).toBe('review_only');
    expect(pack.autoSubmit).toBe(false);
    expect(pack.requiresPhysicianOrder).toBe(true);
  });

  it('builds a ready review-only therapy reasoning pack after physician confirmation', () => {
    const { evidencePack, arbiterResult } = buildArbiterForFacts(
      [
        fact('infection_or_physiologic_burden'),
        fact('hemodynamic_instability'),
        fact('critical_deterioration'),
      ],
      'candidate-sepsis-concern'
    );

    const pack = buildTherapyReasoningPackFromArbiter({ evidencePack, arbiterResult });

    expect(pack.status).toBe('ready');
    expect(pack.selectedWorkingDiagnosis?.id).toBe('candidate-sepsis-concern');
    expect(pack.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'safety-stabilization-review',
        'sepsis-source-control-review',
        'protocol-antimicrobial-review',
      ])
    );
    expect(pack.actions.some((action) => action.priority === 'immediate')).toBe(true);
    expect(pack.safetyChecks.map((check) => check.id)).toEqual(
      expect.arrayContaining([
        'allergy-contraindication-review',
        'medication-reconciliation-review',
        'renal-hepatic-review',
        'local-protocol-review',
      ])
    );
    expect(pack.explanation).toMatch(/review-only therapy reasoning/i);
    expect(Object.keys(pack)).not.toEqual(
      expect.arrayContaining(['confidence', 'probability', 'percentage', 'therapyPlan'])
    );
  });

  it('adds reassessment support when treatment response facts conflict', () => {
    const { evidencePack, arbiterResult } = buildArbiterForFacts(
      [
        fact('respiratory_worsening'),
        fact('infection_or_physiologic_burden'),
        fact('treatment_response_good', { severity: 'low' }),
        fact('treatment_response_poor'),
      ],
      'candidate-pneumonia-bronchopneumonia'
    );

    const pack = buildTherapyReasoningPackFromArbiter({ evidencePack, arbiterResult });

    expect(pack.status).toBe('ready');
    expect(pack.actions.map((action) => action.id)).toContain('treatment-response-reassessment');
    expect(pack.safetyChecks.map((check) => check.id)).toContain('response-conflict-review');
  });
});
