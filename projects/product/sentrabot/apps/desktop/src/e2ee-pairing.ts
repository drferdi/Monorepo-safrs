import { encryptForDevice } from "./e2ee.js";

export interface PairingTransport {
  request<T>(input: {
    method: "GET" | "POST";
    path: string;
    body?: Record<string, string | number>;
  }): Promise<T>;
}

export interface PairingDevice {
  deviceId: string;
  publicKey: string;
}

export async function publishPairingEnvelope(input: {
  transport: PairingTransport;
  senderDeviceId: string;
  recipient: PairingDevice;
  syncKey: string;
  version: number;
}): Promise<void> {
  const ciphertext = JSON.stringify(encryptForDevice(input.syncKey, input.recipient.publicKey));
  await input.transport.request<void>({
    method: "POST",
    path: "/v1/key-envelopes",
    body: {
      senderDeviceId: input.senderDeviceId,
      recipientDeviceId: input.recipient.deviceId,
      version: input.version,
      ciphertext,
    },
  });
}
