"use client";

import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  JOURNEY_AUDIO_SCENE_IDS,
  type JourneyAudioCue,
  nextJourneyAudioCue,
} from "./journey-audio-cues";

/**
 * Satu pemutar untuk seluruh Journey. Audio tidak pernah berjalan sebelum
 * pengunjung memilih Sound. Trek pembuka hanya terdengar sekali dalam satu
 * kunjungan agar perpindahan gulir tidak mengulang musik.
 */
export function JourneyAudio(): ReactElement {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const played = useRef(new Set<string>());

  const playCue = useCallback((cue: JourneyAudioCue | undefined) => {
    const audio = audioRef.current;
    if (!cue || !audio) return;

    played.current.add(cue.id);
    audio.pause();
    audio.src = cue.src;
    audio.currentTime = 0;
    audio.volume = 0.38;
    void audio.play().catch(() => {
      played.current.delete(cue.id);
      setEnabled(false);
    });
  }, []);

  const playVisibleCue = useCallback(() => {
    for (const sceneId of JOURNEY_AUDIO_SCENE_IDS) {
      const scene = document.getElementById(sceneId);
      if (!scene) continue;
      const rect = scene.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        playCue(nextJourneyAudioCue(sceneId, played.current));
        return;
      }
    }
  }, [playCue]);

  useEffect(() => {
    if (!enabled) {
      audioRef.current?.pause();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          playCue(nextJourneyAudioCue(entry.target.id, played.current));
        }
      },
      { threshold: 0.4 },
    );

    for (const sceneId of JOURNEY_AUDIO_SCENE_IDS) {
      const scene = document.getElementById(sceneId);
      if (scene) observer.observe(scene);
    }

    return () => observer.disconnect();
  }, [enabled, playCue]);

  return (
    <>
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => {
          if (enabled) {
            setEnabled(false);
            return;
          }
          setEnabled(true);
          playVisibleCue();
        }}
      >
        Sound: {enabled ? "On" : "Off"}
      </button>
      {/* biome-ignore lint/a11y/useMediaCaption: soundtrack latar tidak memuat narasi atau klaim sejarah. */}
      <audio ref={audioRef} preload="none" />
    </>
  );
}
