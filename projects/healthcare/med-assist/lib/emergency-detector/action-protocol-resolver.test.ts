// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { resolveActionProtocolId, type ProtocolResolvableAlert } from './action-protocol-resolver';

const alert = (
  overrides: Partial<ProtocolResolvableAlert> & Pick<ProtocolResolvableAlert, 'id'>
): ProtocolResolvableAlert => ({
  type: overrides.type ?? 'generic',
  gate: overrides.gate ?? 'GATE_UNKNOWN',
  ...overrides,
});

describe('resolveActionProtocolId', () => {
  it('passes through an already-set actionProtocolId unchanged (Pattern-Engine v2 alerts)', () => {
    const result = resolveActionProtocolId(
      alert({ id: 'pattern-CP-001', type: 'GATE_SEPSIS_EARLY', actionProtocolId: 'PROTO_SEPSIS' })
    );

    expect(result).toBe('PROTO_SEPSIS');
  });

  it.each([
    ['hypotension', 'PROTO_SHOCK'],
    ['occult_shock', 'PROTO_SHOCK'],
    ['hypoglycemia', 'PROTO_HYPOGLYCEMIA'],
    ['hyperglycemia', 'PROTO_DKA_HHS'],
    ['hypoxia', 'PROTO_RESP_FAILURE'],
  ])('maps type=%s to %s', (type, expected) => {
    expect(resolveActionProtocolId(alert({ id: 'x', type }))).toBe(expected);
  });

  it.each([
    ['guardrail-code-red-spo2', 'PROTO_RESP_FAILURE'],
    ['guardrail-code-red-rr', 'PROTO_RESP_FAILURE'],
    ['guardrail-code-red-glucose', 'PROTO_HYPOGLYCEMIA'],
  ])('maps CODE RED cue id=%s to %s', (id, expected) => {
    expect(resolveActionProtocolId(alert({ id, type: 'code_red_cue' }))).toBe(expected);
  });

  it('maps CODE RED sbp cue to PROTO_SHOCK only when sbp is below the shock-level ceiling', () => {
    const shockLevel = resolveActionProtocolId(
      alert({ id: 'guardrail-code-red-sbp', type: 'code_red_cue', clinicalData: { sbp: 70 } })
    );
    const hypertensiveExtreme = resolveActionProtocolId(
      alert({ id: 'guardrail-code-red-sbp', type: 'code_red_cue', clinicalData: { sbp: 210 } })
    );

    expect(shockLevel).toBe('PROTO_SHOCK');
    expect(hypertensiveExtreme).toBeUndefined();
  });

  it('leaves the ambiguous-direction CODE RED hr cue unmapped', () => {
    const bradycardia = resolveActionProtocolId(
      alert({ id: 'guardrail-code-red-hr', type: 'code_red_cue', clinicalData: {} })
    );
    const tachycardia = resolveActionProtocolId(
      alert({ id: 'guardrail-code-red-hr', type: 'code_red_cue', clinicalData: {} })
    );

    expect(bradycardia).toBeUndefined();
    expect(tachycardia).toBeUndefined();
  });

  it('leaves symptom-phrase-driven CODE RED cues unmapped (matched phrase not retrievable)', () => {
    const result = resolveActionProtocolId(
      alert({ id: 'guardrail-code-red-symptomText', type: 'code_red_cue' })
    );

    expect(result).toBeUndefined();
  });

  it.each([
    ['avpu_abnormal', 'GATE_0_AVPU'],
    ['hypertensive_crisis', 'GATE_2_BP'],
    ['tachycardia', 'GATE_5_CIRCULATION'],
    ['bradycardia', 'GATE_5B_CIRCULATION_LOW'],
    ['hyperthermia', 'GATE_7_TEMPERATURE'],
    ['urgent_pain', 'GATE_PAIN'],
    ['preeclampsia_watch', 'GATE_PREGNANCY_BP'],
    ['context_note', 'GATE_PATIENT_CONTEXT'],
  ])('leaves ambiguous/no-protocol type=%s (gate=%s) unmapped', (type, gate) => {
    expect(resolveActionProtocolId(alert({ id: 'x', type, gate }))).toBeUndefined();
  });
});
