import { describe, expect, it, vi } from "vitest";

describe("Xendit billing webhook", () => {
  it("rejects an unsigned payment callback before querying billing state", async () => {
    const { mountXenditWebhookRoutes } = await import("./xendit-webhook.js");
    const { Hono } = await import("hono");
    const app = new Hono();
    const resolvePaymentTarget = vi.fn();
    mountXenditWebhookRoutes(app, {
      callbackToken: "callback-token",
      resolvePaymentTarget,
      applyVerifiedPayment: vi.fn(),
    });

    const response = await app.request("/v1/billing/xendit/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-callback-token": "wrong" },
      body: JSON.stringify({ id: "payment-1", external_id: "checkout-1", status: "PAID" }),
    });

    expect(response.status).toBe(401);
    expect(resolvePaymentTarget).not.toHaveBeenCalled();
  });

  it("activates Plus from a verified Payment Session completion", async () => {
    const { mountXenditWebhookRoutes } = await import("./xendit-webhook.js");
    const { Hono } = await import("hono");
    const app = new Hono();
    const resolvePaymentTarget = vi.fn().mockResolvedValue({
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    const applyVerifiedPayment = vi.fn().mockResolvedValue({ applied: true });
    mountXenditWebhookRoutes(app, {
      callbackToken: "callback-token",
      resolvePaymentTarget,
      applyVerifiedPayment,
    });

    const response = await app.request("/v1/billing/xendit/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-callback-token": "callback-token" },
      body: JSON.stringify({
        event: "payment_session.completed",
        data: {
          payment_session_id: "ps-1",
          reference_id: "checkout-1",
          status: "COMPLETED",
        },
      }),
    });

    expect(response.status).toBe(204);
    expect(resolvePaymentTarget).toHaveBeenCalledWith("checkout-1");
    expect(applyVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({ providerEventId: "ps-1", lifecycle: "paid" }),
    );
  });
});
