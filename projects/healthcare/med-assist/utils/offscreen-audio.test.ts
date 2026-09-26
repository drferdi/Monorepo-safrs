import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('offscreen audio helper', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates the offscreen document before sending playback message', async () => {
    const getContexts = vi.fn().mockResolvedValue([]);
    const createDocument = vi.fn().mockResolvedValue(undefined);
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('chrome', {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
        getContexts,
        sendMessage,
      },
      offscreen: {
        createDocument,
      },
    });

    const { playOffscreenSound, offscreenAudioConstants } = await import('./offscreen-audio');

    await expect(
      playOffscreenSound('opening.mp3', { maxDurationMs: 2200, fadeOutMs: 520, volume: 0.62 })
    ).resolves.toBe(true);

    expect(getContexts).toHaveBeenCalledWith({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [`chrome-extension://test/${offscreenAudioConstants.documentPath}`],
    });
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      target: offscreenAudioConstants.target,
      type: 'PLAY_SOUND',
      filename: 'opening.mp3',
      options: { maxDurationMs: 2200, fadeOutMs: 520, volume: 0.62 },
    });
  });

  it('reuses existing offscreen document when context already exists', async () => {
    const getContexts = vi.fn().mockResolvedValue([{ contextType: 'OFFSCREEN_DOCUMENT' }]);
    const createDocument = vi.fn().mockResolvedValue(undefined);
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('chrome', {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
        getContexts,
        sendMessage,
      },
      offscreen: {
        createDocument,
      },
    });

    const { playOffscreenSound } = await import('./offscreen-audio');

    await expect(playOffscreenSound('button1.mp3')).resolves.toBe(true);

    expect(createDocument).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
