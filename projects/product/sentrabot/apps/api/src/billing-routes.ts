import { Hono } from "hono";

export interface BillingActor {
  userId: string;
  workspaceId: string;
}

export interface BillingRouteDependencies {
  authenticate(request: Request): Promise<BillingActor | null>;
  beginCheckout(input: {
    userId: string;
    workspaceId: string;
    provider: "xendit";
    providerReference: string;
  }): Promise<void>;
  createCheckout(input: {
    referenceId: string;
    amount: number;
    currency: "IDR";
    country: "ID";
    description: string;
    successReturnUrl: string;
    cancelReturnUrl: string;
  }): Promise<{ providerReference: string; checkoutUrl: string }>;
  newReference(): string;
  successReturnUrl: string;
  cancelReturnUrl: string;
}

export function createBillingRoutes(dependencies: BillingRouteDependencies): Hono {
  const app = new Hono();
  app.post("/v1/billing/checkout", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const referenceId = dependencies.newReference();
    await dependencies.beginCheckout({
      userId: actor.userId,
      workspaceId: actor.workspaceId,
      provider: "xendit",
      providerReference: referenceId,
    });
    const checkout = await dependencies.createCheckout({
      referenceId,
      amount: 79_000,
      currency: "IDR",
      country: "ID",
      description: "SentraBot Plus",
      successReturnUrl: dependencies.successReturnUrl,
      cancelReturnUrl: dependencies.cancelReturnUrl,
    });
    return context.json({ checkoutUrl: checkout.checkoutUrl });
  });
  return app;
}
