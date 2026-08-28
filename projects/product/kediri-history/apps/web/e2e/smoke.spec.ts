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
  await page.waitForFunction(
    () => document.querySelectorAll('[data-motion-ready="true"]').length >= 3,
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
    await expect(
      scene.locator('.stage-media[data-media-state="ready"] img'),
    ).toHaveAttribute("src", new RegExp(asset.replace(".", "\\."), "u"));
  }
});

test("journey follows the approved 2026 to 879 to 2026 sequence", async ({
  page,
}) => {
  await page.goto("/journey");

  await expect(page.locator(".journey-act")).toHaveCount(9);
  await expect(page.locator(".scene")).toHaveCount(26);
  await expect(page.getByText("Pratinjau editorial lokal")).toBeVisible();
  // 25 slot scene siap; scene 1292 sengaja ditangguhkan (flag F1 pada
  // docs/shots/image-manifest.md). Prolog dan Finale memakai bingkai
  // tersendiri di luar slot scene.
  await expect(page.locator('[data-media-state="ready"]')).toHaveCount(25);
  await expect(page.locator('[data-media-state="pending"]')).toHaveCount(1);
  // Prolog bergerak sebagai video (direktif Chief 2026-08-28) dengan citra
  // 00-prologue sebagai poster; Finale tetap mengunjungi citra yang sama.
  await expect(
    page.locator('[data-framing="prologue"] video'),
  ).toHaveCount(1);
  await expect(page.locator('[data-framing="finale"] img')).toHaveCount(1);
  await expect(
    page.getByText("Sejak kapan sebuah kota mulai menjadi dirinya sendiri?"),
  ).toBeVisible();
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

  const prologue = page.locator('[data-scene="prologue"]');
  await expect(prologue).toHaveCount(1);
  // Satu dunia visual: satu video pembuka (poster = citra prolog), tanpa
  // citra kedua yang menduplikasinya.
  await expect(prologue.locator("video")).toHaveCount(1);
  await expect(prologue.locator("img")).toHaveCount(0);
  await expect(prologue.locator(".scene-readout")).toHaveCount(0);
  await expect(prologue.locator('[data-motion="master"]')).toHaveAttribute(
    "data-editorial-role",
    "lead-line",
  );

  const beats = prologue.locator('[data-motion="passage"]');
  await expect(beats).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    await expect(beats.nth(index)).toHaveAttribute(
      "data-beat-index",
      String(index),
    );
  }
  await expect(beats.nth(0)).toContainText("Kediri hidup di tahun 2026.");
  await expect(beats.nth(5)).toContainText("perlahan menjadi Kediri");

  const firstScene = page.locator('[id="879-first-mark"]');
  await expect(firstScene.locator('[data-motion="passage"]')).toHaveCount(4);
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
    // naskah (1042 kini dua beat sejak pemangkasan paragraf 2026-08-28).
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

test("mobile reduced early scenes keep metadata clear of the visual label", async ({
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
    "prologue-2026",
    "879-first-mark",
    "921-kadhiri",
    "1015-name-endures",
    "1042-river-divides-kingdom",
  ] as const) {
    const scene = page.locator(`[id="${slug}"]`);
    const label = scene.locator(".stage-visual-label");
    const contextBlock = scene.locator(
      slug === "prologue-2026" ? ".prologue-context" : ".stage-context",
    );
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

test("evidence is one interaction away, and names its source", async ({
  page,
}) => {
  await page.goto("/journey#1135-panjalu-jayati");
  const scene = page.locator(SCENE_1135);
  await scene.locator("details > summary").click();
  await expect(scene.getByText("Bukti yang menopang").first()).toBeVisible();
  await expect(
    scene.getByText("catatan katalog D.9", { exact: false }).first(),
  ).toBeVisible();
});

test("journey to archive and back restores the exact scene", async ({
  page,
}) => {
  // Alur yang UX Bible bagian 17 sebut sakral.
  await page.goto("/journey#1135-panjalu-jayati");
  await page
    .locator(SCENE_1135)
    .getByRole("link", { name: "Catatan arsip lengkap" })
    .click();
  await expect(page).toHaveURL(/\/archive\/events\/1135-panjalu-jayati$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Panjalu Jayati",
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/journey#1135-panjalu-jayati$/);
  await expect(page.locator(SCENE_1135)).toBeVisible();
});

test("the archive record separates record from reading", async ({ page }) => {
  await page.goto("/archive/events/1135-panjalu-jayati");
  await expect(page.getByText("PRIMARY RECORD").first()).toBeVisible();
  await expect(
    page.getByText("SCHOLARLY INTERPRETATION").first(),
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
    page.getByRole("heading", { name: "The First Mark" }),
  ).toBeVisible();
  await expect(
    page.getByText("27 Juli 879").or(page.getByText("879")).first(),
  ).toBeVisible();
  // Bukti tetap terbuka lewat elemen <details> asli.
  await expect(page.getByText("Lihat bukti").first()).toBeVisible();
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
