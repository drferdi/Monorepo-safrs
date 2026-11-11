import { describe, expect, it } from 'vitest';

import { applyRmeVitalTags } from './TTVInferenceUI';

import { canOverrideField, makeFieldMeta } from '@/lib/clinical/aassist-v2/field-priority';

const emptyVitalState = {
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
};

describe('applyRmeVitalTags', () => {
  it('tags newly extracted RME fields as RME-manual', () => {
    const state = { ...emptyVitalState, sbp: '180', dbp: '110' };
    const result = applyRmeVitalTags({}, ['sbp', 'dbp'], state);

    expect(result.sbp).toMatchObject({ value: '180', source: 'RME-manual' });
    expect(result.dbp).toMatchObject({ value: '110', source: 'RME-manual' });
  });

  it('does not tag a field whose current state value is empty', () => {
    const state = { ...emptyVitalState, dbp: '110' };
    const result = applyRmeVitalTags({}, ['sbp', 'dbp'], state);

    expect(result.sbp).toBeUndefined();
    expect(result.dbp).toMatchObject({ source: 'RME-manual' });
  });

  it('preserves existing fieldMeta entries for fields not listed in rmeVitalFieldKeys', () => {
    const existingHrMeta = makeFieldMeta('88', 'ASIST-manual');
    const state = { ...emptyVitalState, sbp: '180', hr: '88' };
    const result = applyRmeVitalTags({ hr: existingHrMeta }, ['sbp'], state);

    expect(result.hr).toEqual(existingHrMeta);
    expect(result.sbp).toMatchObject({ source: 'RME-manual' });
  });

  it('returns the input unchanged when rmeVitalFieldKeys is empty', () => {
    const existing = { hr: makeFieldMeta('88', 'ASIST-manual') };
    expect(applyRmeVitalTags(existing, [], emptyVitalState)).toBe(existing);
  });
});

describe('RME-manual field-priority regression (AutoComplete+ cannot override)', () => {
  it('blocks ASIST-autocomplete from overriding an RME-manual sbp/dbp pair', () => {
    const meta = {
      sbp: makeFieldMeta('180', 'RME-manual'),
      dbp: makeFieldMeta('110', 'RME-manual'),
    };

    // canOverrideField is the exact function vital-autocomplete.ts gates on;
    // this proves the rank alone blocks 'ASIST-autocomplete' without lockField().
    expect(canOverrideField(meta.sbp, 'ASIST-autocomplete')).toBe(false);
    expect(canOverrideField(meta.dbp, 'ASIST-autocomplete')).toBe(false);
  });
});
