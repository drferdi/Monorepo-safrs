// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { miraNoticeFor } from './mira-notice';

describe('miraNoticeFor', () => {
  it.each([
    ['NOT_INSTALLED', 'MIRA belum terpasang'],
    ['STARTING', 'MIRA sedang menyala'],
    ['NETWORK_ERROR', 'MIRA mati'],
    ['NOT_CONFIGURED', 'MIRA mati'],
    ['BUDGET_EXHAUSTED', 'MIRA: batas biaya harian'],
    ['TIMEOUT', 'MIRA: waktu habis'],
    ['MODEL_OUTPUT_INVALID', 'MIRA: hasil tidak valid'],
    ['CONTRACT_MISMATCH', 'MIRA: hasil tidak valid'],
    ['PII_DETECTED', 'MIRA: data pasien ditolak (PII)'],
    ['PII_BLOCKED', 'MIRA: data pasien ditolak (PII)'],
  ])('maps %s', (code, notice) => {
    expect(miraNoticeFor(code)).toBe(notice);
  });

  it('falls back to the generic notice with the code, and without a code', () => {
    expect(miraNoticeFor('HTTP_503')).toBe('MIRA tidak tersedia (HTTP_503)');
    expect(miraNoticeFor(undefined)).toBe('MIRA tidak tersedia');
  });
});
