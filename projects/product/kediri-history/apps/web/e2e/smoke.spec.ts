import { expect, test } from "@playwright/test";

/**
 * Anchor scene dimulai dengan angka (1135-panjalu-jayati), sesuai kontrak
 * tautan dalam di UX Bible bagian 5. Fragment URL menerimanya, tetapi selector
 * CSS TIDAK: "#1135-..." bukan selector yang sah. Karena itu setiap pencarian
 * elemen memakai selector atribut, dan kode aplikasi memakai getElementById.
 */
const SCENE_1135 = '[id="1135-panjalu-jayati"]';

/**
 * Bukti browser.
 *
 * Skenario di bawah mengikuti Master Implementation Plan bagian 21 dan menguji
 * kontrak yang paling mudah rusak diam-diam: dokumen bermakna lebih dulu,
 * tautan dalam yang stabil, bukti berjarak satu interaksi, dan tombol Back yang
 * mengembalikan konteks yang tepat.
 *
 * Setiap uji berjalan di proyek desktop DAN mobile, karena mobile adalah desain
 * tersendiri, bukan desktop yang dikecilkan.
 */

/**
 * Shot yang di-pin baru punya geometri final setelah setiap island motion
 * mendaftarkan ScrollTrigger-nya. Mengukur sebelum itu menghasilkan target
 * gulir yang meleset, dan kegagalannya terlihat seperti motion yang rusak
 * padahal ujinyalah yang terburu-buru.
 */
async function waitForStages(page: import("@playwright/test").Page) {
  // `data-motion-ready` hanya ditulis varian desktop (scenes.ts) — mobile
  // dan reduced tidak pernah men-set atributnya, memang benar begitu. Di
  // sana cukup menunggu island scene mendaftar sama sekali.
  await page.waitForFunction(
    () => {
      const ready = document.querySelectorAll(
        '[data-motion-ready="true"]',
      ).length;
      if (ready >= 3) return true;
      const staticFlow = window.matchMedia(
        "(max-width: 47.999rem), (prefers-reduced-motion: reduce)",
      ).matches;
      return (
        staticFlow &&
        document.querySelectorAll("[data-scene], [id][data-choreography]")
          .length >= 3
      );
    },
    undefined,
    { timeout: 10_000 },
  );
  // Pin-spacer sudah ada, tetapi tingginya baru final setelah ScrollTrigger
  // menyelesaikan refresh terakhirnya. Mengukur di antara keduanya menghasilkan
  // target gulir yang meleset.
  await page.waitForTimeout(700);
}

async function moveToSceneProgress(
  page: import("@playwright/test").Page,
  slug: string,
  progress: number,
): Promise<void> {
  const geometry = await page.locator(`[id="${slug}"]`).evaluate((scene) => {
    const shot = scene.querySelector(".scene-shot");
    if (!(shot instanceof HTMLElement)) return null;
    return {
      top: scene.getBoundingClientRect().top + window.scrollY,
      span: Math.max(0, shot.offsetHeight - window.innerHeight),
    };
  });

  if (!geometry) throw new Error(`Missing shot geometry for ${slug}`);
  await page.evaluate(
    ({ top, span, progress }) => {
      window.scrollTo({ top: top + span * progress, behavior: "auto" });
    },
    { ...geometry, progress },
  );
  // Scrub has a short, intentional settle; sampling immediately after the
  // jump would observe an in-between state rather than the requested beat.
  await page.waitForTimeout(1200);
}

test("home offers three ways in without forcing an intro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /A Living Civilization/,
  );
  await expect(
    page.getByRole("link", { name: "Mulai perjalanan" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ke Arsip" })).toBeVisible();
});

test("the first focusable control is the skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("href", "#historical-content");
  await expect(focused).toBeVisible();
});

test("home leads into the journey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Mulai perjalanan" }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(
    page.getByRole("heading", { name: "Panjalu Jayati" }).first(),
  ).toBeVisible();
});

test("a scene deep link lands on that scene", async ({ page }) => {
  // Seorang guru membagikan tautan ini. Ia harus tetap hidup.
  await page.goto("/journey#1135-panjalu-jayati");
  const scene = page.locator(SCENE_1135);
  await expect(scene).toBeVisible();
  await expect(scene.locator("time")).toHaveText("1135");
});

test("Scene 921 presents its full date as a clean subheading", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.goto("/journey#921-kadhiri");

  const date = page.locator('[id="921-kadhiri"] .stage-date');
  await expect(date).toBeVisible();
  await expect(date).toContainText("19SEPTEMBER921");
  await expect(date.locator(".date-sep")).toHaveCount(0);

  const layout = await date.evaluate((element) => {
    const scene = element.closest<HTMLElement>('[id="921-kadhiri"]');
    if (!scene) throw new Error("Scene 921 is missing");
    const units = Array.from(
      element.querySelectorAll<HTMLElement>(".date-unit"),
    ).map((unit) => unit.getBoundingClientRect());
    const dateBox = element.getBoundingClientRect();
    const ornament = scene.querySelector<SVGElement>(".stage-surface > svg");
    const incomingHandoff = scene.querySelector<HTMLElement>(
      '.scene-handoff[data-handoff-phase="incoming"]',
    );
    const passages = scene.querySelector<HTMLElement>(".stage-passages");
    if (!passages) throw new Error("Scene 921 passages are missing");
    const hierarchy = [
      scene.querySelector<HTMLElement>(".scene-name__word"),
      element,
      scene.querySelector<HTMLElement>(".master-line"),
      scene.querySelector<HTMLElement>(".stage-passages p"),
    ];
    const resolvedHierarchy = hierarchy.filter(
      (item): item is HTMLElement => item !== null,
    );
    if (resolvedHierarchy.length !== hierarchy.length) {
      throw new Error("Scene 921 hierarchy is incomplete");
    }
    return {
      dateHeight: dateBox.height,
      dateRight: dateBox.right,
      bodyWidth: passages.getBoundingClientRect().width,
      fontSizes: resolvedHierarchy.map((item) =>
        Number.parseFloat(getComputedStyle(item).fontSize),
      ),
      leftEdges: resolvedHierarchy.map(
        (item) => item.getBoundingClientRect().left,
      ),
      topEdges: resolvedHierarchy.map(
        (item) => item.getBoundingClientRect().top,
      ),
      unitTops: units.map((unit) => unit.top),
      ornamentVisible: ornament
        ? getComputedStyle(ornament).display !== "none" &&
          ornament.getBoundingClientRect().width > 0
        : false,
      incomingHandoffVisible: incomingHandoff
        ? getComputedStyle(incomingHandoff).display !== "none" &&
          Number.parseFloat(getComputedStyle(incomingHandoff).opacity) > 0 &&
          incomingHandoff.getBoundingClientRect().width > 0
        : false,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.dateRight).toBeLessThanOrEqual(layout.viewportWidth);
  if (testInfo.project.name === "desktop") {
    expect(layout.dateHeight).toBeLessThan(140);
    expect(layout.bodyWidth).toBeGreaterThan(520);
    expect(layout.ornamentVisible).toBe(false);
    expect(layout.incomingHandoffVisible).toBe(false);
    expect(
      Math.max(...layout.leftEdges) - Math.min(...layout.leftEdges),
    ).toBeLessThan(4);
    expect(layout.topEdges).toEqual([...layout.topEdges].sort((a, b) => a - b));
    expect(layout.fontSizes[0]).toBeGreaterThan(layout.fontSizes[2] ?? 0);
    expect(layout.fontSizes[2]).toBeGreaterThan(layout.fontSizes[1] ?? 0);
    expect(layout.fontSizes[1]).toBeGreaterThan(layout.fontSizes[3] ?? 0);
    expect(
      Math.max(...layout.unitTops) - Math.min(...layout.unitTops),
    ).toBeLessThan(2);
  }
});

test("Scene 1015 presents the approved Carama copy and date subheading", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1252, height: 987 });
  }
  await page.goto("/journey#1015-name-endures");

  const scene = page.locator('[id="1015-name-endures"]');
  await expect(scene.locator(".stage-date")).toHaveText("7Juni1015");
  await expect(scene.locator(".stage-date .date-unit")).toHaveText([
    "7",
    "Juni",
    "1015",
  ]);
  await expect(scene.locator(".stage-date .date-sep")).toHaveCount(0);
  await expect(scene.locator(".master-line")).toHaveText(
    "Nama yang Kembali Muncul",
  );
  await expect(scene.locator(".stage-passages")).toContainText(
    "Prasasti Carama, bertarikh 7 Juni 1015",
  );
  await expect(scene.locator(".stage-passages")).toContainText(
    "Tetapi perubahan terbesar baru terjadi pada 1042.",
  );
  await expect(scene).not.toContainText(
    "Nama dapat muncul sekali karena kebetulan",
  );

  if (testInfo.project.name === "desktop") {
    await page.evaluate(() => document.fonts.ready);
    const beatLineCounts = await scene
      .locator(".stage-beat")
      .evaluateAll((beats) =>
        beats.map((beat) => {
          const lineTops = new Set<number>();
          for (const paragraph of beat.querySelectorAll("p")) {
            const range = document.createRange();
            range.selectNodeContents(paragraph);
            for (const rect of range.getClientRects()) {
              if (rect.width > 0 && rect.height > 0) {
                lineTops.add(Math.round(rect.top));
              }
            }
          }
          return lineTops.size;
        }),
      );
    expect(beatLineCounts).toHaveLength(7);
    expect(Math.max(...beatLineCounts)).toBeLessThanOrEqual(2);
  }
});

