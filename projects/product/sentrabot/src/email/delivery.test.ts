import { describe, expect, it, vi } from "vitest";
import { deliverEmail } from "./delivery.ts";

describe("Sentra Bot email delivery", () => {
  const message = {
    to: "chief@example.com",
    subject: "Verify",
    text: "Open link",
  };

  it("uses local sink outside production", async () => {
    const localSink = vi.fn().mockResolvedValue(undefined);
    expect(
      await deliverEmail(
        {
          nodeEnv: "development",
          from: "noreply@example.test",
          allowExternalDelivery: false,
          localSink,
          providerSend: vi.fn(),
        },
        message,
      ),
    ).toEqual({ mode: "local" });
    expect(localSink).toHaveBeenCalledWith(message);
  });

  it("blocks production delivery unless explicitly enabled with a provider", async () => {
    await expect(
      deliverEmail(
        {
          nodeEnv: "production",
          from: "noreply@example.com",
          allowExternalDelivery: false,
        },
        message,
      ),
    ).rejects.toThrow("External email delivery is disabled");
  });
});
