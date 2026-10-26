// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { TesseractArt, FIGURE } from "../src/components/auth/tesseract/art";
import { CELLS, EDGE, POCKET, TESSERACT, TOUR, boxOf, exposed, overlaps, paintOrder, pocketsOf, faceOf } from "../src/components/auth/tesseract/layout";

describe("tesseract cabinet layout", () => {
  it("is Dali's unfolded cross: eight cells, the core hidden, seven for the tour", () => {
    expect(CELLS).toHaveLength(TESSERACT.cells);
    expect(new Set(CELLS.map((cell) => cell.id)).size).toBe(8);
    expect(CELLS.filter((cell) => cell.core)).toHaveLength(1);
    expect(TOUR).toHaveLength(7);
    expect(TOUR).not.toContain(CELLS.find((cell) => cell.core)!.id);
    expect(CELLS.every((cell) => boxOf(cell)[1] - boxOf(cell)[0] === EDGE)).toBe(true);
  });

  it("closes the core on every face the camera could see", () => {
    const core = CELLS.find((cell) => cell.core)!;
    expect(exposed(core, "x") || exposed(core, "y") || exposed(core, "z")).toBe(false);
  });

  it("keeps every pocket inside the face of its cell", () => {
    for (const cell of CELLS.filter((c) => !c.core)) {
      const box = boxOf(cell);
      for (const axis of ["x", "y"] as const) {
        const pockets = pocketsOf(cell, axis);
        expect(pockets).toHaveLength(POCKET.rows.length * 2);
        const { centre } = faceOf(cell, axis);
        for (const p of pockets) {
          expect(p.u0).toBeGreaterThanOrEqual(centre - EDGE / 2);
          expect(p.u1).toBeLessThanOrEqual(centre + EDGE / 2);
          expect(p.v0).toBeGreaterThanOrEqual(box[4]);
          expect(p.v1).toBeLessThanOrEqual(box[5]);
        }
      }
    }
  });

  it("detects overlaps and refuses to order boxes that pass through each other", () => {
    expect(overlaps([0, 2, 0, 2, 0, 2], [1, 3, 1, 3, 1, 3])).toBe(true);
    expect(overlaps([0, 1, 0, 1, 0, 1], [1, 2, 0, 1, 0, 1])).toBe(false);
    expect(() => paintOrder([{ key: "a", box: [0, 2, 0, 2, 0, 2] }, { key: "b", box: [1, 3, 1, 3, 1, 3] }], () => 0)).toThrow(/pass through/);
  });

  it("paints what is behind first", () => {
    const behind = { key: "behind", box: [0, 1, 0, 1, 0, 1] as const };
    const front = { key: "front", box: [1, 2, 0, 1, 0, 1] as const };
    expect(paintOrder([front, behind], () => 0).map((item) => item.key)).toEqual(["behind", "front"]);
  });
});

describe("tesseract figure", () => {
  it("draws seven visible cells, forty-eight cards and a dense set of parts", () => {
    expect(FIGURE.cells).toBe(7);
    expect(FIGURE.cards).toBe(48);
    expect(FIGURE.items.length).toBeGreaterThanOrEqual(80);
    expect(new Set(FIGURE.items.map((item) => item.key)).size).toBe(FIGURE.items.length);
  });

  it("marks what the motion layer moves and nothing else is focusable", () => {
    const svg = renderToStaticMarkup(createElement(TesseractArt));
    expect(svg).toContain("data-tesseract");
    expect(svg).toMatch(/data-rise="-?[\d.]+,-?[\d.]+"/);
    expect((svg.match(/data-card="/g) ?? []).length).toBe(48);
    for (const id of TOUR) expect(svg).toContain(`data-cell-solid="${id}"`);
    expect(svg).not.toMatch(/tabindex|<a |<button|<input/i);
  });
});
