import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getURLMock = vi.fn((assetPath: string) => `chrome-extension://test/${assetPath}`);

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: getURLMock,
    },
  },
}));

class MockAudio {
  static instances: MockAudio[] = [];

  src: string;
  preload = '';
  volume = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();

  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }

  cloneNode(): MockAudio {
    const clone = new MockAudio(this.src);
    clone.volume = this.volume;
    return clone;
  }
}

vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

describe('sound util', () => {
  beforeEach(() => {
    vi.resetModules();
    getURLMock.mockClear();
    MockAudio.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('primeSound preloads and caches audio template', async () => {
    const { primeSound } = await import('./sound');

    primeSound('button1.mp3');

    expect(getURLMock).toHaveBeenCalledWith('assets/sounds/button1.mp3');
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].load).toHaveBeenCalledTimes(1);
  });

  it('playSound clones template audio and plays it', async () => {
    const { playSound } = await import('./sound');

    playSound('button3.mp3');

    expect(getURLMock).toHaveBeenCalledWith('assets/sounds/button3.mp3');
    expect(MockAudio.instances.length).toBeGreaterThanOrEqual(2);
    const playbackInstance = MockAudio.instances.at(-1);
    expect(playbackInstance?.play).toHaveBeenCalledTimes(1);
  });

  it('playSound fades out before capped playback stops', async () => {
    vi.useFakeTimers();
    const { playSound } = await import('./sound');

    playSound('opening.mp3', { maxDurationMs: 2200, fadeOutMs: 500, volume: 0.62 });

    const playbackInstance = MockAudio.instances.at(-1);
    expect(playbackInstance?.volume).toBe(0.62);
    expect(playbackInstance?.play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1740);

    expect(playbackInstance?.volume).toBeLessThan(0.62);
    expect(playbackInstance?.pause).not.toHaveBeenCalled();

    vi.advanceTimersByTime(460);

    expect(playbackInstance?.pause).toHaveBeenCalledTimes(1);
    expect(playbackInstance?.currentTime).toBe(0);
  });
});
