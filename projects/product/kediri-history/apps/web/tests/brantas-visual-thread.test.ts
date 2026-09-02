import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const threadPath = fileURLToPath(
  new URL("../src/modules/motion/brantas-thread.ts", import.meta.url),
);
const componentPath = fileURLToPath(
  new URL(
    "../src/components/journey/brantas-visual-thread.tsx",
    import.meta.url,
  ),
);
const cssPath = fileURLToPath(
  new URL("../src/app/(public)/globals.css", import.meta.url),
);

describe("Brantas visual thread contract", () => {
  it("defines the five historical anchor states with compatible SVG path commands", async () => {
    expect(existsSync(threadPath)).toBe(true);
    const source = await readFile(threadPath, "utf8");

    for (const anchor of [
      "prologue-2026",
      "1042-river-divides-kingdom",
      "1678-river-fortress",
      "1869-brantas-bridge",
      "2024-2026-river-to-runway",
    ]) {
      expect(source).toContain(`anchor: "${anchor}"`);
    }
    expect(source).toContain("export const BRANTAS_PATH_STATES");
    expect(source).toContain("commandCount: 6");
    expect(source).toContain("stroke:");
    expect(source).toContain("strokeWidth:");
    expect(source).toContain("strokeDasharray:");
    expect(source).toContain('"var(--kediri-river-deep)"');
    expect(source).toContain('"var(--kediri-copper)"');
    expect(source).toContain('"var(--kediri-iron)"');
    expect(source).toContain('"var(--kediri-black)"');
    expect(source).toContain("document.getElementById(state.anchor)");
    expect(source).toContain("onRefresh");
    expect(source).toContain("fromTo(");
    expect(source).toContain('ease: "none"');
    expect(source).toContain("scrub: true");
  });

  it("renders a semantic-decorative local SVG with desktop scrub and static fallback", async () => {
    expect(existsSync(componentPath)).toBe(true);
    const [component, css] = await Promise.all([
      readFile(componentPath, "utf8"),
      readFile(cssPath, "utf8"),
    ]);

    expect(component).toContain('aria-hidden="true"');
    expect(component).toContain('data-brantas-thread="true"');
    expect(component).toContain("useGSAP");
    expect(component).toContain("scope: root");
    expect(component).toContain("media.revert()");
    expect(component).toContain("prefers-reduced-motion: reduce");
    expect(component).toContain("max-width: 47.999rem");
    expect(css).toContain(".brantas-visual-thread");
    expect(css).toContain(".brantas-visual-thread__static");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("removes the decorative outgoing handoff drop shadow", async () => {
    const css = await readFile(cssPath, "utf8");
    const outgoingRule = css.match(
      /\.scene-handoff\[data-handoff-phase="outgoing"\]\s*\{([\s\S]*?)\n\}/u,
    );

    expect(outgoingRule?.[1]).not.toContain("drop-shadow");
  });
});
