import { z } from "zod";

export const desktopIpcRequestSchema = z.strictObject({
  channel: z.enum(["get-origin", "open-external"]),
  value: z.string().trim().min(1).max(2048).optional(),
});

export function isAllowedOrigin(origin: string, configuredOrigin: string) {
  try {
    const candidate = new URL(origin);
    const expected = new URL(configuredOrigin);
    return (
      candidate.origin === expected.origin && candidate.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function validateIpcRequest(input: unknown) {
  return desktopIpcRequestSchema.parse(input);
}
