/* global Audio, console, window */

(function () {
  const target = 'offscreen-audio';
  const audioTemplateCache = new Map();
  const activePlaybackSet = new Set();
  const DEFAULT_FADE_OUT_MS = 520;
  const FADE_OUT_STEP_MS = 40;

  function normalizeFilename(filename) {
    if (typeof filename !== 'string') return null;
    const trimmed = filename.trim().replace(/^\/+/, '');
    return trimmed || null;
  }

  function resolveSoundUrl(filename) {
    const normalizedFilename = normalizeFilename(filename);
    if (!normalizedFilename) return null;
    return chrome.runtime.getURL(`assets/sounds/${normalizedFilename}`);
  }

  function clampVolume(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(1, Math.max(0, value));
  }

  function normalizeDurationMs(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.max(0, value);
  }

  function getAudioTemplate(filename) {
    const normalizedFilename = normalizeFilename(filename);
    if (!normalizedFilename) return null;

    const cachedAudio = audioTemplateCache.get(normalizedFilename);
    if (cachedAudio) return cachedAudio;

    try {
      const url = resolveSoundUrl(normalizedFilename);
      if (!url) return null;
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.72;
      audioTemplateCache.set(normalizedFilename, audio);
      return audio;
    } catch (error) {
      console.warn('[OffscreenAudio] Failed to create audio template:', error);
      return null;
    }
  }

  function playSound(filename, options) {
    const audioTemplate = getAudioTemplate(filename);
    if (!audioTemplate) return;

    try {
      const playback = audioTemplate.cloneNode(true);
      const playbackOptions = options && typeof options === 'object' ? options : {};
      const initialVolume = clampVolume(
        typeof playbackOptions.volume === 'number' ? playbackOptions.volume : audioTemplate.volume
      );
      playback.volume = initialVolume;
      playback.currentTime = 0;
      let stopTimeoutId = null;
      let fadeTimeoutId = null;
      let fadeIntervalId = null;

      const cleanup = function () {
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

      const startFadeOut = function (durationMs) {
        if (durationMs <= 0 || initialVolume <= 0) return;

        const fadeStartVolume = playback.volume;
        const totalSteps = Math.max(1, Math.ceil(durationMs / FADE_OUT_STEP_MS));
        let currentStep = 0;

        fadeIntervalId = window.setInterval(function () {
          currentStep += 1;
          const remainingRatio = Math.max(0, 1 - currentStep / totalSteps);
          playback.volume = clampVolume(fadeStartVolume * remainingRatio);

          if (currentStep >= totalSteps && fadeIntervalId !== null) {
            window.clearInterval(fadeIntervalId);
            fadeIntervalId = null;
          }
        }, FADE_OUT_STEP_MS);
      };

      const stopPlayback = function () {
        try {
          playback.pause();
          playback.currentTime = 0;
        } catch {
          // best-effort stop
        }
        cleanup();
      };

      playback.onended = cleanup;
      playback.onerror = cleanup;
      activePlaybackSet.add(playback);

      const maxDurationMs = normalizeDurationMs(playbackOptions.maxDurationMs);
      if (maxDurationMs > 0) {
        const requestedFadeOutMs =
          typeof playbackOptions.fadeOutMs === 'number'
            ? playbackOptions.fadeOutMs
            : DEFAULT_FADE_OUT_MS;
        const fadeOutMs = Math.min(maxDurationMs, normalizeDurationMs(requestedFadeOutMs));
        if (fadeOutMs > 0) {
          fadeTimeoutId = window.setTimeout(
            function () {
              fadeTimeoutId = null;
              startFadeOut(fadeOutMs);
            },
            Math.max(0, maxDurationMs - fadeOutMs)
          );
        }
        stopTimeoutId = window.setTimeout(stopPlayback, maxDurationMs);
      }

      playback.play().catch(function (error) {
        cleanup();
        console.warn('[OffscreenAudio] Playback failed:', error);
      });
    } catch (error) {
      console.warn('[OffscreenAudio] playSound failed:', error);
    }
  }

  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (!message || message.target !== target) {
      return;
    }

    if (message.type === 'PLAY_SOUND') {
      playSound(message.filename, message.options);
      sendResponse({ ok: true });
    }
  });
})();
