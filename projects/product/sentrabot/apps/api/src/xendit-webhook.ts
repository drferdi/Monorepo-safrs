import { hasValidXenditCallbackToken } from "@sentrabot/adapters";
import type { Hono } from "hono";
import { readBoundedBody, WEBHOOK_MAX_BODY_BYTES } from "./webhook.js";

interface PaymentTarget {
  userId: string;
  workspaceId: string;
}

export interface XenditWebhookDependencies {
  callbackToken: string;
  resolvePaymentTarget(providerReference: string): Promise<PaymentTarget | null>;
  applyVerifiedPayment(input: {
    provider: "xendit";
    providerEventId: string;
    userId: string;
    workspaceId: string;
    lifecycle: "paid" | "renewal_failed";
    now: Date;
  }): Promise<{ applied: boolean }>;
}

export function mountXenditWebhookRoutes(app: Hono, dependencies: XenditWebhookDependencies): void {
  app.post("/v1/billing/xendit/webhook", async (context) => {
    if (
      !hasValidXenditCallbackToken(
        dependencies.callbackToken,
        context.req.header("x-callback-token") ?? null,
      )
    ) {
      return context.json({ error: "Unauthorized" }, 401);
    }
    const raw = await readBoundedBody(context.req.raw, WEBHOOK_MAX_BODY_BYTES);
    if (raw === null) return context.json({ error: "Payload too large" }, 413);
    const event = parseXenditEvent(raw);
    if (!event) return context.json({ error: "Invalid payment event" }, 400);
    const target = await dependencies.resolvePaymentTarget(event.providerReference);
    if (!target) return context.json({ error: "Unknown payment" }, 404);
    await dependencies.applyVerifiedPayment({
      provider: "xendit",
      providerEventId: event.providerEventId,
      userId: target.userId,
      workspaceId: target.workspaceId,
      lifecycle: event.lifecycle,
      now: new Date(),
    });
    return context.body(null, 204);
  });
}

function parseXenditEvent(raw: string): {
  providerEventId: string;
  providerReference: string;
  lifecycle: "paid" | "renewal_failed";
} | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const event = value as Record<string, unknown>;
    const session = asRecord(event.data);
    if (
      (event.event === "payment_session.completed" || event.event === "payment_session.expired") &&
      session
    ) {
      const providerEventId =
        typeof session.payment_session_id === "string" ? session.payment_session_id : null;
      const providerReference =
        typeof session.reference_id === "string" ? session.reference_id : null;
      if (!providerEventId || !providerReference) return null;
      return {
        providerEventId,
        providerReference,
        lifecycle: event.event === "payment_session.completed" ? "paid" : "renewal_failed",
      };
    }
    const providerEventId = typeof event.id === "string" ? event.id : null;
    const providerReference = typeof event.external_id === "string" ? event.external_id : null;
    const status = typeof event.status === "string" ? event.status : null;
    if (!providerEventId || !providerReference || !status) return null;
    if (status === "PAID" || status === "SETTLED") {
      return { providerEventId, providerReference, lifecycle: "paid" };
    }
    if (status === "FAILED" || status === "EXPIRED") {
      return { providerEventId, providerReference, lifecycle: "renewal_failed" };
    }
    return null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
