import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const compose = readFileSync(
  new URL("./docker-compose.yml", import.meta.url),
  "utf8",
);

describe("self-host Compose topology", () => {
  it("keeps the backend network internal and services health-gated", () => {
    expect(compose).toContain("internal: true");
    expect(compose).toContain("condition: service_healthy");
    expect(compose).not.toContain("docker.sock");
    expect(compose).toContain("public:");
  });

  it("does not expose worker or supervisor ports publicly", () => {
    expect(compose).toContain('expose: ["8787"]');
    expect(compose).toContain('expose: ["8788"]');
    expect(compose).not.toContain("8787:8787");
    expect(compose).not.toContain("8788:8788");
  });

  it("uses executable runtime commands for every application service", () => {
    expect(compose).toContain(
      "dockerfile: projects/product/sentrabot/infra/compose/Dockerfile.web",
    );
    expect(compose).toContain(
      "dockerfile: projects/product/sentrabot/infra/compose/Dockerfile.worker",
    );
    expect(compose).toContain(
      "dockerfile: projects/product/sentrabot/infra/compose/Dockerfile.supervisor",
    );
    for (const dockerfile of [
      "Dockerfile.web",
      "Dockerfile.worker",
      "Dockerfile.supervisor",
    ]) {
      const contents = readFileSync(
        new URL(`./${dockerfile}`, import.meta.url),
        "utf8",
      );
      expect(contents).toContain("CMD");
    }
  });
});
