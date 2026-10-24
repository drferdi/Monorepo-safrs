import { describe, expect, it } from "vitest";
import { streamAt, typedAt, wordsUpTo } from "../src/lib/typing";

// Answer reveal like a chat reply (Gaffer, 2026-10-20: "seperti claude.ai"). Measured on beta the same day: whole
// lines and paragraphs arrived in steps and the section pauses gave 350-520 ms stills ("kasar, lompat, tersendat").
describe("wordsUpTo", () => {
  const sentence = (n: number) => `Kalimat nomor ${n} menjelaskan temuan klinis dengan cukup panjang supaya realistis.`;
  const paragraph = Array.from({ length: 12 }, (_, i) => sentence(i + 1)).join(" ");
  const text = ["## Ringkasan", paragraph, "- Pneumonia", `- ${paragraph}`].join("\n");

  it("grows a long line a whole word at a time, never cutting a word", () => {
    const steps = new Set<string>();
    for (let count = 0; count <= text.length; count++) steps.add(wordsUpTo(text, count));
    expect(steps.size).toBeGreaterThan(100);
    for (const shown of steps) {
      expect(text.startsWith(shown)).toBe(true);
      expect(shown === "" || shown === text || /\s/.test(text[shown.length])).toBe(true);
    }
  });
  it("only ever grows as more characters are typed", () => {
    let previous = "";
    for (let count = 0; count <= text.length; count++) {
      const shown = wordsUpTo(text, count);
      expect(shown.startsWith(previous)).toBe(true);
      previous = shown;
    }
  });
  it("shows a field label only whole, so it is never half-styled", () => {
    const labelled = ["Keluhan utama", "  nyeri kepala hebat bagian belakang sejak dua hari", "Data yang perlu dilengkapi", "- Durasi dan frekuensi nyeri kepala", "Pemeriksaan penunjang", "Darah rutin untuk menyingkirkan infeksi sistemik."].join("\n");
    const lasts = new Set<string>();
    for (let count = 1; count < labelled.length; count++) lasts.add(wordsUpTo(labelled, count).split("\n").at(-1) ?? "");
    for (const partial of ["Keluhan", "Data", "Data yang", "Pemeriksaan"]) expect(lasts.has(partial)).toBe(false);
    expect(lasts.has("Keluhan utama")).toBe(true);
    expect(lasts.has("  nyeri kepala")).toBe(true);
  });
  it("brings a line's evidence marker together with its first word", () => {
    const detail = "  Mendukung: demam tinggi dan batuk berdahak sejak tiga hari terakhir";
    for (let count = 1; count < detail.length; count++) expect(wordsUpTo(detail, count)).not.toMatch(/^\s*(?:M\w*|Mendukung:)$/);
  });
  it("brings a line's list marker together with its first word", () => {
    for (let count = 0; count <= text.length; count++) expect(wordsUpTo(text, count).split("\n").at(-1)).not.toBe("-");
    for (let count = 0; count <= text.length; count++) expect(wordsUpTo(text, count).endsWith("\n- ")).toBe(false);
  });
  it("shows nothing before typing and everything after", () => {
    expect(wordsUpTo(text, 0)).toBe("");
    expect(wordsUpTo(text, text.length)).toBe(text);
    expect(wordsUpTo(text, text.length + 5)).toBe(text);
    expect(wordsUpTo("", 3)).toBe("");
  });
});

describe("typedAt", () => {
  it("streams a short answer at one steady pace", () => {
    expect(typedAt(0, 2000)).toBe(0);
    expect(typedAt(1000, 2000)).toBeCloseTo(400);
    expect(typedAt(2000, 2000)).toBeCloseTo(800);
    expect(typedAt(5000, 2000)).toBe(2000);
  });
  it("streams the first screen of a long answer at the same pace, then speeds up to end within 10 seconds", () => {
    expect(typedAt(1000, 22000)).toBeCloseTo(400);
    expect(typedAt(10000, 22000)).toBeCloseTo(22000);
    expect(typedAt(Infinity, 22000)).toBe(22000);
    let previous = 0, pace = 0;
    for (let t = 16; t <= 10000; t += 16) {
      const typed = typedAt(t, 22000), step = typed - previous;
      expect(step).toBeGreaterThanOrEqual(pace - 1e-9); // never slows down, so it never stutters
      previous = typed; pace = step;
    }
  });
});

describe("streamAt", () => {
  it("runs on from one section into the next without a pause", () => {
    expect(streamAt([0, 100, 0, 50], 0)).toEqual({ visible: [0, 0, 0, 0], active: 1, done: false });
    expect(streamAt([0, 100, 0, 50], 120)).toEqual({ visible: [0, 100, 0, 20], active: 3, done: false });
    expect(streamAt([0, 100, 0, 50], 150)).toEqual({ visible: [0, 100, 0, 50], active: 3, done: true });
  });
});
