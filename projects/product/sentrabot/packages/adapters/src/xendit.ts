import { timingSafeEqual } from "node:crypto";

/**
 * Xendit signs legacy payment callbacks with the configured callback token.
 * This comparison intentionally handles only the header; event payload parsing
 * belongs to the billing boundary where it can remain minimal and sanitized.
 */
export function hasValidXenditCallbackToken(expected: string, received: string | null): boolean {
  if (!received || !expected) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.byteLength === receivedBytes.byteLength &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}
