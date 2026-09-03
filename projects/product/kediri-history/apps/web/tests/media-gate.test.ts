import { describe, expect, it } from "vitest";

import { shouldPlay } from "../src/modules/motion/media-gate";
import { MOTION_VARIANTS } from "../src/modules/motion/registry";

/**
 * Gerbang pemutaran media diuji pada keputusannya, bukan pada DOM-nya.
 *
 * Aturan yang dijaga di sini: reduced motion tidak pernah memutar apa pun, tab
 * tersembunyi tidak memutar apa pun, dan selebihnya video hanya hidup selama
 * scene-nya berada di layar. Pengamat perpotongan hanyalah cara memasok fakta
 * "di layar" — aturannya tinggal di fungsi ini.
 */
const MOVING_VARIANTS = MOTION_VARIANTS.filter(
  (variant) => variant !== "reduced",
);

describe("media playback gate", () => {
  it("never plays under reduced motion", () => {
    for (const intersecting of [true, false]) {
      for (const hidden of [true, false]) {
        expect(shouldPlay("reduced", intersecting, hidden)).toBe(false);
      }
    }
  });

  it("never plays while the document is hidden", () => {
    for (const variant of MOTION_VARIANTS) {
      expect(shouldPlay(variant, true, true)).toBe(false);
    }
  });

  it("follows intersection for every moving variant", () => {
    for (const variant of MOVING_VARIANTS) {
      expect(shouldPlay(variant, true, false)).toBe(true);
      expect(shouldPlay(variant, false, false)).toBe(false);
    }
  });

  it("covers every declared variant, so a new one cannot slip through", () => {
    expect(MOVING_VARIANTS).toEqual(["desktop", "tablet", "mobile"]);
  });
});