test("Timeline pushState lands on a readable early scene", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop") {
    // Viewport ini menangkap rasio stage/pin yang sebelumnya membuat landing
    // 879 dan 1015 berhenti di tengah tween beat terakhir.
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.goto("/journey");

  for (const slug of [
    "879-first-mark",
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ] as const) {
    await page.getByRole("button", { name: "Timeline" }).click();
    const entry = page.locator(`.timeline-list a[href="#${slug}"]`);
    // Panel Timeline sendiri memiliki scroll container full-screen. Scroll
    // terarah pada container ini menyamai gesture pengguna pada panel mobile;
    // scrollIntoViewIfNeeded menunggu elemen terlihat lebih dulu dan buntu
    // ketika entri masih berada di bawah viewport fixed panel.
    await entry.evaluate((element) => {
      const panel = element.closest<HTMLElement>(".timeline-panel");
      if (!panel) return;
      const elementBox = element.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const centeredTop =
        panel.scrollTop +
        elementBox.top -
        panelBox.top -
        (panel.clientHeight - elementBox.height) / 2;
      panel.scrollTo({ top: Math.max(0, centeredTop), behavior: "auto" });
    });
    await expect(entry).toBeVisible();
    await entry.click();

    await expect(page).toHaveURL(new RegExp(`/journey#${slug}$`, "u"));
    const scene = page.locator(`[id="${slug}"]`);
    const heading = scene.locator(`[id="${slug}-title"]`);
    await expect(heading).toBeFocused();

    await expect
      .poll(
        () =>
          scene.evaluate((root) => {
            const opacity = (selector: string) => {
              const element = root.querySelector<HTMLElement>(selector);
              return element ? Number(getComputedStyle(element).opacity) : 0;
            };
            const passages = Array.from(
              root.querySelectorAll<HTMLElement>('[data-motion="passage"]'),
            );
            const finalPassage = passages.at(-1);
            const finalPassageOpacity = finalPassage
              ? Number(getComputedStyle(finalPassage).opacity)
              : 0;
            const isStatic = window.matchMedia(
              "(max-width: 47.999rem), (prefers-reduced-motion: reduce)",
            ).matches;
            const expectedTop = isStatic
              ? root.getBoundingClientRect().top +
                window.scrollY -
                (document
                  .querySelector<HTMLElement>(".site-nav")
                  ?.getBoundingClientRect().height ?? 0) -
                8
              : (() => {
                  const shot = root.querySelector<HTMLElement>(".scene-shot");
                  if (!shot) return Number.POSITIVE_INFINITY;
                  return (
                    shot.getBoundingClientRect().top +
                    window.scrollY +
                    Math.max(0, shot.offsetHeight - window.innerHeight) * 0.74
                  );
                })();

            return (
              passages.length > 0 &&
              Math.abs(window.scrollY - expectedTop) <= 8 &&
              opacity('[data-motion="title"]') >= 0.98 &&
              opacity('[data-motion="master"]') >= 0.98 &&
              finalPassageOpacity >= 0.98
            );
          }),
        { timeout: 6_000 },
      )
      .toBe(true);
  }
});

test("the 879 mobile deep link lands on a complete graphic panel", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Kontrak ini khusus komposisi novel-grafis tanpa pin.",
  );

  await page.goto("/journey#879-first-mark");
  const scene = page.locator('[id="879-first-mark"]');
  const master = scene.locator('[data-motion="master"]');

  await expect(scene.locator("time")).toContainText("879");
  await expect(
    scene.locator(".stage-object").getByText("Prasasti Kwak", { exact: false }),
  ).toBeVisible();
  await expect(master).toHaveCSS("opacity", "1");
  await expect(master).toBeInViewport();
});

