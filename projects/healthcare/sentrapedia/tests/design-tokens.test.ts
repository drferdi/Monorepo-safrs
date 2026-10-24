import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "../src/components/sidebar";
import { initialWorkspace } from "../src/lib/workspace";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const token = (name: string) => {
  const match = root.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,6})\\b`));
  if (!match) throw new Error(`${name} is not a hex token in :root`);
  return match[1];
};
const luminance = (hex: string) => {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const declarations = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors.split(",").map((s) => s.trim()).includes(selector)).map(([, , body]) => body).join(";");

describe("contrast of the semantic colour tokens (WCAG 2.2 AA)", () => {
  const canvas = token("--color-background-canvas"), surface = token("--color-background-surface"), white = token("--workspace-white");
  it("keeps body and secondary text at 4.5:1 on every background", () => {
    for (const background of [canvas, surface, white]) {
      expect(contrast(token("--color-text-primary"), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token("--color-text-secondary"), background)).toBeGreaterThanOrEqual(4.5);
    }
  });
  // Muted text is 4.37:1 on the surface colour, so surface text uses secondary (see the selector checks below).
  it("keeps muted text at 4.5:1 on canvas and white", () => {
    expect(contrast(token("--color-text-muted"), canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--color-text-muted"), white)).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps field edges and the focus ring at 3:1", () => {
    expect(contrast(token("--workspace-control-border"), white)).toBeGreaterThanOrEqual(3);
    expect(contrast(token("--workspace-focus"), canvas)).toBeGreaterThanOrEqual(3);
  });
});

describe("muted text never sits on the surface colour", () => {
  // The inline Clinical Cockpit and the sidebar use --color-background-surface, where muted text is 4.36:1.
  it.each([".timeline-encounter small", ".timeline-encounter span", ".nav-group-title", ".empty-text"])("%s uses secondary text", (selector) => {
    const body = declarations(selector);
    expect(body).toMatch(/color:\s*var\(--color-text-secondary\)/);
    expect(body).not.toMatch(/color:\s*var\(--color-text-muted\)/);
  });
});

describe("cockpit dialog", () => {
  it("hides the side-column label at every width, because the dialog title already names the cockpit", () => {
    const at = css.indexOf(".dialog .clinical-panel-header {");
    expect(at).toBeGreaterThan(-1);
    const before = css.slice(0, at);
    expect(before.split("{").length - before.split("}").length).toBe(0);
    expect(declarations(".dialog .clinical-panel-header")).toMatch(/display:\s*none/);
  });
});

describe("sidebar empty state", () => {
  it("offers a first Encounter instead of a dead end", () => {
    const empty = { ...initialWorkspace, patients: [], encounters: [], activeEncounterId: null };
    const html = renderToStaticMarkup(createElement(Sidebar, { state: empty, open: true, mobile: false, onToggle() {}, onDialog() {}, onNew() {}, onSelect() {}, onToast() {} }));
    expect(html).toMatch(/<button[^>]*class="empty-text"[^>]*>Mulai Encounter pertama/);
  });
});
