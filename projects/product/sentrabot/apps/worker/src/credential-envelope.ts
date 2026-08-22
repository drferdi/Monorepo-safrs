import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function deriveKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest();
}

export function encryptCredential(plaintext: string, encryptionKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(encryptionKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptCredential(envelope: string, encryptionKey: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] =
    envelope.split(".");
  if (version !== VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Unsupported credential envelope");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(encryptionKey),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function rotateCredential(
  envelope: string,
  oldKey: string,
  newKey: string,
) {
  return encryptCredential(decryptCredential(envelope, oldKey), newKey);
}
