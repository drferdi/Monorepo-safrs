import { describe, expect, it } from 'vitest';

import type { VitalFieldKey, VitalFieldStatus } from '@/lib/clinical/vital-guardrails';
import { selectVitalWarnings } from '@/lib/clinical/vital-warning-selector';

function normalStatus(field: VitalFieldKey): VitalFieldStatus {
  return { field, severity: 'normal' };
}

describe('selectVitalWarnings', () => {
  it('returns an empty array when every vital is normal', () => {
    const fieldStatus = {
      sbp: normalStatus('sbp'),
      dbp: normalStatus('dbp'),
      hr: normalStatus('hr'),
      rr: normalStatus('rr'),
      temp: normalStatus('temp'),
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    expect(selectVitalWarnings(fieldStatus)).toEqual([]);
  });

  it('always shows TD first when abnormal, even if other vitals are also abnormal', () => {
    const fieldStatus = {
      sbp: { field: 'sbp' as const, severity: 'critical' as const, value: 180 },
      dbp: { field: 'dbp' as const, severity: 'critical' as const, value: 110 },
      hr: { field: 'hr' as const, severity: 'warning' as const, value: 130 },
      rr: normalStatus('rr'),
      temp: normalStatus('temp'),
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result[0]).toMatchObject({ label: 'TD', value: '180/110' });
  });

  it('shows TD and Suhu together when both are abnormal, ignoring other abnormal vitals', () => {
    const fieldStatus = {
      sbp: { field: 'sbp' as const, severity: 'critical' as const, value: 180 },
      dbp: { field: 'dbp' as const, severity: 'critical' as const, value: 110 },
      hr: { field: 'hr' as const, severity: 'warning' as const, value: 130 },
      rr: normalStatus('rr'),
      temp: { field: 'temp' as const, severity: 'warning' as const, value: 39.2 },
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'TD', value: '180/110' });
    expect(result[1]).toMatchObject({ label: 'Suhu', value: '39.2' });
  });

  it('fills the remaining slot with HR before RR/SpO2/Glucose when TD is abnormal but Suhu is normal', () => {
    const fieldStatus = {
      sbp: { field: 'sbp' as const, severity: 'critical' as const, value: 180 },
      dbp: { field: 'dbp' as const, severity: 'critical' as const, value: 110 },
      hr: { field: 'hr' as const, severity: 'warning' as const, value: 130 },
      rr: { field: 'rr' as const, severity: 'warning' as const, value: 30 },
      temp: normalStatus('temp'),
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'TD' });
    expect(result[1]).toMatchObject({ label: 'HR', value: '130' });
  });

  it('falls through HR -> RR -> SpO2 -> Glucose in order when TD and Suhu are both normal', () => {
    const fieldStatus = {
      sbp: normalStatus('sbp'),
      dbp: normalStatus('dbp'),
      hr: normalStatus('hr'),
      rr: normalStatus('rr'),
      temp: normalStatus('temp'),
      spo2: { field: 'spo2' as const, severity: 'critical' as const, value: 88 },
      glucose: { field: 'glucose' as const, severity: 'warning' as const, value: 250 },
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'SpO2', value: '88' });
    expect(result[1]).toMatchObject({ label: 'Glukosa', value: '250' });
  });
});
