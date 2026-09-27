import { browser } from 'wxt/browser';

// Sentra Assist — sound utility
const audioTemplateCache = new Map<string, HTMLAudioElement>();
const activePlaybackSet = new Set<HTMLAudioElement>();
const DEFAULT_FADE_OUT_MS = 520;
const FADE_OUT_STEP_MS = 40;
// Samples quieter than this at the start of a file are skipped, so a click is heard at once.
const LEADING_SILENCE_THRESHOLD = 0.01;

// Web Audio plays a decoded buffer within a few milliseconds; a new <audio> element per play
// has to spin up a media pipeline first, which is what made button sounds feel late.
interface DecodedSound {
  buffer: AudioBuffer;
  startOffsetSec: number;
}

const decodedSoundCache = new Map<string, DecodedSound>();
const pendingDecodeSet = new Set<string>();
let sharedAudioContext: AudioContext | null = null;

export interface SoundPlaybackOptions {
  volume?: number;
  maxDurationMs?: number;
  fadeOutMs?: number;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function normalizeDurationMs(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function normalizeSoundFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/^\/+/, '');
  if (!normalized) return null;

  return normalized;
}

function resolveSoundUrl(filename: string): string | null {
  const normalizedFilename = normalizeSoundFilename(filename);
  if (!normalizedFilename) {
    return null;
  }

  return browser.runtime.getURL(
    `assets/sounds/${normalizedFilename}` as unknown as Parameters<typeof browser.runtime.getURL>[0]
  );
}

function getAudioTemplate(filename: string): HTMLAudioElement | null {
  const normalizedFilename = normalizeSoundFilename(filename);
  if (!normalizedFilename) {
    return null;
  }

  const cachedAudio = audioTemplateCache.get(normalizedFilename);
  if (cachedAudio) {
    return cachedAudio;
  }

  try {
    const url = resolveSoundUrl(normalizedFilename);
    if (!url) {
      return null;
    }

    const audio = new Audio(url);
    audio.preload = 'auto';
    audioTemplateCache.set(normalizedFilename, audio);
    return audio;
  } catch (error) {
    console.warn('[Audio] Failed to create audio template:', error);
    return null;
  }
}

function getAudioContext(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext;
  if (typeof AudioContext === 'undefined') return null;
  try {
    sharedAudioContext = new AudioContext({ latencyHint: 'interactive' });
  } catch (error) {
    console.warn('[Audio] AudioContext unavailable:', error);
    return null;
  }
  return sharedAudioContext;
}

function findLeadingSilenceSec(buffer: AudioBuffer): number {
  const samples = buffer.getChannelData(0);
  let index = 0;
  while (index < samples.length && Math.abs(samples[index]) < LEADING_SILENCE_THRESHOLD) {
    index += 1;
  }
  return index >= samples.length ? 0 : index / buffer.sampleRate;
}

function decodeSound(normalizedFilename: string): void {
  if (decodedSoundCache.has(normalizedFilename) || pendingDecodeSet.has(normalizedFilename)) {
    return;
  }
  const context = getAudioContext();
  const url = resolveSoundUrl(normalizedFilename);
  if (!context || !url) return;

  pendingDecodeSet.add(normalizedFilename);
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      decodedSoundCache.set(normalizedFilename, {
        buffer,
        startOffsetSec: findLeadingSilenceSec(buffer),
      });
    })
    .catch((error) => {
      console.warn('[Audio] Failed to decode sound:', error);
    })
    .finally(() => {
      pendingDecodeSet.delete(normalizedFilename);
    });
}

function playDecodedSound(
  context: AudioContext,
  sound: DecodedSound,
  options: SoundPlaybackOptions
): void {
  if (context.state === 'suspended') {
    void context.resume();
  }

  const volume = clampVolume(options.volume ?? 1);
  const startAt = context.currentTime;
  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(volume, startAt);
  const source = context.createBufferSource();
  source.buffer = sound.buffer;
  source.connect(gainNode);
  gainNode.connect(context.destination);
  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
  source.start(startAt, sound.startOffsetSec);

  const maxDurationMs = normalizeDurationMs(options.maxDurationMs);
  if (maxDurationMs > 0) {
    const stopAt = startAt + maxDurationMs / 1000;
    const fadeOutMs = Math.min(
      maxDurationMs,
      normalizeDurationMs(options.fadeOutMs ?? DEFAULT_FADE_OUT_MS)
    );
    if (fadeOutMs > 0) {
      gainNode.gain.setValueAtTime(volume, startAt + (maxDurationMs - fadeOutMs) / 1000);
      gainNode.gain.linearRampToValueAtTime(0, stopAt);
    }
    source.stop(stopAt);
  }
}

