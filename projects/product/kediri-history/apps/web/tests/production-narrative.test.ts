import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  composeProductionJourney,
  PRODUCTION_JOURNEY,
  PRODUCTION_PROLOGUE,
} from "../src/content/production-narrative";
import { isKnownChoreographyKey } from "../src/modules/motion/registry";

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
      expect(scene.epistemicStatus).toContain(
        "Naskah ini masih dalam proses penelaahan editorial dan belum diterbitkan secara resmi.",
      );
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

  it("keeps GSAP choreography active from Ganter through the final scene", () => {
    const keys = scenes
      .map((scene) => scene.choreographyKey)
      .filter((key): key is string => key !== undefined);
    expect(keys.every(isKnownChoreographyKey)).toBe(true);
    expect(
      scenes
        .filter((scene) => scene.order >= 9)
        .every((scene) => scene.choreographyKey !== undefined),
    ).toBe(true);
  });

  it("uses the approved 19 September 921 Kadhiri narrative", () => {
    const kadhiri = scenes.find((scene) => scene.slug === "921-kadhiri");

    expect(kadhiri?.dateDisplay).toBe("19 SEPTEMBER 921");
    expect(kadhiri?.narrativeParagraphs).toEqual([
      "Nama itu muncul:",
      "Kadhiri.",
      "Dalam Prasasti Harinjing B, bertarikh 19 September 921, nama Kadhiri tercatat secara tertulis pada masa Raja Rakai Layang Dyah Tulodong.",
      "Inilah salah satu momen penting dalam sejarah Kediri.",
      "Sebuah wilayah yang sebelumnya kita kenali melalui jejak masa lalu kini memiliki nama yang dapat kita baca lebih dari seribu tahun kemudian.",
      "Dalam bahasa Jawa Kuno, kāḍiri dikaitkan dengan makna berdiri sendiri, mandiri, atau berdiri tegak.",
      "Nama itu akan bertahan melewati kerajaan, perang, kolonialisme, revolusi, dan modernisasi.",
      "Dan nama Kadhiri tidak berhenti pada satu prasasti.",
    ]);
    expect(kadhiri?.narrativeBeats).toEqual([
      ["Nama itu muncul:", "Kadhiri."],
      [
        "Dalam Prasasti Harinjing B, bertarikh 19 September 921, nama Kadhiri tercatat secara tertulis pada masa Raja Rakai Layang Dyah Tulodong.",
      ],
      ["Inilah salah satu momen penting dalam sejarah Kediri."],
      [
        "Sebuah wilayah yang sebelumnya kita kenali melalui jejak masa lalu kini memiliki nama yang dapat kita baca lebih dari seribu tahun kemudian.",
      ],
      [
        "Dalam bahasa Jawa Kuno, kāḍiri dikaitkan dengan makna berdiri sendiri, mandiri, atau berdiri tegak.",
      ],
      [
        "Nama itu akan bertahan melewati kerajaan, perang, kolonialisme, revolusi, dan modernisasi.",
      ],
      ["Dan nama Kadhiri tidak berhenti pada satu prasasti."],
    ]);
    expect(kadhiri?.narrativeParagraphs?.join(" ")).not.toContain(
      "Sebuah tempat dapat hidup jauh sebelum dunia menuliskan namanya",
    );
    expect(kadhiri?.narrativeParagraphs?.join(" ")).not.toContain(
      "Gunung telah berdiri. Brantas telah mengalir.",
    );
  });

  it("uses the clear 7 June 1015 Carama narrative", () => {
    const carama = scenes.find((scene) => scene.slug === "1015-name-endures");

    expect(carama?.title).toBe("Nama yang Kembali Muncul");
    expect(carama?.dateDisplay).toBe("7 Juni 1015");
    expect(carama?.masterLine).toBe("Nama yang Kembali Muncul");
    expect(carama?.narrativeParagraphs).toEqual([
      "Nama Kadhiri yang tercatat pada 921 muncul lagi hampir satu abad kemudian.",
      "Prasasti Carama, bertarikh 7 Juni 1015, mencatat penganugerahan yang berkaitan dengan Sri Mahadewi yang bertakhta di Kadhiri.",
      "Lempeng tembaganya kini tercatat berada di Frankfurt, Jerman.",
      "Penyebutan berulang ini menunjukkan bahwa Kadhiri sudah dikenal dalam lingkungan politik Jawa sebelum masa Panjalu.",
      "Setelah itu, perubahan politik yang lebih besar terjadi pada 1042.",
    ]);
    expect(carama?.narrativeBeats).toEqual([
      [
        "Nama Kadhiri yang tercatat pada 921 muncul lagi hampir satu abad kemudian.",
      ],
      [
        "Prasasti Carama, bertarikh 7 Juni 1015, mencatat penganugerahan yang berkaitan dengan Sri Mahadewi yang bertakhta di Kadhiri.",
      ],
      ["Lempeng tembaganya kini tercatat berada di Frankfurt, Jerman."],
      [
        "Penyebutan berulang ini menunjukkan bahwa Kadhiri sudah dikenal dalam lingkungan politik Jawa sebelum masa Panjalu.",
      ],
      ["Setelah itu, perubahan politik yang lebih besar terjadi pada 1042."],
    ]);
    expect(carama?.narrativeParagraphs?.join(" ")).not.toContain(
      "Nama dapat muncul sekali karena kebetulan",
    );
    expect(carama?.epistemicStatus).toContain("Research Hold");
  });

  it("keeps Scene 10 as the canonical Jayakatwang return without the retired conflations", () => {
    const scene = scenes.find(
      (candidate) => candidate.slug === "1292-the-return",
    );
    const domText = [
      scene?.title,
      scene?.masterLine,
      ...(scene?.narrativeParagraphs ?? []),
    ].join(" ");

    expect(domText).toContain("JAYAKATWANG");
    expect(domText).toContain("RAJA KEDIRIAN TERAKHIR");
    expect(domText).toContain("dikalahkan oleh pasukan Raden Wijaya");
    expect(domText).not.toContain("JAYAKASTWANG");
    expect(domText).not.toContain("KEDAHIRAN");
    expect(domText).not.toContain("dikalahkan oleh pasukan Jayabaya");
  });

  it("keeps one contemporary prologue world and transforms it toward 879", async () => {
    const directorPath = fileURLToPath(
      new URL("../src/modules/motion/director.ts", import.meta.url),
    );
    const pagePath = fileURLToPath(
      new URL("../src/app/(public)/journey/page.tsx", import.meta.url),
    );
    const cssPath = fileURLToPath(
      new URL("../src/app/(public)/globals.css", import.meta.url),
    );
    const prologuePath = fileURLToPath(
      new URL("../src/components/journey/prologue-scene.tsx", import.meta.url),
    );
    const videoPath = fileURLToPath(
      new URL(
        "../src/components/journey/prologue-video-sequence.tsx",
        import.meta.url,
      ),
    );
    const [director, page, css, prologue, video] = await Promise.all([
      readFile(directorPath, "utf8"),
      readFile(pagePath, "utf8"),
      readFile(cssPath, "utf8"),
      readFile(prologuePath, "utf8"),
      readFile(videoPath, "utf8"),
    ]);

    expect(page).not.toContain("INTRO_BOOT_SCRIPT");
    expect(prologue).toContain("prologue-water-field");
    expect(prologue).toContain("prologue-copper-field");
    expect(prologue).toContain('kind="water-copper"');
    expect(prologue).not.toContain("PrologueVisualLabel");
    expect(css).toContain(".prologue-material-world");
    expect(director).not.toContain("kediri:prologue-video-start");
    expect(video).toContain("prefers-reduced-motion: reduce");
    expect(video).toContain("video.play()");
    expect(video).not.toContain("continuationVideoPath");
  });

  it("presents the 1042 division while distinguishing historical record from tradition", () => {
    const division = scenes.find(
      (scene) => scene.slug === "1042-river-divides-kingdom",
    );

    const paragraphs = [
      "Perubahan itu terjadi pada 1042, ketika kekuasaan Airlangga dibagi menjadi Panjalu dan Janggala.",
      "Pembagian ini mengubah peta politik Jawa Timur.",
      "Tradisi kemudian mengisahkan Mpu Bharada membelah tanah dengan air suci untuk menandai kedua wilayah.",
      "Kisah itu adalah tradisi, bukan catatan peristiwa yang dapat dipastikan secara langsung.",
      "Brantas berada di antara kedua wilayah tersebut.",
      "Dari pembagian ini, Panjalu berkembang dengan Daha sebagai pusat kekuasaannya.",
    ];

    expect(division?.title).toBe("Panjalu dan Janggala");
    expect(division?.dateDisplay).toBe("1042");
    expect(division?.masterLine).toBe("Panjalu dan Janggala");
    expect(division?.narrativeParagraphs).toEqual(paragraphs);
    expect(division?.narrativeBeats).toEqual(
      paragraphs.map((paragraph) => [paragraph]),
    );
    expect(division?.narrativeParagraphs?.join(" ")).not.toContain(
      "Sejarah mengingat sebuah pembagian. Tradisi mengingat air suci.",
    );
  });

  it("menjaga Prolog sebagai satu shot dengan dua beat editorial", () => {
    expect(PRODUCTION_PROLOGUE.title).toBe("KEDIRI, 2026");
    expect(PRODUCTION_PROLOGUE.masterLine).toBe("Berapa Usia Sebuah Kota?");
    expect(PRODUCTION_PROLOGUE.paragraphs).toEqual([
      "Kota memiliki lebih dari satu awal. Bentang alam, permukiman, pemerintahan, dan ingatan warganya tidak lahir pada saat yang sama.",
      "27 Juli 879 diperingati Kota Kediri sebagai awal kronologi sipilnya—bukan sebagai tanggal berdirinya pemerintahan kota modern.",
    ]);
    expect(PRODUCTION_PROLOGUE.portal).toEqual({
      date: "879",
      label: "Catatan pertama menunggu di balik aliran.",
    });
    expect(PRODUCTION_PROLOGUE.beatGroups).toEqual([[0], [1]]);
    expect(PRODUCTION_PROLOGUE.beatGroups?.flat()).toEqual(
      Array.from(
        { length: PRODUCTION_PROLOGUE.paragraphs.length },
        (_, index) => index,
      ),
    );
    /*
     * Bingkai dasar Prolog tetap CITRA Kediri 2026 — footage hidup di babak
     * pembuka (`overture`), bukan sebagai pengganti citra, sehingga cat
     * pertama dan fallback tanpa JavaScript tidak pernah berubah era.
     */
    expect(PRODUCTION_PROLOGUE.media?.videoPath).toBeUndefined();
    expect(PRODUCTION_PROLOGUE.media?.continuationVideoPath).toBeUndefined();
    expect(PRODUCTION_PROLOGUE.media?.path).toBe(
      "/journey-approved/00-prologue.webp",
    );
    expect(PRODUCTION_PROLOGUE.media?.label).toBe(
      "VISUALISASI ARTISTIK · KEDIRI, 2026",
    );
  });

  it("membuka Prolog dengan dua babak footage dan naskah era Daha", () => {
    /*
     * Urutan yang dikunci (direktif Chief 2026-09-04): citra 2026 → gelap →
     * footage kota kuno → gelap → naskah era Daha → footage kehidupan
     * sehari-hari → gelap → pelat "KEDIRI, 2026" dan portal 879.
     */
    const overture = PRODUCTION_PROLOGUE.overture;
    expect(overture).toBeDefined();
    expect(overture?.city.videoPath).toBe("/journey-approved/00-prologue.mp4");
    expect(overture?.life.videoPath).toBe(
      "/journey-approved/00-prologue-daha.mp4",
    );
    // Keduanya wajib menyatakan dirinya rekaan: tidak ada footage rekonstruksi
    // yang boleh lewat sebagai rekaman peristiwa.
    expect(overture?.city.altText).toMatch(/rekaan/u);
    expect(overture?.life.altText).toMatch(/rekaan/u);
    expect(overture?.copy).toHaveLength(3);
    // Abad yang disebut adalah era Daha, bukan abad ke-17.
    expect(overture?.copy[0]).toContain("abad ke-11 dan ke-12");
    expect(overture?.copy[0]).toContain("Daha");
    expect(overture?.copy.join(" ")).not.toMatch(/abad ke-17/u);
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

    expect(composed.acts[0]?.scenes[0]?.epistemicStatus).toBe(
      "Naskah ini masih dalam proses penelaahan editorial dan belum diterbitkan secara resmi.",
    );
  });

  it("ensures scene sequence links cross act boundaries without trapping navigation", () => {
    const orderedScenes = PRODUCTION_JOURNEY.acts.flatMap((act) => act.scenes);
    for (let i = 0; i < orderedScenes.length - 1; i++) {
      const current = orderedScenes[i];
      const next = orderedScenes[i + 1];
      expect(current).toBeDefined();
      expect(next).toBeDefined();
      expect(next?.slug.length).toBeGreaterThan(0);
    }
    // Specifically test the boundary between Act 1 (Scene 4) and Act 2 (Scene 5)
    const act1LastScene = PRODUCTION_JOURNEY.acts[0]?.scenes.at(-1);
    const act2FirstScene = PRODUCTION_JOURNEY.acts[1]?.scenes[0];
    expect(act1LastScene?.slug).toBe("1042-river-divides-kingdom");
    expect(act2FirstScene?.slug).toBe("daha-centre-of-power");
  });
});
