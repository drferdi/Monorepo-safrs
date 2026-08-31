import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isWhatsAppEnabled,
  isWhatsAppWindowExpiredError,
  normalizeWaNumber,
  parseWhatsAppInbound,
  sanitizeTemplateParameter,
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
      media: null,
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

/** Media messages replace `text` with the type-specific object. */
function mediaPayload(type: string, media: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ from: "628123456789", id: "wamid.M1", type, [type]: media }],
            },
          },
        ],
      },
    ],
  };
}

describe("parseWhatsAppInbound media", () => {
  it("reads a photo with its caption as the message text", () => {
    const event = parseWhatsAppInbound(
      mediaPayload("image", { id: "MEDIA_1", mime_type: "image/jpeg", caption: "ini invoicenya" }),
    );
    expect(event).toMatchObject({
      handle: "wamid.M1",
      content: "ini invoicenya",
      media: { id: "MEDIA_1", mimeType: "image/jpeg", kind: "image" },
    });
  });

  it("flags a voice note and strips the codec parameter from its mime type", () => {
    const event = parseWhatsAppInbound(
      mediaPayload("audio", { id: "MEDIA_2", mime_type: "audio/ogg; codecs=opus", voice: true }),
    );
    expect(event).toMatchObject({
      content: "",
      media: { id: "MEDIA_2", mimeType: "audio/ogg", kind: "audio", voice: true },
    });
  });

  it("keeps a document's filename", () => {
    const event = parseWhatsAppInbound(
      mediaPayload("document", {
        id: "MEDIA_3",
        mime_type: "application/pdf",
        filename: "surat.pdf",
      }),
    );
    expect(event).toMatchObject({
      media: { kind: "document", filename: "surat.pdf", mimeType: "application/pdf" },
    });
  });

  it("surfaces stickers as images and video as a document", () => {
    expect(
      parseWhatsAppInbound(mediaPayload("sticker", { id: "S1", mime_type: "image/webp" })),
    ).toMatchObject({ media: { kind: "sticker" } });
    // Video rides along as a document so ingestion answers "not supported"
    // instead of silently swallowing the message.
    expect(
      parseWhatsAppInbound(mediaPayload("video", { id: "V1", mime_type: "video/mp4" })),
    ).toMatchObject({ media: { kind: "document", mimeType: "video/mp4" } });
  });

  it("leaves a plain text message without media", () => {
    expect(parseWhatsAppInbound(inboundPayload())).toMatchObject({ content: "halo", media: null });
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
        new Error(
          'WhatsApp send failed with 400: {"error":{"message":"(#131047) Re-engagement message"}}',
        ),
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

  it("downloads media in two steps, both bearing the token", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = new WhatsAppMessagingProvider(config, {
      fetch: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        if (calls.length === 1) {
          return new Response(
            JSON.stringify({
              url: "https://lookaside.fbsbx.com/x",
              mime_type: "image/jpeg",
              file_size: 12,
            }),
            { status: 200 },
          );
        }
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }) as typeof globalThis.fetch,
    });

    const media = await provider.fetchMedia("MEDIA_1", context);
    expect(media.mimeType).toBe("image/jpeg");
    expect(Array.from(media.bytes)).toEqual([1, 2, 3]);
    expect(calls[0]?.url).toContain("/MEDIA_1");
    expect(calls[1]?.url).toBe("https://lookaside.fbsbx.com/x");
    for (const call of calls) {
      expect((call.init.headers as Record<string, string>).authorization).toBe("Bearer token");
      // A redirect would hand the bearer token to another origin.
      expect(call.init.redirect).toBe("error");
    }
  });

  it("refuses media past the attachment size cap before downloading it", async () => {
    let downloads = 0;
    const provider = new WhatsAppMessagingProvider(config, {
      fetch: (async (url: string | URL | Request) => {
        if (String(url).includes("MEDIA_BIG")) {
          return new Response(
            JSON.stringify({
              url: "https://lookaside.fbsbx.com/big",
              mime_type: "image/jpeg",
              file_size: 50 * 1024 * 1024,
            }),
            { status: 200 },
          );
        }
        downloads += 1;
        return new Response(new Uint8Array([1]), { status: 200 });
      }) as typeof globalThis.fetch,
    });
    await expect(provider.fetchMedia("MEDIA_BIG", context)).rejects.toThrow(/limit/i);
    expect(downloads).toBe(0);
  });

  it("surfaces a failed media lookup with its status", async () => {
    const provider = new WhatsAppMessagingProvider(config, {
      fetch: (async () => new Response("gone", { status: 404 })) as typeof globalThis.fetch,
    });
    await expect(provider.fetchMedia("MEDIA_X", context)).rejects.toThrow(/404/);
  });

  it("sends a template with the body as its single parameter", async () => {
    const calls: Array<{ init: RequestInit }> = [];
    const provider = new WhatsAppMessagingProvider(
      { ...config, templateName: "sentra_update", templateLanguage: "id" },
      {
        fetch: (async (_url: string | URL | Request, init?: RequestInit) => {
          calls.push({ init: init ?? {} });
          return new Response(JSON.stringify({ messages: [{ id: "wamid.T1" }] }), { status: 200 });
        }) as typeof globalThis.fetch,
      },
    );

    const result = await provider.sendTemplate(
      { to: "+628123456789", body: "Laporan mingguan sudah selesai" },
      context,
    );
    expect(result.handle).toBe("wamid.T1");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "628123456789",
      type: "template",
      template: {
        name: "sentra_update",
        language: { code: "id" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: "Laporan mingguan sudah selesai" }],
          },
        ],
      },
    });
  });

  it("refuses to send a template that was never configured", async () => {
    const provider = new WhatsAppMessagingProvider(config);
    await expect(provider.sendTemplate({ to: "+62812", body: "x" }, context)).rejects.toThrow(
      /not configured/i,
    );
  });

  it("flattens and truncates a template parameter Meta would reject", () => {
    expect(sanitizeTemplateParameter("baris satu\nbaris dua\tselesai")).toBe(
      "baris satu baris dua selesai",
    );
    const long = sanitizeTemplateParameter("x".repeat(900));
    expect(long).toHaveLength(600);
    expect(long.endsWith("…")).toBe(true);
  });

  it("has no group capabilities", async () => {
    const provider = new WhatsAppMessagingProvider(config);
    expect(provider.describe().capabilities).toEqual({
      direct: true,
      groups: false,
      typing: false,
    });
    await expect(provider.sendGroup({ groupId: "g", body: "x" }, context)).rejects.toThrow();
  });
});
