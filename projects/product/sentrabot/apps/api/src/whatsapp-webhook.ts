import type { MessagingInboundMessage } from "@sentrabot/adapter-kit";
import { type PhoneLocale, phoneStrings, timingSafeStringEqual } from "@sentrabot/core";
import type { Hono } from "hono";
import { readBoundedBody, WEBHOOK_MAX_BODY_BYTES } from "./webhook.js";

export const WHATSAPP_WEBHOOK_PATH = "/api/v1/whatsapp/webhook";

export const PAIRING_CODE_PATTERN = /^\s*PAIR-([A-Z0-9]{6,10})\b/i;

export type WhatsAppPairingResult = "paired" | "invalid" | "conflict-number" | "conflict-bot";

export type WhatsAppWebhookDeps = {
  verifyToken: string;
  /** HMAC over the raw body (X-Hub-Signature-256); wired to the app secret. */
  verifySignature: (rawBody: string, signatureHeader: string | undefined) => boolean;
  parseInbound: (payload: unknown) => import("@sentrabot/adapter-kit").MessagingInboundEvent | null;
  /**
   * Bind a WhatsApp number to the pairing code's user/bot. Runs BEFORE the
   * normal inbound path so an unknown number sending a code is never
   * provisioned as a synthetic user first.
   */
  completePairing: (code: string, phoneE164: string) => Promise<WhatsAppPairingResult>;
  /** Best-effort confirmation reply back to the sender. */
  sendReply?: (toE164: string, body: string) => Promise<void>;
  handle: (event: MessagingInboundMessage) => Promise<void>;
  /** Language of the pairing replies; defaults to "id". */
  locale?: PhoneLocale;
};

/**
 * Meta WhatsApp Cloud API webhook. GET answers the hub.challenge subscription
 * handshake; POST verifies the X-Hub-Signature-256 HMAC over the raw body.
 * Replay safety downstream comes from the `phone:{wamid}` client nonce.
 */
export function mountWhatsAppWebhookRoutes(app: Hono, deps: WhatsAppWebhookDeps) {
  app.get(WHATSAPP_WEBHOOK_PATH, (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");
    if (mode === "subscribe" && timingSafeStringEqual(token, deps.verifyToken) && challenge) {
      return c.text(challenge, 200);
    }
    return c.json({ error: "Forbidden" }, 403);
  });

  app.post(WHATSAPP_WEBHOOK_PATH, async (c) => {
    const raw = await readBoundedBody(c.req.raw, WEBHOOK_MAX_BODY_BYTES);
    if (raw === null) {
      return c.json({ error: "Payload too large" }, 413);
    }
    if (!deps.verifySignature(raw, c.req.header("x-hub-signature-256"))) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let payload: unknown = null;
    try {
      payload = raw.trim() ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }
    const event = deps.parseInbound(payload);
    // Always 200 for verified senders: Meta retries on non-2xx and statuses
    // (delivered/read) are not actionable here.
    if (event?.type === "message") {
      const pairMatch = PAIRING_CODE_PATTERN.exec(event.content);
      if (pairMatch) {
        const result = await deps.completePairing(
          (pairMatch[1] ?? "").toUpperCase(),
          event.fromNumber,
        );
        const replies = phoneStrings(deps.locale ?? "id").pairing;
        await deps.sendReply?.(event.fromNumber, replies[result]).catch(() => undefined);
      } else {
        await deps.handle(event);
      }
    }
    return c.json({ ok: true });
  });
}
