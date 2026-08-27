import { describe, expect, it } from "vitest";

import {
  composeProductionJourney,
  PRODUCTION_JOURNEY,
  PRODUCTION_PROLOGUE,
} from "../src/content/production-narrative";
import { CHOREOGRAPHY_KEYS } from "../src/modules/motion/registry";

describe("production journey contract", () => {
  const scenes = PRODUCTION_JOURNEY.acts.flatMap((act) => act.scenes);

  it("locks the approved nine-act and twenty-six-scene order", () => {
    expect(PRODUCTION_JOURNEY.acts).toHaveLength(9);
    expect(scenes).toHaveLength(26);
    expect(scenes.map((scene) => scene.order)).toEqual(
      Array.from({ length: 26 }, (_, index) => index + 1),
    );
    expect(scenes[0]?.slug).toBe("879-first-mark");
    expect(scenes.at(-1)?.slug).toBe("2024-2026-river-to-runway");
    expect(new Set(scenes.map((scene) => scene.slug)).size).toBe(26);
  });

  it("gives every scene complete copy and a stable media slot", () => {
    for (const scene of scenes) {
      expect(scene.narrativeParagraphs?.length).toBeGreaterThan(0);
      expect(scene.masterLine?.length).toBeGreaterThan(0);
      expect(scene.mediaSlot?.key).toBe(scene.slug);
      expect(scene.mediaSlot?.expectedPath).toMatch(
        /^\/api\/editorial-preview\//u,
      );
      expect(scene.epistemicStatus).toContain("belum dipublikasikan");
    }
    // 25 dari 26 slot siap. Scene 10 (1292) sengaja ditangguhkan: teks yang
    // terbakar di citranya memuat kekeliruan faktual (flag F1 di
    // docs/shots/image-manifest.md), dan slot kosong yang jujur menang.
    const ready = scenes.filter((scene) => scene.mediaSlot?.ready);
    expect(ready).toHaveLength(25);
    expect(scenes.find((scene) => scene.order === 10)?.mediaSlot?.ready).toBe(
      false,
    );
    for (const scene of ready) {
      expect(scene.mediaSlot?.altText.length).toBeGreaterThan(24);
      expect(scene.mediaSlot?.expectedPath).toBe(
        `/api/editorial-preview/${String(scene.order).padStart(2, "0")}-${scene.slug}.webp`,
      );
    }
    expect(scenes.find((scene) => scene.order === 16)?.dateDisplay).toBe(
      "18 Maret 1869",
    );
  });

  it("uses each scene choreography exactly once", () => {
    const sceneKeys = CHOREOGRAPHY_KEYS.filter(
      (key) => key !== "prologueReveal",
    );
    const keys = scenes
      .map((scene) => scene.choreographyKey)
      .filter((key): key is string => key !== undefined);
    expect(keys).toHaveLength(sceneKeys.length);
    expect(new Set(keys)).toEqual(new Set(sceneKeys));
  });

  it("keeps the prologue as one shot with explicit editorial beats", () => {
    expect(PRODUCTION_PROLOGUE.beatGroups).toEqual([
      [0],
      [1, 2, 3],
      [4, 5, 6],
      [7],
      [8, 9, 10],
      [11, 12],
    ]);
    expect(PRODUCTION_PROLOGUE.beatGroups?.flat()).toEqual(
      Array.from(
        { length: PRODUCTION_PROLOGUE.paragraphs.length },
        (_, index) => index,
      ),
    );
    expect(PRODUCTION_PROLOGUE.masterLine).toBe(
      "Sejak kapan sebuah kota mulai menjadi dirinya sendiri?",
    );
  });

  it("retains the unpublished marker after governed CMS claims are composed", () => {
    const firstAct = PRODUCTION_JOURNEY.acts[0];
    const firstScene = firstAct?.scenes[0];
    expect(firstAct).toBeDefined();
    expect(firstScene).toBeDefined();
    if (!firstAct || !firstScene) return;

    const composed = composeProductionJourney({
      acts: [
        {
          ...firstAct,
          scenes: [
            {
              ...firstScene,
              featuredClaims: [
                {
                  id: "claim-cms",
                  slug: "claim-cms",
                  statement: "Klaim terbit dari CMS.",
                  evidenceClass: "historical_fact",
                  evidenceLabel: "Fakta terdokumentasi",
                  confidence: "high",
                  links: [],
                  competingClaimSlugs: [],
                },
              ],
            },
          ],
        },
      ],
      sceneCount: 1,
    });

    expect(composed.acts[0]?.scenes[0]?.epistemicStatus).toContain(
      "belum dipublikasikan",
    );
  });
});
