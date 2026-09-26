// Designed and constructed by Drferdi.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSendMessage, mockTypedSendMessage, mockTypedOnMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockTypedSendMessage: vi.fn(),
  mockTypedOnMessage: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      sendMessage: mockSendMessage,
    },
  },
}));

vi.mock('@webext-core/messaging', () => ({
  defineExtensionMessaging: () => ({
    sendMessage: mockTypedSendMessage,
    onMessage: mockTypedOnMessage,
  }),
}));

import {
  classifyTabMessageError,
  parseAnamnesaData,
  parseDiagnosaData,
  parseResepData,
  sendMessageToTabWithTimeout,
} from '~/utils/messaging';

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

describe('messaging runtime hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses anamnesa payload with optional fields omitted', () => {
    const result = parseAnamnesaData({ keluhan_utama: 'Demam sejak 2 hari' });

    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      keluhan_utama: 'Demam sejak 2 hari',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 0 },
      riwayat_penyakit: null,
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });
  });

  it('parses explicit is_pregnant flag from anamnesa payload', () => {
    const result = parseAnamnesaData({
      keluhan_utama: 'Mual muntah',
      is_pregnant: true,
    });

    expect(result.ok).toBe(true);
    expect(result.value?.is_pregnant).toBe(true);
  });

  it('rejects anamnesa payload without critical identifier', () => {
    const result = parseAnamnesaData({ keluhan_tambahan: 'Batuk' });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain('keluhan_utama is required');
  });

  it('rejects diagnosa payload without icd_x', () => {
    const result = parseDiagnosaData({ nama: 'ISPA' });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain('icd_x is required');
  });

  it('keeps valid resep rows and drops invalid rows', () => {
    const result = parseResepData([
      {
        nama_obat: 'Paracetamol',
        jumlah: 10,
        aturan_pakai: '3',
      },
      {
        jumlah: 5,
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.reasons).toContain('item[1].nama_obat is required');
  });

  it('throws timeout error when tab does not respond in time', async () => {
    mockSendMessage.mockImplementation(() => new Promise(() => {}));

    let caughtError: unknown;
    try {
      await sendMessageToTabWithTimeout(11, { type: 'execFill' }, 25);
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect(getErrorText(caughtError).toLowerCase()).toContain('timeout');
  });

  it('injects timestamp for native tab messages to satisfy messaging validator', async () => {
    mockSendMessage.mockResolvedValueOnce({ success: true });

    const result = await sendMessageToTabWithTimeout<{ success: boolean }>(
      11,
      { type: 'execFill', data: { type: 'anamnesa' } },
      100
    );

    expect(result.success).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const outboundMessage = mockSendMessage.mock.calls[0]?.[1] as
      | { timestamp?: unknown; type?: unknown }
      | undefined;
    expect(outboundMessage?.type).toBe('execFill');
    expect(typeof outboundMessage?.timestamp).toBe('number');
  });

  it('classifies no-receiver errors with user actionable message', async () => {
    mockSendMessage.mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.')
    );

    let caughtError: unknown;
    try {
      await sendMessageToTabWithTimeout(11, { type: 'scanFields' }, 100);
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect(getErrorText(caughtError)).toContain('No content-script receiver');
  });

  it('treats BFCache closed-channel errors as no-receiver for self-healing retry', async () => {
    mockSendMessage.mockRejectedValueOnce(
      new Error(
        'The page keeping the extension port is moved into back/forward cache, so the message channel is closed.'
      )
    );

    let caughtError: unknown;
    try {
      await sendMessageToTabWithTimeout(11, { type: 'scanFields' }, 100);
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect(getErrorText(caughtError)).toContain('No content-script receiver');
  });

  it('classifies wrapped no-receiver errors from sendMessageToTabWithTimeout retries', () => {
    const kind = classifyTabMessageError(
      new Error('No content-script receiver for "scanVisitHistory" on tab 972825325')
    );

    expect(kind).toBe('NO_RECEIVER');
  });
});
