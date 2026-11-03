// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CabinetArt, FIGURE } from "../src/components/auth/cabinet/art";
import { CARCASS, CARDS_MAX, CATEGORIES, DRAWER, DRAWERS, ENTRIES, FRONT, TOUR, behind, cardX, cardsFor, drawerBox, paintOrder } from "../src/components/auth/cabinet/layout";

describe("cabinet layout", () => {
  it("files exactly the categories and counts of the knowledge SSOT", () => {
    const ssot = JSON.parse(readFileSync("theoracle/ssot/sentrapedia-knowledge-ssot.json", "utf8")) as { penyakit: Array<{ kategori: string }> };
    const counts = new Map<string, number>();
    for (const entry of ssot.penyakit) counts.set(entry.kategori, (counts.get(entry.kategori) ?? 0) + 1);
    expect(Object.fromEntries(CATEGORIES.map((category) => [category.name, category.entries]))).toEqual(Object.fromEntries(counts));
    expect(ENTRIES).toBe(ssot.penyakit.length);
    expect([...CATEGORIES.map((category) => category.name)].sort((a, b) => a.localeCompare(b))).toEqual(CATEGORIES.map((category) => category.name));
  });

  it("gives every category one drawer inside the carcass face, and the tour walks them all", () => {
    expect(DRAWERS).toHaveLength(CATEGORIES.length);
    expect(TOUR).toHaveLength(DRAWERS.length);
    for (const drawer of DRAWERS) {
      expect(drawer.y0).toBeGreaterThanOrEqual(CARCASS.y0 + DRAWER.gap);
      expect(drawer.y1).toBeLessThanOrEqual(CARCASS.y1 - DRAWER.gap);
      expect(drawer.z0).toBeGreaterThanOrEqual(CARCASS.z0 + DRAWER.gap);
      expect(drawer.z1).toBeLessThanOrEqual(CARCASS.z1 - DRAWER.gap);
      expect(drawer.cards).toBe(cardsFor(drawer.category.entries));
    }
    expect(cardsFor(1)).toBe(1);
    expect(cardsFor(69)).toBe(CARDS_MAX);
  });

  it("keeps every card inside the drawer's room at rest, at full stroke and fully raised", () => {
    const { pull, floor, card, rise } = DRAWER;
    for (const drawer of DRAWERS) {
      const top = drawer.z0 + floor * 2 + card.height + card.tab + rise;
      expect(top).toBeLessThan(drawer.z1);
      for (let index = 0; index < drawer.cards; index++) {
        const x = cardX(drawer, index);
        expect(x).toBeGreaterThan(FRONT - DRAWER.depth + DRAWER.wall);
        expect(x + card.thick).toBeLessThan(FRONT);
        // At full stroke every card stands in the part of the drawer that is out of the carcass.
        expect(x + pull).toBeGreaterThan(FRONT);
      }
    }
  });

  it("orders the drawers so none is drawn over one in front of it", () => {
    const ordered = paintOrder(DRAWERS);
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const a = drawerBox(ordered[i]!);
        const b = drawerBox(ordered[j]!);
        // Either a is behind b, or the pair is diagonal and no line of sight crosses both.
        expect(behind(a, b) || !behind(b, a)).toBe(true);
      }
    }
  });
});

describe("cabinet figure", () => {
  it("draws every drawer with its cards, each in its own clip", () => {
    const svg = renderToStaticMarkup(createElement(CabinetArt));
    expect(FIGURE.drawers).toBe(24);
    expect(FIGURE.cards).toBe(DRAWERS.reduce((sum, drawer) => sum + drawer.cards, 0));
    expect((svg.match(/<clipPath /g) ?? []).length).toBe(24);
    expect((svg.match(/data-drawer="/g) ?? []).length).toBe(24);
    expect((svg.match(/data-card="/g) ?? []).length).toBe(FIGURE.cards);
    for (const id of TOUR) expect(svg).toContain(`data-cell-solid="${id}"`);
    expect(svg).toMatch(/data-pull="-?[\d.]+,-?[\d.]+"/);
    expect(svg).toMatch(/data-rise="-?[\d.]+,-?[\d.]+"/);
    expect(svg).not.toMatch(/tabindex|<a |<button|<input/i);
  });
});
