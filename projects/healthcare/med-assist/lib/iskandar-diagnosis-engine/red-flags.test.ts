import { describe, expect, it } from 'vitest';

import { checkAnaphylaxis, checkSepsis, runRedFlagChecks } from './red-flags';

describe('checkAnaphylaxis (WAO 2020)', () => {
  it('does not call nausea, vomiting and dizziness anaphylaxis', () => {
    expect(checkAnaphylaxis('mual muntah dan pusing sejak pagi', undefined, undefined)).toBeNull();
  });

  it('does not call a rash with plain vomiting anaphylaxis', () => {
    expect(
      checkAnaphylaxis(
        'gatal seluruh badan dan muntah',
        { systolic: 118, heart_rate: 96 },
        undefined
      )
    ).toBeNull();
  });

  it('does not call skin signs alone anaphylaxis, even after a meal', () => {
    expect(
      checkAnaphylaxis('biduran setelah makan udang', { systolic: 120 }, undefined)
    ).toBeNull();
  });

  it('criterion 1: skin or mucosa plus respiratory compromise', () => {
    const flag = checkAnaphylaxis('biduran seluruh tubuh dan sesak', undefined, undefined);
    expect(flag?.severity).toBe('emergency');
    expect(flag?.criteria_met.join(' ')).toContain('Kriteria 1');
  });

  it('criterion 1: skin or mucosa plus low SpO2 counts as respiratory compromise', () => {
    expect(checkAnaphylaxis('bengkak bibir', { spo2: 91 }, undefined)?.severity).toBe('emergency');
  });

  it('criterion 1: skin or mucosa plus severe gastrointestinal symptoms', () => {
    expect(
      checkAnaphylaxis('gatal seluruh badan dan muntah berulang', undefined, undefined)?.severity
    ).toBe('emergency');
  });

  it('criterion 1: hypotension is age-adjusted for a child', () => {
    // 4 years: hypotension is SBP < 70 + 2 x 4 = 78.
    expect(checkAnaphylaxis('bengkak bibir', { systolic: 75 }, undefined, 4)?.severity).toBe(
      'emergency'
    );
    expect(checkAnaphylaxis('bengkak bibir', { systolic: 82 }, undefined, 4)).toBeNull();
  });

  it('criterion 2: allergen exposure plus bronchospasm, without skin signs', () => {
    const flag = checkAnaphylaxis(
      'mengi dan sesak setelah disuntik antibiotik',
      undefined,
      undefined
    );
    expect(flag?.severity).toBe('emergency');
    expect(flag?.criteria_met.join(' ')).toContain('Kriteria 2');
  });

  it('criterion 2: allergen exposure plus hypotension, without skin signs', () => {
    expect(
      checkAnaphylaxis('lemas setelah disengat tawon', { systolic: 82 }, undefined, 30)?.severity
    ).toBe('emergency');
  });

  it('a known allergy without current exposure does not satisfy criterion 2', () => {
    expect(checkAnaphylaxis('mengi', undefined, ['amoksisilin'])).toBeNull();
  });

  it('cites WAO 2020', () => {
    expect(checkAnaphylaxis('biduran dan sesak', undefined, undefined)?.source).toContain(
      'WAO 2020'
    );
  });

  it('runRedFlagChecks passes the age through', () => {
    const flags = runRedFlagChecks({ keluhan: 'bengkak bibir', vitals: { systolic: 75 }, age: 4 });
    expect(flags.map((flag) => flag.id)).toContain('RF-ANAPHYLAXIS');
  });
});

describe('checkSepsis ICD-10 codes', () => {
  it('uses the WHO ICD-10 code R65.1, not the US-only R65.20', () => {
    const flag = checkSepsis({ respiratory_rate: 24, systolic: 95 });
    expect(flag?.icd_codes).toEqual(['A41.9', 'R65.1']);
  });
});

// qSOFA (Singer 2016): each criterion on both sides of its line. One other criterion is held met,
// so the criterion under test decides whether the flag appears.
describe('checkSepsis qSOFA boundaries', () => {
  it.each([
    ['RR 22 counts', { respiratory_rate: 22, gcs: 14 }, true],
    ['RR 21 does not', { respiratory_rate: 21, gcs: 14 }, false],
    ['systolic 100 counts', { systolic: 100, gcs: 14 }, true],
    ['systolic 101 does not', { systolic: 101, gcs: 14 }, false],
    ['GCS 14 counts', { gcs: 14, respiratory_rate: 22 }, true],
    ['GCS 15 does not', { gcs: 15, respiratory_rate: 22 }, false],
  ])('%s', (_label, vitals, flagged) => {
    expect(checkSepsis(vitals) !== null).toBe(flagged);
  });
});
