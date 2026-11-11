import { createHmac } from "node:crypto";
import { parseWhatsAppInbound, verifyWhatsAppSignature } from "@sentrabot/adapters";
import { phoneStrings } from "@sentrabot/core";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  mountWhatsAppWebhookRoutes,
  WHATSAPP_WEBHOOK_PATH,
  type WhatsAppWebhookDeps,
} from "./whatsapp-webhook.js";

const APP_SECRET = "app-secret";
const VERIFY_TOKEN = "verify-token";

function buildApp(overrides: Partial<WhatsAppWebhookDeps> = {}) {
  const handle = vi.fn(async () => undefined);
  const completePairing = vi.fn(async () => "paired" as const);
  const sendReply = vi.fn(async () => undefined);
  const app = new Hono();
  mountWhatsAppWebhookRoutes(app, {
    verifyToken: VERIFY_TOKEN,
    verifySignature: (rawBody, header) => verifyWhatsAppSignature(rawBody, header, APP_SECRET),
    parseInbound: parseWhatsAppInbound,
    completePairing,
    sendReply,
    handle,
    ...overrides,
  });
  return { app, handle, completePairing, sendReply };
}

function signedPost(app: Hono, payload: unknown, secret = APP_SECRET) {
  const raw = JSON.stringify(payload);
  return app.request(WHATSAPP_WEBHOOK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`,
    },
    body: raw,
  });
}

function textMessage(body: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ id: "wamid.X1", from: "628123456789", text: { body }, type: "text" }],
            },
          },
        ],
      },
    ],
  };
}

describe("whatsapp webhook", () => {
  it("answers the hub.challenge subscription handshake", async () => {
    const { app } = buildApp();
    const response = await app.request(
      `${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=12345`,
    );
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("12345");
  });

  it("refuses the handshake with a wrong verify token", async () => {
    const { app } = buildApp();
    const response = await app.request(
      `${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`,
    );
    expect(response.status).toBe(403);
  });

  it("rejects an unsigned or mis-signed POST", async () => {
    const { app, handle } = buildApp();
    const raw = JSON.stringify(textMessage("halo"));
    const unsigned = await app.request(WHATSAPP_WEBHOOK_PATH, { method: "POST", body: raw });
    expect(unsigned.status).toBe(401);
    const misSigned = await signedPost(app, textMessage("halo"), "wrong-secret");
    expect(misSigned.status).toBe(401);
    expect(handle).not.toHaveBeenCalled();
  });

  it("routes a normal message to the inbound handler", async () => {
    const { app, handle, completePairing } = buildApp();
    const response = await signedPost(app, textMessage("halo bot"));
    expect(response.status).toBe(200);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0]?.[0]).toMatchObject({
      handle: "wamid.X1",
      fromNumber: "+628123456789",
      content: "halo bot",
    });
    expect(completePairing).not.toHaveBeenCalled();
  });

  it("intercepts PAIR codes before the inbound path and confirms by reply", async () => {
    const { app, handle, completePairing, sendReply } = buildApp();
    const response = await signedPost(app, textMessage("PAIR-ab12cd34 hello"));
    expect(response.status).toBe(200);
    // The pairing interception must run INSTEAD of the provisioning path.
    expect(handle).not.toHaveBeenCalled();
    expect(completePairing).toHaveBeenCalledWith("AB12CD34", "+628123456789");
    // Indonesian is the default: this is the first message a paired user reads.
    expect(sendReply).toHaveBeenCalledWith("+628123456789", phoneStrings("id").pairing.paired);
  });

  it("replies with the failure reason for an invalid code", async () => {
    const { app, sendReply } = buildApp({ completePairing: async () => "invalid" });
    await signedPost(app, textMessage("PAIR-ZZZZZZ"));
    expect(sendReply).toHaveBeenCalledWith("+628123456789", phoneStrings("id").pairing.invalid);
  });

  it("answers in English when the deployment is configured that way", async () => {
    const { app, sendReply } = buildApp({ locale: "en" });
    await signedPost(app, textMessage("PAIR-ab12cd34"));
    expect(sendReply).toHaveBeenCalledWith("+628123456789", phoneStrings("en").pairing.paired);
  });
});