test("published journey slices use labelled picture-led stages", async ({
  page,
}) => {
  await page.goto("/journey");

  await expect(page.locator(".journey-visual-label").first()).toHaveText(
    "Visualisasi artistik",
  );

  const scenes = [
    ["879-first-mark", "01-879-first-mark.webp"],
    ["1135-panjalu-jayati", "06-1135-panjalu-jayati.webp"],
    ["1869-brantas-bridge", "16-1869-brantas-bridge.webp"],
  ] as const;

  for (const [slug, asset] of scenes) {
    const scene = page.locator(`[id="${slug}"]`);
    await expect(scene.locator(".stage-visual-label")).toHaveText(
      "Visualisasi artistik · pratinjau editorial",
    );
    /*
     * Sebuah slot boleh dipimpin citra ATAU footage (1135 memakai video sejak
     * direktif Chief 2026-09-04). Kontraknya tetap sama: citra slot yang sudah
     * disetujui harus memimpin bingkai — sebagai `src` pada citra, atau
     * sebagai `poster` pada video, yang juga menjadi fallback tanpa JavaScript.
     */
    const leadAsset = await scene
      .locator('.stage-media[data-media-state="ready"] :is(img, video)')
      .first()
      .evaluate((node: HTMLImageElement | HTMLVideoElement) =>
        node instanceof HTMLVideoElement
          ? node.getAttribute("poster")
          : node.getAttribute("src"),
      );
    expect(leadAsset).toMatch(new RegExp(asset.replace(".", "\\."), "u"));
  }

  // Sambutan pembuka Act I adalah transisi alur tersendiri: ia muncul sesudah
  // header act dan selesai sebelum panggung 879, bukan overlay di dalam scene.
  const openingTransition = page.locator(
    '[data-scene-opening-transition="true"]',
  );
  await expect(openingTransition).toHaveCount(1);
  await expect(openingTransition).toHaveClass(/scene-opening-transition/u);
  await expect(openingTransition.locator(".scene-opening-address")).toHaveCount(
    1,
  );
  const firstMark = page.locator('[id="879-first-mark"]');
  await expect(firstMark.locator(".scene-opening-address")).toHaveCount(0);
  const transitionOrder = await page.evaluate(() => {
    const transition = document.querySelector(
      '[data-scene-opening-transition="true"]',
    );
    const actHeader = document
      .getElementById("act-the-land-remembers")
      ?.closest("header");
    const firstScene = document.getElementById("879-first-mark");
    return {
      afterHeader: Boolean(
        transition &&
          actHeader &&
          actHeader.compareDocumentPosition(transition) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      beforeScene: Boolean(
        transition &&
          firstScene &&
          transition.compareDocumentPosition(firstScene) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    };
  });
  expect(transitionOrder).toEqual({ afterHeader: true, beforeScene: true });
  await expect(
    firstMark.locator('.stage-media[data-media-state="ready"] img'),
  ).toHaveAttribute("src", /01-879-first-mark\.webp/u);
});

test("Act I opening transition is compact and holds its address until 879 approaches", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop motion contract");
  await page.setViewportSize({ width: 1332, height: 987 });
  await page.goto("/journey");

  const sourceHeader = page.locator('[data-opening-handoff-source="true"]');
  const transition = page.locator('[data-scene-opening-transition="true"]');
  await expect(sourceHeader).toHaveCount(1);
  const sourceGeometry = await sourceHeader.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    top: element.getBoundingClientRect().top + window.scrollY,
  }));
  const geometry = await transition.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    top: element.getBoundingClientRect().top + window.scrollY,
    viewportHeight: window.innerHeight,
  }));
  const sampleAt = async (scrollTop: number) => {
    await page.evaluate((target) => window.scrollTo(0, target), scrollTop);
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const element = document.querySelector<HTMLElement>(
        ".scene-opening-address",
      );
      const source = document.querySelector<HTMLElement>(
        '[data-opening-handoff-source="true"]',
      );
      const firstScene = document.getElementById("879-first-mark");
      if (!element || !source || !firstScene) {
        throw new Error("Act I handoff is incomplete");
      }
      const characters = Array.from(
        element.querySelectorAll<HTMLElement>("[data-address-char]"),
      );
      return {
        addressOpacity: Number.parseFloat(getComputedStyle(element).opacity),
        firstSceneTop: firstScene.getBoundingClientRect().top,
        sourceOpacity: Number.parseFloat(getComputedStyle(source).opacity),
        top: element.getBoundingClientRect().top,
        totalCharacters: characters.length,
        visibleCharacters: characters.filter(
          (character) =>
            Number.parseFloat(getComputedStyle(character).opacity) > 0.95,
        ).length,
      };
    });
  };

  const afterOneWheel = await sampleAt(
    sourceGeometry.top + geometry.viewportHeight * 0.12,
  );
  const reveal = await sampleAt(geometry.top - geometry.viewportHeight * 0.36);
  const hold = await sampleAt(geometry.top - geometry.viewportHeight * 0.22);
  const faded = await sampleAt(geometry.top - geometry.viewportHeight * 0.06);
  const restored = await sampleAt(
    geometry.top - geometry.viewportHeight * 0.22,
  );

  expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight * 0.48);
  expect(sourceGeometry.height).toBeGreaterThanOrEqual(
    geometry.viewportHeight * 0.98,
  );
  expect(afterOneWheel.sourceOpacity).toBeGreaterThan(0.95);
  expect(afterOneWheel.visibleCharacters).toBe(0);
  expect(reveal.sourceOpacity).toBeLessThan(0.5);
  expect(reveal.visibleCharacters).toBeGreaterThan(10);
  expect(hold.sourceOpacity).toBeLessThan(0.05);
  expect(hold.addressOpacity).toBeGreaterThan(0.95);
  expect(hold.visibleCharacters).toBe(hold.totalCharacters);
  expect(faded.addressOpacity).toBeLessThan(0.05);
  expect(faded.top).toBeGreaterThan(0);
  expect(faded.firstSceneTop).toBeLessThan(geometry.viewportHeight * 0.65);
  expect(restored.sourceOpacity).toBeLessThan(0.05);
  expect(restored.addressOpacity).toBeGreaterThan(0.95);
  expect(restored.visibleCharacters).toBe(restored.totalCharacters);
});

