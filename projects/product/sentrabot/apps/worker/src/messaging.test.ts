import { SendBlueMessagingProvider, WhatsAppMessagingProvider } from "@sentrabot/adapters";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workerMessagingFromEnv } from "./messaging.js";

const whatsAppEnv = {
  WHATSAPP_ACCESS_TOKEN: "token",
  WHATSAPP_PHONE_NUMBER_ID: "123",
  WHATSAPP_APP_SECRET: "secret",
  WHATSAPP_VERIFY_TOKEN: "verify",
  WHATSAPP_BUSINESS_PHONE_E164: "+6281234567890",
};

const sendBlueEnv = {
  SENDBLUE_API_KEY_ID: "id",
  SENDBLUE_API_SECRET: "secret",
  SENDBLUE_SIGNING_SECRET: "signing",
  SENDBLUE_PHONE_NUMBER: "+15550001111",
};

describe("worker messaging composition", () => {
  // isSendBlueEnabled / isWhatsAppEnabled deliberately stay off under the test runner
  // (they check process.env.VITEST); clear it so the real enablement rules are exercised.
  beforeEach(() => {
    vi.stubEnv("VITEST", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays off under the test runner like the API helpers do", () => {
    vi.unstubAllEnvs();
    const result = workerMessagingFromEnv({ ...whatsAppEnv, ...sendBlueEnv }, "deployment-key");
    expect(result.messaging).toBeUndefined();
    expect(result.whatsappMessaging).toBeUndefined();
  });

  it("builds the WhatsApp provider from the same environment the API reads", () => {
    const result = workerMessagingFromEnv({ ...whatsAppEnv, PHONE_LOCALE: "en" }, undefined);
    expect(result.whatsappMessaging).toBeInstanceOf(WhatsAppMessagingProvider);
    expect(result.messaging).toBeUndefined();
    expect(result.phoneLocale).toBe("en");
  });

  it("defaults the phone locale to id and leaves both providers off without configuration", () => {
    const result = workerMessagingFromEnv({}, undefined);
    expect(result.messaging).toBeUndefined();
    expect(result.whatsappMessaging).toBeUndefined();
    expect(result.phoneLocale).toBe("id");
  });

  it("keeps SendBlue behind the deployment model key like the API", () => {
    expect(workerMessagingFromEnv(sendBlueEnv, undefined).messaging).toBeUndefined();
    expect(workerMessagingFromEnv(sendBlueEnv, "deployment-key").messaging).toBeInstanceOf(
      SendBlueMessagingProvider,
    );
  });

  it("does not require the deployment model key for WhatsApp", () => {
    expect(workerMessagingFromEnv(whatsAppEnv, undefined).whatsappMessaging).toBeInstanceOf(
      WhatsAppMessagingProvider,
    );
  });
});
