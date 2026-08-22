import { describe, expect, it } from "vitest";
import {
  renderPasswordResetEmail,
  renderVerificationEmail,
} from "./templates.ts";

describe("Sentra Bot email templates", () => {
  it("renders verification and reset links as text", () => {
    expect(
      renderVerificationEmail({
        appName: "Sentra Bot",
        verificationUrl: "https://example.test/v",
      }),
    ).toEqual({
      subject: "Verify your Sentra Bot account",
      text: "Verify your account by opening: https://example.test/v",
    });
    expect(
      renderPasswordResetEmail({
        appName: "Sentra Bot",
        resetUrl: "https://example.test/r",
      }).text,
    ).toContain("https://example.test/r");
  });
});
