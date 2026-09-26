import { describe, expect, it } from 'vitest';

import { RME_TRUNCATION_LIMIT, truncateDeepStrings, truncateRMEText } from './truncate';

describe('truncateRMEText', () => {
  it('returns empty string for nullish values', () => {
    expect(truncateRMEText(undefined)).toBe('');
    expect(truncateRMEText(null)).toBe('');
    expect(truncateRMEText('')).toBe('');
  });

  it('normalizes whitespace without changing safe text', () => {
    expect(truncateRMEText('  demam   tinggi  sejak 3 hari  ')).toBe('demam tinggi sejak 3 hari');
  });

  it('truncates deterministically to 255 chars', () => {
    const text = `Keluhan ${'sangat '.repeat(40)}panjang`;
    const result = truncateRMEText(text);

    expect(result.length).toBeLessThanOrEqual(RME_TRUNCATION_LIMIT);
    expect(result).toBe(truncateRMEText(text));
  });

  it('prefers cutting at the last nearby word boundary', () => {
    const text = `Pasien ${'mengeluh '.repeat(30)}sesak`;
    const result = truncateRMEText(text, 80);

    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith(' ')).toBe(false);
  });
});

describe('truncateDeepStrings', () => {
  it('truncates nested strings without crashing on numbers or booleans', () => {
    const payload = {
      a: 'x'.repeat(400),
      b: ['y'.repeat(260), 3, false],
      c: {
        d: 'z'.repeat(270),
      },
    };

    const result = truncateDeepStrings(payload);

    expect(result.a.length).toBeLessThanOrEqual(RME_TRUNCATION_LIMIT);
    expect((result.b[0] as string).length).toBeLessThanOrEqual(RME_TRUNCATION_LIMIT);
    expect(result.c.d.length).toBeLessThanOrEqual(RME_TRUNCATION_LIMIT);
    expect(result.b[1]).toBe(3);
    expect(result.b[2]).toBe(false);
  });
});
