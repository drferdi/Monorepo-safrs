import { describe, expect, it } from "vitest";
import {
  decryptCredential,
  encryptCredential,
  rotateCredential,
} from "./credential-envelope.js";

describe("versioned credential envelope", () => {
  it("round-trips without exposing plaintext in the envelope", () => {
    const envelope = encryptCredential("provider-secret", "old-key");
    expect(envelope).toMatch(/^v1\./);
    expect(envelope).not.toContain("provider-secret");
    expect(decryptCredential(envelope, "old-key")).toBe("provider-secret");
  });

  it("supports key rotation", () => {
    const rotated = rotateCredential(
      encryptCredential("provider-secret", "old-key"),
      "old-key",
      "new-key",
    );
    expect(decryptCredential(rotated, "new-key")).toBe("provider-secret");
    expect(() => decryptCredential(rotated, "old-key")).toThrow();
  });

  it("rejects unsupported envelope versions", () => {
    expect(() => decryptCredential("v0.invalid", "key")).toThrow(
      "Unsupported credential envelope",
    );
  });
});
