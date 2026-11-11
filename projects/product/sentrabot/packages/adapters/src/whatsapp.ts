import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  AdapterContext,
  AdapterDescriptor,
  MessagingCapabilities,
  MessagingDirectRequest,
  MessagingGroup,
  MessagingGroupRequest,
  MessagingInboundEvent,
  MessagingInboundMedia,
  MessagingMediaContent,
  MessagingProvider,
  MessagingSendResult,
} from "@sentrabot/adapter-kit";
import { ATTACHMENT_MAX_BYTES } from "@sentrabot/contracts";

const DEFAULT_GRAPH_BASE_URL = "https://graph.facebook.com/v21.0";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  businessPhoneE164: string;
  baseUrl?: string;
  /**
   * Pre-approved template used to reach the owner after the 24h
   * customer-service window closes (a finished routine, a completed long run).
   * It must take exactly one body parameter. Unset means those messages fail
   * terminally, as they did before.
   */
  templateName?: string;
  templateLanguage?: string;
}

export interface WhatsAppEnvironmentValues {
  whatsappAccessToken: string | undefined;
  whatsappPhoneNumberId: string | undefined;
  whatsappAppSecret: string | undefined;
  whatsappVerifyToken: string | undefined;
  whatsappBusinessPhoneE164: string | undefined;
  whatsappTemplateName?: string | undefined;
  whatsappTemplateLanguage?: string | undefined;
}

export function whatsAppConfigFromEnv(values: WhatsAppEnvironmentValues): WhatsAppConfig {
  return {
    accessToken: values.whatsappAccessToken ?? "",
    phoneNumberId: values.whatsappPhoneNumberId ?? "",
    appSecret: values.whatsappAppSecret ?? "",
    verifyToken: values.whatsappVerifyToken ?? "",
    businessPhoneE164: values.whatsappBusinessPhoneE164 ?? "",
    templateName: values.whatsappTemplateName || undefined,
    templateLanguage: values.whatsappTemplateLanguage || undefined,
  };
}

/** Template body parameters reject newlines/tabs and are length-capped. */
const MAX_TEMPLATE_PARAMETER_LENGTH = 600;

export function sanitizeTemplateParameter(value: string): string {
  const flattened = value.replace(/\s+/g, " ").trim();
  return flattened.length > MAX_TEMPLATE_PARAMETER_LENGTH
    ? `${flattened.slice(0, MAX_TEMPLATE_PARAMETER_LENGTH - 1)}…`
    : flattened;
}

/** All five values present, and never live under the test runner. */
export function isWhatsAppEnabled(config: Partial<WhatsAppConfig>): boolean {
  return Boolean(
    config.accessToken &&
      config.phoneNumberId &&
      config.appSecret &&
      config.verifyToken &&
      config.businessPhoneE164 &&
      !process.env.VITEST,
  );
}

/**
 * Verify Meta's X-Hub-Signature-256 header (sha256=<hex HMAC of the raw body
 * with the app secret>). Constant-time comparison.
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | undefined | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Normalize a WhatsApp Cloud API webhook payload into provider-neutral inbound
 * events. Cloud API batches entries; we surface the first text message (or the
 * first status) — Meta sends one change per POST in practice.
 *
 * The event handle MUST be Meta's `wamid`: the whole pipeline's replay safety
 * rides on `clientNonce: phone:<handle>` and Meta redelivers webhooks.
 */