test("journey follows the approved 2026 to 879 to 2026 sequence", async ({
  page,
}) => {
  await page.goto("/journey");

  await expect(page.locator(".journey-act")).toHaveCount(9);
  await expect(page.locator(".scene")).toHaveCount(26);
  await expect(
    page.getByRole("heading", { name: "KEDIRI, 2026" }),
  ).toBeVisible();
  // 25 slot scene siap; scene 1292 sengaja ditangguhkan (flag F1 pada
  // docs/shots/image-manifest.md). Prolog dan Finale memakai bingkai
  // tersendiri di luar slot scene.
  // Penangguhan 1292 ditutup perintah Chief 2026-08-29: 26 slot siap.
  await expect(page.locator('[data-media-state="ready"]')).toHaveCount(26);
  await expect(page.locator('[data-media-state="pending"]')).toHaveCount(0);
  // Prolog mempertahankan satu gambar HD kontemporer; perjalanan ke 879
  // terjadi lewat kamera dan lapisan material. Finale mengunjungi citra yang sama.
  const prologueImage = page.locator('[data-framing="prologue"] img');
  await expect(prologueImage).toHaveCount(1);
  await expect(prologueImage).toHaveAttribute(
    "src",
    /\/journey-approved\/00-prologue\.webp/u,
  );
  await expect(page.locator('[data-framing="finale"] img')).toHaveCount(1);
  await expect(page.locator('[data-motion="master"]').first()).toHaveText(
    "Berapa Usia Sebuah Kota?",
  );
  await expect(page.getByRole("heading", { name: "KEDIRI, 2026" })).toHaveText(
    "KEDIRI, 2026",
  );
  await expect(
    page.getByText("Berapa Usia Sebuah Kota?", { exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('[id="879-first-mark"]')).toHaveAttribute(
    "data-media-slot",
    "879-first-mark",
  );
  await expect(
    page.locator('[id="2024-2026-river-to-runway"]'),
  ).toHaveAttribute("data-media-slot", "2024-2026-river-to-runway");
  await expect(
    page.getByText("Kota ini terus berlanjut.").last(),
  ).toBeVisible();
});

test("prologue is one visual world with semantic editorial beats", async ({
  page,
}) => {
  await page.goto("/journey");
  await waitForStages(page);

  const prologue = page.locator('[data-scene="prologue"]');
  await expect(prologue).toHaveCount(1);
  /*
   * Bingkai DASAR Prolog tetap citra Kediri 2026: cat pertama dan fallback
   * tanpa JavaScript tidak pernah berubah era. Footage hidup di babak
   * pembuka (direktif Chief 2026-09-04) sebagai dua lapisan terpisah, bukan
   * sebagai source swap pada satu elemen.
   */
  const image = prologue.locator(".prologue-surface img");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute(
    "src",
    /\/journey-approved\/00-prologue\.webp/u,
  );
  await expect(image).toHaveAttribute(
    "alt",
    "Visualisasi artistik Kediri kontemporer saat senja: jembatan di atas Brantas, lalu lintas menyala, dan kota yang hidup di kedua tepian sungai.",
  );

  const overtureClips = prologue.locator(".prologue-overture-clip video");
  await expect(overtureClips).toHaveCount(2);
  await expect(overtureClips.nth(0)).toHaveAttribute(
    "src",
    /\/journey-approved\/00-prologue\.mp4/u,
  );
  await expect(overtureClips.nth(1)).toHaveAttribute(
    "src",
    /\/journey-approved\/00-prologue-daha\.mp4/u,
  );
  // Keduanya wajib menyatakan diri rekaan: tidak ada rekonstruksi yang boleh
  // lewat sebagai rekaman peristiwa.
  await expect(overtureClips.nth(0)).toHaveAttribute("aria-label", /rekaan/u);
  await expect(overtureClips.nth(1)).toHaveAttribute("aria-label", /rekaan/u);
  // Naskah era Daha ada di HTML sejak awal, apa pun variannya.
  await expect(prologue.locator('[data-motion="overture-copy"]')).toContainText(
    "abad ke-11 dan ke-12",
  );
  await expect(prologue.locator('[data-motion="water-field"]')).toHaveCount(1);
  await expect(prologue.locator('[data-motion="copper"]')).toHaveCount(1);
  await expect(prologue.locator('[data-motion="portal"]')).toHaveText(
    /879.*Catatan pertama menunggu di balik aliran\./u,
  );
  await expect(prologue.locator(".scene-readout")).toHaveCount(0);
  await expect(prologue.locator('[data-motion="master"]')).toHaveAttribute(
    "data-editorial-role",
    "lead-line",
  );

  const beats = prologue.locator('[data-motion="passage"]');
  await expect(beats).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    await expect(beats.nth(index)).toHaveAttribute(
      "data-beat-index",
      String(index),
    );
  }
  await expect(beats.nth(0)).toHaveText(
    "Kota memiliki lebih dari satu awal. Bentang alam, permukiman, pemerintahan, dan ingatan warganya tidak lahir pada saat yang sama.",
  );
  await expect(beats.nth(1)).toHaveText(
    "27 Juli 879 diperingati Kota Kediri sebagai awal kronologi sipilnya—bukan sebagai tanggal berdirinya pemerintahan kota modern.",
  );
  await expect(prologue.locator('[data-motion="passage"] p')).toHaveCount(2);
  await expect(
    prologue.getByText("Berapa Usia Sebuah Kota?", { exact: true }),
  ).toHaveCount(1);

  const firstScene = page.locator('[id="879-first-mark"]');
  // 5 beat sejak revisi konten Chief 2026-08-30 (dulu 4).
  await expect(firstScene.locator('[data-motion="passage"]')).toHaveCount(5);
});

test("prologue stage beats have no local panel", async ({ page }) => {
  await page.goto("/journey");

  const prologue = page.locator('[data-scene="prologue"]');
  const beats = prologue.locator(".stage-beat");
  await expect(beats).toHaveCount(2);

  await expect(
    prologue.getByText(
      "27 Juli 879 diperingati Kota Kediri sebagai awal kronologi sipilnya—bukan sebagai tanggal berdirinya pemerintahan kota modern.",
      { exact: true },
    ),
  ).toHaveCount(1);

  const styles = await beats.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        padding: style.padding,
      };
    }),
  );

  expect(styles).toEqual([
    {
      backgroundImage: "none",
      backgroundColor: "rgba(0, 0, 0, 0)",
      padding: "0px",
    },
    {
      backgroundImage: "none",
      backgroundColor: "rgba(0, 0, 0, 0)",
      padding: "0px",
    },
  ]);
});

test("prologue presents its held beats in order and reverses honestly", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Beat timing is sampled on the desktop pinned composition.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/journey#prologue-2026");
  await waitForStages(page);

  const prologue = page.locator('[data-scene="prologue"]');
  const beats = prologue.locator('[data-motion="passage"]');
  const pinSpace = prologue.locator(".prologue-pin-space");

  const marginBottom = await prologue
    .locator(".prologue-passages")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).marginBottom),
    );
  expect(marginBottom).toBeGreaterThanOrEqual(64);
  await expect(pinSpace).toHaveCount(1);

  const findVisibleBeat = async (
    beatIndex: number,
    start: number,
    end: number,
  ): Promise<number> => {
    const samples: Array<{
      readonly progress: number;
      readonly opacities: readonly number[];
    }> = [];

    for (let progress = start; progress <= end; progress += 0.04) {
      await moveToSceneProgress(page, "prologue-2026", progress);
      const opacities = await beats.evaluateAll((elements) =>
        elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
      );
      samples.push({ progress, opacities });

      const otherBeatIndex = beatIndex === 0 ? 1 : 0;
      if (
        (opacities[beatIndex] ?? 0) >= 0.95 &&
        (opacities[otherBeatIndex] ?? 1) <= 0.05
      ) {
        return progress;
      }
    }

    throw new Error(
      `Beat ${beatIndex} never became exclusively visible: ${JSON.stringify(samples)}`,
    );
  };

  /*
   * Mulai dari keadaan yang BERSIH. Pendaratan tautan dalam menaruh pembaca
   * di keadaan baca shot (REST), dan sejak babak pembuka Prolog dipasang
   * (2026-09-04) keadaan itu memang sudah menampilkan beat pertama. Tanpa
   * langkah ini, sampel pertama memotret sisa keadaan pendaratan dan
   * pemindaian langsung "menemukan" beat 0 pada progres paling awal —
   * positif palsu yang tidak ada hubungannya dengan posisi gulir.
   */
  /*
   * Percobaan pendaratan tautan dalam berjalan sampai 1,5 detik sesudah
   * `load` (lihat DESKTOP_ATTEMPTS di deep-link-landing.tsx). Menggulir di
   * tengah rentang itu akan ditarik balik ke REST, jadi jendela itu dibiarkan
   * habis lebih dulu — kalau tidak, pemindaian mengukur pendaratan, bukan
   * koreografi.
   */
  await page.waitForTimeout(1_700);
  await moveToSceneProgress(page, "prologue-2026", 0.2);
  await expect
    .poll(async () =>
      (
        await beats.evaluateAll((elements) =>
          elements.map((element) =>
            Number.parseFloat(getComputedStyle(element).opacity),
          ),
        )
      ).every((opacity) => opacity <= 0.05),
    )
    .toBe(true);

  // Cari state yang benar-benar dilihat pembaca; jangan menganggap helper
  // geometri identik dengan progres internal ScrollTrigger/ScrollSmoother.
  const firstBeatProgress = await findVisibleBeat(0, 0.24, 0.76);
  const secondBeatProgress = await findVisibleBeat(
    1,
    firstBeatProgress + 0.04,
    0.92,
  );

  expect(secondBeatProgress - firstBeatProgress).toBeGreaterThanOrEqual(0.12);

  await moveToSceneProgress(page, "prologue-2026", firstBeatProgress);
  await expect(beats.nth(0)).toHaveCSS("opacity", "1");
  await expect(beats.nth(1)).toHaveCSS("opacity", "0");
});

