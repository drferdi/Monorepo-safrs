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

  // Scene 01-04: crop lolos verifikasi Redo Register (REDO-ASSET-001..004,
  // framing-baked-text.test.ts), sehingga dipromosikan ke aset statis publik
  // (`/journey-approved/`) alih-alih rute pratinjau bergerbang (direktif
  // runtime 2026-08-28). Sisanya tetap di belakang `/api/editorial-preview/`
  // sampai crop masing-masing diverifikasi.
  const STATIC_APPROVED_SLUGS = new Set([
    "879-first-mark",
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ]);

  it("gives every scene complete copy and a stable media slot", () => {
    for (const scene of scenes) {
      expect(scene.narrativeParagraphs?.length).toBeGreaterThan(0);
      expect(scene.masterLine?.length).toBeGreaterThan(0);
      expect(scene.mediaSlot?.key).toBe(scene.slug);
      expect(scene.mediaSlot?.expectedPath).toMatch(
        STATIC_APPROVED_SLUGS.has(scene.slug)
          ? /^\/journey-approved\//u
          : /^\/api\/editorial-preview\//u,
      );
      expect(scene.epistemicStatus).toContain("belum dipublikasikan");
    }
    // Seluruh 26 slot siap. Penangguhan 1292 (flag F1) ditutup perintah
    // Chief 2026-08-29 dengan aset revisi; catatan epistemik teks terbakar
    // yang tersisa tercatat pada scene-nya di production-narrative.
    const ready = scenes.filter((scene) => scene.mediaSlot?.ready);
    expect(ready).toHaveLength(26);
    expect(scenes.find((scene) => scene.order === 10)?.mediaSlot?.ready).toBe(
      true,
    );
    for (const scene of ready) {
      expect(scene.mediaSlot?.altText.length).toBeGreaterThan(24);
      const prefix = STATIC_APPROVED_SLUGS.has(scene.slug)
        ? "/journey-approved/"
        : "/api/editorial-preview/";
      expect(scene.mediaSlot?.expectedPath).toBe(
        `${prefix}${String(scene.order).padStart(2, "0")}-${scene.slug}.webp`,
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

  it("menjaga Prolog sebagai satu shot dengan dua beat editorial", () => {
    expect(PRODUCTION_PROLOGUE.title).toBe("KEDIRI, 2026");
    expect(PRODUCTION_PROLOGUE.masterLine).toBe("1.147 Tahun Sebelum Hari Ini");
    expect(PRODUCTION_PROLOGUE.paragraphs).toEqual([
      "Kediri hari ini adalah kota yang kita kenal: jalan yang ramai, pasar yang membuka pagi, kawasan industri, sekolah, rumah ibadah, dan dua tepian kota yang dipertemukan oleh jembatan di atas Brantas.",
      "Namun kota ini menyimpan perjalanan yang jauh lebih panjang daripada bangunan yang terlihat saat ini.",
    ]);
    expect(PRODUCTION_PROLOGUE.beatGroups).toEqual([[0], [1]]);
    expect(PRODUCTION_PROLOGUE.beatGroups?.flat()).toEqual(
      Array.from(
        { length: PRODUCTION_PROLOGUE.paragraphs.length },
        (_, index) => index,
      ),
    );
    expect(PRODUCTION_PROLOGUE.media?.videoPath).toBe(
      "/journey-approved/00-prologue.mp4",
    );
    expect(PRODUCTION_PROLOGUE.media?.continuationVideoPath).toBe(
      "/journey-approved/00-prologue-daha.mp4",
    );
    expect(PRODUCTION_PROLOGUE.media?.label).toBe(
      "REKONSTRUKSI ARTISTIK · DAHA, ABAD XII",
    );
    expect(PRODUCTION_PROLOGUE.media?.labelDetail).toBe(
      "Interpretasi visual berdasarkan konteks sejarah; bukan representasi arkeologis definitif.",
    );
    expect(PRODUCTION_PROLOGUE.media?.continuationAltText).toBe(
      "Rekonstruksi artistik Daha abad XII berdasarkan konteks sejarah; bukan representasi arkeologis definitif.",
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
