import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
} from "node:crypto";

export interface DeviceKeypair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedEnvelope {
  version: 1;
  ephemeralPublicKey: string;
  iv: string;
  ciphertext: string;
  authTag: string;
}

export interface RecoveryEnvelope {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
  authTag: string;
}

interface SyncObjectCiphertext {
  version: 1;
  iv: string;
  ciphertext: string;
  authTag: string;
}

export function createSyncKey(): string {
  return randomBytes(32).toString("base64");
}

export function createRecoveryKey(): string {
  return randomBytes(32).toString("base64url");
}

export function createRecoveryEnvelope(syncKey: string, recoveryKey: string): RecoveryEnvelope {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveRecoveryKey(recoveryKey, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(syncKey, "base64")), cipher.final()]);
  return {
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function recoverSyncKey(envelope: RecoveryEnvelope, recoveryKey: string): string {
  if (envelope.version !== 1) throw new Error("Unsupported recovery envelope version");
  const salt = Buffer.from(envelope.salt, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveRecoveryKey(recoveryKey, salt),
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("base64");
}

/** Encrypts private sync state locally; identity/version are authenticated AAD, never plaintext payload. */
export function encryptSyncObject(
  input: { objectId: string; objectType: string; version: number; plaintext: string },
  syncKey: string,
): string {
  const key = decodeSyncKey(syncKey);
  const aad = syncObjectAad(input);
  // A version is immutable, so this makes a lost PUT response safely retryable.
  const iv = createHmac("sha256", key).update(aad).digest().subarray(0, 12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
  return JSON.stringify({
    version: 1,
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  } satisfies SyncObjectCiphertext);
}

export function decryptSyncObject(
  input: { objectId: string; objectType: string; version: number; ciphertext: string },
  syncKey: string,
): string {
  let encrypted: SyncObjectCiphertext;
  try {
    encrypted = JSON.parse(input.ciphertext) as SyncObjectCiphertext;
  } catch {
    throw new Error("Sync object ciphertext is invalid");
  }
  if (encrypted.version !== 1 || !encrypted.iv || !encrypted.ciphertext || !encrypted.authTag) {
    throw new Error("Sync object ciphertext is invalid");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    decodeSyncKey(syncKey),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAAD(syncObjectAad(input));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function createDeviceKeypair(): DeviceKeypair {
  const keys = generateKeyPairSync("x25519");
  return {
    publicKey: keys.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKey: keys.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

export function encryptForDevice(plaintext: string, recipientPublicKey: string): EncryptedEnvelope {
  const ephemeral = generateKeyPairSync("x25519");
  const sharedKey = deriveKey(
    ephemeral.privateKey,
    createPublicKey({
      key: Buffer.from(recipientPublicKey, "base64"),
      type: "spki",
      format: "der",
    }),
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sharedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    version: 1,
    ephemeralPublicKey: ephemeral.publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptEnvelope(envelope: EncryptedEnvelope, recipientPrivateKey: string): string {
  if (envelope.version !== 1) throw new Error("Unsupported encrypted envelope version");
  const sharedKey = deriveKey(
    createPrivateKey({
      key: Buffer.from(recipientPrivateKey, "base64"),
      type: "pkcs8",
      format: "der",
    }),
    createPublicKey({
      key: Buffer.from(envelope.ephemeralPublicKey, "base64"),
      type: "spki",
      format: "der",
    }),
  );
  const decipher = createDecipheriv("aes-256-gcm", sharedKey, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function deriveKey(
  privateKey: ReturnType<typeof createPrivateKey>,
  publicKey: ReturnType<typeof createPublicKey>,
) {
  return createHash("sha256").update(diffieHellman({ privateKey, publicKey })).digest();
}

function deriveRecoveryKey(recoveryKey: string, salt: Buffer): Buffer {
  return scryptSync(recoveryKey, salt, 32);
}

function decodeSyncKey(syncKey: string): Buffer {
  const key = Buffer.from(syncKey, "base64");
  if (key.length !== 32) throw new Error("Sync key is invalid");
  return key;
}

function syncObjectAad(input: { objectId: string; objectType: string; version: number }): Buffer {
  return Buffer.from(
    `sentrabot.sync.v1:${input.objectId}:${input.objectType}:${input.version}`,
    "utf8",
  );
}
