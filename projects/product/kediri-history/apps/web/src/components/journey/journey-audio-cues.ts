export interface JourneyAudioCue {
  readonly id: "cinematic-opening";
  readonly src: string;
}

const AUDIO_CUE_BY_SCENE: Readonly<Record<string, JourneyAudioCue>> = {
  "prologue-2026": {
    id: "cinematic-opening",
    src: "/journey-approved/halokediri.mp3",
  },
};

export const JOURNEY_AUDIO_SCENE_IDS = Object.keys(AUDIO_CUE_BY_SCENE);

export function nextJourneyAudioCue(
  sceneId: string,
  played: ReadonlySet<string>,
): JourneyAudioCue | undefined {
  const cue = AUDIO_CUE_BY_SCENE[sceneId];
  return cue && !played.has(cue.id) ? cue : undefined;
}
