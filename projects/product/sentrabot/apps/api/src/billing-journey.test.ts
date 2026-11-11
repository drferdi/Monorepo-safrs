import { describe, expect, it } from "vitest";

describe("billing journey", () => {
  it("activates Plus exactly once after a signed QRIS payment callback", async () => {
    const { createBillingRoutes } = await import("./billing-routes.js");
    const { mountXenditWebhookRoutes } = await import("./xendit-webhook.js");
    const { Hono } = await import("hono");
    const app = new Hono();
    const checkoutReferences = new Map<string, { userId: string; workspaceId: string }>();
    const appliedEvents = new Set<string>();
    const entitlements: string[] = [];

    app.route(
      "/",
      createBillingRoutes({
        authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
        beginCheckout: async (input) => {
          checkoutReferences.set(input.providerReference, input);
        },
        createCheckout: async (input) => ({
          providerReference: input.referenceId,
          checkoutUrl: "https://checkout.test/qris-1",
        }),
        newReference: () => "checkout-1",
        successReturnUrl: "https://sentrabot.test/billing/success",
        cancelReturnUrl: "https://sentrabot.test/billing/cancel",
      }),
    );
    mountXenditWebhookRoutes(app, {
      callbackToken: "callback-token",
      resolvePaymentTarget: async (reference) => checkoutReferences.get(reference) ?? null,
      applyVerifiedPayment: async (input) => {
        if (appliedEvents.has(input.providerEventId)) return { applied: false };
        appliedEvents.add(input.providerEventId);
        entitlements.push(`${input.workspaceId}:active_plus`);
        return { applied: true };
      },
    });

    const checkout = await app.request("/v1/billing/checkout", { method: "POST" });
    expect(checkout.status).toBe(200);

    const callback = () =>
      app.request("/v1/billing/xendit/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-callback-token": "callback-token" },
        body: JSON.stringify({ id: "payment-1", external_id: "checkout-1", status: "PAID" }),
      });
    expect((await callback()).status).toBe(204);
    expect((await callback()).status).toBe(204);
    expect(entitlements).toEqual(["workspace-1:active_plus"]);
  });
});
