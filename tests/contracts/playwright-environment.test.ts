import { describe, expect, it } from "vitest";
import { resolvePlaywrightEnvironment } from "../../projects/golden-path/apps/web/e2e/environment.js";

const safeEnvironment = {
  APP_URL: "http://127.0.0.1:3001",
  DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_e2e_test",
  NODE_ENV: "test",
};

describe("Playwright database environment", () => {
  it.each([
    [
      "external host",
      "postgresql://safrs:safrs@db.example.test:54329/safrs_e2e_test",
    ],
    ["wrong port", "postgresql://safrs:safrs@127.0.0.1:5432/safrs_e2e_test"],
    [
      "non-test database",
      "postgresql://safrs:safrs@127.0.0.1:54329/safrs_local",
    ],
  ])(
    "rejects an inherited %s DATABASE_URL before starting a web server",
    (_label, databaseUrl) => {
      expect(() =>
        resolvePlaywrightEnvironment({
          ...safeEnvironment,
          DATABASE_URL: databaseUrl,
        }),
      ).toThrow(/^\[E2E\] DATABASE_URL DITOLAK/u);
    },
  );

  it("accepts only the disposable _test database passed to the browser journey", () => {
    expect(resolvePlaywrightEnvironment(safeEnvironment)).toEqual(
      safeEnvironment,
    );
  });
});
