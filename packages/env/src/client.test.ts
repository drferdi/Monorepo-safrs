import { describe, expect, it, vi } from "vitest";

// client.ts builds clientEnv from process.env at import time.
vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

const { createClientEnv } = await import("./client.js");

describe("createClientEnv", () => {
  it("accepts a valid public app URL", () => {
    const env = createClientEnv({
      NEXT_PUBLIC_APP_URL: "https://app.example.test",
    });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.example.test");
  });

  it("treats an empty public app URL as absent", () => {
    const env = createClientEnv({ NEXT_PUBLIC_APP_URL: "" });

    expect(env.NEXT_PUBLIC_APP_URL).toBeUndefined();
  });

  it("rejects an invalid public app URL without exposing the value", () => {
    const supplied = "not-a-url?token=do-not-expose";
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      expect(() =>
        createClientEnv({ NEXT_PUBLIC_APP_URL: supplied }),
      ).toThrowError("Invalid environment variables");

      try {
        createClientEnv({ NEXT_PUBLIC_APP_URL: supplied });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).not.toContain(supplied);
      }

      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(supplied);
    } finally {
      consoleError.mockRestore();
    }
  });
});
