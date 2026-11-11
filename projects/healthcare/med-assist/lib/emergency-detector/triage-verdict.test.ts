// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { computeTriageVerdict, type TriageAlertLike } from './triage-verdict';

const alert = (
  overrides: Partial<TriageAlertLike> & Pick<TriageAlertLike, 'id'>
): TriageAlertLike => ({
  type: overrides.type ?? 'generic',
  severity: overrides.severity ?? 'warning',
  gate: overrides.gate ?? 'GATE_UNKNOWN',
  ...overrides,
});

describe('computeTriageVerdict', () => {
  it('returns standby (never hijau) before any vital sign is entered', () => {
    const verdict = computeTriageVerdict(
      [alert({ id: 'a', severity: 'critical', gate: 'GATE_0_AVPU' })],
      false
    );

    expect(verdict.zone).toBe('standby');
    expect(verdict.headlineAlert).toBeNull();
    expect(verdict.sortedAlerts).toEqual([]);
  });

  it('returns hijau when vitals are entered and there are no findings', () => {
    const verdict = computeTriageVerdict([], true);

    expect(verdict.zone).toBe('hijau');
    expect(verdict.headlineAlert).toBeNull();
    expect(verdict.sortedAlerts).toEqual([]);
  });

  it('returns kuning when only warning-severity alerts are present', () => {
    const verdict = computeTriageVerdict(
      [alert({ id: 'fever', severity: 'warning', gate: 'GATE_7_TEMPERATURE' })],
      true
    );

    expect(verdict.zone).toBe('kuning');
  });

  it('returns kuning when only high-severity alerts are present', () => {
    const verdict = computeTriageVerdict(
      [alert({ id: 'tachy', severity: 'high', gate: 'GATE_5_CIRCULATION' })],
      true
    );

    expect(verdict.zone).toBe('kuning');
  });

  it('returns merah when any critical-severity alert is present', () => {
    const verdict = computeTriageVerdict(
      [
        alert({ id: 'fever', severity: 'warning', gate: 'GATE_7_TEMPERATURE' }),
        alert({ id: 'avpu', severity: 'critical', gate: 'GATE_0_AVPU' }),
      ],
      true
    );

    expect(verdict.zone).toBe('merah');
  });

  it('ranks hypoglycemia (critical) ahead of hypotension (critical) — glucose checked before hemodynamic', () => {
    const hypotension = alert({
      id: 'hypotension-alert',
      severity: 'critical',
      gate: 'GATE_1_HEMODYNAMIC',
    });
    const hypoglycemia = alert({
      id: 'hypoglycemia-alert',
      severity: 'critical',
      gate: 'GATE_3_GLUCOSE',
    });

    const verdict = computeTriageVerdict([hypotension, hypoglycemia], true);

    expect(verdict.headlineAlert?.id).toBe('hypoglycemia-alert');
    expect(verdict.sortedAlerts.map((a) => a.id)).toEqual([
      'hypoglycemia-alert',
      'hypotension-alert',
    ]);
  });

  it('sorts high ahead of warning within the same zone', () => {
    const warning = alert({ id: 'fever', severity: 'warning', gate: 'GATE_7_TEMPERATURE' });
    const high = alert({ id: 'tachy', severity: 'high', gate: 'GATE_5_CIRCULATION' });

    const verdict = computeTriageVerdict([warning, high], true);

    expect(verdict.sortedAlerts.map((a) => a.id)).toEqual(['tachy', 'fever']);
  });

  it('never throws on an unrecognized gate string and sorts it last within its tier', () => {
    const known = alert({ id: 'known', severity: 'critical', gate: 'GATE_0_AVPU' });
    const unknown = alert({ id: 'unknown', severity: 'critical', gate: 'GATE_SOME_FUTURE_THING' });

    const verdict = computeTriageVerdict([unknown, known], true);

    expect(verdict.sortedAlerts.map((a) => a.id)).toEqual(['known', 'unknown']);
  });

  it('keeps stable original order for equal-priority ties', () => {
    const first = alert({ id: 'first', severity: 'warning', gate: 'GATE_PAIN' });
    const second = alert({ id: 'second', severity: 'warning', gate: 'GATE_PAIN' });

    const verdict = computeTriageVerdict([first, second], true);

    expect(verdict.sortedAlerts.map((a) => a.id)).toEqual(['first', 'second']);
  });

  it('computes zone independently from the headline alert (worst severity present, not headline-derived)', () => {
    // Headline (by gate priority) would be GATE_CODE_RED, but its severity here
    // is 'high' — zone must still reflect the separate 'critical' alert present.
    const codeRed = alert({ id: 'code-red', severity: 'high', gate: 'GATE_CODE_RED' });
    const criticalOther = alert({
      id: 'critical-other',
      severity: 'critical',
      gate: 'GATE_7_TEMPERATURE',
    });

    const verdict = computeTriageVerdict([codeRed, criticalOther], true);

    expect(verdict.zone).toBe('merah');
    expect(verdict.headlineAlert?.id).toBe('critical-other');
  });
});
