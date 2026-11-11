// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { miraNoticeFor } from './mira-notice';
import { resolveMiraNoticeCode } from './run-diagnosis';
import type { MiraStatus } from './mira-supervisor';

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

describe('resolveMiraNoticeCode', () => {
  const statusOf = (state: MiraStatus['state']): MiraStatus => ({
    state,
    checkedAt: '2026-09-28T00:00:00.000Z',
  });

  it('sharpens NETWORK_ERROR to NOT_INSTALLED when the supervisor says not-installed', () => {
    expect(resolveMiraNoticeCode('NETWORK_ERROR', statusOf('not-installed'))).toBe('NOT_INSTALLED');
  });

  it('sharpens NETWORK_ERROR to STARTING when the supervisor says starting', () => {
    expect(resolveMiraNoticeCode('NETWORK_ERROR', statusOf('starting'))).toBe('STARTING');
  });

  it('leaves TIMEOUT unchanged even when the supervisor says starting', () => {
    expect(resolveMiraNoticeCode('TIMEOUT', statusOf('starting'))).toBe('TIMEOUT');
  });

  it('leaves NETWORK_ERROR unchanged when there is no supervisor status', () => {
    expect(resolveMiraNoticeCode('NETWORK_ERROR', null)).toBe('NETWORK_ERROR');
  });
});