test("tablet keeps the raised prologue copy inside its cinematic safe area", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/journey#prologue-2026");

  const passages = page.locator('[data-scene="prologue"] .prologue-passages');
  const geometry = await passages.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottom: bounds.bottom,
      marginBottom: Number.parseFloat(getComputedStyle(element).marginBottom),
    };
  });

  expect(geometry.marginBottom).toBeGreaterThanOrEqual(69);
  expect(geometry.bottom).toBeLessThanOrEqual(704);
});

test("879 body copy is one pixel larger and remains panel-free", async ({
  page,
}) => {
  await page.goto("/journey#879-first-mark");
  const paragraph = page
    .locator('[data-choreography="inscriptionReveal"] .stage-beat p')
    .first();
  const styles = await paragraph.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
    };
  });

  expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(styles.backgroundImage).toBe("none");
  expect(styles.fontSize).toBe("14px");
  expect(styles.fontWeight).toBe("400");
  expect(Number.parseFloat(styles.lineHeight)).toBeCloseTo(25.48, 1);
});

test("prologue transforms the contemporary river into the 879 portal", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Material transition is sampled on the desktop motion composition.",
  );

  await page.goto("/journey");
  await waitForStages(page);

  const prologue = page.locator('[data-scene="prologue"]');
  const surface = prologue.locator(".prologue-surface img");
  const copper = prologue.locator('[data-motion="copper"]');
  const portal = prologue.locator('[data-motion="portal"]');

  await moveToSceneProgress(page, "prologue-2026", 0.18);
  const cityState = {
    copper: Number(
      await copper.evaluate((node) => getComputedStyle(node).opacity),
    ),
    portal: Number(
      await portal.evaluate((node) => getComputedStyle(node).opacity),
    ),
  };

  await moveToSceneProgress(page, "prologue-2026", 0.99);
  const recordState = {
    copper: Number(
      await copper.evaluate((node) => getComputedStyle(node).opacity),
    ),
    portal: Number(
      await portal.evaluate((node) => getComputedStyle(node).opacity),
    ),
  };

  expect(recordState.copper).toBeGreaterThan(cityState.copper + 0.65);
  expect(recordState.portal).toBeGreaterThan(cityState.portal + 0.75);
  // Bingkai dasarnya tetap citra 2026 — tidak ada source swap di tengah shot.
  await expect(surface).toHaveAttribute(
    "src",
    /\/journey-approved\/00-prologue\.webp/u,
  );
  await expect(prologue).not.toContainText("DAHA, ABAD XII");
});

test("prologue keeps its HD image static for reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  await page.goto("/journey");

  const prologue = page.locator('[data-scene="prologue"]');
  /*
   * Reduced motion tidak pernah memutar babak pembuka: lapisan footage-nya
   * `display: none`, sedangkan NASKAH era Daha justru terbaca dalam alur
   * dokumen — komposisi baca yang utuh, bukan versi rusak.
   */
  await expect(
    prologue.locator(".prologue-overture-clip").first(),
  ).toBeHidden();
  await expect(prologue.locator('[data-motion="overture-copy"]')).toBeVisible();
  await expect(prologue.locator(".prologue-surface img")).toBeVisible();
  await expect(prologue.locator('[data-motion="master"]')).toBeVisible();
  await expect(prologue.locator('[data-motion="passage"]')).toHaveCount(2);
  await expect(prologue).not.toContainText("DAHA, ABAD XII");

  await context.close();
});

test("inscription evidence follows the 921 Kadhiri scene", async ({ page }) => {
  await page.goto("/journey");
  const followsScene = await page
    .locator('[id="921-kadhiri"]')
    .evaluate((scene) => {
      const interlude = document.querySelector(".interlude-scene");
      return Boolean(
        interlude &&
          scene.compareDocumentPosition(interlude) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
  expect(followsScene).toBe(true);
});

test("early scenes expose continuous decorative handoffs", async ({ page }) => {
  await page.goto("/journey");

  const handoffs = [
    ['[data-scene="prologue"]', [["outgoing", "water-copper"]]],
    [
      '[id="879-first-mark"]',
      [
        ["incoming", "water-copper"],
        ["outgoing", "inscription-mark"],
      ],
    ],
    [
      '[id="921-kadhiri"]',
      [
        ["incoming", "inscription-mark"],
        ["outgoing", "name-world"],
      ],
    ],
    [
      '[id="1015-name-endures"]',
      [
        ["incoming", "name-world"],
        ["outgoing", "record-territory"],
      ],
    ],
    [
      '[id="1042-river-divides-kingdom"]',
      [
        ["incoming", "record-territory"],
        ["outgoing", "territory-centre"],
      ],
    ],
  ] as const;

  for (const [scopeSelector, phases] of handoffs) {
    const handoff = page
      .locator(scopeSelector)
      .locator('[data-motion="handoff"]');
    await expect(handoff).toHaveCount(phases.length);
    for (const [phase, kind] of phases) {
      const motif = page
        .locator(scopeSelector)
        .locator(`[data-motion="handoff"][data-handoff-phase="${phase}"]`);
      await expect(motif).toHaveCount(1);
      await expect(motif).toHaveAttribute("data-handoff", kind);
      await expect(motif).toHaveAttribute("aria-hidden", "true");
      await expect(motif).toHaveAttribute("data-handoff-from", /.+/u);
      await expect(motif).toHaveAttribute("data-handoff-to", /.+/u);
    }
  }
});

test("early outgoing handoffs reach a distinct transition state", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Computed transition state is sampled on the staged desktop timeline.",
  );

  await page.goto("/journey");
  await waitForStages(page);

  const scenes = [
    ["prologue-2026", '[data-scene="prologue"]'],
    ["879-first-mark", '[id="879-first-mark"]'],
    ["921-kadhiri", '[id="921-kadhiri"]'],
    ["1015-name-endures", '[id="1015-name-endures"]'],
    ["1042-river-divides-kingdom", '[id="1042-river-divides-kingdom"]'],
  ] as const;

  for (const [slug, scopeSelector] of scenes) {
    const outgoing = page
      .locator(scopeSelector)
      .locator('[data-motion="handoff"][data-handoff-phase="outgoing"]');

    await moveToSceneProgress(page, slug, 0.55);
    const readable = await outgoing.evaluate((node) => {
      const marker = node.querySelector<HTMLElement>(
        '[data-handoff-element="incoming"]',
      );
      const style = getComputedStyle(node);
      return {
        opacity: Number(style.opacity),
        transform: style.transform,
        markerOpacity: Number(marker ? getComputedStyle(marker).opacity : 0),
      };
    });

    await moveToSceneProgress(page, slug, 0.95);
    const transition = await outgoing.evaluate((node) => {
      const marker = node.querySelector<HTMLElement>(
        '[data-handoff-element="incoming"]',
      );
      const style = getComputedStyle(node);
      return {
        opacity: Number(style.opacity),
        transform: style.transform,
        markerOpacity: Number(marker ? getComputedStyle(marker).opacity : 0),
      };
    });

    expect(
      transition.opacity,
      `${slug} outgoing motif should be visible at exit`,
    ).toBeGreaterThan(0.75);
    expect(
      transition.opacity,
      `${slug} outgoing motif should differ from readable hold`,
    ).toBeGreaterThan(readable.opacity + 0.4);
    expect(
      transition.transform,
      `${slug} outgoing motif should travel into its handoff state`,
    ).not.toBe(readable.transform);
    expect(
      transition.markerOpacity,
      `${slug} incoming material should resolve at exit`,
    ).toBeGreaterThan(readable.markerOpacity + 0.25);
  }
});

test("early secondary beats remain readable on the desktop rest path", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Beat contrast is sampled on the staged desktop timeline.",
  );

  await page.goto("/journey");
  await waitForStages(page);

  for (const slug of [
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ] as const) {
    await moveToSceneProgress(page, slug, 0.76);
    // Beat TERAKHIR, bukan indeks tetap — jumlah beat per scene mengikuti
    // naskah (1042 kini enam beat pendek sejak revisi editorial 2026-08-31).
    const beat = page
      .locator(`[id="${slug}"]`)
      .locator('[data-motion="passage"]')
      .last();
    const state = await beat.evaluate((node) => {
      const paragraph = node.querySelector("p");
      const paragraphStyle = paragraph ? getComputedStyle(paragraph) : null;
      const box = node.getBoundingClientRect();
      return {
        opacity: Number(getComputedStyle(node).opacity),
        height: box.height,
        color: paragraphStyle?.color ?? "",
        fontWeight: paragraphStyle?.fontWeight ?? "",
      };
    });

    expect(state.opacity, `${slug} secondary beat is visible`).toBeGreaterThan(
      0.9,
    );
    expect(
      state.height,
      `${slug} secondary beat has readable geometry`,
    ).toBeGreaterThan(0);
    expect(state.color, `${slug} secondary beat has an ink color`).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(state.fontWeight, `${slug} secondary beat keeps text weight`).toBe(
      "500",
    );
  }
});

