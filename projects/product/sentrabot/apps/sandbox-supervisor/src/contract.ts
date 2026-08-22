import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const supervisorComputerIdentitySchema = z.strictObject({
  computerId: z.string().trim().min(1).max(128),
  botId: z.string().trim().min(1).max(128),
  workspaceId: z.string().trim().min(1).max(128),
});

export const supervisorOperationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("status") }),
  z.object({ operation: z.literal("boot") }),
  z.object({ operation: z.literal("stop") }),
  z.object({ operation: z.literal("heartbeat") }),
  z.object({
    operation: z.literal("input"),
    kind: z.enum(["key", "pointer", "clipboard"]),
    payload: z.record(z.string(), z.unknown()),
  }),
]);

export const supervisorRequestSchema = z.strictObject({
  actor: supervisorComputerIdentitySchema,
  requestId: z.string().trim().min(1).max(128),
  operation: supervisorOperationSchema,
});

export type SupervisorRequest = z.infer<typeof supervisorRequestSchema>;

export function hasValidSupervisorToken(
  authorization: string | undefined,
  expected: string,
) {
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(authorization.slice("Bearer ".length));
  const secret = Buffer.from(expected);
  return (
    candidate.length === secret.length && timingSafeEqual(candidate, secret)
  );
}

export function isSafeComputerPath(computerId: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(computerId);
}