export function parseWhatsAppInbound(payload: unknown): MessagingInboundEvent | null {
  const body = asRecord(payload);
  if (body.object !== "whatsapp_business_account") return null;
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(asRecord(entry).changes)
      ? (asRecord(entry).changes as unknown[])
      : [];
    for (const change of changes) {
      const value = asRecord(asRecord(change).value);
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const raw of messages) {
        const message = asRecord(raw);
        const wamid = typeof message.id === "string" ? message.id : "";
        const from = typeof message.from === "string" ? message.from : "";
        if (!wamid || !from) continue;
        const media = parseWhatsAppMedia(message);
        const text = asRecord(message.text);
        return {
          type: "message",
          handle: wamid,
          fromNumber: normalizeWaNumber(from),
          groupId: null,
          groupName: null,
          participants: [],
          // A media message's caption is its text; voice notes have none.
          content: media?.caption ?? (typeof text.body === "string" ? text.body : ""),
          mediaUrl: null,
          media,
        };
      }
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const raw of statuses) {
        const status = asRecord(raw);
        const wamid = typeof status.id === "string" ? status.id : "";
        if (!wamid) continue;
        return {
          type: "status",
          handle: wamid,
          status: typeof status.status === "string" ? status.status : "",
        };
      }
    }
  }
  return null;
}

/**
 * Media kinds the Cloud API can attach to an inbound message. `video` rides
 * along as a document so ingestion answers with an honest "not supported yet"
 * instead of swallowing the message; `voice` is the legacy alias some payloads
 * still use for a recorded note.
 */
const MEDIA_KINDS: Record<string, MessagingInboundMedia["kind"]> = {
  image: "image",
  audio: "audio",
  voice: "audio",
  document: "document",
  sticker: "sticker",
  video: "document",
};

function parseWhatsAppMedia(message: Record<string, unknown>): MessagingInboundMedia | null {
  const type = typeof message.type === "string" ? message.type : "";
  const kind = MEDIA_KINDS[type];
  if (!kind) return null;
  const payload = asRecord(message[type]);
  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) return null;
  const caption = typeof payload.caption === "string" ? payload.caption : undefined;
  const filename = typeof payload.filename === "string" ? payload.filename : undefined;
  return {
    id,
    // Cloud API reports parameters inline, e.g. "audio/ogg; codecs=opus".
    mimeType: (typeof payload.mime_type === "string" ? payload.mime_type : "")
      .split(";")[0]!
      .trim(),
    kind,
    voice: type === "voice" || payload.voice === true ? true : undefined,
    caption,
    filename,
  };
}

/** Cloud API `from` is digits without "+"; the phone pipeline keys on E.164. */
export function normalizeWaNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : value;
}

/**
 * Meta's re-engagement error (outside the 24h customer-service window).
 * Non-retryable: retrying can never succeed until the customer writes again.
 */
