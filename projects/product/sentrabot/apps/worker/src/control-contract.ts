import { z } from "zod";

export const workerIdentitySchema = z.strictObject({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  botId: z.string().min(1),
});

export const computerOperationSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("status") }),
  z.strictObject({ operation: z.literal("boot") }),
  z.strictObject({ operation: z.literal("stop") }),
  z.strictObject({ operation: z.literal("heartbeat") }),
  z.strictObject({
    operation: z.literal("input"),
    kind: z.enum(["key", "pointer", "clipboard"]),
    payload: z
      .record(z.string().max(64), z.unknown())
      .refine(
        (payload) => JSON.stringify(payload).length <= 16_384,
        "Payload too large",
      ),
  }),
]);

export const workerControlRequestSchema = z.strictObject({
  actor: workerIdentitySchema,
  requestId: z.string().min(1).max(128),
  operation: computerOperationSchema,
});

export type WorkerControlRequest = z.infer<typeof workerControlRequestSchema>;

export function hasValidWorkerToken(request: Request, expectedToken: string) {
  const authorization = request.headers.get("authorization");
  return Boolean(expectedToken) && authorization === `Bearer ${expectedToken}`;
}
