import { describe, expect, it } from 'vitest';

import {
  checkDKARedFlags,
  checkHHSRedFlags,
  classifyBloodGlucose,
  classifyGlucose,
  type DKAHHSRedFlags,
  GLUCOSE_THRESHOLDS,
  HYPOGLYCEMIA_15_15_RULE,
  treatHypoglycemia,
  triageHyperglycemia,
} from './glucose-classifier';

// Gate 3 of the emergency detector (PERKENI 2024). Each boundary is tested on both sides, so moving
// a threshold turns a test red.

const capillary = { sample_type: 'capillary' as const, has_classic_symptoms: false };

const noFlags: DKAHHSRedFlags = {
  kussmaul_breathing: false,
  acetone_breath: false,
  nausea_vomiting: false,
  abdominal_pain: false,
  altered_mental_status: false,
  severe_dehydration: false,
  extreme_hyperglycemia: false,
  seizures: false,
};

describe('classifyGlucose', () => {
  it('calls a random glucose below 70 mg/dL a hypoglycaemia crisis, and 70 not', () => {
    expect(GLUCOSE_THRESHOLDS.HYPOGLYCEMIA).toBe(70);
    expect(classifyGlucose({ ...capillary, gds: 69 })).toBe('HYPOGLYCEMIA_CRISIS');
    expect(classifyGlucose({ ...capillary, gds: 70 })).toBe('NORMAL');
  });

  it('confirms diabetes from a random glucose of 200 mg/dL only with classic symptoms', () => {
    const symptomatic = { ...capillary, has_classic_symptoms: true };
    expect(classifyGlucose({ ...symptomatic, gds: 199 })).toBe('NORMAL');
    expect(classifyGlucose({ ...symptomatic, gds: 200 })).toBe('DIABETES_CONFIRMED');
  });

  it('reads fasting glucose: normal to 99, prediabetes 100-125, diabetes from 126', () => {
    expect(classifyGlucose({ ...capillary, gdp: 99 })).toBe('NORMAL');
    expect(classifyGlucose({ ...capillary, gdp: 100 })).toBe('PREDIABETES');
    expect(classifyGlucose({ ...capillary, gdp: 125 })).toBe('PREDIABETES');
    expect(classifyGlucose({ ...capillary, gdp: 126 })).toBe('DIABETES_CONFIRMED');
  });

  it('reads the 2-hour OGTT: normal to 139, prediabetes 140-199, diabetes from 200', () => {
    expect(classifyGlucose({ ...capillary, ttgo_2h: 139 })).toBe('NORMAL');
    expect(classifyGlucose({ ...capillary, ttgo_2h: 140 })).toBe('PREDIABETES');
    expect(classifyGlucose({ ...capillary, ttgo_2h: 199 })).toBe('PREDIABETES');
    expect(classifyGlucose({ ...capillary, ttgo_2h: 200 })).toBe('DIABETES_CONFIRMED');
  });

  it('reads HbA1c: normal to 5.6, prediabetes 5.7-6.4, diabetes from 6.5', () => {
    expect(classifyGlucose({ ...capillary, hba1c: 5.6 })).toBe('NORMAL');
    expect(classifyGlucose({ ...capillary, hba1c: 5.7 })).toBe('PREDIABETES');
    expect(classifyGlucose({ ...capillary, hba1c: 6.4 })).toBe('PREDIABETES');
    expect(classifyGlucose({ ...capillary, hba1c: 6.5 })).toBe('DIABETES_CONFIRMED');
  });

  it('puts a hypoglycaemic random glucose before any other measurement', () => {
    expect(classifyGlucose({ ...capillary, gds: 55, gdp: 130 })).toBe('HYPOGLYCEMIA_CRISIS');
  });
});

describe('classifyBloodGlucose', () => {
  it('marks hypoglycaemia critical and names the 15-15 rule', () => {
    const result = classifyBloodGlucose({ ...capillary, gds: 54 });

    expect(result).toMatchObject({
      category: 'HYPOGLYCEMIA_CRISIS',
      severity: 'critical',
      value: 54,
      measurement_type: 'GDS',
    });
    expect(result.recommendations[0]).toBe('⚡ TREAT IMMEDIATELY (15-15 rule)');
    expect(result.reasoning).toBe(
      'Gula darah 54 mg/dL <70 (threshold hipoglikemia). TANGANI SEGERA dengan 15-15 rule.'
    );
  });

  it('marks confirmed diabetes high and prediabetes moderate', () => {
    expect(classifyBloodGlucose({ ...capillary, gdp: 126 }).severity).toBe('high');
    expect(classifyBloodGlucose({ ...capillary, gdp: 110 }).severity).toBe('moderate');
  });

  it('refuses a request without any glucose value', () => {
    expect(() => classifyBloodGlucose({ ...capillary })).toThrow('No glucose measurement provided');
  });
});

describe('treatHypoglycemia', () => {
  it('monitors from 70 mg/dL', () => {
    expect(treatHypoglycemia(70, true).action).toBe('MONITOR');
  });

  it('gives the 15-15 rule below 70 when the patient can swallow', () => {
    expect(treatHypoglycemia(69, true)).toEqual({
      action: 'TREAT',
      steps: HYPOGLYCEMIA_15_15_RULE,
    });
  });

  it('escalates to IV dextrose or glucagon when the patient cannot swallow', () => {
    expect(treatHypoglycemia(40, false)).toEqual({
      action: 'EMERGENCY',
      treatment: 'IV Dextrose 10-25g OR Glucagon 1mg IM/SC',
      alert: 'Severe hypoglycemia - activate emergency protocol',
    });
  });
});

describe('triageHyperglycemia', () => {
  it('is no hyperglycaemia below 200 mg/dL, even with crisis signs', () => {
    expect(triageHyperglycemia(199, { kussmaul_breathing: true })).toBe('NOT_HYPERGLYCEMIA');
  });

  it('is hyperglycaemia without crisis from 200 mg/dL when no sign is present', () => {
    expect(triageHyperglycemia(200, {})).toBe('HYPERGLYCEMIA_NO_CRISIS');
  });

  it.each([
    'severe_dehydration',
    'nausea_vomiting',
    'kussmaul_breathing',
    'acetone_breath',
    'altered_mental_status',
    'abdominal_pain',
    'seizures',
  ] as const)('suspects DKA/HHS from 200 mg/dL with %s', (sign) => {
    expect(triageHyperglycemia(200, { [sign]: true })).toBe('HYPERGLYCEMIC_CRISIS');
  });
});

describe('DKA and HHS red flags', () => {
  it.each(['kussmaul_breathing', 'acetone_breath', 'nausea_vomiting', 'abdominal_pain'] as const)(
    'suspects DKA from %s',
    (flag) => {
      expect(checkDKARedFlags({ ...noFlags, [flag]: true })).toBe(true);
    }
  );

  it.each([
    'extreme_hyperglycemia',
    'altered_mental_status',
    'seizures',
    'severe_dehydration',
  ] as const)('suspects HHS from %s', (flag) => {
    expect(checkHHSRedFlags({ ...noFlags, [flag]: true })).toBe(true);
  });

  it('suspects neither without a flag', () => {
    expect(checkDKARedFlags(noFlags)).toBe(false);
    expect(checkHHSRedFlags(noFlags)).toBe(false);
  });
});
