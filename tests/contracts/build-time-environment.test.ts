import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const nextConfigEntry = fileURLToPath(
  new URL(
    "../../projects/golden-path/apps/web/next.config.ts",
    import.meta.url,
  ),
);

describe("build-time environment validation", () => {
  it("evaluating next.config.ts without required variables fails and names them", () => {
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", nextConfigEntry],
      {
        encoding: "utf8",
        env: {
          NODE_ENV: "production",
          PATH: process.env.PATH,
        },
      },
    );
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain("Invalid environment variables");
    expect(output).toContain("DATABASE_URL");
    expect(output).toContain("APP_URL");
  });

  it("evaluating next.config.ts with required variables succeeds", () => {
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", nextConfigEntry],
      {
        encoding: "utf8",
        env: {
          APP_URL: "http://127.0.0.1:3000",
          DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_local",
          NODE_ENV: "production",
          PATH: process.env.PATH,
        },
      },
    );

    expect(result.status).toBe(0);
  });
});
