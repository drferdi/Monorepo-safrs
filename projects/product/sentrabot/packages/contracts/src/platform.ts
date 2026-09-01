import * as z from "zod";
import { Id, IsoDate } from "./ids.js";

export const SyncObjectTypeSchema = z.enum([
  "conversation",
  "bot",
  "memory",
  "setting",
  "file_ref",
]);
export type SyncObjectType = z.infer<typeof SyncObjectTypeSchema>;

export const E2eeEnvelopeSchema = z
  .object({
    version: z.literal(1),
    ephemeralPublicKey: z.string().min(1),
    iv: z.string().min(1),
    ciphertext: z.string().min(1),
    authTag: z.string().min(1),
  })
  .strict();
export type E2eeEnvelope = z.infer<typeof E2eeEnvelopeSchema>;

export const KeyEnvelopeSchema = z
  .object({
    envelopeId: Id,
    workspaceId: Id,
    senderDeviceId: Id,
    recipientDeviceId: Id,
    version: z.number().int().positive(),
    ciphertext: z.string().min(1),
    createdAt: IsoDate,
  })
  .strict();
export type KeyEnvelope = z.infer<typeof KeyEnvelopeSchema>;

export const RuntimeLeaseSchema = z
  .object({
    workspaceId: Id,
    activeRuntimeId: Id,
    executionEpoch: z.number().int().nonnegative(),
    leaseExpiresAt: IsoDate,
  })
  .strict();
export type RuntimeLease = z.infer<typeof RuntimeLeaseSchema>;

export const RelayEnvelopeSchema = z
  .object({
    envelopeId: Id,
    workspaceId: Id,
    runtimeId: Id,
    executionEpoch: z.number().int().nonnegative(),
    senderDeviceId: Id,
    sequence: z.number().int().nonnegative(),
    ciphertext: z.string().min(1),
    signature: z.string().min(1),
    createdAt: IsoDate,
    expiresAt: IsoDate,
  })
  .strict();
export type RelayEnvelope = z.infer<typeof RelayEnvelopeSchema>;
