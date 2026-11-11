import type { MessagingProvider } from "@sentrabot/adapter-kit";
import {
  isPhoneSurfaceEnabled,
  isWhatsAppEnabled,
  SendBlueMessagingProvider,
  sendBlueConfigFromEnv,
  WhatsAppMessagingProvider,
  whatsAppConfigFromEnv,
} from "@sentrabot/adapters";
import { normalizePhoneLocale, type PhoneLocale } from "@sentrabot/core";

export interface WorkerMessaging {
  messaging?: MessagingProvider;
  whatsappMessaging?: MessagingProvider;
  phoneLocale: PhoneLocale;
}

/**
 * The worker must reach the same messaging decision as apps/api/src/app.ts. In the Graphile
 * topology run.continue and phone.deliver execute here, so a provider missing on this side is a
 * provider missing in production.
 */
export function workerMessagingFromEnv(
  env: NodeJS.ProcessEnv,
  deploymentModelKey: string | undefined,
): WorkerMessaging {
  const sendBlueConfig = sendBlueConfigFromEnv({
    sendblueApiKeyId: env.SENDBLUE_API_KEY_ID,
    sendblueApiSecret: env.SENDBLUE_API_SECRET,
    sendblueSigningSecret: env.SENDBLUE_SIGNING_SECRET,
    sendbluePhoneNumber: env.SENDBLUE_PHONE_NUMBER,
  });
  const whatsAppConfig = whatsAppConfigFromEnv({
    whatsappAccessToken: env.WHATSAPP_ACCESS_TOKEN,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappAppSecret: env.WHATSAPP_APP_SECRET,
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN,
    whatsappBusinessPhoneE164: env.WHATSAPP_BUSINESS_PHONE_E164,
    whatsappTemplateName: env.WHATSAPP_TEMPLATE_NAME,
    whatsappTemplateLanguage: env.WHATSAPP_TEMPLATE_LANGUAGE,
  });
  return {
    messaging: isPhoneSurfaceEnabled(sendBlueConfig, deploymentModelKey)
      ? new SendBlueMessagingProvider(sendBlueConfig)
      : undefined,
    // Pairing binds real users with their own model credentials, so WhatsApp does not
    // depend on the deployment model key (same rule as the API).
    whatsappMessaging: isWhatsAppEnabled(whatsAppConfig)
      ? new WhatsAppMessagingProvider(whatsAppConfig)
      : undefined,
    phoneLocale: normalizePhoneLocale(env.PHONE_LOCALE),
  };
}
