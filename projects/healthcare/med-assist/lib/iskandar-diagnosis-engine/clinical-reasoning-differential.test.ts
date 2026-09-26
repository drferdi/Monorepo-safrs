import { describe, expect, it } from 'vitest';

import type {
  ClinicalFact,
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from './clinical-reasoning-evidence';
import {
  buildDifferentialCandidatesFromEvidencePack,
  getAssistDiagnosisPacks,
} from './clinical-reasoning-differential';

function fact(
  key: ClinicalReasoningFactKey,
  overrides: Partial<ClinicalFact> = {}
): ClinicalFact {
  const acuteDeterioration = key !== 'baseline_or_planning_risk_context' && key !== 'treatment_response_good';
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
      treatmentResponseConflict: facts.some((item) => item.key === 'treatment_response_good') &&
        facts.some((item) => item.key === 'treatment_response_poor'),
    },
    therapySupportReady: false,
    therapySupportRequirement: 'physician_selected_working_diagnosis_required',
  };
}

describe('getAssistDiagnosisPacks', () => {
  it('exposes the initial Assist-local pack set without Jewel imports', () => {
    expect(getAssistDiagnosisPacks().map((pack) => pack.id)).toEqual([
      'pack-pneumonia-bronchopneumonia',
      'pack-sepsis-concern',
      'pack-asthma-exacerbation',
      'pack-bronchiolitis',
      'pack-hypertensive-crisis',
    ]);
  });
});

describe('buildDifferentialCandidatesFromEvidencePack', () => {
  it('builds highly compatible respiratory infection candidates from trajectory facts', () => {
    const candidates = buildDifferentialCandidatesFromEvidencePack(
      makePack([
        fact('respiratory_worsening'),
        fact('infection_or_physiologic_burden'),
        fact('treatment_response_poor'),
      ])
    );

    const pneumonia = candidates.find((item) => item.id === 'candidate-pneumonia-bronchopneumonia');
    expect(pneumonia).toMatchObject({
      name: 'Pneumonia / bronchopneumonia consideration',
      category: 'most_compatible',
      fitBand: 'highly_compatible',
      requiresPhysicianSelectionForTherapy: true,
    });
    expect(pneumonia?.evidenceFor.map((item) => item.factKey)).toEqual(
      expect.arrayContaining(['respiratory_worsening', 'infection_or_physiologic_burden'])
    );
    expect(pneumonia?.trajectorySignalsLinked).toEqual(
      expect.arrayContaining(['T-45', 'T-16', 'T-54', 'T-50'])
    );
    expect(pneumonia?.missingToConfirm).toEqual(
      expect.arrayContaining(['Auskultasi paru terarah', 'SpO2 repeat / oxygen response'])
    );
    expect(Object.keys(pneumonia || {})).not.toEqual(
      expect.arrayContaining(['confidence', 'probability', 'percentage'])
    );
  });

  it('keeps sepsis concern visible as must-not-miss when safety dominance is active', () => {
    const candidates = buildDifferentialCandidatesFromEvidencePack(
      makePack([
        fact('infection_or_physiologic_burden'),
        fact('hemodynamic_instability'),
        fact('critical_deterioration'),
      ])
    );

    const sepsis = candidates.find((item) => item.id === 'candidate-sepsis-concern');
    expect(sepsis).toMatchObject({
      category: 'must_not_miss',
      fitBand: 'must_not_miss',
      safetyNote: 'Must-not-miss consideration; verify source, perfusion, mental status, and escalation need.',
    });
    expect(sepsis?.evidenceFor.map((item) => item.factKey)).toEqual(
      expect.arrayContaining([
        'infection_or_physiologic_burden',
        'hemodynamic_instability',
        'critical_deterioration',
      ])
    );
  });

  it('does not treat baseline planning context or good response as acute diagnosis support', () => {
    const candidates = buildDifferentialCandidatesFromEvidencePack(
      makePack([
        fact('baseline_or_planning_risk_context'),
        fact('treatment_response_good', { severity: 'low' }),
      ])
    );

    expect(candidates).toEqual([]);
  });

  it('does not emit therapy recommendations before physician working diagnosis selection', () => {
    const candidates = buildDifferentialCandidatesFromEvidencePack(
      makePack([fact('respiratory_worsening'), fact('infection_or_physiologic_burden')])
    );

    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.requiresPhysicianSelectionForTherapy).toBe(true);
      expect('therapyPlan' in candidate).toBe(false);
      expect(candidate.explanation).toMatch(/clinical reasoning support/i);
    }
  });
});
