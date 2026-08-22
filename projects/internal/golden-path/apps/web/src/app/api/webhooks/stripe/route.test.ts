import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";

const baseEnvironment = {
  APP_URL: "http://127.0.0.1:3000",
  DATABASE_URL: "postgresql://safrs:safrs@127.0.0.1:54329/safrs_test",
  NODE_ENV: "test",
} as const;

const stripeEnvironment = {
  ...baseEnvironment,
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_test_dummy",
} as const;

async function loadRoute(environment: Record<string, string>) {
  vi.resetModules();

  for (const [key, value] of Object.entries(environment)) {
    vi.stubEnv(key, value);
  }

  return await import("./route.js");
}

function webhookRequest(body: string, signature?: string): Request {
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    body,
    headers: signature ? { "stripe-signature": signature } : {},
    method: "POST",
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe webhook route", () => {
  it("returns 503 when Stripe is not configured", async () => {
    const { POST } = await loadRoute({ ...baseEnvironment });

    const response = await POST(webhookRequest("{}"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "STRIPE_NOT_CONFIGURED",
    });
  });

  it("rejects a request without a signature header", async () => {
    const { POST } = await loadRoute({ ...stripeEnvironment });

    const response = await POST(webhookRequest("{}"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "SIGNATURE_MISSING",
    });
  });

  it("rejects an invalid signature", async () => {
    const { POST } = await loadRoute({ ...stripeEnvironment });

    const response = await POST(webhookRequest("{}", "t=1,v1=forged"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "SIGNATURE_INVALID",
    });
  });

  it("accepts a correctly signed event", async () => {
    const { POST } = await loadRoute({ ...stripeEnvironment });
    const payload = JSON.stringify({
      data: { object: {} },
      id: "evt_test_1",
      type: "payment_intent.succeeded",
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: stripeEnvironment.STRIPE_WEBHOOK_SECRET,
    });

    const response = await POST(webhookRequest(payload, signature));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      eventType: "payment_intent.succeeded",
      received: true,
    });
  });
});
