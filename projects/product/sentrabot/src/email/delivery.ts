export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailDeliveryConfig = {
  nodeEnv: "development" | "test" | "production";
  from: string;
  allowExternalDelivery: boolean;
  localSink?: (message: EmailMessage) => Promise<void>;
  providerSend?: (message: EmailMessage) => Promise<void>;
};

export async function deliverEmail(
  config: EmailDeliveryConfig,
  message: EmailMessage,
) {
  if (config.nodeEnv !== "production") {
    if (!config.localSink)
      throw new Error("Local email sink is required outside production");
    await config.localSink(message);
    return { mode: "local" as const };
  }

  if (!config.allowExternalDelivery || !config.providerSend) {
    throw new Error("External email delivery is disabled");
  }

  await config.providerSend(message);
  return { mode: "provider" as const };
}