export function isWhatsAppWindowExpiredError(error: unknown): boolean {
  return error instanceof Error && /\(#131047\)|re-engagement/i.test(error.message);
}

/** Distinguishable so ingestion can answer "file too big" rather than "failed". */
export class WhatsAppMediaTooLargeError extends Error {
  constructor(readonly size: number) {
    super(`WhatsApp media exceeds the ${ATTACHMENT_MAX_BYTES}-byte limit (${size})`);
    this.name = "WhatsAppMediaTooLargeError";
  }
}

export class WhatsAppMessagingProvider implements MessagingProvider {
  constructor(
    private readonly config: WhatsAppConfig,
    private readonly dependencies: { fetch?: typeof globalThis.fetch } = {},
  ) {
    if (config.baseUrl && !config.baseUrl.startsWith("https://")) {
      throw new Error(`WhatsApp baseUrl must use HTTPS: ${config.baseUrl}`);
    }
  }

  describe(): AdapterDescriptor<MessagingCapabilities> {
    return {
      id: "whatsapp",
      contractVersion: "1",
      adapterVersion: "0.1.0",
      capabilities: { direct: true, groups: false, typing: false },
    };
  }

  async sendDirect(
    request: MessagingDirectRequest,
    context: AdapterContext,
  ): Promise<MessagingSendResult> {
    return this.postMessage(
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: request.to.replace(/^\+/, ""),
        type: "text",
        text: { body: request.body },
      },
      context,
    );
  }

  /**
   * Reach the owner after the 24h customer-service window has closed. Meta
   * only accepts a pre-approved template there, so the message body becomes
   * the template's single parameter and the full text stays in the web thread.
   */
  async sendTemplate(
    request: MessagingDirectRequest,
    context: AdapterContext,
  ): Promise<MessagingSendResult> {
    if (!this.config.templateName) {
      throw new Error("WhatsApp template is not configured");
    }
    return this.postMessage(
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: request.to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: this.config.templateName,
          language: { code: this.config.templateLanguage ?? "id" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: sanitizeTemplateParameter(request.body) }],
            },
          ],
        },
      },
      context,
    );
  }

  private async postMessage(
    payload: Record<string, unknown>,
    context: AdapterContext,
  ): Promise<MessagingSendResult> {
    const fetchImpl = this.dependencies.fetch ?? globalThis.fetch;
    const response = await fetchImpl(
      `${this.config.baseUrl ?? DEFAULT_GRAPH_BASE_URL}/${encodeURIComponent(this.config.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: context.signal,
        // Never let a redirect forward the bearer token cross-origin.
        redirect: "error",
      },
    );
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`WhatsApp send failed with ${response.status}: ${text.slice(0, 300)}`);
    }
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("WhatsApp send returned invalid JSON");
    }
    const messages = asRecord(data).messages;
    const first = Array.isArray(messages) ? asRecord(messages[0]) : {};
    const handle = typeof first.id === "string" && first.id ? first.id : "";
    if (!handle) throw new Error("WhatsApp response did not include a message id");
    return { handle };
  }

  /**
   * Two-step Graph download: resolve the media id to a short-lived lookaside
   * URL, then fetch the bytes. Both calls carry the bearer token (Meta's CDN
   * requires it), so redirects stay refused — a redirect would forward the
   * token to another origin.
   */
  async fetchMedia(mediaId: string, context: AdapterContext): Promise<MessagingMediaContent> {
    const fetchImpl = this.dependencies.fetch ?? globalThis.fetch;
    const headers = { authorization: `Bearer ${this.config.accessToken}` };
    const lookup = await fetchImpl(
      `${this.config.baseUrl ?? DEFAULT_GRAPH_BASE_URL}/${encodeURIComponent(mediaId)}`,
      { headers, signal: context.signal, redirect: "error" },
    );
    const lookupText = await lookup.text();
    if (!lookup.ok) {
      throw new Error(
        `WhatsApp media lookup failed with ${lookup.status}: ${lookupText.slice(0, 300)}`,
      );
    }
    let described: unknown = {};
    try {
      described = lookupText ? JSON.parse(lookupText) : {};
    } catch {
      throw new Error("WhatsApp media lookup returned invalid JSON");
    }
    const record = asRecord(described);
    const url = typeof record.url === "string" ? record.url : "";
    if (!url.startsWith("https://")) throw new Error("WhatsApp media lookup returned no URL");
    const reportedSize = typeof record.file_size === "number" ? record.file_size : 0;
    if (reportedSize > ATTACHMENT_MAX_BYTES) {
      throw new WhatsAppMediaTooLargeError(reportedSize);
    }

    const download = await fetchImpl(url, { headers, signal: context.signal, redirect: "error" });
    if (!download.ok) {
      throw new Error(`WhatsApp media download failed with ${download.status}`);
    }
    const buffer = await download.arrayBuffer();
    if (buffer.byteLength > ATTACHMENT_MAX_BYTES) {
      throw new WhatsAppMediaTooLargeError(buffer.byteLength);
    }
    const mimeType = (
      typeof record.mime_type === "string"
        ? record.mime_type
        : (download.headers.get("content-type") ?? "")
    )
      .split(";")[0]!
      .trim();
    return { bytes: new Uint8Array(buffer), mimeType };
  }

  async sendGroup(
    _request: MessagingGroupRequest,
    _context: AdapterContext,
  ): Promise<MessagingSendResult> {
    throw new Error("WhatsApp Cloud API does not support group messaging");
  }

  async getGroup(_groupId: string, _context: AdapterContext): Promise<MessagingGroup> {
    throw new Error("WhatsApp Cloud API does not support group messaging");
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
}
