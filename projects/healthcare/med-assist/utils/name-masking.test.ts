import { describe, expect, it } from 'vitest';

import { maskIdentifier, maskPatientName } from './name-masking';

describe('maskPatientName', () => {
  // Chief, 2026-10-03: "Ferdi Iskandar, Jadi : F**di ..." — first letter and last two stay.
  it('keeps the first letter and the last two letters of each word', () => {
    expect(maskPatientName('Ferdi Iskandar')).toBe('F**di I*****ar');
  });

  it('keeps only the first letter of a word of three letters or fewer', () => {
    expect(maskPatientName('Adi Wijaya')).toBe('A** W***ya');
    expect(maskPatientName('Tn. Bo')).toBe('T** B*');
  });

  it('masks an upper-case name the same way and collapses extra spaces', () => {
    expect(maskPatientName('  SITI   NURHALIZA ')).toBe('S*TI N******ZA');
  });

  it('returns an empty string for an empty name', () => {
    expect(maskPatientName('   ')).toBe('');
  });
});

describe('maskIdentifier', () => {
  it('keeps only the last four characters', () => {
    expect(maskIdentifier('0001234567890')).toBe('*********7890');
  });

  it('masks an identifier of four characters or fewer completely', () => {
    expect(maskIdentifier('1234')).toBe('****');
  });
});
