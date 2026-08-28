import { describe, expect, it } from "vitest";

import {
  BAKED_TEXT_BOXES,
  SCENE_FRAMING,
  type SourceWindow,
  visibleSourceRect,
} from "../src/modules/motion/framing";

/**
 * Gerbang Authority Rule 1.
 *
 * `docs/production/00_IMPLEMENTATION_AUTHORITY.md`: teks sejarah yang membawa
 * makna faktual, kronologis, geografis, evidensial, atau epistemik tidak boleh
 * terbakar ke dalam raster sinematik.
 *
 * Sebagian aset produksi Batch A sudah terlanjur membawanya. Keputusan Chief
 * 2026-08-28 melarang regenerasi, jadi teks itu dikeluarkan dari bingkai lewat
 * jendela pengarahan di `modules/motion/framing.ts` dan maknanya dikembalikan
 * sebagai lapisan DOM.
 *
 * Prosa tidak menjaga apa pun. Berkas inilah yang menjaganya. Perkiraan pertama
 * atas letak kotak teks MELESET pada 921 dan 1042, dan kebocorannya baru
 * ketahuan ketika bingkai akhir disimulasikan — persis kegagalan yang akan
 * terulang diam-diam kalau seseorang menggeser satu jendela nanti.
 *
 * Karena itu tesnya menguji seluruh rasio viewport yang didukung, bukan satu
 * ukuran nyaman. Kebocoran pertama muncul justru di ultrawide dan di ponsel
 * paling sempit, bukan di 1280x720.
 */

const DESKTOP_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 1920, height: 1080 },
  // Ultrawide memuai secara horizontal dan pernah membocorkan JENGGALA.
  { width: 2560, height: 1080 },
  { width: 3440, height: 1440 },
] as const;

const MOBILE_VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
] as const;

function overlaps(
  rect: { x0: number; y0: number; x1: number; y1: number },
  box: SourceWindow,
): boolean {
  const bx1 = box.x + box.width;
  const by1 = box.y + box.height;
  return !(
    bx1 < rect.x0 ||
    box.x > rect.x1 ||
    by1 < rect.y0 ||
    box.y > rect.y1
  );
}

describe("Authority Rule 1 — teks terbakar tidak boleh masuk bingkai", () => {
  for (const [slug, boxes] of Object.entries(BAKED_TEXT_BOXES)) {
    const framing = SCENE_FRAMING[slug];

    it(`${slug} memiliki jendela pengarahan`, () => {
      expect(framing).toBeDefined();
      expect(framing?.desktop).toBeDefined();
      expect(framing?.mobile).toBeDefined();
    });

    it(`${slug} menjaga teks terbakar keluar bingkai di seluruh viewport desktop`, () => {
      if (!framing) throw new Error(`framing hilang untuk ${slug}`);
      for (const viewport of DESKTOP_VIEWPORTS) {
        const rect = visibleSourceRect(framing, framing.desktop, viewport);
        for (const box of boxes) {
          expect(
            overlaps(rect, box),
            `${slug} membocorkan teks terbakar pada ${viewport.width}x${viewport.height}`,
          ).toBe(false);
        }
      }
    });

    it(`${slug} menjaga teks terbakar keluar bingkai di seluruh viewport mobile`, () => {
      if (!framing) throw new Error(`framing hilang untuk ${slug}`);
      for (const viewport of MOBILE_VIEWPORTS) {
        const rect = visibleSourceRect(framing, framing.mobile, viewport);
        for (const box of boxes) {
          expect(
            overlaps(rect, box),
            `${slug} membocorkan teks terbakar pada ${viewport.width}x${viewport.height}`,
          ).toBe(false);
        }
      }
    });
  }
});

describe("jendela pengarahan tetap berada di dalam aset", () => {
  it("tidak ada jendela yang keluar batas sumber", () => {
    for (const [slug, framing] of Object.entries(SCENE_FRAMING)) {
      for (const window of [framing.desktop, framing.mobile]) {
        if (!window) continue;
        expect(window.x, `${slug}`).toBeGreaterThanOrEqual(0);
        expect(window.y, `${slug}`).toBeGreaterThanOrEqual(0);
        expect(window.x + window.width, `${slug}`).toBeLessThanOrEqual(
          framing.source.width,
        );
        expect(window.y + window.height, `${slug}`).toBeLessThanOrEqual(
          framing.source.height,
        );
      }
    }
  });

  it("tidak ada bidang pandang yang keluar aset, sehingga tidak pernah ada pita kosong", () => {
    for (const [slug, framing] of Object.entries(SCENE_FRAMING)) {
      for (const [window, viewports] of [
        [framing.desktop, DESKTOP_VIEWPORTS],
        [framing.mobile, MOBILE_VIEWPORTS],
      ] as const) {
        for (const viewport of viewports) {
          const rect = visibleSourceRect(framing, window, viewport);
          const slack = 1.5;
          expect(rect.x0, `${slug} ${viewport.width}`).toBeGreaterThanOrEqual(
            -slack,
          );
          expect(rect.y0, `${slug} ${viewport.width}`).toBeGreaterThanOrEqual(
            -slack,
          );
          expect(rect.x1, `${slug} ${viewport.width}`).toBeLessThanOrEqual(
            framing.source.width + slack,
          );
          expect(rect.y1, `${slug} ${viewport.width}`).toBeLessThanOrEqual(
            framing.source.height + slack,
          );
        }
      }
    }
  });

  it("setiap jendela membawa alasan pengarahannya", () => {
    for (const [slug, framing] of Object.entries(SCENE_FRAMING)) {
      expect(framing.rationale.length, `${slug}`).toBeGreaterThan(40);
    }
  });
});
