import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (assetPath: string) => `chrome-extension://test/${assetPath}`,
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
}

// 50 silent samples, then sound, at 1000 Hz: the audible part starts at 0.05 s.
const SAMPLE_RATE = 1000;
const channelData = new Float32Array(200).fill(0.5);
channelData.fill(0, 0, 50);

class FakeGainParam {
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = {};
  sources: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
  gains: Array<{ gain: FakeGainParam }> = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  decodeAudioData = vi.fn(async () => ({
    sampleRate: SAMPLE_RATE,
    duration: channelData.length / SAMPLE_RATE,
    getChannelData: () => channelData,
  }));

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    const node = { gain: new FakeGainParam(), connect: vi.fn(), disconnect: vi.fn() };
    this.gains.push(node);
    return node;
  }

  createBufferSource() {
    const node = {
      buffer: null as unknown,
      onended: null as (() => void) | null,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.sources.push(node);
    return node;
  }
}

async function flushDecode(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('sound util with Web Audio', () => {
  beforeEach(() => {
    vi.resetModules();
    MockAudio.instances = [];
    FakeAudioContext.instances = [];
    vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
    vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays a primed sound from its decoded buffer at once, skipping the leading silence', async () => {
    const { playSound, primeSound } = await import('./sound');
    primeSound('button5.mp3');
    await flushDecode();
    const audioElementsBeforePlay = MockAudio.instances.length;

    playSound('button5.mp3');

    const context = FakeAudioContext.instances[0];
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].start).toHaveBeenCalledWith(0, 0.05);
    expect(MockAudio.instances).toHaveLength(audioElementsBeforePlay);
  });

  it('falls back to an audio element on the first play and uses the decoded buffer next time', async () => {
    const { playSound } = await import('./sound');

    playSound('button5.mp3');
    expect(MockAudio.instances.at(-1)?.play).toHaveBeenCalledTimes(1);
    await flushDecode();
    const audioElementsAfterFirstPlay = MockAudio.instances.length;

    playSound('button5.mp3');

    expect(FakeAudioContext.instances[0].sources).toHaveLength(1);
    expect(MockAudio.instances).toHaveLength(audioElementsAfterFirstPlay);
  });

  it('fades a capped sound out with a gain ramp and stops it at maxDurationMs', async () => {
    const { playSound, primeSound } = await import('./sound');
    primeSound('opening.mp3');
    await flushDecode();

    playSound('opening.mp3', { maxDurationMs: 2200, fadeOutMs: 500, volume: 0.62 });

    const context = FakeAudioContext.instances[0];
    const gain = context.gains[0].gain;
    expect(gain.setValueAtTime).toHaveBeenCalledWith(0.62, 0);
    expect(gain.setValueAtTime).toHaveBeenCalledWith(0.62, 1.7);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 2.2);
    expect(context.sources[0].stop).toHaveBeenCalledWith(2.2);
  });

  it('resumes a suspended audio context before playing', async () => {
    const { playSound, primeSound } = await import('./sound');
    primeSound('button5.mp3');
    await flushDecode();
    const context = FakeAudioContext.instances[0];
    context.state = 'suspended';

    playSound('button5.mp3');

    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.sources[0].start).toHaveBeenCalledTimes(1);
  });
});