test("prologue remains readable on mobile without a pin space", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Kontrak ini khusus komposisi novel-grafis tanpa pin.",
  );

  await page.goto("/journey#prologue-2026");
  const prologue = page.locator('[data-scene="prologue"]');
  await expect(prologue.locator(".prologue-pin-space")).toHaveCSS(
    "display",
    "none",
  );
  await expect(prologue.locator('[data-motion="master"]')).toBeVisible();
  await expect(
    prologue.locator('[data-motion="passage"]').last(),
  ).toBeVisible();
});

test("prologue reduced motion has no empty pin contract", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/journey#prologue-2026");
  const prologue = page.locator('[data-scene="prologue"]');
  await expect(prologue.locator(".prologue-pin-space")).toHaveCSS(
    "display",
    "none",
  );
  await expect(prologue.locator('[data-motion="master"]')).toBeVisible();
  await expect(
    prologue.locator('[data-motion="passage"]').last(),
  ).toBeVisible();
  await context.close();
});

test("mobile reduced early scenes keep metadata clear of visual labels", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Kontrak ini mengunci komposisi mobile-reduced sekali.",
  );

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/journey");

  for (const slug of [
    "879-first-mark",
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ] as const) {
    const scene = page.locator(`[id="${slug}"]`);
    const label = scene.locator(".stage-visual-label");
    const contextBlock = scene.locator(".stage-context");
    await expect(label).toHaveCSS("display", "none");
    // Direktif runtime 2026-08-28: chrome "SCENE n / Prolog · judul" berhenti
    // dicat untuk lima scene ini — teksnya (eyebrow, judul) sengaja
    // visually-hidden demi pembaca layar, jadi wadahnya sendiri boleh tetap
    // "visible" secara teknis (kontrak sr-only: 1px, bukan 0) sementara
    // tidak ada satu pun kata yang benar-benar tercat.
    await expect(contextBlock).toBeVisible();
    const chromeText = contextBlock.locator("p, h1, h2");
    await expect(chromeText).toHaveCount(2);
    for (const className of await chromeText.evaluateAll((nodes) =>
      nodes.map((node) => node.className),
    )) {
      expect(className, `${slug} eyebrow/title stays sr-only`).toContain(
        "visually-hidden",
      );
    }

    const overlap = await scene.evaluate((root) => {
      const label = root.querySelector<HTMLElement>(".stage-visual-label");
      const context = root.querySelector<HTMLElement>(
        ".prologue-context, .stage-context",
      );
      if (!label || !context) return 0;
      const labelBox = label.getBoundingClientRect();
      const contextBox = context.getBoundingClientRect();
      return (
        Math.max(
          0,
          Math.min(labelBox.right, contextBox.right) -
            Math.max(labelBox.left, contextBox.left),
        ) *
        Math.max(
          0,
          Math.min(labelBox.bottom, contextBox.bottom) -
            Math.max(labelBox.top, contextBox.top),
        )
      );
    });
    expect(overlap, `${slug} label must not overlap metadata`).toBe(0);

    const opacities = await scene
      .locator('[data-motion="passage"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity)),
      );
    expect(opacities, `${slug} beats remain readable`).toEqual(
      opacities.map(() => 1),
    );
  }

  await context.close();
});

test("early scenes render hero media once inside the scene world", async ({
  page,
}) => {
  await page.goto("/journey");

  for (const slug of [
    "prologue-2026",
    "879-first-mark",
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ] as const) {
    const scene = page.locator(`[id="${slug}"]`);
    // Media hero tampil SEKALI — sebagai citra atau video (prolog memakai
    // video sejak direktif Chief 2026-08-28).
    await expect(
      scene.locator(".stage-media img, .stage-media video"),
    ).toHaveCount(1);
    await expect(scene.locator(".scene-readout img")).toHaveCount(0);
    await expect(scene.locator('[data-media-role="metadata"] img')).toHaveCount(
      0,
    );
  }
});

test("early mobile shots clear the fixed navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Komposisi safe-area ini khusus alur mobile.",
  );

  const scenes = [
    "879-first-mark",
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ] as const;

  for (const slug of scenes) {
    await page.goto(`/journey#${slug}`);
    const navBox = await page.locator(".site-nav").boundingBox();
    const safeTop = (navBox?.y ?? 0) + (navBox?.height ?? 0) + 2;
    const scene = page.locator(`[id="${slug}"]`);

    for (const selector of [".stage-date", ".master-line"]) {
      const target = scene.locator(selector);
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      expect(box, `${slug} ${selector} must have a box`).not.toBeNull();
      expect(
        box?.y ?? -Infinity,
        `${slug} ${selector} clears nav`,
      ).toBeGreaterThanOrEqual(safeTop);
    }
  }
});

test("tablet motion registration keeps the prologue geometry stable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Playwright mobile context dipakai untuk emulasi tablet touch 768px.",
  );

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.addInitScript(() => {
    const target = window as Window & { __tabletLayoutShifts?: number[] };
    target.__tabletLayoutShifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!shift.hadRecentInput) {
            target.__tabletLayoutShifts?.push(shift.value ?? 0);
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Browser tanpa Layout Instability API tidak dapat memberi bukti CLS.
    }
  });

  await page.goto("/journey");
  await page.waitForTimeout(700);
  const maxScroll = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollHeight - innerHeight),
  );
  for (let index = 1; index <= 6; index += 1) {
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round((maxScroll * index) / 6),
    );
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);

  const cls = await page.evaluate(() => {
    const target = window as Window & { __tabletLayoutShifts?: number[] };
    return (
      target.__tabletLayoutShifts?.reduce((total, value) => total + value, 0) ??
      0
    );
  });
  expect(cls, "tablet motion registration must not shift layout").toBeLessThan(
    0.1,
  );
});

