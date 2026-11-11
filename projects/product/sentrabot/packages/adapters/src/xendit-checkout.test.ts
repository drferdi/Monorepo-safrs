import { describe, expect, it, vi } from "vitest";

describe("Xendit hosted checkout", () => {
  it("creates an Indonesian hosted Payment Session without putting payment state in the client", async () => {
    const { XenditCheckoutProvider } = await import("./xendit-checkout.js");
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          payment_session_id: "session-1",
          payment_link_url: "https://checkout.test/session-1",
        }),
        { status: 200 },
      ),
    );
    const provider = new XenditCheckoutProvider({ apiKey: "test-key", fetch });

    await expect(
      provider.createCheckout({
        referenceId: "checkout-1",
        amount: 79_000,
        currency: "IDR",
        country: "ID",
        description: "SentraBot Plus",
        successReturnUrl: "https://sentrabot.test/billing/success",
        cancelReturnUrl: "https://sentrabot.test/billing/cancel",
      }),
    ).resolves.toEqual({
      providerReference: "checkout-1",
      checkoutUrl: "https://checkout.test/session-1",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.xendit.co/sessions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"allowed_payment_channels":["QRIS"]'),
      }),
    );
  });
});
