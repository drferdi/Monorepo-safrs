import { describe, expect, it } from "vitest";

import { nextJourneyAudioCue } from "../src/components/journey/journey-audio-cues";

describe("nextJourneyAudioCue", () => {
  it("memainkan pembuka sinematik sekali saat Prolog terlihat", () => {
    const played = new Set<string>();

    const opening = nextJourneyAudioCue("prologue-2026", played);

    expect(opening).toEqual({
      id: "cinematic-opening",
      src: "/journey-approved/halokediri.mp3",
    });
    if (opening) played.add(opening.id);
    expect(nextJourneyAudioCue("prologue-2026", played)).toBeUndefined();
  });

  it("tidak menyediakan trek untuk scene revolusi", () => {
    const played = new Set<string>();

    expect(
      nextJourneyAudioCue("1947-1948-sugar-weapons", played),
    ).toBeUndefined();
  });
});
