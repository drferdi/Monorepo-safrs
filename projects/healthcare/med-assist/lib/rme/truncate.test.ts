import { describe, expect, it } from 'vitest';

import {
  RME_TEXT_LIMIT,
  RME_TRUNCATION_LIMIT,
  RME_WORD_LIMIT,
  capRMEWords,
  sanitizeRMEAnamnesaText,
  truncateDeepStrings,
  truncateRMEText,
} from './truncate';

describe('RME truncate SSOT', () => {
  it('exports defensive char=250 and word=220 limits', () => {
    expect(RME_TEXT_LIMIT).toBe(250);
    expect(RME_WORD_LIMIT).toBe(220);
    expect(RME_TRUNCATION_LIMIT).toBe(250);
  });
});

describe('truncateRMEText', () => {
  it('returns empty string for nullish values', () => {
    expect(truncateRMEText(undefined)).toBe('');
    expect(truncateRMEText(null)).toBe('');
    expect(truncateRMEText('')).toBe('');
  });

  it('normalizes whitespace without changing safe text', () => {
    expect(truncateRMEText('  demam   tinggi  sejak 3 hari  ')).toBe('demam tinggi sejak 3 hari');
  });

  it('truncates deterministically to 250 chars by default', () => {
    const text = `Keluhan ${'sangat '.repeat(50)}panjang`;
    const result = truncateRMEText(text);

    expect(result.length).toBeLessThanOrEqual(RME_TEXT_LIMIT);
    expect(result.length).toBeLessThanOrEqual(250);
    expect(result).toBe(truncateRMEText(text));
  });

  it('prefers cutting at the last nearby word boundary', () => {
    const text = `Pasien ${'mengeluh '.repeat(30)}sesak`;
    const result = truncateRMEText(text, 80);

    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith(' ')).toBe(false);
  });
});

describe('capRMEWords', () => {
  it('returns empty string for nullish values', () => {
    expect(capRMEWords(undefined)).toBe('');
    expect(capRMEWords(null)).toBe('');
    expect(capRMEWords('')).toBe('');
  });

  it('leaves short text unchanged', () => {
    expect(capRMEWords('demam tinggi sejak 3 hari')).toBe('demam tinggi sejak 3 hari');
  });

  it('caps to 220 words by default', () => {
    const words = Array.from({ length: 250 }, (_, i) => `kata${i + 1}`);
    const result = capRMEWords(words.join(' '));
    expect(result.split(' ')).toHaveLength(RME_WORD_LIMIT);
    expect(result.split(' ')[0]).toBe('kata1');
    expect(result.split(' ').at(-1)).toBe('kata220');
  });
});

describe('sanitizeRMEAnamnesaText', () => {
  it('applies word then char caps', () => {
    const longWords = Array.from({ length: 230 }, (_, i) => `keluhan${i + 1}`).join(' ');
    const sanitized = sanitizeRMEAnamnesaText(longWords);
    expect(sanitized.split(' ').length).toBeLessThanOrEqual(RME_WORD_LIMIT);
    expect(sanitized.length).toBeLessThanOrEqual(RME_TEXT_LIMIT);
  });

  it('caps oversized character runs even when word count is low', () => {
    const blob = `x${'y'.repeat(400)}`;
    const sanitized = sanitizeRMEAnamnesaText(blob);
    expect(sanitized.length).toBeLessThanOrEqual(RME_TEXT_LIMIT);
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
