import { describe, expect, it } from "vitest";

describe("Xendit callback token", () => {
  it("accepts the configured callback token without parsing payment content", async () => {
    const { hasValidXenditCallbackToken } = await import("./xendit.js");

    expect(hasValidXenditCallbackToken("callback-token", "callback-token")).toBe(true);
    expect(hasValidXenditCallbackToken("callback-token", "wrong-token")).toBe(false);
  });
});