test("evidence opens by default, remains collapsible, and names its source", async ({
  page,
}) => {
  await page.goto("/journey#1135-panjalu-jayati");
  const scene = page.locator(SCENE_1135);
  // ScrollSmoother butuh ±1,1 detik menyusul lompatan hash; interaksi dan
  // asersinya menunggu geometri settle — kontraknya sendiri tidak berubah.
  await page.waitForTimeout(1600);
  const disclosure = scene.locator("details.evidence-disclosure");
  const summary = scene.locator("details > summary");
  await summary.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(summary).toHaveText("Sumber dan bukti sejarah yang tersedia");
  await expect(
    scene.getByText("Catatan mengenai sumber dan dasar informasi"),
  ).toBeVisible();
  await expect(
    scene
      .locator(".epistemic-note")
      .getByText(
        "Naskah ini masih dalam proses penelaahan editorial dan belum diterbitkan secara resmi.",
      ),
  ).toBeVisible();
  await expect(
    scene.getByText("Tingkat kepastian berdasarkan sumber: Tinggi"),
  ).toBeVisible();
  await expect(
    scene.getByText("Sumber yang mendukung penafsiran ini").first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    scene.getByText("catatan katalog D.9", { exact: false }).first(),
  ).toBeVisible({ timeout: 10_000 });

  await summary.click();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await summary.click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(
    scene.getByText("catatan katalog D.9", { exact: false }).first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("journey to archive and back restores the exact scene", async ({
  page,
}) => {
  // Alur yang UX Bible bagian 17 sebut sakral.
  await page.goto("/journey#1135-panjalu-jayati");
  await page.waitForTimeout(1600);
  const archiveLink = page
    .locator(SCENE_1135)
    .getByRole("link", { name: "Catatan arsip lengkap" });
  await archiveLink.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  await archiveLink.click();
  await expect(page).toHaveURL(/\/archive\/events\/1135-panjalu-jayati$/, {
    timeout: 10_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Panjalu Jayati",
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/journey#1135-panjalu-jayati$/);
  await expect(page.locator(SCENE_1135)).toBeVisible();
});

test("the archive record separates record from reading", async ({ page }) => {
  await page.goto("/archive/events/1135-panjalu-jayati");
  await expect(
    page.getByText("SUMBER PRIMER · PRIMARY RECORD").first(),
  ).toBeVisible();
  await expect(
    page.getByText("INTERPRETASI AKADEMIK · SCHOLARLY INTERPRETATION").first(),
  ).toBeVisible();
});

test("an event without published evidence says so plainly", async ({
  page,
}) => {
  await page.goto("/archive/events/1869-brantas-bridge");
  await expect(
    page.getByText("Belum ada klaim terbit yang tertaut ke peristiwa ini."),
  ).toBeVisible();
});

test("a person with no documented likeness says so", async ({ page }) => {
  await page.goto("/archive/people/jayabhaya");
  await expect(
    page
      .getByText("Tidak ada rupa yang terdokumentasi", { exact: false })
      .first(),
  ).toBeVisible();
});

test("search finds a person through a historical spelling", async ({
  page,
}) => {
  // Jayabaya harus menemukan Jayabhaya tanpa pengunjung menguasai transliterasi.
  await page.goto("/archive");
  await page.getByLabel("Cari arsip").fill("Jayabaya");
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page.getByRole("link", { name: /Jayabhaya/ })).toBeVisible();
});

test("search invents nothing when there is no match", async ({ page }) => {
  await page.goto("/archive?q=zzzznothing");
  await expect(page.getByText("Tidak ada yang cocok")).toBeVisible();
});

test("the timeline is a real page, not only an overlay", async ({ page }) => {
  await page.goto("/explore/timeline");
  await expect(page.getByText("27 Juli 879").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Panjalu Jayati/ }).first(),
  ).toBeVisible();
});

test("a missing record does not fabricate a replacement", async ({ page }) => {
  const response = await page.goto("/archive/events/tidak-pernah-ada");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByText("Bagian sejarah ini tidak ada di sini"),
  ).toBeVisible();
});

test("the journey is meaningful with JavaScript disabled", async ({
  browser,
}) => {
  // Kalau JavaScript gagal, bioskopnya hilang dan sejarahnya tetap ada.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/journey");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jejak Pertama" }),
  ).toBeVisible();
  await expect(
    page.getByText("27 Juli 879").or(page.getByText("879")).first(),
  ).toBeVisible();
  // Bukti tetap terbuka lewat elemen <details> asli.
  await expect(
    page.getByText("Sumber dan bukti sejarah yang tersedia").first(),
  ).toBeVisible();
  await context.close();
});

test("reduced motion keeps the whole journey, without motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/journey");

  const title = page.getByRole("heading", { name: "Panjalu Jayati" }).first();
  await expect(title).toBeVisible();
  // Komposisi akhir langsung: tidak ada elemen yang tertinggal transparan.
  await expect(title).toHaveCSS("opacity", "1");
  await context.close();
});

test("arriving by deep link lands on the readable rest state", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Pin hanya dipasang di desktop dan tablet; kontraknya diuji sekali.",
  );

  /*
   * UX Bible bagian 39: setiap scene punya keadaan masuk lewat deep-link, dan
   * keadaan itu adalah keadaan baca yang stabil. Dengan scene yang di-pin,
   * tiba di anchor berarti mendarat di awal rentang scrub - komposisi separuh
   * jadi - kecuali koreografinya mencari dataran istirahat. Uji ini yang
   * menjaganya, karena kegagalannya tidak menimbulkan error apa pun.
   */
  await page.goto("/journey#1135-panjalu-jayati");
  const scene = page.locator(SCENE_1135);
  const master = scene.locator('[data-motion="master"]');
  await expect(master).toBeVisible();
  await waitForStages(page);
  await page.waitForTimeout(2200);
  await expect(master).toHaveCSS("opacity", "1");
  await expect(scene.locator('[data-motion="title"]')).toHaveCSS(
    "opacity",
    "1",
  );
});

test("no historical text is ever removed from the accessibility tree", async ({
  page,
}) => {
  // Koreografi boleh menunda cat, tetapi tidak boleh menyembunyikan sejarah.
  // autoAlpha GSAP menyetel visibility:hidden dan pernah membuat judul scene
  // 1135 hilang dari pohon aksesibilitas sampai discroll; uji ini menguncinya.
  await page.goto("/journey");
  const headings = page.getByRole("heading", { level: 2 });
  const count = await headings.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(headings.nth(index)).toBeVisible();
  }
});

test("motion enhances the document without becoming it", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Varian mobile punya perjalanan spasialnya sendiri; kontrak ini diuji sekali.",
  );

  await page.goto("/journey");
  const title = page.locator(`${SCENE_1135} [data-motion="title"]`);

  // Teksnya ada di DOM sejak awal: yang berubah hanya presentasinya.
  await expect(title).toHaveText("Panjalu Jayati");

  // Shot yang di-pin punya rentang gulirnya sendiri; menggulir "sekitar" scene
  // tidak cukup. Uji ini menggulir ke tengah rentang itu, yaitu keadaan baca.
  await waitForStages(page);
  await page.evaluate(() => {
    const scene = document.querySelector('[id="1135-panjalu-jayati"]');
    const shot = scene?.closest(".scene")?.querySelector(".scene-shot");
    if (!(shot instanceof HTMLElement)) return;
    // Rentang shot = tinggi shot DIKURANGI tinggi viewport. Memakai tinggi
    // penuh melewati akhir shot, dan kegagalannya menyerupai motion rusak.
    const span = shot.offsetHeight - window.innerHeight;
    const top = shot.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + span * 0.74, behavior: "auto" });
  });
  await page.waitForTimeout(2200);

  // Setelah shot mencapai keadaan bacanya, komposisinya selesai.
  await expect(title).toHaveCSS("opacity", "1");
});

