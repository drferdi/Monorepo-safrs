import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

describe("Sentra Bot release parity contract", () => {
  it("keeps product identity out of runtime files", () => {
    const runtimeFiles = [
      "projects/product/sentrabot/apps/worker/src/index.ts",
      "projects/product/sentrabot/apps/sandbox-supervisor/src/index.ts",
      "projects/product/sentrabot/apps/web/src/app/page.tsx",
    ];
    for (const file of runtimeFiles) {
      const source = read(file).toLowerCase();
      expect(source).not.toContain("@rakazo");
      expect(source).not.toContain("rakazo_");
    }
  });

  it("declares the release blockers instead of hiding them", () => {
    const evidence = read("projects/product/sentrabot/docs/release-parity.md");
    expect(evidence).toContain("d17a138");
    expect(evidence).toContain("Docker executor has not run");
    expect(evidence).toContain("Electron runtime is documented");
  });
});
