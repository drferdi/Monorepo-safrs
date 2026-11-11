import { describe, expect, it } from 'vitest';

import { buildAlerts } from '@/components/clinical/TTVInferenceUI';
import { makeFieldMeta } from '@/lib/clinical/aassist-v2/field-priority';
import {
  buildVitalAutofill,
  filterVitalAutofillByFieldPriority,
} from '@/lib/clinical/vital-autocomplete';
import { getVitalScreeningProfile } from '@/lib/clinical/vital-screening-thresholds';

const makeState = (
  overrides: Partial<Parameters<typeof buildAlerts>[0]> = {}
): Parameters<typeof buildAlerts>[0] => ({
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
  disabilityType: '',
  obesityConfirmation: '',
  autosenPreset: 'adl',
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
  ...overrides,
});

describe('buildVitalAutofill', () => {
  it('treats blood pressure as an atomic pair when filtering autocomplete values', () => {
    const generated = buildVitalAutofill('adl', 45, 123).vitals;
    const filtered = filterVitalAutofillByFieldPriority(generated, {
      sbp: makeFieldMeta('120', 'ASIST-manual'),
    });

    expect(generated.sbp).toBeTruthy();
    expect(generated.dbp).toBeTruthy();
    expect(filtered.sbp).toBeUndefined();
    expect(filtered.dbp).toBeUndefined();
    expect(filtered.hr).toBe(generated.hr);
  });

  it('repairs an incomplete blood pressure pair previously created by autocomplete', () => {
    const generated = buildVitalAutofill('adl', 45, 123).vitals;
    const filtered = filterVitalAutofillByFieldPriority(generated, {
      dbp: makeFieldMeta('52', 'ASIST-autocomplete'),
    });

    expect(filtered.sbp).toBe(generated.sbp);
    expect(filtered.dbp).toBe(generated.dbp);
  });

  it('generates below-floor hypotension range for an adult and activates hypotension alert', () => {
    const profile = getVitalScreeningProfile(35);
    const autofill = buildVitalAutofill('hypotension', 35);
    const sbp = Number(autofill.vitals.sbp);

    expect(sbp).toBeLessThan(profile.hypotensionSbpFloor);

    const alerts = buildAlerts(
      makeState({
        ...autofill.vitals,
        autosenPreset: 'hypotension',
      }),
      { patientAge: 35 }
    );

    expect(alerts.some((alert) => alert.type === 'hypotension')).toBe(true);
  });

  it('generates severe hypertension range for an adult and triggers crisis alert', () => {
    const profile = getVitalScreeningProfile(35);
    const autofill = buildVitalAutofill('hypertension', 35);
    const sbp = Number(autofill.vitals.sbp);
    const dbp = Number(autofill.vitals.dbp);

    expect(sbp).toBe(profile.severeHypertensionSbp);
    expect(dbp).toBe(profile.severeHypertensionDbp);

    const alerts = buildAlerts(
      makeState({
        ...autofill.vitals,
        autosenPreset: 'hypertension',
      }),
      { patientAge: 35 }
    );

    expect(alerts.some((alert) => alert.type === 'hypertensive_crisis')).toBe(true);
  });

  it('regression guard: keeps hypertension preset HR/RR within pediatric bounds, not flat adult ranges', () => {
    const profile = getVitalScreeningProfile(8);
    const autofill = buildVitalAutofill('hypertension', 8);
    const sbp = Number(autofill.vitals.sbp);
    const hr = Number(autofill.vitals.hr);
    const rr = Number(autofill.vitals.rr);

    expect(sbp).toBe(profile.severeHypertensionSbp);
    expect(hr).toBeGreaterThan(profile.bradycardiaThreshold);
    expect(hr).toBeLessThan(profile.tachycardiaThreshold);
    expect(rr).toBeGreaterThan(profile.bradypneaThreshold);
    expect(rr).toBeLessThan(profile.tachypneaThreshold);
  });

  it('regression guard: keeps hyperglycemia preset HR/RR within pediatric bounds for a child', () => {
    const profile = getVitalScreeningProfile(5);
    const autofill = buildVitalAutofill('hyperglycemia', 5);
    const hr = Number(autofill.vitals.hr);
    const rr = Number(autofill.vitals.rr);

    expect(hr).toBeGreaterThan(profile.bradycardiaThreshold);
    expect(hr).toBeLessThan(profile.tachycardiaThreshold);
    expect(rr).toBeGreaterThan(profile.bradypneaThreshold);
    expect(rr).toBeLessThan(profile.tachypneaThreshold);
  });

  it('regression guard: keeps hypotension preset within pediatric HR bounds for a toddler', () => {
    const profile = getVitalScreeningProfile(2);
    const autofill = buildVitalAutofill('hypotension', 2);
    const sbp = Number(autofill.vitals.sbp);
    const hr = Number(autofill.vitals.hr);

    expect(sbp).toBeLessThan(profile.hypotensionSbpFloor);
    expect(hr).toBeGreaterThan(profile.bradycardiaThreshold);
    expect(hr).toBeLessThan(profile.tachycardiaThreshold);
  });

  it('surfaces the geriatric orthostatic note in hypotension preset reasoning for older adults', () => {
    const profile = getVitalScreeningProfile(70);
    const autofill = buildVitalAutofill('hypotension', 70);
    const sbp = Number(autofill.vitals.sbp);

    expect(sbp).toBeLessThan(profile.hypotensionSbpFloor);
    expect(profile.geriatricOrthostaticNote).toBeTruthy();
    expect(autofill.reasoning.join(' ')).toContain(profile.geriatricOrthostaticNote);
  });

  // The preset fills glucose "agar gate glukosa aktif"; the gate now does.
  it('fills the hyperglycemia preset in the severe range, which activates the glucose gate', () => {
    const autofill = buildVitalAutofill('hyperglycemia', 42);
    const alerts = buildAlerts(
      makeState({
        ...autofill.vitals,
        autosenPreset: 'hyperglycemia',
      }),
      { patientAge: 42 }
    );

    expect(Number(autofill.vitals.glucose)).toBeGreaterThanOrEqual(300);
    expect(alerts.some((alert) => alert.type === 'hyperglycemia')).toBe(true);
  });

  it('activates glucose gate for hypoglycemia preset', () => {
    const autofill = buildVitalAutofill('hypoglycemia', 42);
    const alerts = buildAlerts(
      makeState({
        ...autofill.vitals,
        autosenPreset: 'hypoglycemia',
      }),
      { patientAge: 42 }
    );

    expect(Number(autofill.vitals.glucose)).toBeLessThan(70);
    expect(alerts.some((alert) => alert.type === 'hypoglycemia')).toBe(true);
  });

  it('keeps glucose tolerance preset outside crisis range', () => {
    const autofill = buildVitalAutofill('glucose_tolerance', 42);
    const alerts = buildAlerts(
      makeState({
        ...autofill.vitals,
        autosenPreset: 'glucose_tolerance',
      }),
      { patientAge: 42 }
    );

    expect(Number(autofill.vitals.glucose)).toBeGreaterThanOrEqual(140);
    expect(Number(autofill.vitals.glucose)).toBeLessThan(200);
    expect(alerts.some((alert) => alert.type === 'hyperglycemia')).toBe(false);
    expect(alerts.some((alert) => alert.type === 'hypoglycemia')).toBe(false);
  });

  it('fills stable baseline values for ADL preset', () => {
    const autofill = buildVitalAutofill('adl', 70);

    expect(Number(autofill.vitals.spo2)).toBeGreaterThanOrEqual(97);
    expect(Number(autofill.vitals.glucose)).toBeGreaterThanOrEqual(90);
    expect(autofill.reasoning[0]).toContain('baseline fisiologis');
  });
});