export function primeSound(filename: string): void {
  const normalizedPrimeFilename = normalizeSoundFilename(filename);
  if (normalizedPrimeFilename) {
    decodeSound(normalizedPrimeFilename);
  }

  const audioTemplate = getAudioTemplate(filename);
  if (!audioTemplate) {
    return;
  }

  try {
    audioTemplate.load();
  } catch (error) {
    console.warn('[Audio] primeSound failed:', error);
  }
}

export function playSound(filename: string, options: SoundPlaybackOptions = {}): void {
  const normalizedFilename = normalizeSoundFilename(filename);
  if (!normalizedFilename) {
    console.warn('[Audio] playSound skipped: filename kosong/tidak valid');
    return;
  }

  const context = getAudioContext();
  const decodedSound = decodedSoundCache.get(normalizedFilename);
  if (context && decodedSound) {
    try {
      playDecodedSound(context, decodedSound, options);
      return;
    } catch (error) {
      console.warn('[Audio] Web Audio playback failed, falling back:', error);
    }
  }
  // Not decoded yet: play through an audio element this once, and decode for the next play.
  decodeSound(normalizedFilename);

  const audioTemplate = getAudioTemplate(normalizedFilename);
  if (!audioTemplate) {
    return;
  }

  try {
    const playback = new Audio(audioTemplate.src);
    const initialVolume = clampVolume(options.volume ?? audioTemplate.volume);
    playback.volume = initialVolume;
    playback.currentTime = 0;
    let stopTimeoutId: number | null = null;
    let fadeTimeoutId: number | null = null;
    let fadeIntervalId: number | null = null;

    const cleanup = () => {
      if (stopTimeoutId !== null) {
        window.clearTimeout(stopTimeoutId);
        stopTimeoutId = null;
      }
      if (fadeTimeoutId !== null) {
        window.clearTimeout(fadeTimeoutId);
        fadeTimeoutId = null;
      }
      if (fadeIntervalId !== null) {
        window.clearInterval(fadeIntervalId);
        fadeIntervalId = null;
      }
      activePlaybackSet.delete(playback);
      playback.onended = null;
      playback.onerror = null;
    };

    const startFadeOut = (durationMs: number) => {
      if (durationMs <= 0 || initialVolume <= 0) return;

      const fadeStartVolume = playback.volume;
      const totalSteps = Math.max(1, Math.ceil(durationMs / FADE_OUT_STEP_MS));
      let currentStep = 0;

      fadeIntervalId = window.setInterval(() => {
        currentStep += 1;
        const remainingRatio = Math.max(0, 1 - currentStep / totalSteps);
        playback.volume = clampVolume(fadeStartVolume * remainingRatio);

        if (currentStep >= totalSteps && fadeIntervalId !== null) {
          window.clearInterval(fadeIntervalId);
          fadeIntervalId = null;
        }
      }, FADE_OUT_STEP_MS);
    };

    const stopPlayback = () => {
      try {
        playback.pause();
        playback.currentTime = 0;
      } catch {
        /* best-effort stop */
      }
      cleanup();
    };

    playback.onended = cleanup;
    playback.onerror = cleanup;
    activePlaybackSet.add(playback);

    const maxDurationMs = normalizeDurationMs(options.maxDurationMs);
    if (maxDurationMs > 0) {
      const requestedFadeOutMs = options.fadeOutMs ?? DEFAULT_FADE_OUT_MS;
      const fadeOutMs = Math.min(maxDurationMs, normalizeDurationMs(requestedFadeOutMs));
      if (fadeOutMs > 0) {
        fadeTimeoutId = window.setTimeout(
          () => {
            fadeTimeoutId = null;
            startFadeOut(fadeOutMs);
          },
          Math.max(0, maxDurationMs - fadeOutMs)
        );
      }
      stopTimeoutId = window.setTimeout(stopPlayback, maxDurationMs);
    }

    playback.play().catch((error) => {
      cleanup();
      console.warn('[Audio] Playback failed:', error);
    });
  } catch (error) {
    console.warn('[Audio] playSound failed:', error);
  }
}
