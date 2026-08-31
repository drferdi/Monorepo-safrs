import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isWhatsAppEnabled,
  isWhatsAppWindowExpiredError,
  normalizeWaNumber,
  parseWhatsAppInbound,
  verifyWhatsAppSignature,
  WhatsAppMessagingProvider,
} from "./whatsapp.js";

const context = {
  operationId: "test",
  traceId: "test",
  workspaceId: "workspace",
  userId: "user-1",
  signal: new AbortController().signal,
};

/** Shape from Meta's Cloud API webhook documentation. */
function inboundPayload(overrides: { wamid?: string; from?: string; body?: string } = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "628110000000", phone_number_id: "PNID" },
              contacts: [{ profile: { name: "Chief" }, wa_id: "628123456789" }],
              messages: [
                {
                  from: overrides.from ?? "628123456789",
                  id: overrides.wamid ?? "wamid.HBgLNjI4MTIzNDU2Nzg5FQIAEhg=",
                  timestamp: "1756600000",
                  text: { body: overrides.body ?? "halo" },
                  type: "text",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("parseWhatsAppInbound", () => {
  it("maps a text message with the wamid as the event handle", () => {
    const event = parseWhatsAppInbound(inboundPayload({ wamid: "wamid.TEST123" }));
    expect(event).toEqual({
      type: "message",
      // Replay safety downstream is `phone:${handle}` — the handle MUST be
      // Meta's wamid, which is stable across webhook redeliveries.
      handle: "wamid.TEST123",
      fromNumber: "+628123456789",
      groupId: null,
      groupName: null,
      participants: [],
      content: "halo",
      mediaUrl: null,
    });
  });

  it("maps a status callback", () => {
    const event = parseWhatsAppInbound({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.STATUS1", status: "delivered", recipient_id: "628123" }],
              },
            },
          ],
        },
      ],
    });
    expect(event).toEqual({ type: "status", handle: "wamid.STATUS1", status: "delivered" });
  });

  it("rejects non-WhatsApp payloads", () => {
    expect(parseWhatsAppInbound({ object: "page" })).toBeNull();
    expect(parseWhatsAppInbound(null)).toBeNull();
    expect(parseWhatsAppInbound("x")).toBeNull();
  });
});

describe("verifyWhatsAppSignature", () => {
  it("accepts the documented sha256= HMAC over the raw body and rejects tampering", () => {
    const raw = JSON.stringify(inboundPayload());
    const secret = "app-secret";
    const header = `sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`;
    expect(verifyWhatsAppSignature(raw, header, secret)).toBe(true);
    expect(verifyWhatsAppSignature(`${raw} `, header, secret)).toBe(false);
    expect(verifyWhatsAppSignature(raw, header, "other-secret")).toBe(false);
    expect(verifyWhatsAppSignature(raw, undefined, secret)).toBe(false);
  });
});

describe("normalizeWaNumber", () => {
  it("prefixes the E.164 plus that Cloud API omits", () => {
    expect(normalizeWaNumber("628123456789")).toBe("+628123456789");
    expect(normalizeWaNumber("+628123456789")).toBe("+628123456789");
  });
});

describe("isWhatsAppWindowExpiredError", () => {
  it("flags Meta's re-engagement error as terminal", () => {
    expect(
      isWhatsAppWindowExpiredError(
        new Error('WhatsApp send failed with 400: {"error":{"message":"(#131047) Re-engagement message"}}'),
      ),
    ).toBe(true);
    expect(isWhatsAppWindowExpiredError(new Error("rate limited"))).toBe(false);
  });
});

describe("WhatsAppMessagingProvider", () => {
  const config = {
    accessToken: "token",
    phoneNumberId: "PNID",
    appSecret: "secret",
    verifyToken: "verify",
    businessPhoneE164: "+628110000000",
  };

  it("is disabled unless all five values are present", () => {
    expect(isWhatsAppEnabled({ ...config, accessToken: "" })).toBe(false);
  });

  it("sends a text message and returns the wamid handle", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = new WhatsAppMessagingProvider(config, {
      fetch: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ messages: [{ id: "wamid.SENT1" }] }), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    const result = await provider.sendDirect({ to: "+628123456789", body: "hi" }, context);
    expect(result.handle).toBe("wamid.SENT1");
    expect(calls[0]?.url).toContain("/PNID/messages");
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "628123456789",
      type: "text",
      text: { body: "hi" },
    });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer token");
  });

  it("surfaces API errors with the response body", async () => {
    const provider = new WhatsAppMessagingProvider(config, {
      fetch: (async () =>
        new Response(JSON.stringify({ error: { message: "(#131047) Re-engagement message" } }), {
          status: 400,
        })) as typeof globalThis.fetch,
    });
    await expect(provider.sendDirect({ to: "+62812", body: "x" }, context)).rejects.toThrow(
      /131047/,
    );
  });

  it("has no group capabilities", async () => {
    const provider = new WhatsAppMessagingProvider(config);
    expect(provider.describe().capabilities).toEqual({ direct: true, groups: false, typing: false });
    await expect(provider.sendGroup({ groupId: "g", body: "x" }, context)).rejects.toThrow();
  });
});
