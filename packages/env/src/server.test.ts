import { describe, expect, it, vi } from "vitest";

vi.stubEnv("APP_URL", "http://localhost:3000");
vi.stubEnv(
  "DATABASE_URL",
  "postgresql://safrs:safrs@127.0.0.1:54329/safrs_test",
);
vi.stubEnv("NODE_ENV", "test");

const { createServerEnv } = await import("./server.js");

describe("createServerEnv", () => {
  it("does not mutate unrelated empty values on the caller environment", () => {
    const environment = {
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_test",
      NODE_ENV: "test",
      UNRELATED_EMPTY: "",
    };

    createServerEnv(environment);

    expect(environment.UNRELATED_EMPTY).toBe("");
  });

  it("reads only declared server variables", () => {
    let unrelatedValueRead = false;
    const environment = {
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_test",
      NODE_ENV: "test",
      get UNRELATED_VALUE() {
        unrelatedValueRead = true;
        return "not-for-validation";
      },
    };

    createServerEnv(environment);

    expect(unrelatedValueRead).toBe(false);
  });

  it("reports a missing DATABASE_URL without exposing supplied values", () => {
    const suppliedAppUrl = "https://example.test/app?token=do-not-expose";

    expect(() =>
      createServerEnv({
        APP_URL: suppliedAppUrl,
        NODE_ENV: "test",
      }),
    ).toThrowError("Invalid environment variables: DATABASE_URL");

    try {
      createServerEnv({
        APP_URL: suppliedAppUrl,
        NODE_ENV: "test",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(suppliedAppUrl);
    }
  });

  it("requires a complete Stripe key prefix without exposing its value", () => {
    const environment = {
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_test",
      NODE_ENV: "test" as const,
      STRIPE_SECRET_KEY: "sk_not_a_complete_key",
    };

    expect(() => createServerEnv(environment)).toThrowError(
      "Invalid environment variables: STRIPE_SECRET_KEY",
    );
  });

  it("accepts complete Stripe test and live key prefixes", () => {
    const baseEnvironment = {
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_test",
      NODE_ENV: "test" as const,
    };

    expect(() =>
      createServerEnv({
        ...baseEnvironment,
        STRIPE_SECRET_KEY: "sk_test_123",
      }),
    ).not.toThrow();
    expect(() =>
      createServerEnv({
        ...baseEnvironment,
        STRIPE_SECRET_KEY: "sk_live_123",
      }),
    ).not.toThrow();
  });
});
