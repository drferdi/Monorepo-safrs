import type { PaymentProvider } from "@sentrabot/adapter-kit";

export class XenditCheckoutProvider implements PaymentProvider {
  constructor(
    private readonly config: {
      apiKey: string;
      fetch?: typeof globalThis.fetch;
      baseUrl?: string;
    },
  ) {}

  async createCheckout(
    input: Parameters<PaymentProvider["createCheckout"]>[0],
  ): Promise<{ providerReference: string; checkoutUrl: string }> {
    const fetch = this.config.fetch ?? globalThis.fetch;
    const response = await fetch(`${this.config.baseUrl ?? "https://api.xendit.co"}/sessions`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.config.apiKey}:`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reference_id: input.referenceId,
        session_type: "PAY",
        mode: "PAYMENT_LINK",
        amount: input.amount,
        currency: input.currency,
        country: input.country,
        // Payment Session accepts an explicit channel allow-list. Keeping only
        // QRIS in the launch checkout makes the intended default deterministic.
        allowed_payment_channels: ["QRIS"],
        description: input.description,
        success_return_url: input.successReturnUrl,
        cancel_return_url: input.cancelReturnUrl,
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Xendit checkout failed (${response.status})`);
    if (!body || typeof body !== "object") throw new Error("Invalid Xendit checkout response");
    const checkoutUrl = (body as Record<string, unknown>).payment_link_url;
    if (typeof checkoutUrl !== "string" || !checkoutUrl) {
      throw new Error("Xendit checkout response lacks payment link");
    }
    return { providerReference: input.referenceId, checkoutUrl };
  }
}
