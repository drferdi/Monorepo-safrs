// Designed and constructed by Drferdi.
/**
 * Audio Notification Utility
 *
 * Provides functions to play notification sounds in the extension.
 * Uses Chrome's runtime.getURL() for extension-safe path resolution.
 *
 * @module utils/audio
 */

/**
 * Plays the UPLINK completion notification sound
 *
 * @remarks
 * This function creates a new Audio instance and plays the notif1.wav
 * notification sound when UPLINK sync completes successfully. Errors are
 * caught and logged but don't throw to avoid breaking the UI flow.
 *
 * The sound file must be accessible via chrome.runtime.getURL(), which
 * means it should be in the assets directory and properly configured
 * in the extension manifest.
 *
 * @example
 * ```typescript
 * import { playNotificationSound } from '@/utils/audio';
 *
 * // Play sound after successful UPLINK sync
 * await syncToEpus();
 * playNotificationSound();
 * ```
 */
type ChromeRuntimeApi = {
  getURL: (path: string) => string;
};

function getChromeRuntime(): ChromeRuntimeApi | undefined {
  return (globalThis as { chrome?: { runtime?: ChromeRuntimeApi } }).chrome?.runtime;
}

export function playNotificationSound(): void {
  try {
    // Get the correct path for the sound file in the extension
    const chromeRuntime = getChromeRuntime();
    if (!chromeRuntime) {
      throw new Error('chrome.runtime tidak tersedia');
    }
    const soundPath = chromeRuntime.getURL('assets/sounds/notif1.wav');

    // Create and play the audio
    const audio = new Audio(soundPath);

    // Set volume to a reasonable level (0.8 = 80%)
    audio.volume = 0.8;

    // Play the sound
    audio.play().catch((error) => {
      console.warn('[Audio] Failed to play notification sound:', error);
    });
  } catch (error) {
    console.error('[Audio] Error initializing notification sound:', error);
  }
}

/**
 * Plays a notification sound with custom volume
 *
 * @param volume - Volume level (0.0 to 1.0)
 *
 * @example
 * ```typescript
 * // Play at 50% volume
 * playNotificationSoundWithVolume(0.5);
 * ```
 */
export function playNotificationSoundWithVolume(volume: number): void {
  try {
    const chromeRuntime = getChromeRuntime();
    if (!chromeRuntime) {
      throw new Error('chrome.runtime tidak tersedia');
    }
    const soundPath = chromeRuntime.getURL('assets/sounds/notif1.wav');
    const audio = new Audio(soundPath);

    // Clamp volume between 0 and 1
    audio.volume = Math.max(0, Math.min(1, volume));

    audio.play().catch((error) => {
      console.warn('[Audio] Failed to play notification sound:', error);
    });
  } catch (error) {
    console.error('[Audio] Error initializing notification sound:', error);
  }
}
