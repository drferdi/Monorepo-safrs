import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serverEntry = fileURLToPath(
  new URL("../../packages/env/src/server.ts", import.meta.url),
);

describe("server environment boundary", () => {
  it("fails in a clean process when DATABASE_URL is absent without leaking sentinels", () => {
    const databaseSentinel =
      "postgresql://leak:never-print@db.example.test/secret";
    const appUrlSentinel = "https://example.test/?access_token=never-print";
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", serverEntry],
      {
        encoding: "utf8",
        env: {
          APP_URL: appUrlSentinel,
          NODE_ENV: "test",
          SENTINEL_DATABASE_URL: databaseSentinel,
          PATH: process.env.PATH,
        },
      },
    );
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain("DATABASE_URL");
    expect(output).not.toContain(databaseSentinel);
    expect(output).not.toContain(appUrlSentinel);
  });
});
