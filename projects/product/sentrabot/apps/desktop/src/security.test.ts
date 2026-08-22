import { describe, expect, it } from "vitest";
import { isAllowedOrigin, validateIpcRequest } from "./security.js";

describe("desktop security boundary", () => {
  it("allows only the configured HTTPS origin", () => {
    expect(
      isAllowedOrigin(
        "https://bot.example.test/workspace",
        "https://bot.example.test",
      ),
    ).toBe(true);
    expect(
      isAllowedOrigin("http://bot.example.test", "https://bot.example.test"),
    ).toBe(false);
    expect(
      isAllowedOrigin("https://evil.example.test", "https://bot.example.test"),
    ).toBe(false);
  });

  it("rejects unallowlisted IPC channels and oversized values", () => {
    expect(() => validateIpcRequest({ channel: "eval" })).toThrow();
    expect(() =>
      validateIpcRequest({
        channel: "open-external",
        value: "x".repeat(2049),
      }),
    ).toThrow();
  });
});
