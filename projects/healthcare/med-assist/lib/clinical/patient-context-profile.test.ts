import { describe, expect, it } from 'vitest';

import {
  buildPatientContextProfile,
  hasReducedConsciousnessSignal,
  needsPregnancyVerification,
} from './patient-context-profile';

describe('patient context profile', () => {
  it('classifies infant, child, geriatric, and reproductive female profiles', () => {
    expect(buildPatientContextProfile({ age: 0, gender: 'L' }).ageBand).toBe('infant');
    expect(buildPatientContextProfile({ age: 8, gender: 'P' }).ageBand).toBe('child');
    expect(buildPatientContextProfile({ age: 66, gender: 'L' }).isGeriatric).toBe(true);
    expect(buildPatientContextProfile({ age: 30, gender: 'P' }).isReproductiveFemale).toBe(true);
    expect(buildPatientContextProfile({ age: 2, gender: 'P' }).usesFlaccPainScale).toBe(true);
  });

  it('detects reduced consciousness and pregnancy verification symptom signals', () => {
    expect(hasReducedConsciousnessSignal('Pasien pingsan lalu letargi')).toBe(true);
    expect(hasReducedConsciousnessSignal('Batuk pilek biasa')).toBe(false);
    expect(
      needsPregnancyVerification(
        buildPatientContextProfile({ age: 25, gender: 'P' }),
        'Nyeri perut bawah dan telat haid',
        null
      )
    ).toBe(true);
    expect(
      needsPregnancyVerification(
        buildPatientContextProfile({ age: 25, gender: 'L' }),
        'Nyeri perut bawah dan telat haid',
        null
      )
    ).toBe(false);
  });
});