test("leaving and returning does not leave motion behind", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Diuji sekali.");

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/journey");
  await page.getByRole("link", { name: "Sumber" }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/journey$/);

  // Timeline dan ScrollTrigger milik scene dibersihkan pemiliknya; trigger
  // yatim akan muncul sebagai error saat rute berganti.
  expect(errors).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Panjalu Jayati" }).first(),
  ).toBeVisible();
});

test("desktop journey boot does not emit a hydration attribute mismatch", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Atribut boot hanya menyimpang pada varian desktop; kontraknya diuji sekali.",
  );

  const hydrationWarnings: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/A tree hydrated but some attributes|Hydration failed/i.test(text)) {
      hydrationWarnings.push(text);
    }
  });

  const journeyUrl = process.env.KEDIRI_E2E_BASE_URL
    ? new URL("/journey", process.env.KEDIRI_E2E_BASE_URL).toString()
    : "/journey";
  await page.goto(journeyUrl);
  // React menghidrasi setelah `goto` menyelesaikan lifecycle dokumen.
  await page.waitForTimeout(500);

  expect(hydrationWarnings, hydrationWarnings.join("\n")).toEqual([]);
});

test("deep-linked journey has no blocking prologue intro", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Kontrak deep link diperiksa sekali pada desktop.",
  );

  await page.goto("/journey#879-first-mark");

  await expect(
    page.locator('[id="879-first-mark"] [data-motion="master"]'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.getAttribute("data-intro")),
    )
    .toBeNull();
});

test("journey reload at a restored position has no blocking intro", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Scroll restoration intro hanya diuji pada varian desktop.",
  );

  await page.goto("/journey");
  await waitForStages(page);
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight * 2, behavior: "auto" });
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  await page.reload();

  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect(page.locator(".site-nav")).toBeVisible();
  const introState = await page.evaluate(() =>
    document.documentElement.getAttribute("data-intro"),
  );
  expect(introState).toBeNull();
});

test("first-load prologue opens immediately without a forced intro", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Diuji sekali pada desktop.");

  await page.goto("/journey");
  const prologue = page.locator('[data-scene="prologue"]');
  await expect(page.locator(".site-nav")).toBeVisible();
  await expect(page.locator('[data-brantas-thread="true"]')).toBeVisible();
  await expect(prologue.locator(".prologue-surface img")).toBeVisible();
  await expect(prologue.locator('[data-motion="scroll-cue"]')).toBeVisible();
  await expect(page.locator("[data-opening-frame]")).toHaveCount(0);
  const introState = await page.evaluate(
    () => document.documentElement.dataset.intro,
  );
  expect(introState).toBeUndefined();
});

test("Scene 10 exposes correctable canonical text while its raster remains decorative", async ({
  page,
}) => {
  await page.goto("/journey#1292-the-return");
  const scene = page.locator('[id="1292-the-return"]');

  await expect(scene).toContainText("JAYAKATWANG");
  await expect(scene).toContainText("RAJA KEDIRIAN TERAKHIR");
  await expect(scene).toContainText("dikalahkan oleh pasukan Raden Wijaya");
  await expect(scene).not.toContainText("JAYAKASTWANG");
  await expect(scene).not.toContainText("KEDAHIRAN");
  await expect(scene).not.toContainText("pasukan Jayabaya");
});

test("Brantas line remains decorative and static when reduced motion is requested", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/journey#1042-river-divides-kingdom");

  const thread = page.locator('[data-brantas-thread="true"]');
  await expect(thread).toHaveAttribute("aria-hidden", "true");
  await expect(thread.locator("[data-brantas-path]")).toBeVisible();
  await expect(thread.locator("[data-brantas-path]")).toHaveCSS(
    "opacity",
    "0.48",
  );
  await context.close();
});

test("prologue image fills the cinematic frame before the river dolly", async ({
  page,
}, testInfo) => {
  await page.goto("/journey");

  // The opening must fill the viewport; the GSAP camera then performs the
  // deliberate crop toward Brantas instead of exposing letterbox bands.
  if (testInfo.project.name === "desktop") {
    await waitForStages(page);
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }

  const surface = page.locator('[data-scene="prologue"] .prologue-surface img');
  await expect(surface).toHaveCount(1);
  await expect
    .poll(() =>
      surface.evaluate((element) => getComputedStyle(element).objectFit),
    )
    .toBe("cover");

  if (testInfo.project.name === "desktop") {
    const perspective = await page
      .locator('[data-scene="prologue"] .prologue-surface')
      .evaluate((element) => {
        const transform = getComputedStyle(element).transform;
        if (transform === "none") {
          return { scale: 1, scrollY: window.scrollY };
        }

        const values = transform
          .slice(transform.indexOf("(") + 1, -1)
          .split(",")
          .map(Number);
        return {
          scale: values[0],
          scrollY: window.scrollY,
        };
      });

    expect(perspective.scrollY).toBe(0);
    expect(perspective.scale).toBeCloseTo(1, 2);
  }
});

test("timeline overlay locks body scroll, traps focus, and closes on Escape", async ({
  page,
}) => {
  await page.goto("/journey");
  const timelineButton = page.getByRole("button", { name: "Timeline" });
  await timelineButton.click();

  const panel = page.locator(".timeline-panel");
  await expect(panel).toBeVisible();

  // Verify body scroll lock and inert background
  const bodyState = await page.evaluate(() => ({
    locked: document.body.dataset.timelineOpen === "true",
    overflow: getComputedStyle(document.body).overflow,
    smoothInert: document
      .getElementById("smooth-wrapper")
      ?.hasAttribute("inert"),
  }));
  expect(bodyState.locked).toBe(true);
  expect(bodyState.overflow).toBe("hidden");
  expect(bodyState.smoothInert).toBe(true);

  // Press Escape to close
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(timelineButton).toBeFocused();

  const restoredBodyState = await page.evaluate(() => ({
    locked: document.body.dataset.timelineOpen === "true",
    smoothInert: document
      .getElementById("smooth-wrapper")
      ?.hasAttribute("inert"),
  }));
  expect(restoredBodyState.locked).toBe(false);
  expect(restoredBodyState.smoothInert).toBe(false);
});

test("skip-to-next-scene navigates globally across act boundaries", async ({
  page,
}) => {
  await page.goto("/journey#1042-river-divides-kingdom");
  const scene1042 = page.locator('[id="1042-river-divides-kingdom"]');
  const skipLink = scene1042.locator('.scene-actions a[href*="#"]');
  await expect(skipLink).toBeVisible();
  const targetHref = await skipLink.getAttribute("href");
  // The last scene of Act 1 (1042) must point to the first scene of Act 2 (daha)
  expect(targetHref).toBe("#daha-centre-of-power");
});

test("scene anchor survives viewport layout mode changes on resize", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Desktop to mobile resize test",
  );
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/journey#879-first-mark");
  await page.waitForTimeout(600);

  // Resize to mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  // Scene 879 should still be the target and visible
  const scene = page.locator('[id="879-first-mark"]');
  await expect(scene).toBeVisible();
  expect(page.url()).toContain("#879-first-mark");
});
