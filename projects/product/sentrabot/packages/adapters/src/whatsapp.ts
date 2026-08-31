import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  AdapterContext,
  AdapterDescriptor,
  MessagingCapabilities,
  MessagingDirectRequest,
  MessagingGroup,
  MessagingGroupRequest,
  MessagingInboundEvent,
  MessagingProvider,
  MessagingSendResult,
} from "@sentrabot/adapter-kit";

const DEFAULT_GRAPH_BASE_URL = "https://graph.facebook.com/v21.0";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  businessPhoneE164: string;
  baseUrl?: string;
}

export interface WhatsAppEnvironmentValues {
  whatsappAccessToken: string | undefined;
  whatsappPhoneNumberId: string | undefined;
  whatsappAppSecret: string | undefined;
  whatsappVerifyToken: string | undefined;
  whatsappBusinessPhoneE164: string | undefined;
}

export function whatsAppConfigFromEnv(values: WhatsAppEnvironmentValues): WhatsAppConfig {
  return {
    accessToken: values.whatsappAccessToken ?? "",
    phoneNumberId: values.whatsappPhoneNumberId ?? "",
    appSecret: values.whatsappAppSecret ?? "",
    verifyToken: values.whatsappVerifyToken ?? "",
    businessPhoneE164: values.whatsappBusinessPhoneE164 ?? "",
  };
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
    const changes = Array.isArray(asRecord(entry).changes) ? (asRecord(entry).changes as unknown[]) : [];
    for (const change of changes) {
      const value = asRecord(asRecord(change).value);
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const raw of messages) {
        const message = asRecord(raw);
        const wamid = typeof message.id === "string" ? message.id : "";
        const from = typeof message.from === "string" ? message.from : "";
        if (!wamid || !from) continue;
        const text = asRecord(message.text);
        return {
          type: "message",
          handle: wamid,
          fromNumber: normalizeWaNumber(from),
          groupId: null,
          groupName: null,
          participants: [],
          content: typeof text.body === "string" ? text.body : "",
          mediaUrl: null,
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
    const fetchImpl = this.dependencies.fetch ?? globalThis.fetch;
    const response = await fetchImpl(
      `${this.config.baseUrl ?? DEFAULT_GRAPH_BASE_URL}/${encodeURIComponent(this.config.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: request.to.replace(/^\+/, ""),
          type: "text",
          text: { body: request.body },
        }),
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

  async sendGroup(_request: MessagingGroupRequest, _context: AdapterContext): Promise<MessagingSendResult> {
    throw new Error("WhatsApp Cloud API does not support group messaging");
  }

  async getGroup(_groupId: string, _context: AdapterContext): Promise<MessagingGroup> {
    throw new Error("WhatsApp Cloud API does not support group messaging");
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
}
