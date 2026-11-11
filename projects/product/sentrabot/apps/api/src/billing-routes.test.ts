import { describe, expect, it, vi } from "vitest";

describe("billing checkout routes", () => {
  it("records a checkout reference before returning the hosted QRIS link", async () => {
    const { createBillingRoutes } = await import("./billing-routes.js");
    const beginCheckout = vi.fn();
    const app = createBillingRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      beginCheckout,
      createCheckout: async () => ({
        providerReference: "checkout-1",
        checkoutUrl: "https://pay.test/1",
      }),
      newReference: () => "checkout-1",
      successReturnUrl: "https://sentrabot.test/billing/success",
      cancelReturnUrl: "https://sentrabot.test/billing/cancel",
    });

    const response = await app.request("/v1/billing/checkout", { method: "POST" });

    expect(response.status).toBe(200);
    expect(beginCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", providerReference: "checkout-1" }),
    );
    await expect(response.json()).resolves.toEqual({ checkoutUrl: "https://pay.test/1" });
  });
});
