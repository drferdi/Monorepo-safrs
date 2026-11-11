const OFFSCREEN_AUDIO_DOCUMENT_PATH = 'offscreen-audio.html';
const OFFSCREEN_AUDIO_TARGET = 'offscreen-audio';
const OFFSCREEN_AUDIO_JUSTIFICATION =
  'Play Sentra Assist interface sounds from Manifest V3 background events.';

export interface OffscreenSoundPlaybackOptions {
  volume?: number;
  maxDurationMs?: number;
  fadeOutMs?: number;
}

type OffscreenDocumentContext = {
  contextType?: string;
  documentUrl?: string;
};

type ChromeRuntimeWithContexts = {
  getURL: (path: string) => string;
  sendMessage: (message: unknown) => Promise<unknown>;
  getContexts?: (filter: {
    contextTypes?: string[];
    documentUrls?: string[];
  }) => Promise<OffscreenDocumentContext[]>;
};

type ChromeGlobalWithOffscreen = {
  offscreen?: {
    createDocument: (parameters: {
      url: string;
      reasons: Array<'AUDIO_PLAYBACK'>;
      justification: string;
    }) => Promise<void>;
  };
  runtime?: ChromeRuntimeWithContexts;
};

type ReadyChromeOffscreenGlobal = {
  offscreen: NonNullable<ChromeGlobalWithOffscreen['offscreen']>;
  runtime: ChromeRuntimeWithContexts;
};

let creatingOffscreenAudioDocument: Promise<void> | null = null;

function getChromeOffscreenGlobal(): ReadyChromeOffscreenGlobal | null {
  const chromeGlobal = (globalThis as typeof globalThis & { chrome?: ChromeGlobalWithOffscreen })
    .chrome;
  const runtime = chromeGlobal?.runtime;
  const offscreen = chromeGlobal?.offscreen;

  if (!offscreen?.createDocument || !runtime?.sendMessage) {
    return null;
  }

  return { runtime, offscreen };
}

function isDuplicateOffscreenDocumentError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /single offscreen document|already exists/i.test(message);
}

function normalizePlaybackOptions(
  options: OffscreenSoundPlaybackOptions = {}
): OffscreenSoundPlaybackOptions | undefined {
  const normalized: OffscreenSoundPlaybackOptions = {};

  if (typeof options.volume === 'number' && Number.isFinite(options.volume)) {
    normalized.volume = options.volume;
  }
  if (typeof options.maxDurationMs === 'number' && Number.isFinite(options.maxDurationMs)) {
    normalized.maxDurationMs = options.maxDurationMs;
  }
  if (typeof options.fadeOutMs === 'number' && Number.isFinite(options.fadeOutMs)) {
    normalized.fadeOutMs = options.fadeOutMs;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export async function ensureOffscreenAudioDocument(): Promise<boolean> {
  const chromeGlobal = getChromeOffscreenGlobal();
  if (!chromeGlobal) {
    return false;
  }

  const offscreenUrl = chromeGlobal.runtime.getURL(OFFSCREEN_AUDIO_DOCUMENT_PATH);
  const existingContexts = await chromeGlobal.runtime.getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts && existingContexts.length > 0) {
    return true;
  }

  if (!creatingOffscreenAudioDocument) {
    creatingOffscreenAudioDocument = chromeGlobal.offscreen
      .createDocument({
        url: OFFSCREEN_AUDIO_DOCUMENT_PATH,
        reasons: ['AUDIO_PLAYBACK'],
        justification: OFFSCREEN_AUDIO_JUSTIFICATION,
      })
      .catch((error: unknown) => {
        if (!isDuplicateOffscreenDocumentError(error)) {
          throw error;
        }
      })
      .finally(() => {
        creatingOffscreenAudioDocument = null;
      });
  }

  await creatingOffscreenAudioDocument;
  return true;
}

export async function playOffscreenSound(
  filename: string,
  options: OffscreenSoundPlaybackOptions = {}
): Promise<boolean> {
  const normalizedFilename = filename.trim();
  if (!normalizedFilename) {
    return false;
  }

  const chromeGlobal = getChromeOffscreenGlobal();
  if (!chromeGlobal) {
    return false;
  }

  const ready = await ensureOffscreenAudioDocument();
  if (!ready) {
    return false;
  }

  const normalizedOptions = normalizePlaybackOptions(options);
  await chromeGlobal.runtime.sendMessage({
    target: OFFSCREEN_AUDIO_TARGET,
    type: 'PLAY_SOUND',
    filename: normalizedFilename,
    ...(normalizedOptions ? { options: normalizedOptions } : {}),
  });

  return true;
}

export const offscreenAudioConstants = {
  documentPath: OFFSCREEN_AUDIO_DOCUMENT_PATH,
  target: OFFSCREEN_AUDIO_TARGET,
};
