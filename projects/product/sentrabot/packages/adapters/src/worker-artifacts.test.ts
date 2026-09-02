import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("worker artifact wiring", () => {
  it("constructs the run executor with an artifact store through the shared composition", () => {
    const worker = readFileSync(path.join(here, "../../../apps/worker/src/index.ts"), "utf8");
    const api = readFileSync(path.join(here, "../../../apps/api/src/app.ts"), "utf8");
    const composition = readFileSync(path.join(here, "agent-runtime-composition.ts"), "utf8");
    expect(worker).toContain("composeAgentRuntime(");
    expect(api).toContain("composeAgentRuntime(");
    expect(composition).toContain("new LocalArtifactStore(");
    expect(composition).toContain("artifacts,");
  });
});
