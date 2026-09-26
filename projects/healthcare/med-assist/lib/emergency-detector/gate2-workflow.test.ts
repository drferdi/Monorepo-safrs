// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { CLINICAL_PATTERNS } from './clinical-patterns';
import { buildClinicalSnapshot, type SnapshotFormState } from './clinical-snapshot';
import { buildGate2Workflow, sortGate2Alerts, type Gate2AlertInput } from './gate2-workflow';
import { evaluatePatterns } from './pattern-engine';
import type { PatternMatch } from './pattern-types';

const makeState = (overrides: Partial<SnapshotFormState> = {}): SnapshotFormState => ({
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
  ...overrides,
});

function toGate2Alert(match: PatternMatch): Gate2AlertInput {
  return {
    id: `pattern-${match.pattern.id}`,
    patternId: match.pattern.id,
    severity: match.pattern.severity,
    title: match.resolvedTitle,
    gate: match.pattern.gate,
    reasoning: match.resolvedReasoning,
    recommendations: match.pattern.recommendations,
    actionProtocolId: match.actionProtocolId,
    confidence: match.confidence,
    matchedCriteria: match.matchedCriteria.map((criterion) => criterion.label ?? criterion.field),
    differentials: match.pattern.differentials,
    source: match.pattern.source,
  };
}

describe('Gate 2 workflow', () => {
  it('resolves respiratory failure pattern into a FKTP action protocol', () => {
    const snapshot = buildClinicalSnapshot(
      makeState({
        sbp: '100',
        dbp: '65',
        hr: '118',
        rr: '32',
        spo2: '88',
        symptomText: 'sesak berat tidak bisa bicara demam batuk produktif',
      }),
      { patientAge: 45 }
    );

    const matches = evaluatePatterns(snapshot, CLINICAL_PATTERNS, [], { tierFilter: ['A', 'B'] });
    const respiratoryMatch = matches.find((match) => match.pattern.id === 'CP-012');
    const alerts = matches.map(toGate2Alert);
    const respiratoryAlert = respiratoryMatch ? toGate2Alert(respiratoryMatch) : undefined;

    expect(respiratoryAlert).toEqual(
      expect.objectContaining({
        patternId: 'CP-012',
        actionProtocolId: 'PROTO_RESP_FAILURE',
        gate: 'GATE_RESP_FAILURE',
        severity: 'critical',
      })
    );

    const workflow = buildGate2Workflow(alerts);

    expect(workflow.active).toBe(true);
    expect(workflow.primaryAlert?.patternId).toBe('CP-012');
    expect(workflow.primaryProtocol?.id).toBe('PROTO_RESP_FAILURE');
    expect(workflow.actionItems.map((item) => item.action)).toEqual(
      expect.arrayContaining([expect.stringContaining('Pasien duduk tegak')])
    );
    expect(workflow.referralCriteria).toEqual(
      expect.arrayContaining([expect.stringContaining('SpO2 tetap <90%')])
    );
    expect(workflow.remeasurePrompt).toContain('5 menit');
  });

  it('sorts action-backed critical Gate 2 alerts before lower-risk and non-action alerts', () => {
    const sorted = sortGate2Alerts([
      {
        id: 'warning',
        severity: 'warning',
        title: 'Warning',
        gate: 'GATE_TEST',
        reasoning: '',
        recommendations: [],
      },
      {
        id: 'critical-no-protocol',
        severity: 'critical',
        title: 'Critical no protocol',
        gate: 'GATE_TEST',
        reasoning: '',
        recommendations: [],
        confidence: 0.99,
      },
      {
        id: 'critical-with-protocol',
        severity: 'critical',
        title: 'Critical with protocol',
        gate: 'GATE_RESP_FAILURE',
        reasoning: '',
        recommendations: [],
        actionProtocolId: 'PROTO_RESP_FAILURE',
        confidence: 0.7,
      },
    ]);

    expect(sorted.map((alert) => alert.id)).toEqual([
      'critical-with-protocol',
      'critical-no-protocol',
      'warning',
    ]);
  });

  it('uses explicit structured clinical context for Tier C patterns', () => {
    const baseSnapshot = buildClinicalSnapshot(
      makeState({
        rr: '25',
        symptomText: 'sesak napas dan mengi sejak pagi',
      }),
      { patientAge: 45 }
    );
    const snapshot = {
      ...baseSnapshot,
      history: {
        ...baseSnapshot.history,
        knownAsthma: true,
      },
      symptoms: {
        ...baseSnapshot.symptoms,
        clinicalConcern: true,
      },
    };

    expect(snapshot.history.knownAsthma).toBe(true);
    expect(snapshot.symptoms.clinicalConcern).toBe(true);

    const matches = evaluatePatterns(snapshot, CLINICAL_PATTERNS, [], { tierFilter: ['C'] });

    expect(matches.map((match) => match.pattern.id)).toEqual(
      expect.arrayContaining(['CP-052', 'CP-070'])
    );
  });
});
